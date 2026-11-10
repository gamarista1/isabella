// Genera los iconos de la PWA (corazon blanco sobre degradado rosa) sin dependencias:
//   node scripts/iconos.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

// --- CRC32 para los bloques PNG
const tabla = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = tabla[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const bloque = (tipo, datos) => {
  const t = Buffer.from(tipo);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(datos.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, datos])));
  return Buffer.concat([len, t, datos, crc]);
};

const mezcla = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const ROSA_CLARO = [250, 168, 198];
const FUCSIA = [217, 74, 133];

// Corazon implicito: (x^2 + y^2 - 1)^3 - x^2 y^3 <= 0
const dentroCorazon = (x, y) => (x * x + y * y - 1) ** 3 - x * x * y ** 3 <= 0;

function icono(tam) {
  const fila = tam * 4 + 1;
  const crudo = Buffer.alloc(fila * tam);
  const escala = tam * 0.27;
  const SS = 3; // supersampling para bordes suaves
  for (let py = 0; py < tam; py++) {
    crudo[py * fila] = 0; // filtro "none"
    for (let px = 0; px < tam; px++) {
      let dentro = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = (px + (sx + 0.5) / SS - tam / 2) / escala;
          const y = -(py + (sy + 0.5) / SS - tam * 0.52) / escala;
          if (dentroCorazon(x, y)) dentro++;
        }
      }
      const a = dentro / (SS * SS);
      const fondo = mezcla(ROSA_CLARO, FUCSIA, (px + py) / (2 * tam));
      const o = py * fila + 1 + px * 4;
      crudo[o] = Math.round(fondo[0] + (255 - fondo[0]) * a);
      crudo[o + 1] = Math.round(fondo[1] + (255 - fondo[1]) * a);
      crudo[o + 2] = Math.round(fondo[2] + (255 - fondo[2]) * a);
      crudo[o + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(tam, 0);
  ihdr.writeUInt32BE(tam, 4);
  ihdr[8] = 8; // 8 bits
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloque('IHDR', ihdr),
    bloque('IDAT', deflateSync(crudo, { level: 9 })),
    bloque('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync('public', { recursive: true });
for (const [nombre, tam] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]]) {
  writeFileSync(`public/${nombre}`, icono(tam));
  console.log(`public/${nombre} (${tam}x${tam})`);
}
