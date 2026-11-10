# Isabella - control de medicación

App web (PWA) muy simple para registrar la medicación de Isabella, con alarma a la hora de Venezuela (America/Caracas) y avisos push.

## Estructura
```
index.html  main.js  style.css      Frontend (Vite, JavaScript puro)
public/                             manifest, service worker e iconos de la PWA
api/api.php                         API JSON (PDO + MySQL)
api/cron.php                        Avisos push (lo ejecuta el cron cada minuto)
api/config.example.php              Plantilla de configuración
schema.sql                          Tablas para phpMyAdmin
scripts/                            vapid.mjs, iconos.mjs, copiar-api.mjs
```
`npm run build` genera `dist/` con el frontend **y** una copia de `api/` (sin `config.php`).

## Despliegue en Hostinger desde GitHub
Configuración del sitio: preset **Vite**, rama `main`, Node 22.x, directorio raíz `./`, comando `npm run build`, gestor `npm`, directorio de salida `dist`. Sin variables de entorno.

1. **hPanel > Bases de datos MySQL**: crea la base de datos, el usuario y la contraseña.
2. **phpMyAdmin**: abre la base, pestaña SQL, pega `schema.sql` y ejecuta.
3. Genera las claves de avisos en tu PC: `node scripts/vapid.mjs`.
4. Copia `api/config.example.php` a un archivo llamado **`isabella-config.php`** y completa los datos de la base, la `clave` de la app y las dos líneas VAPID.
5. **Administrador de archivos**: sube `isabella-config.php` a la carpeta que **contiene** a `public_html` (por ejemplo `/home/USUARIO/domains/TUDOMINIO/`), nunca dentro de `public_html`. Así los redeploys no lo borran ni queda público.
6. Despliega desde GitHub. El sitio y `api/` quedan en `public_html`.
7. **hPanel > Cron Jobs**: tarea cada minuto con el comando
   `php /home/USUARIO/domains/TUDOMINIO/public_html/api/cron.php`
8. En cada teléfono abre el sitio (HTTPS), escribe la clave, instala la app (Android: "Instalar app"; iPhone: Compartir > Agregar a pantalla de inicio) y toca **Activar alarma y avisos**.
9. Prueba: marca una dosis y mira que aparezca en otro teléfono; usa Deshacer; escribe una clave mala y comprueba que la vuelve a pedir; comprueba que a las 7, 8 y 9 PM (cetirizina, Pediacort y azitromicina) llega el aviso si la dosis no está marcada. Las horas son fijas y están en `main.js` y `api/cron.php`.

Alternativa manual (sin GitHub): `npm install`, `npm run build` y sube el contenido de `dist/` a `public_html`.

## Desarrollo local
```
php -S localhost:8000 -t .      # API (requiere api/config.php y MySQL local)
npm run dev                     # frontend; /api se reenvía a localhost:8000
```
Para regenerar los iconos: `node scripts/iconos.mjs`.

## Alarma y avisos
- Con la app abierta: sonido en bucle y vibración hasta marcar la dosis o silenciar 10 minutos.
- Con la app cerrada: notificación push del sistema (sonido de notificación del teléfono). En iPhone solo funciona con la app agregada a la pantalla de inicio (iOS 16.4 o superior). El ahorro de batería puede retrasar el aviso.
- No se avisa de acetaminofén (solo se da con fiebre): únicamente se muestra el contador.

## Seguridad
`config.php` e `isabella-config.php` nunca se suben al repositorio. `api/.htaccess` bloquea el acceso web a `config.php` y `cron.php`. Todas las consultas son preparadas y cada petición exige el header `X-Clave`.

Esta app organiza lo que indicó la doctora y no reemplaza sus instrucciones.
