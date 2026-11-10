// Genera las claves VAPID para las notificaciones push (se ejecuta una sola vez):
//   node scripts/vapid.mjs
// Copia las dos lineas que imprime dentro de api/config.php.
import { generateKeyPairSync } from 'node:crypto';

const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });

const jwk = publicKey.export({ format: 'jwk' });
const punto = Buffer.concat([
  Buffer.from([0x04]),
  Buffer.from(jwk.x, 'base64url'),
  Buffer.from(jwk.y, 'base64url'),
]);

const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }).trim().replace(/\n/g, '\\n');

console.log('Pega estas lineas en api/config.php:\n');
console.log(`    'vapid_publica'  => '${punto.toString('base64url')}',`);
console.log(`    'vapid_privada'  => "${pem}\\n",`);
console.log('\nGuarda la clave privada en secreto. No la subas a ningun repositorio.');
