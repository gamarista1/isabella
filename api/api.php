<?php
// Isabella - API de medicacion. Un solo archivo, PDO, sin dependencias.
//
//   GET     api.php                    -> registros de los ultimos 10 dias + ajustes
//   POST    api.php                    -> crea registro  {tipo, dia?, temperatura?}
//   DELETE  api.php?id=N               -> borra un registro
//   POST    api.php?r=ajuste           -> {clave, valor}  (hora de azitromicina / pediacort)
//   POST    api.php?r=suscripcion      -> guarda suscripcion push (PushSubscription.toJSON())
//   DELETE  api.php?r=suscripcion      -> {endpoint}
//
// Todas las peticiones llevan el header X-Clave.

date_default_timezone_set('America/Caracas');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

// Dias de tratamiento por medicamento del plan (dia 0 = primer dia).
const PLAN  = ['cetirizina' => 7, 'azitromicina' => 5, 'pediacort' => 5];
const TIPOS = ['cetirizina', 'azitromicina', 'pediacort', 'acetaminofen', 'lavado_nasal'];
const AJUSTES_EDITABLES = ['hora_azitromicina', 'hora_pediacort'];

function salir(int $codigo, array $datos): void {
    http_response_code($codigo);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    exit;
}

// Nunca mostrar detalles internos (PDO, rutas) al cliente.
set_exception_handler(function (Throwable $e) {
    error_log('[isabella] ' . $e->getMessage());
    salir(500, ['error' => 'Error del servidor']);
});

// config.php junto a este archivo o, mejor, fuera de public_html (no se borra al redesplegar).
$cfg = require is_file(__DIR__ . '/config.php') ? __DIR__ . '/config.php' : dirname(__DIR__, 2) . '/isabella-config.php';

// Proteccion simple por clave compartida.
if (!hash_equals((string) $cfg['clave'], (string) ($_SERVER['HTTP_X_CLAVE'] ?? ''))) {
    salir(401, ['error' => 'Clave incorrecta']);
}

$db = new PDO(
    "mysql:host={$cfg['bd_host']};dbname={$cfg['bd_nombre']};charset=utf8mb4",
    $cfg['bd_usuario'],
    $cfg['bd_clave'],
    [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]
);
// Venezuela es UTC-4 todo el anio (sin horario de verano): evita depender de tablas de zonas del hosting.
$db->exec("SET time_zone = '-04:00'");

$metodo = $_SERVER['REQUEST_METHOD'];
$r      = $_GET['r'] ?? 'registro';
$in     = json_decode(file_get_contents('php://input') ?: '', true);
if (!is_array($in)) {
    $in = [];
}

function formatear(array $f): array {
    return [
        'id'          => (int) $f['id'],
        'tipo'        => $f['tipo'],
        'dado_en'     => date('c', strtotime($f['dado_en'])),   // ISO con -04:00
        'dia'         => $f['dia'] === null ? null : (int) $f['dia'],
        'temperatura' => $f['temperatura'] === null ? null : (float) $f['temperatura'],
    ];
}

// ---------------------------------------------------------------- GET
if ($metodo === 'GET') {
    $filas = $db->query(
        'SELECT id, tipo, dado_en, dia, temperatura FROM registros
         WHERE dado_en >= NOW() - INTERVAL 10 DAY ORDER BY dado_en'
    )->fetchAll();

    $ajustes = [];
    foreach ($db->query("SELECT clave, valor FROM ajustes WHERE clave NOT LIKE 'aviso:%'") as $a) {
        $ajustes[$a['clave']] = $a['valor'];
    }

    salir(200, [
        'ahora'         => date('c'),
        'registros'     => array_map('formatear', $filas),
        'ajustes'       => (object) $ajustes,
        'vapid_publica' => $cfg['vapid_publica'] ?? '',
    ]);
}

