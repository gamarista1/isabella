<?php
// Avisos push. Se ejecuta cada minuto desde el Cron de Hostinger (solo por linea de comandos):
//   php /home/USUARIO/domains/TUDOMINIO/public_html/api/cron.php
//
// Envia un push (sin contenido) cuando:
//  - toca cetirizina / azitromicina / pediacort y todavia no esta marcada
//    (aviso a la hora, y se repite cada 10 min hasta 3 veces);
//  - pasaron 4 h desde el ultimo lavado nasal.

if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    exit;
}

date_default_timezone_set('America/Caracas');

const INICIO = '2026-11-10';                       // primer dia del tratamiento (dia 0)
const PLAN = [                                     // tipo => [dias, hora por defecto, ajuste editable]
    'cetirizina'   => [7, '19:00', null],
    'azitromicina' => [5, '17:00', 'hora_azitromicina'],
    'pediacort'    => [5, '17:00', 'hora_pediacort'],
];
const MAX_AVISOS    = 3;
const ENTRE_AVISOS  = 600;                         // 10 min
const LAVADO_CADA   = 4 * 3600;
const LAVADO_VIGENCIA = 6 * 3600;                  // no avisar de un lavado viejo

// Misma ubicacion que usa api.php.
$cfg = require is_file(__DIR__ . '/config.php') ? __DIR__ . '/config.php' : dirname(__DIR__, 2) . '/isabella-config.php';

$db = new PDO(
    "mysql:host={$cfg['bd_host']};dbname={$cfg['bd_nombre']};charset=utf8mb4",
    $cfg['bd_usuario'],
    $cfg['bd_clave'],
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
);
$db->exec("SET time_zone = '-04:00'");

// ---------------------------------------------------------------- Web Push (VAPID, sin cifrado de contenido)

function b64u(string $s): string {
    return rtrim(strtr(base64_encode($s), '+/', '-_'), '=');
}

// OpenSSL firma en DER; JWT ES256 necesita R||S de 64 bytes.
function der_a_raw(string $der): string {
    $pos = 2;
    if (ord($der[1]) & 0x80) {
        $pos += ord($der[1]) & 0x7f;
    }
    $pos++;                                        // 0x02
    $lr = ord($der[$pos++]);
    $r  = substr($der, $pos, $lr);
    $pos += $lr + 1;                               // + 0x02
    $ls = ord($der[$pos++]);
    $s  = substr($der, $pos, $ls);
    $r  = str_pad(ltrim($r, "\0"), 32, "\0", STR_PAD_LEFT);
    $s  = str_pad(ltrim($s, "\0"), 32, "\0", STR_PAD_LEFT);
    return $r . $s;
}

function jwt_vapid(array $cfg, string $aud): string {
    $h = b64u(json_encode(['typ' => 'JWT', 'alg' => 'ES256']));
    $p = b64u(json_encode(['aud' => $aud, 'exp' => time() + 12 * 3600, 'sub' => $cfg['vapid_contacto']]));
    $clave = openssl_pkey_get_private($cfg['vapid_privada']);
    openssl_sign("$h.$p", $der, $clave, OPENSSL_ALGO_SHA256);
    return "$h.$p." . b64u(der_a_raw($der));
}

// Devuelve el codigo HTTP del servicio de push.
function enviar_push(array $cfg, string $endpoint): int {
    $u   = parse_url($endpoint);
    $aud = $u['scheme'] . '://' . $u['host'] . (isset($u['port']) ? ':' . $u['port'] : '');
    $ch  = curl_init($endpoint);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => '',
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_HTTPHEADER     => [
            'Authorization: vapid t=' . jwt_vapid($cfg, $aud) . ', k=' . $cfg['vapid_publica'],
            'TTL: 600',
            'Urgency: high',
            'Content-Length: 0',
        ],
    ]);
    curl_exec($ch);
    $codigo = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
    return $codigo;
}

