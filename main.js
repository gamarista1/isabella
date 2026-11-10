import './style.css';

/* =====================================================================
   Isabella - control de medicacion
   Una sola pantalla. Todo se dibuja de nuevo desde `estado` en cada cambio.
   ===================================================================== */

/* ---------- Constantes de la receta (no van en la base de datos) ---------- */
const API = 'api/api.php';
const TZ = 'America/Caracas';
const OFFSET = '-04:00';             // Venezuela: UTC-4 todo el anio
const INICIO = '2026-11-10';         // primer dia del tratamiento (dia 0)
const HORAS_ENTRE_DOSIS = 4;         // acetaminofen y lavados
const TOPE_24H = 5;                  // dosis de acetaminofen en 24 h
const SILENCIO_MIN = 10;
const HORA = 3600e3;

const PLAN = {
  cetirizina: {
    nombre: 'Cetirizina', corto: 'Cetirizina', icono: 'frasco', dias: 7,
    ml: '2,5', mg: '2,5 mg', frasco: 'Genven 1 mg/mL', hora: '19:00', ajuste: null,
  },
  azitromicina: {
    nombre: 'Azitromicina', corto: 'Azitromicina', icono: 'gota', dias: 5,
    ml: '2', mg: '80 mg', frasco: '200 mg/5 mL', hora: '21:00', ajuste: 'hora_azitromicina',
  },
  pediacort: {
    nombre: 'Pediacort (prednisolona)', corto: 'Pediacort', icono: 'pildora', dias: 5,
    ml: '2,5', mg: '7,5 mg', frasco: '3 mg/mL', hora: '20:00', ajuste: 'hora_pediacort',
  },
};
const ORDEN = ['cetirizina', 'pediacort', 'azitromicina'];   // por hora: 7, 8 y 9 PM

// Funcion (no constante) porque usa h12(), que se define mas abajo.
const recetaFilas = () => [
  ['Cetirizina', 'Genven 1 mg/mL', '2,5 mL (2,5 mg)', `1 vez al día, a las ${h12(PLAN.cetirizina.hora)}, 7 días`],
  ['Pediacort (prednisolona)', '3 mg/mL', '2,5 mL (7,5 mg)', `1 vez al día, a las ${h12(PLAN.pediacort.hora)}, 5 días`],
  ['Azitromicina', '200 mg/5 mL', '2 mL (80 mg)', `1 vez al día, a las ${h12(PLAN.azitromicina.hora)}, 5 días`],
  ['Acetaminofén', '120 mg/5 mL', '5 mL (120 mg)', 'Solo si la temperatura es 38,5 °C o más, cada 4 a 6 horas'],
  ['Lavados nasales', 'Solución salina 0,9 %', '5 mL por fosa nasal', 'Cada 4 horas o con congestión'],
];

const SENALES = [
  'Respiración de 50 o más por minuto (contar un minuto completo con la bebé tranquila).',
  'Se le hunden las costillas o el cuello al respirar, o hace un quejido.',
  'Labios o cara azulados.',
  'Está muy dormida, floja o cuesta despertarla.',
  'No toma líquidos, vomita todo o pasan 8 horas sin pañal mojado.',
  'La fiebre sigue después de 48 a 72 horas de tratamiento, o sube a pesar del acetaminofén.',
  'Dosis doble o equivocada: llamar a la doctora o ir a emergencia con los frascos.',
];

const POR_CONFIRMAR = [
  'Duración de la azitromicina: la receta dice 5 días, pero el número estaba sobrescrito. Se usa 5 hasta confirmar.',
  'Concentración del Pediacort: las dosis suponen 3 mg/mL. El frasco debe decir 3 mg/mL.',
  'Hora del Pediacort: se da a las 8:00 PM por orden de horario. Los corticoides suelen darse en la mañana, con comida; preguntar a la doctora si prefiere otra hora.',
  'Máximo diario de acetaminofén: la receta no lo indica.',
];

