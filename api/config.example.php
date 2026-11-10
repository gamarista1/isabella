<?php
// Copia este archivo y completa tus datos. NO se sube a ningun repositorio.
//
// Despliegue desde GitHub (recomendado): guardalo FUERA de public_html, con este nombre:
//   /home/USUARIO/domains/TUDOMINIO/isabella-config.php
// (la carpeta que contiene a public_html). Asi un redeploy no lo borra.
// En desarrollo local puedes llamarlo api/config.php (esta en .gitignore).

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