function avisar_a_todos(PDO $db, array $cfg, string $motivo): void {
    foreach ($db->query('SELECT id, endpoint FROM suscripciones')->fetchAll() as $s) {
        $codigo = enviar_push($cfg, $s['endpoint']);
        echo date('H:i:s') . " push [$motivo] -> HTTP $codigo\n";
        if ($codigo === 404 || $codigo === 410) {      // telefono ya no suscrito
            $db->prepare('DELETE FROM suscripciones WHERE id = ?')->execute([$s['id']]);
        }
    }
}

// ---------------------------------------------------------------- Logica de avisos

$ahora = time();
$hoy   = date('Y-m-d');
$dia   = (int) round((strtotime($hoy) - strtotime(INICIO)) / 86400);   // 0 = primer dia

// Horas editables guardadas por la app.
$ajustes = [];
foreach ($db->query("SELECT clave, valor FROM ajustes WHERE clave NOT LIKE 'aviso:%'") as $a) {
    $ajustes[$a['clave']] = $a['valor'];
}

// Avisos ya enviados: clave => marca de tiempo del ultimo.
$avisos = [];
foreach ($db->query("SELECT clave, valor FROM ajustes WHERE clave LIKE 'aviso:%'") as $a) {
    $avisos[$a['clave']] = (int) $a['valor'];
}

function marcar(PDO $db, string $clave, int $ts): void {
    $db->prepare('INSERT INTO ajustes (clave, valor) VALUES (?, ?) ON DUPLICATE KEY UPDATE valor = VALUES(valor)')
       ->execute([$clave, (string) $ts]);
}

// Medicamentos del plan.
foreach (PLAN as $tipo => [$dias, $horaDefecto, $ajuste]) {
    if ($dia < 0 || $dia >= $dias) {
        continue;
    }
    $hora = $ajuste !== null ? ($ajustes[$ajuste] ?? $horaDefecto) : $horaDefecto;
    if ($ahora < strtotime("$hoy $hora")) {
        continue;                                  // todavia no es la hora
    }
    $q = $db->prepare('SELECT 1 FROM registros WHERE tipo = ? AND dia = ? LIMIT 1');
    $q->execute([$tipo, $dia]);
    if ($q->fetch()) {
        continue;                                  // ya fue dada
    }

    // Cuantos avisos se enviaron y cuando fue el ultimo.
    $n = 0;
    $ultimo = 0;
    for ($k = 1; $k <= MAX_AVISOS; $k++) {
        $clave = "aviso:$tipo:$dia:$k";
        if (isset($avisos[$clave])) {
            $n = $k;
            $ultimo = $avisos[$clave];
        }
    }
    if ($n >= MAX_AVISOS || ($n > 0 && $ahora - $ultimo < ENTRE_AVISOS)) {
        continue;
    }
    marcar($db, 'aviso:' . $tipo . ':' . $dia . ':' . ($n + 1), $ahora);
    avisar_a_todos($db, $cfg, $tipo);
}

// Lavado nasal: 4 h despues del ultimo registro.
$ult = $db->query("SELECT id, dado_en FROM registros WHERE tipo = 'lavado_nasal' ORDER BY dado_en DESC LIMIT 1")->fetch();
if ($ult) {
    $toca = strtotime($ult['dado_en']) + LAVADO_CADA;
    $clave = 'aviso:lavado:' . $ult['id'];
    if ($ahora >= $toca && $ahora - $toca < LAVADO_VIGENCIA && !isset($avisos[$clave])) {
        marcar($db, $clave, $ahora);
        avisar_a_todos($db, $cfg, 'lavado_nasal');
    }
}

// Limpieza: avisos de hace mas de 3 dias.
$db->prepare("DELETE FROM ajustes WHERE clave LIKE 'aviso:%' AND CAST(valor AS UNSIGNED) < ?")
   ->execute([$ahora - 3 * 86400]);