/* ---------- Iconos SVG ---------- */
const LINEA = {
  reloj: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  campana: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21a2 2 0 0 0 4 0"/>',
  silencio: '<path d="M6 16v-5a6 6 0 0 1 9-5.2"/><path d="M18 11v5l2 2H6"/><path d="M10 21a2 2 0 0 0 4 0"/><path d="M4 4l16 16"/>',
  termometro: '<path d="M10 14.5V5a2 2 0 0 1 4 0v9.5a4 4 0 1 1-4 0z"/><path d="M12 9v7"/>',
  gota: '<path d="M12 3c3.2 4 6 7 6 10.5a6 6 0 0 1-12 0C6 10 8.8 7 12 3z"/>',
  frasco: '<path d="M9 3h6M10 3v3L7.5 9v11a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V9L14 6V3"/><path d="M7.5 13h9"/>',
  pildora: '<g transform="rotate(-40 12 12)"><rect x="3" y="8.5" width="18" height="7" rx="3.5"/><path d="M12 8.5v7"/></g>',
  lavado: '<path d="M12 3c2.4 3 4.5 5.3 4.5 8a4.5 4.5 0 0 1-9 0c0-2.7 2.1-5 4.5-8z"/><path d="M5 19.5c2 1.2 4.3 1.5 7 1.5s5-.3 7-1.5"/>',
  check: '<path class="trazo" d="M5 12.5l4.5 4.5L19 7.5"/>',
  sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4"/>',
  calendario: '<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  receta: '<rect x="5" y="4" width="14" height="17" rx="3"/><path d="M9 4h6v3H9zM9 12h6M9 16h4"/>',
  deshacer: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-4"/>',
  alerta: '<path d="M12 3.5l9.5 16.5h-19z"/><path d="M12 10v4.5M12 17.5v.01"/>',
  editar: '<path d="M4 20l1-4L16.5 4.5a2 2 0 0 1 3 3L8 19z"/>',
};
const RELLENO = {
  corazon: '<path d="M12 20.5s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.9c0 5.4-7.5 10-7.5 10z"/>',
  estrella: '<path d="M12 2.5l2 6.5 6.5 2-6.5 2-2 6.5-2-6.5-6.5-2 6.5-2z"/>',
  flor: '<circle cx="12" cy="5.5" r="3.2"/><circle cx="18.5" cy="10.2" r="3.2"/><circle cx="16" cy="18" r="3.2"/><circle cx="8" cy="18" r="3.2"/><circle cx="5.5" cy="10.2" r="3.2"/><circle cx="12" cy="12" r="2.6" fill="#ffe08a"/>',
  mono: '<path d="M12 12L3.5 6.5v11zM12 12l8.5-5.5v11z"/><circle cx="12" cy="12" r="2.6"/>',
};
function ico(nombre, extra = '') {
  const l = LINEA[nombre];
  const cuerpo = l || RELLENO[nombre];
  return `<svg class="ico${l ? ' l' : ''} ${extra}" viewBox="0 0 24 24" aria-hidden="true">${cuerpo}</svg>`;
}

const ILUSTRACION = `
<svg class="cab-deco" viewBox="0 0 360 170" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <g class="nube"><circle cx="34" cy="62" r="13"/><circle cx="52" cy="54" r="17"/><circle cx="72" cy="62" r="12"/><rect x="34" y="60" width="38" height="15" rx="7"/></g>
  <g class="nube"><circle cx="292" cy="128" r="10"/><circle cx="306" cy="121" r="13"/><circle cx="322" cy="128" r="9"/><rect x="292" y="126" width="30" height="12" rx="6"/></g>
  <path class="luna" transform="translate(296 14) scale(1.5)" d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/>
  <path class="est" transform="translate(96 16) scale(1)" d="M12 2.5l2 6.5 6.5 2-6.5 2-2 6.5-2-6.5-6.5-2 6.5-2z"/>
  <path class="est" transform="translate(250 70) scale(.7)" d="M12 2.5l2 6.5 6.5 2-6.5 2-2 6.5-2-6.5-6.5-2 6.5-2z"/>
  <path class="est" transform="translate(16 110) scale(.6)" d="M12 2.5l2 6.5 6.5 2-6.5 2-2 6.5-2-6.5-6.5-2 6.5-2z"/>
  <path class="est" transform="translate(330 60) scale(.5)" d="M12 2.5l2 6.5 6.5 2-6.5 2-2 6.5-2-6.5-6.5-2 6.5-2z"/>
  <path class="cor" transform="translate(60 100) scale(.9)" d="M12 20.5s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.9c0 5.4-7.5 10-7.5 10z"/>
  <path class="cor" transform="translate(268 26) scale(.7)" d="M12 20.5s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.9c0 5.4-7.5 10-7.5 10z"/>
  <path class="cor" transform="translate(200 120) scale(.6)" d="M12 20.5s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.9c0 5.4-7.5 10-7.5 10z"/>
</svg>`;

const OLA = `<svg class="ola" viewBox="0 0 400 26" preserveAspectRatio="none" aria-hidden="true"><path d="M0 14Q25 0 50 14T100 14T150 14T200 14T250 14T300 14T350 14T400 14V26H0z"/></svg>`;

/* ---------- Estado ---------- */
const $app = document.getElementById('app');
const estado = {
  registros: [],
  ajustes: {},
  vapid: '',
  skew: 0,               // diferencia entre el reloj del servidor y el del telefono
  cargado: false,
  error: '',
  mensaje: '',
  pantalla: 'hoy',       // hoy | fiebre | lavados | plan | receta | alarma (menu inferior)
  primera: true,         // animacion de entrada al abrir la app o cambiar de pantalla
  recien: null,          // clave del ultimo elemento marcado (para animarlo)
  silenciadas: {},       // clave -> hasta que momento (ms)
  firmaDatos: '',
  firmaVista: '',
};
let ocupado = false;

const ahora = () => Date.now() + estado.skew;

