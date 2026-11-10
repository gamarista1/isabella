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
scripts/vapid.mjs  scripts/iconos.mjs
```

## Despliegue en Hostinger
1. **hPanel > Bases de datos MySQL**: crea la base de datos, el usuario y la contraseña.
2. **phpMyAdmin**: abre la base, pestaña SQL, pega el contenido de `schema.sql` y ejecuta.
3. Genera las claves de avisos: `node scripts/vapid.mjs`. Copia `api/config.example.php` a `api/config.php` y completa los datos de la base, la `clave` de la app y las dos líneas VAPID.
4. `npm install` y `npm run build`.
5. **Administrador de archivos**: sube el **contenido** de `dist/` a `public_html` y la carpeta `api/` (con su `config.php`) a `public_html/api`.
6. **hPanel > Cron Jobs**: tarea cada minuto con el comando
   `php /home/USUARIO/domains/TUDOMINIO/public_html/api/cron.php`
7. En cada teléfono abre el sitio (con HTTPS), escribe la clave, instala la app (Android: "Instalar app"; iPhone: Compartir > Agregar a pantalla de inicio) y toca **Activar alarma y avisos**.
8. Prueba: marca una dosis y mira que aparezca en otro teléfono; usa Deshacer; escribe una clave mala y comprueba que la vuelve a pedir; pon la hora de azitromicina unos minutos adelante y espera el aviso.

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
`api/config.php` está en `.gitignore`. `api/.htaccess` bloquea el acceso web a `config.php` y `cron.php`. Todas las consultas son preparadas y cada petición exige el header `X-Clave`.

Esta app organiza lo que indicó la doctora y no reemplaza sus instrucciones.
