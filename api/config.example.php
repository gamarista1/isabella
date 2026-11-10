<?php
// Copia este archivo como config.php y completa tus datos.
// config.php NO se sube a ningun repositorio (esta en .gitignore).

return [
    // MySQL de Hostinger (hPanel > Bases de datos)
    'bd_host'    => 'localhost',
    'bd_nombre'  => 'u123456789_isabella',
    'bd_usuario' => 'u123456789_isabella',
    'bd_clave'   => 'contrasena-de-la-base-de-datos',

    // Clave que se escribe una vez en cada telefono. Larga y facil de dictar.
    'clave' => 'cambia-esta-clave',

    // Notificaciones push: genera estos valores con `node scripts/vapid.mjs`
    'vapid_publica'  => '',
    'vapid_privada'  => '',   // PEM, en una sola linea con \n entre comillas dobles
    'vapid_contacto' => 'mailto:tu@correo.com',
];