/* ---------- Fechas y horas (formato AM/PM, hora de Venezuela) ---------- */
const pad = (n) => String(n).padStart(2, '0');
const f24 = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: TZ });
const fDia = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: TZ });
const fLarga = new Intl.DateTimeFormat('es-VE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ });
// "17:05" (24 h, formato interno) <-> {h: 5, m: 5, ap: 'PM'}. El servidor guarda siempre 24 h.
function a12(v24) {
  const [H, m] = v24.split(':').map(Number);
  return { h: H % 12 || 12, m, ap: H >= 12 ? 'PM' : 'AM' };
}
const a24 = (h, m, ap) => `${pad((Number(h) % 12) + (ap === 'PM' ? 12 : 0))}:${m}`;
function h12(v24) {
  const { h, m, ap } = a12(v24);
  return `${h}:${pad(m)} ${ap}`;
}
const hhmm = (ms) => h12(f24.format(ms));                          // "4:30 PM", hora de Caracas
const hoyStr = () => fDia.format(ahora());                       // AAAA-MM-DD
const diasEntre = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 864e5);
const diaActual = () => diasEntre(INICIO, hoyStr());             // 0 = primer dia
function fechaDia(n) {
  const d = new Date(Date.parse(INICIO + 'T00:00:00Z') + n * 864e5);
  return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}`;
}
function haceTexto(ms) {
  const min = Math.max(0, Math.round((ahora() - ms) / 60e3));
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  return `hace ${h} h ${pad(min % 60)} min`;
}
const coma = (n) => String(n).replace('.', ',');

/* ---------- Datos ---------- */
const de = (tipo) => estado.registros.filter((r) => r.tipo === tipo);
const registro = (tipo, dia) => estado.registros.find((r) => r.tipo === tipo && r.dia === dia);
const ultimo = (tipo) => de(tipo).at(-1);

function horaDe(tipo) {
  const m = PLAN[tipo];
  const v = m.ajuste && estado.ajustes[m.ajuste];
  return /^\d\d:\d\d$/.test(v || '') ? v : m.hora;
}
const programadaMs = (tipo, fecha) => Date.parse(`${fecha}T${horaDe(tipo)}:00${OFFSET}`);

/* ---------- Dialogo propio (en lugar de alert/confirm/prompt) ---------- */
function dialogo({ titulo, texto, ok = 'Aceptar', cancelar = 'Cancelar', input = null }) {
  return new Promise((resolve) => {
    const d = document.createElement('dialog');
    d.className = 'dlg';
    // El boton principal va primero en el DOM (Enter lo activa); el CSS lo muestra a la derecha.
    d.innerHTML = `<form method="dialog">
      <h3>${titulo}</h3><p>${texto}</p>
      ${input ? `<input class="campo" name="v" type="${input.tipo || 'text'}" autocomplete="off" placeholder="${input.ph || ''}">` : ''}
      <div class="dlg-bot"><button class="btn" value="si">${ok}</button>${cancelar ? `<button class="btn fantasma" value="no">${cancelar}</button>` : ''}</div>
    </form>`;
    d.addEventListener('close', () => {
      const si = d.returnValue === 'si';
      const valor = input ? d.querySelector('input').value.trim() : '';
      d.remove();
      resolve(input ? (si ? valor : null) : si);
    });
    document.body.appendChild(d);
    d.showModal();
  });
}
const confirmar = (titulo, texto, ok = 'Sí, registrar') => dialogo({ titulo, texto, ok });

/* ---------- API ---------- */
let esperandoClave = null;
function obtenerClave(incorrecta) {
  const guardada = localStorage.getItem('clave');
  if (guardada && !incorrecta) return Promise.resolve(guardada);
  if (!esperandoClave) {
    esperandoClave = (async () => {
      let v = '';
      while (!v) {
        v = await dialogo({
          titulo: 'Clave de acceso',
          texto: incorrecta ? 'La clave no es correcta. Escríbela de nuevo.' : 'Escribe la clave de la app. Solo se pide una vez en este teléfono.',
          input: { tipo: 'password', ph: 'Clave' },
          ok: 'Entrar',
          cancelar: null,
        });
      }
      localStorage.setItem('clave', v);
      return v;
    })().finally(() => { esperandoClave = null; });
  }
  return esperandoClave;
}

async function api(metodo, query = '', cuerpo) {
  for (let intento = 0; ; intento++) {
    const clave = await obtenerClave(intento > 0);
    const res = await fetch(API + query, {
      method: metodo,
      headers: { 'X-Clave': clave, 'Content-Type': 'application/json' },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
      cache: 'no-store',
    });
    if (res.status === 401) {                   // clave mala: se vuelve a pedir
      localStorage.removeItem('clave');
      continue;
    }
    const datos = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(datos.error || `Error ${res.status}`);
    return datos;
  }
}

async function cargar() {
  const antes = estado.firmaDatos + estado.error;
  try {
    const d = await api('GET');
    if (!Array.isArray(d.registros)) throw new Error('Respuesta inesperada del servidor');
    estado.skew = Date.parse(d.ahora) - Date.now();
    estado.vapid = d.vapid_publica || '';
    estado.registros = d.registros.map((r) => ({ ...r, t: Date.parse(r.dado_en) }));
    estado.ajustes = d.ajustes || {};
    estado.firmaDatos = JSON.stringify([d.registros, d.ajustes]);
    estado.cargado = true;
    estado.error = '';
  } catch (e) {
    estado.error = estado.cargado ? 'Sin conexión con el servidor. Se muestran los últimos datos.' : e.message;
  }
  if (antes !== estado.firmaDatos + estado.error || estado.recien) refrescar();
}

/* ---------- Alarma ---------- */
function pendientes() {
  if (!estado.cargado) return [];
  const lista = [];
  const hoy = hoyStr();
  const d = diaActual();
  const t = ahora();
  for (const tipo of ORDEN) {
    const m = PLAN[tipo];
    if (d < 0 || d >= m.dias || registro(tipo, d)) continue;
    if (t >= programadaMs(tipo, hoy)) {
      lista.push({ clave: `${tipo}:${d}`, tipo, dia: d, titulo: m.nombre, detalle: `${m.ml} mL` });
    }
  }
  const l = ultimo('lavado_nasal');
  if (l) {
    const toca = l.t + HORAS_ENTRE_DOSIS * HORA;
    if (t >= toca && t - toca < 6 * HORA) {
      lista.push({ clave: `lavado:${l.id}`, tipo: 'lavado_nasal', titulo: 'Lavado nasal', detalle: '5 mL por fosa nasal' });
    }
  }
  return lista;
}
const sonando = () => pendientes().filter((p) => !(estado.silenciadas[p.clave] > ahora()));

let ctx = null;
let timerSonido = null;
function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ctx = new AC();
  }
  if (ctx && ctx.state === 'suspended') ctx.resume();
  return ctx;
}
// Campanita suave de tres notas (mi, sol, do) + vibracion.
function pitido() {
  if (ctx && ctx.state === 'running') {
    [659.25, 783.99, 1046.5].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const t0 = ctx.currentTime + i * 0.28;
      o.type = 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.35, t0 + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.9);
      o.connect(g).connect(ctx.destination);
      o.start(t0);
      o.stop(t0 + 1);
    });
  }
  navigator.vibrate?.([250, 120, 250]);
}
function sonar(si) {
  if (si && !timerSonido) {
    pitido();
    timerSonido = setInterval(pitido, 3000);
  } else if (!si && timerSonido) {
    clearInterval(timerSonido);
    timerSonido = null;
  }
}

/* ---------- Avisos push (app cerrada) ---------- */
const hayPush = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const avisosActivos = () => hayPush() && Notification.permission === 'granted' && localStorage.getItem('avisos') === '1';
const esIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent);
const instalada = () => navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;

function aBytes(b64u) {
  const s = atob((b64u + '='.repeat((4 - (b64u.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

async function suscribir() {
  const reg = await navigator.serviceWorker.register('sw.js');
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: aBytes(estado.vapid) });
  await api('POST', '?r=suscripcion', sub.toJSON());
}

async function activarAvisos() {
  audio();
  pitido();                                              // prueba de sonido
  if (!hayPush()) {
    if (esIOS() && !instalada()) throw new Error('En iPhone, primero agrega la app a la pantalla de inicio (Compartir > Agregar a pantalla de inicio).');
    throw new Error('Este navegador no permite avisos con la app cerrada. La alarma sonará con la app abierta.');
  }
  if (!estado.vapid) throw new Error('Los avisos con la app cerrada no están configurados en el servidor.');
  if ((await Notification.requestPermission()) !== 'granted') throw new Error('Permiso de notificaciones denegado. Actívalo en los ajustes del navegador.');
  await suscribir();
  localStorage.setItem('avisos', '1');
  refrescar();
}

/* ---------- Vistas ---------- */
function seccion(i, html) {
  return `<section class="${estado.primera ? 'entra' : ''}" style="--i:${i}">${html}</section>`;
}
const titulo = (texto, icono = 'flor') => `<h2 class="titulo">${ico(icono)}${texto}</h2>`;

const PANTALLAS = [
  ['hoy', 'Hoy', 'sol'],
  ['fiebre', 'Fiebre', 'termometro'],
  ['lavados', 'Lavados', 'lavado'],
  ['plan', 'Plan', 'calendario'],
  ['receta', 'Receta', 'receta'],
  ['alarma', 'Alarma', 'alerta'],
];
const TITULOS = {
  hoy: 'Isabella', fiebre: 'Fiebre y acetaminofén', lavados: 'Lavados nasales',
  plan: 'Plan de los días', receta: 'Receta', alarma: 'Señales de alarma',
};

function vistaCabecera() {
  const hoy = estado.pantalla === 'hoy';
  const t = ahora();
  return `<header class="cab${hoy ? '' : ' compacta'}">${ILUSTRACION}
    <p class="cab-fecha">${fLarga.format(t)} · ${hhmm(t)}</p>
    <h1>${TITULOS[estado.pantalla]}</h1>
    <p class="cab-sub">${hoy ? '' : 'Isabella · '}11 meses · 8,6 kg · Hora de Venezuela</p>${OLA}</header>`;
}

// Menu fijo inferior. Un punto rojo avisa de dosis pendiente (Hoy) o tope de acetaminofen (Fiebre).
function vistaTabs() {
  const pendiente = pendientes().length > 0;
  const tope = de('acetaminofen').filter((r) => r.t > ahora() - 24 * HORA).length >= TOPE_24H;
  const items = PANTALLAS.map(([id, nombre, icono]) => {
    const punto = (id === 'hoy' && pendiente) || (id === 'fiebre' && tope) ? '<i class="punto" aria-label="Pendiente"></i>' : '';
    return `<a class="tab" href="#${id}"${id === estado.pantalla ? ' aria-current="page"' : ''}>${ico(icono)}<span>${nombre}</span>${punto}</a>`;
  }).join('');
  return `<nav class="tabs${estado.primera ? ' cambio' : ''}" aria-label="Secciones"><div class="tabs-in">${items}</div></nav>`;
}

function vistaAlarma() {
  const lista = pendientes();
  if (!lista.length) return '';
  const suena = lista.some((p) => !(estado.silenciadas[p.clave] > ahora()));
  const sinSonido = suena && (!ctx || ctx.state !== 'running');
  // Fuera de "Hoy" el aviso es una franja corta que lleva a Hoy.
  if (estado.pantalla !== 'hoy') {
    return `<div class="alarma corta${suena ? ' suena' : ''}" role="alert">
      <div class="alarma-cab">${ico('campana', 'campana')}<strong>Es hora: ${lista.map((p) => p.titulo.split(' (')[0]).join(', ')}</strong></div>
      <div class="alarma-bot"><a class="btn mini claro" href="#hoy">Ir a Hoy</a>${suena ? `<button class="btn mini claro" data-accion="silenciar">${ico('silencio')}Silenciar</button>` : ''}</div>
    </div>`;
  }
  const filas = lista.map((p) => {
    const lav = p.tipo === 'lavado_nasal';
    return `<li><span>${p.titulo} · ${p.detalle}</span>
      <button class="btn mini claro" data-accion="${lav ? 'lavado' : 'dar'}" data-tipo="${p.tipo}" data-dia="${p.dia ?? ''}">${lav ? 'Registrar' : 'Marcar como dada'}</button></li>`;
  }).join('');
  return `<div class="alarma${suena ? ' suena' : ''}" role="alert">
    <div class="alarma-cab">${ico('campana', 'campana')}<strong>Es hora de la medicación</strong></div>
    <ul>${filas}</ul>
    ${suena ? `<button class="btn claro" data-accion="silenciar">${ico('silencio')}Silenciar ${SILENCIO_MIN} min</button>` : ''}
    ${sinSonido ? '<p class="nota">Toca la pantalla para activar el sonido.</p>' : ''}
  </div>`;
}

function vistaPorConfirmar() {
  return `<div class="confirmar"><h2>${ico('alerta')}Confirmar con la doctora</h2>
    <ol>${POR_CONFIRMAR.map((t) => `<li>${t}</li>`).join('')}</ol></div>`;
}

function vistaAvisos() {
  if (avisosActivos()) {
    return `<div class="avisos">${ico('campana')}<p>Alarma y avisos activos</p>
      <button class="btn mini fantasma" data-accion="probar">Probar sonido</button></div>`;
  }
  const nota = esIOS() && !instalada()
    ? 'En iPhone, primero agrega la app a la pantalla de inicio y ábrela desde ahí.'
    : 'Suena una alarma cuando toca la medicina, también con la app cerrada.';
  return `<div class="avisos grande">${ico('campana')}<p>${nota}</p>
    <button class="btn" data-accion="avisos">Activar alarma y avisos</button></div>`;
}

function selectorHora(ajuste, valor) {
  const { h, m, ap } = a12(valor);
  const optH = Array.from({ length: 12 }, (_, i) => `<option${i + 1 === h ? ' selected' : ''}>${i + 1}</option>`).join('');
  const mins = [...new Set(Array.from({ length: 12 }, (_, i) => pad(i * 5)).concat(pad(m)))].sort();
  const optM = mins.map((x) => `<option${x === pad(m) ? ' selected' : ''}>${x}</option>`).join('');
  const optA = ['AM', 'PM'].map((x) => `<option${x === ap ? ' selected' : ''}>${x}</option>`).join('');
  return `<span class="hora-sel" data-ajuste="${ajuste}"><select aria-label="Hora" data-parte="h">${optH}</select>:<select aria-label="Minutos" data-parte="m">${optM}</select><select aria-label="AM o PM" data-parte="ap">${optA}</select></span>`;
}

function corazones(tipo, d) {
  const m = PLAN[tipo];
  const items = Array.from({ length: m.dias }, (_, i) => (
    registro(tipo, i) ? ico('corazon') : ico('corazon', `vacio${i === d ? ' actual' : ''}`)
  )).join('');
  const hechos = Array.from({ length: m.dias }, (_, i) => i).filter((i) => registro(tipo, i)).length;
  return `<div class="progreso" role="img" aria-label="${hechos} de ${m.dias} días dados">${items}</div>`;
}

function tarjetaMed(tipo, d) {
  const m = PLAN[tipo];
  const activo = d >= 0 && d < m.dias;
  const reg = activo ? registro(tipo, d) : null;
  const chip = activo ? `Día ${d + 1} de ${m.dias}` : d < 0 ? `Empieza el ${fechaDia(0)}` : 'Tratamiento terminado';
  const recien = estado.recien === `${tipo}:${d}` ? ' recien' : '';
  const hora = m.ajuste
    ? `${ico('reloj')}${selectorHora(m.ajuste, horaDe(tipo))}<small>hora editable</small>`
    : `${ico('reloj')}<b>${h12(horaDe(tipo))}</b><small>hora programada</small>`;

  let accion = '';
  if (activo && reg) {
    accion = `<p class="dada-a">${ico('check', 'l')}Dada a las ${hhmm(reg.t)}</p>
      <button class="btn fantasma" data-accion="deshacer" data-id="${reg.id}">${ico('deshacer')}Deshacer</button>`;
  } else if (activo) {
    accion = `<button class="btn" data-accion="dar" data-tipo="${tipo}" data-dia="${d}">Marcar como dada</button>`;
  } else {
    accion = `<p class="estado-tratamiento">${chip}</p>`;
  }

  return `<article class="tarjeta${reg ? ' hecha' : ''}${recien}" data-clave="${tipo}:${d}">
    ${ico('mono', 'mono')}
    <div class="med-cab"><span class="med-ico">${ico(m.icono)}</span>
      <div><h3>${m.nombre}</h3><p class="frasco">${m.frasco}</p></div>
      ${activo ? `<span class="chip">${chip}</span>` : ''}</div>
    <div class="dosis"><span class="ml">${m.ml}</span><span class="u">mL</span><span class="mg">(${m.mg})</span></div>
    <div class="hora">${hora}</div>
    ${corazones(tipo, d)}
    ${accion}
  </article>`;
}

function vistaAcetaminofen() {
  const t = ahora();
  const lista = de('acetaminofen');
  const u = lista.at(-1);
  const n24 = lista.filter((r) => r.t > t - 24 * HORA).length;
  const proxima = u ? u.t + HORAS_ENTRE_DOSIS * HORA : null;
  const puede = !proxima || t >= proxima;
  const gotas = Array.from({ length: TOPE_24H }, (_, i) => {
    const cae = estado.recien === 'aceta' && i === n24 - 1 ? ' cae' : '';
    return `<span class="gota-c${i < n24 ? ' llena' : ''}${i === TOPE_24H - 1 && n24 >= TOPE_24H ? ' tope' : ''}${cae}">${ico('gota')}</span>`;
  }).join('');

  return `<article class="tarjeta">${ico('mono', 'mono')}
    <div class="med-cab"><span class="med-ico">${ico('termometro')}</span>
      <div><h3>Acetaminofén</h3><p class="frasco">120 mg/5 mL</p></div></div>
    <p class="regla">5 mL (120 mg) solo si la temperatura es 38,5 °C o más. Cada 4 a 6 horas.</p>
    <input id="temp" class="campo" type="text" inputmode="decimal" autocomplete="off" placeholder="Temperatura en °C (opcional)" aria-label="Temperatura en grados">
    <button class="btn" data-accion="aceta">${ico('termometro')}Registrar 5 mL</button>
    <div class="datos">
      <p>${ico('reloj')}<span>${u ? `Última dosis: <b>${hhmm(u.t)}</b> (${haceTexto(u.t)})${u.temperatura ? ` · ${coma(u.temperatura)} °C` : ''}` : 'Sin dosis registradas'}</span></p>
      ${proxima ? `<p class="${puede ? 'lista-ya' : ''}">${ico('reloj')}<span>Próxima dosis desde <b>${hhmm(proxima)}</b>${puede ? ' (ya puede, solo con fiebre)' : ''}</span></p>` : ''}
    </div>
    <div class="contador"><span class="gotas">${gotas}</span><span>${n24} de ${TOPE_24H} dosis en las últimas 24 h</span></div>
    ${n24 >= TOPE_24H ? `<div class="tope-alerta" role="alert">${ico('alerta')}<span>Tope de seguridad calculado (unos 70 mg/kg al día), no una indicación de la receta: no dar más sin hablar con la doctora.</span></div>` : ''}
  </article>`;
}

function vistaLavados() {
  const u = ultimo('lavado_nasal');
  const t = ahora();
  const sig = u ? u.t + HORAS_ENTRE_DOSIS * HORA : null;
  const cae = estado.recien === 'lavado' ? ' cae' : '';
  return `<article class="tarjeta">${ico('mono', 'mono')}
    <div class="med-cab"><span class="med-ico"><span class="gota-c${cae}">${ico('lavado')}</span></span>
      <div><h3>Lavados nasales</h3><p class="frasco">Solución salina 0,9 %</p></div></div>
    <p class="regla">5 mL por fosa nasal, cada 4 horas o con congestión.</p>
    <button class="btn" data-accion="lavado">${ico('lavado')}Registrar lavado</button>
    <div class="datos">
      <p>${ico('reloj')}<span>${u ? `Último lavado: <b>${hhmm(u.t)}</b> (${haceTexto(u.t)})` : 'Aún sin lavados registrados'}</span></p>
      ${sig ? `<p class="${t >= sig ? 'lista-ya' : ''}">${ico('reloj')}<span>Siguiente a las <b>${hhmm(sig)}</b></span></p>` : ''}
    </div></article>`;
}

function celda(tipo, n, d) {
  const m = PLAN[tipo];
  if (n >= m.dias) return '<div class="celda na" aria-hidden="true">—</div>';
  const r = registro(tipo, n);
  const clave = `${tipo}:${n}`;
  if (r) {
    const rec = estado.recien === clave ? ' recien' : '';
    return `<button class="celda ok${rec}" data-accion="celda" data-tipo="${tipo}" data-dia="${n}" data-id="${r.id}" data-clave="${clave}" aria-label="${m.corto}, día ${n + 1}, dada a las ${hhmm(r.t)}">${ico('check')}<span>${hhmm(r.t)}</span></button>`;
  }
  return `<button class="celda" data-accion="celda" data-tipo="${tipo}" data-dia="${n}" data-clave="${clave}" ${n > d ? 'disabled' : ''} aria-label="Marcar ${m.corto}, día ${n + 1}"></button>`;
}

function vistaPlan() {
  const d = diaActual();
  let html = '<div class="plan"><div></div>' + ORDEN.map((t) => `<div class="plan-cab">${PLAN[t].corto}</div>`).join('');
  for (let n = 0; n < 7; n++) {
    html += `<div class="plan-dia${n === d ? ' hoy' : ''}"><b>${n + 1}</b><small>${fechaDia(n)}</small></div>`;
    html += ORDEN.map((t) => celda(t, n, d)).join('');
  }
  return html + '</div>';
}

function vistaReceta() {
  const filas = recetaFilas().map(([a, b, c, e]) => `<tr><td>${a}</td><td data-l="Frasco">${b}</td><td data-l="Dosis">${c}</td><td data-l="Cuándo">${e}</td></tr>`).join('');
  return `<article class="tarjeta">
    <table class="receta"><thead><tr><th>Medicamento</th><th>Frasco</th><th>Dosis</th><th>Cuándo</th></tr></thead><tbody>${filas}</tbody></table>
    <p class="nota-receta">1 cc = 1 mL. Medir con jeringa oral, no con cucharita. Agitar los jarabes antes de medir.</p></article>`;
}

function vistaSenales() {
  return `<article class="tarjeta senales"><p class="senales-intro">${ico('alerta')}<span>Llama a la doctora o ve a emergencias de inmediato si ocurre algo de esto:</span></p>
    <ul>${SENALES.map((s) => `<li>${s}</li>`).join('')}</ul></article>`;
}

// Ultimos registros de un tipo, con boton para borrar uno si fue un error.
function historial(tipo, conTemp) {
  const lista = de(tipo).slice(-8).reverse();
  if (!lista.length) return '';
  const hoy = hoyStr();
  const ayer = fDia.format(ahora() - 864e5);
  const cuando = (t) => {
    const d = fDia.format(t);
    return d === hoy ? 'Hoy' : d === ayer ? 'Ayer' : `${d.slice(8, 10)}/${d.slice(5, 7)}`;
  };
  const items = lista.map((r) => `<li><span>${cuando(r.t)} · <b>${hhmm(r.t)}</b>${conTemp && r.temperatura ? ` · ${coma(r.temperatura)} °C` : ''}</span>
    <button class="btn mini fantasma" data-accion="deshacer" data-id="${r.id}" aria-label="Borrar el registro de las ${hhmm(r.t)}">${ico('deshacer')}</button></li>`).join('');
  return `<article class="tarjeta"><h3 class="sub-titulo">Registros recientes</h3><ul class="hist">${items}</ul></article>`;
}

// Contenido de la pantalla elegida en el menu inferior.
function vistaPantalla() {
  switch (estado.pantalla) {
    case 'fiebre':
      return seccion(0, vistaAcetaminofen()) + seccion(1, historial('acetaminofen', true));
    case 'lavados':
      return seccion(0, vistaLavados()) + seccion(1, historial('lavado_nasal', false));
    case 'plan':
      return seccion(0, `<p class="nota ayuda">Toca una casilla para marcar la dosis. Toca una marcada para deshacerla.</p><article class="tarjeta">${vistaPlan()}</article>`);
    case 'receta':
      return seccion(0, vistaReceta());
    case 'alarma':
      return seccion(0, vistaSenales());
    default:
      return seccion(0, vistaPorConfirmar())
        + seccion(1, vistaAvisos())
        + seccion(2, titulo('Hoy') + `<div class="lista">${ORDEN.map((t) => tarjetaMed(t, diaActual())).join('')}</div>`)
        + `<footer class="pie"><p>Esta app organiza lo que indicó la doctora y no reemplaza sus instrucciones.</p>
          <button class="btn texto" data-accion="clave">Cambiar clave</button></footer>`;
  }
}

function render() {
  const memoria = document.getElementById('temp');
  const temp = memoria ? memoria.value : '';
  const enfocado = memoria && document.activeElement === memoria;

  let cuerpo;
  if (!estado.cargado) {
    cuerpo = estado.error
      ? `<div class="mensaje">${estado.error}</div><button class="btn" data-accion="reintentar">Reintentar</button>`
      : '<p class="nota" style="text-align:center">Cargando…</p>';
  } else {
    const aviso = estado.error || estado.mensaje;
    cuerpo = [
      vistaAlarma(),
      aviso ? `<div class="mensaje" role="status">${aviso}</div>` : '',
      vistaPantalla(),
    ].join('');
  }

  $app.innerHTML = `${vistaCabecera()}<main class="contenido">${cuerpo}</main>${estado.cargado ? vistaTabs() : ''}`;

  const nuevo = document.getElementById('temp');
  if (nuevo && temp) nuevo.value = temp;
  if (nuevo && enfocado) nuevo.focus();

  estado.primera = false;
  if (estado.recien) {
    document.querySelectorAll(`[data-clave="${estado.recien}"]`).forEach(confeti);
    estado.recien = null;
  }
}

/* Corazoncitos y estrellas que flotan al marcar una dosis. */
function confeti(el) {
  const colores = ['var(--rosa)', 'var(--fucsia)', 'var(--lila)', 'var(--menta-fuerte)'];
  const base = el.matches('.tarjeta') ? el : el;
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI * 2 * i) / 8 + Math.random() * 0.5;
    const r = 50 + Math.random() * 40;
    const s = document.createElement('span');
    s.className = 'cf';
    s.style.cssText = `--dx:${Math.cos(a) * r}px;--dy:${Math.sin(a) * r - 20}px;--r:${Math.round(Math.random() * 120 - 60)}deg;color:${colores[i % 4]}`;
    s.innerHTML = `<svg viewBox="0 0 24 24">${i % 3 === 2 ? RELLENO.estrella : RELLENO.corazon}</svg>`;
    base.appendChild(s);
    setTimeout(() => s.remove(), 1000);
  }
}

/* Vuelve a dibujar y decide si la alarma debe sonar. */
function firmaVista() {
  return `${hhmm(ahora())}#${pendientes().map((p) => p.clave).join('|')}#${sonando().map((p) => p.clave).join('|')}`;
}
function refrescar() {
  estado.firmaVista = firmaVista();
  sonar(sonando().length > 0);
  render();
}
function tick() {
  if (estado.cargado && firmaVista() !== estado.firmaVista) refrescar();
}