// ---------------------------------------------------------------- POST
if ($metodo === 'POST') {
    // Hora de azitromicina / pediacort (compartida entre telefonos).
    if ($r === 'ajuste') {
        $clave = $in['clave'] ?? '';
        $valor = $in['valor'] ?? '';
        if (!in_array($clave, AJUSTES_EDITABLES, true) || !preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', (string) $valor)) {
            salir(400, ['error' => 'Ajuste no valido']);
        }
        $q = $db->prepare('INSERT INTO ajustes (clave, valor) VALUES (?, ?) ON DUPLICATE KEY UPDATE valor = VALUES(valor)');
        $q->execute([$clave, $valor]);
        // Si cambia la hora, los avisos push ya enviados de ese medicamento dejan de valer.
        $tipo = substr($clave, strlen('hora_'));
        $q = $db->prepare('DELETE FROM ajustes WHERE clave LIKE ?');
        $q->execute(['aviso:' . $tipo . ':%']);
        salir(200, ['ok' => true]);
    }

    // Suscripcion a notificaciones push.
    if ($r === 'suscripcion') {
        $endpoint = (string) ($in['endpoint'] ?? '');
        $p256dh   = (string) ($in['keys']['p256dh'] ?? '');
        $auth     = (string) ($in['keys']['auth'] ?? '');
        if (strncmp($endpoint, 'https://', 8) !== 0 || $p256dh === '' || $auth === '' || strlen($endpoint) > 2000) {
            salir(400, ['error' => 'Suscripcion no valida']);
        }
        $q = $db->prepare(
            'INSERT INTO suscripciones (hash, endpoint, p256dh, auth, creado) VALUES (?, ?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE p256dh = VALUES(p256dh), auth = VALUES(auth)'
        );
        $q->execute([hash('sha256', $endpoint), $endpoint, $p256dh, $auth]);
        salir(200, ['ok' => true]);
    }

    // Registro de una dosis.
    $tipo = $in['tipo'] ?? '';
    if (!in_array($tipo, TIPOS, true)) {
        salir(400, ['error' => 'Tipo no valido']);
    }

    $dia  = null;
    $temp = null;

    if (isset(PLAN[$tipo])) {
        $dia = filter_var($in['dia'] ?? null, FILTER_VALIDATE_INT);
        if ($dia === false || $dia < 0 || $dia >= PLAN[$tipo]) {
            salir(400, ['error' => 'Dia no valido']);
        }
        // Dos telefonos tocando a la vez: el segundo no duplica.
        $q = $db->prepare('SELECT id FROM registros WHERE tipo = ? AND dia = ? LIMIT 1');
        $q->execute([$tipo, $dia]);
        if ($q->fetch()) {
            salir(200, ['ok' => true, 'repetido' => true]);
        }
    } elseif ($tipo === 'acetaminofen' && isset($in['temperatura']) && $in['temperatura'] !== '') {
        $t = filter_var($in['temperatura'], FILTER_VALIDATE_FLOAT);
        if ($t === false || $t < 30 || $t > 43) {
            salir(400, ['error' => 'Temperatura no valida']);
        }
        $temp = round($t, 1);
    }

    $q = $db->prepare('INSERT INTO registros (tipo, dado_en, dia, temperatura) VALUES (?, NOW(), ?, ?)');
    $q->execute([$tipo, $dia, $temp]);

    $q = $db->prepare('SELECT id, tipo, dado_en, dia, temperatura FROM registros WHERE id = ?');
    $q->execute([$db->lastInsertId()]);
    salir(201, formatear($q->fetch()));
}

// ---------------------------------------------------------------- DELETE
if ($metodo === 'DELETE') {
    if ($r === 'suscripcion') {
        $q = $db->prepare('DELETE FROM suscripciones WHERE hash = ?');
        $q->execute([hash('sha256', (string) ($in['endpoint'] ?? ''))]);
        salir(200, ['ok' => true]);
    }

    $id = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT);
    if ($id === false || $id < 1) {
        salir(400, ['error' => 'id no valido']);
    }
    $q = $db->prepare('DELETE FROM registros WHERE id = ?');
    $q->execute([$id]);
    salir(200, ['ok' => true]);
}

salir(405, ['error' => 'Metodo no permitido']);
