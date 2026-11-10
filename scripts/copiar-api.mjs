// Se ejecuta despues de `vite build`: copia api/ a dist/api para que el despliegue
// desde GitHub (que solo publica dist/) incluya el PHP. Nunca copia config.php.
import { cpSync, existsSync } from 'node:fs';

if (!existsSync('dist')) throw new Error('Primero ejecuta vite build (no existe dist/)');

cpSync('api', 'dist/api', {
  recursive: true,
  filter: (origen) => !/[\\/]config\.php$/.test(origen),
});
console.log('api/ copiada a dist/api (sin config.php)');