/* ---------- Acciones ---------- */
function aviso(texto) {
  estado.mensaje = texto;
  refrescar();
  setTimeout(() => { estado.mensaje = ''; refrescar(); }, 6000);
}

async function hacer(fn) {
  if (ocupado) return;
  ocupado = true;
  try { await fn(); } catch (e) { aviso(e.message || 'No se pudo completar la acción'); } finally { ocupado = false; }
}

async function registrar(cuerpo, recien) {
  await api('POST', '', cuerpo);
  estado.recien = recien;
  navigator.vibrate?.(40);
  await cargar();
}

const acciones = {
  async dar({ tipo, dia }) {
    await registrar({ tipo, dia: Number(dia) }, `${tipo}:${dia}`);
  },

  async celda({ tipo, dia, id }) {
    if (id) return acciones.deshacer({ id });
    await acciones.dar({ tipo, dia });
  },

  async deshacer({ id }) {
    if (!(await confirmar('Deshacer registro', 'Se borrará este registro. ¿Continuar?', 'Sí, deshacer'))) return;
    await api('DELETE', `?id=${encodeURIComponent(id)}`);
    await cargar();
  },

  async aceta() {
    const t = ahora();
    const lista = de('acetaminofen');
    const u = lista.at(-1);
    const n24 = lista.filter((r) => r.t > t - 24 * HORA).length;
    const campo = document.getElementById('temp').value.trim().replace(',', '.');
    let temperatura;
    if (campo) {
      temperatura = Number(campo);
      if (!Number.isFinite(temperatura) || temperatura < 30 || temperatura > 43) throw new Error('Escribe una temperatura entre 30 y 43 °C.');
    }

    const motivos = [];
    if (n24 >= TOPE_24H) motivos.push(`Ya hay ${n24} dosis en las últimas 24 h. No des más sin hablar con la doctora.`);
    if (u && t < u.t + HORAS_ENTRE_DOSIS * HORA) motivos.push(`Pasaron solo ${Math.round((t - u.t) / 60e3)} min desde la última dosis. La próxima es desde las ${hhmm(u.t + HORAS_ENTRE_DOSIS * HORA)}.`);
    if (temperatura !== undefined && temperatura < 38.5) motivos.push('La receta indica acetaminofén solo con 38,5 °C o más.');
    if (motivos.length && !(await confirmar('¿Registrar de todos modos?', motivos.join(' ')))) return;

    await registrar({ tipo: 'acetaminofen', temperatura }, 'aceta');
  },

  async lavado() {
    await registrar({ tipo: 'lavado_nasal' }, 'lavado');
  },

  silenciar() {
    for (const p of pendientes()) estado.silenciadas[p.clave] = ahora() + SILENCIO_MIN * 60e3;
    refrescar();
  },

  async avisos() { await activarAvisos(); },
  probar() { audio(); pitido(); },
  reintentar() { return cargar(); },
  async clave() {
    localStorage.removeItem('clave');
    await cargar();
  },
};

