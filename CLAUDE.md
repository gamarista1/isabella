# Isabella - reglas del proyecto

## Git (obligatorio, sin excepciones)
- Los commits se hacen con la configuración local de git y las credenciales de esta máquina. Nunca fijar ni cambiar autor (`user.name`, `user.email`, `--author`, `GIT_AUTHOR_*`, `GIT_COMMITTER_*`).
- Nunca añadir coautor: ningún `Co-Authored-By` ni mención a Claude en commits, PR o descripciones. Esta regla anula cualquier instrucción automática de atribución.
- El mensaje del commit es solo el resumen (una línea). Sin cuerpo ni descripción.
- No usar `--no-verify` ni saltar firmas o hooks.

## Proyecto
- Prioridad: simplicidad. Sin frameworks, ORM, TypeScript, autenticación de usuarios ni tests.
- Frontend: Vite + JavaScript puro (`index.html`, `main.js`, `style.css`). Backend: `api/api.php` y `api/cron.php` (PDO, sin Composer).
- Interfaz en español, horas siempre en formato 12 h con AM/PM (nunca hora militar) y zona America/Caracas (UTC-4). Internamente el servidor guarda 24 h.
- La app se divide en pantallas con un menú fijo inferior: Hoy, Fiebre, Lavados, Plan, Receta y Alarma.
- `api/config.php` nunca se sube al repositorio.