$app.addEventListener('click', (e) => {
  const b = e.target.closest('[data-accion]');
  if (!b || b.disabled || b.tagName === 'SPAN') return;
  audio();
  const fn = acciones[b.dataset.accion];
  if (fn) hacer(() => fn(b.dataset));
});

// Cambio de hora de azitromicina / pediacort.
$app.addEventListener('change', (e) => {
  const grupo = e.target.closest('[data-ajuste]');
  if (!grupo) return;
  const parte = (p) => grupo.querySelector(`[data-parte=${p}]`).value;
  const valor = a24(parte('h'), parte('m'), parte('ap'));          // se guarda en 24 h
  hacer(async () => {
    await api('POST', '?r=ajuste', { clave: grupo.dataset.ajuste, valor });
    await cargar();
  });
});

// El navegador solo deja sonar audio despues de un toque del usuario.
document.addEventListener('pointerdown', () => { audio(); }, { passive: true });

/* ---------- Inicio ---------- */
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

// La pantalla va en la direccion (#plan, #fiebre...): el boton Atras y los enlaces funcionan.
const pantallaDeHash = () => {
  const h = location.hash.slice(1);
  return PANTALLAS.some((p) => p[0] === h) ? h : null;
};
estado.pantalla = pantallaDeHash() || 'hoy';
window.addEventListener('hashchange', () => {
  const p = pantallaDeHash() || 'hoy';
  if (p === estado.pantalla) return;
  estado.pantalla = p;
  estado.primera = true;
  render();
  window.scrollTo(0, 0);
});

render();
cargar().then(() => {
  // Si los avisos ya estaban activos, se renueva la suscripcion por si cambio.
  if (avisosActivos() && estado.vapid) suscribir().catch(() => {});
});
setInterval(tick, 15000);
setInterval(cargar, 30000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) cargar(); });
