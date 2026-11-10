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
    ml: '2,5', mg: '2,5 mg', frasco: 'Genven 1 mg/mL', hora: '19:00',
  },
  azitromicina: {
    nombre: 'Azitromicina', corto: 'Azitromicina', icono: 'gota', dias: 5,
    ml: '2', mg: '80 mg', frasco: '200 mg/5 mL', hora: '21:00',
  },
  pediacort: {
    nombre: 'Pediacort (prednisolona)', corto: 'Pediacort', icono: 'pildora', dias: 5,
    ml: '2,5', mg: '7,5 mg', frasco: '3 mg/mL', hora: '20:00',
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
  grafica: '<path d="M4 4v16h16"/><path d="M8 15l3.5-4.5 3 2.5L19 7"/>',
  luna: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/>',
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
  vapid: '',
  skew: 0,               // diferencia entre el reloj del servidor y el del telefono
  cargado: false,
  error: '',
  mensaje: '',
  pantalla: 'hoy',       // hoy | fiebre | lavados | plan | receta | evolucion (menu inferior)
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

const horaDe = (tipo) => PLAN[tipo].hora;
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
    estado.firmaDatos = JSON.stringify(d.registros);
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
  ['evolucion', 'Evolución', 'grafica'],
];
const TITULOS = {
  hoy: 'Isabella', fiebre: 'Fiebre y acetaminofén', lavados: 'Lavados nasales',
  plan: 'Plan de los días', receta: 'Receta', evolucion: 'Evolución de Isabella',
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

function corazones(tipo, d) {
  const m = PLAN[tipo];
  const items = Array.from({ length: m.dias }, (_, i) => (
    registro(tipo, i) ? ico('corazon') : ico('corazon', `vacio${i === d ? ' actual' : ''}`)
  )).join('');
  const hechos = Array.from({ length: m.dias }, (_, i) => i).filter((i) => registro(tipo, i)).length;
  return `<div class="progreso" role="img" aria-label="${hechos} de ${m.dias} días dados">${items}</div>`;
}

// Orden de "Hoy": primero lo que falta (por hora), luego lo ya dado, al final lo que no toca hoy.
function ordenHoy(d) {
  const rango = (t) => (d < 0 || d >= PLAN[t].dias ? 2 : registro(t, d) ? 1 : 0);
  return [...ORDEN].sort((a, b) => rango(a) - rango(b) || PLAN[a].hora.localeCompare(PLAN[b].hora));
}

function vistaListoHoy(d) {
  const activos = ORDEN.filter((t) => d >= 0 && d < PLAN[t].dias);
  if (!activos.length || !activos.every((t) => registro(t, d))) return '';
  return `<p class="listo">${ico('check', 'l')}Listo por hoy: ya se dieron todas las dosis del día.</p>`;
}

function tarjetaMed(tipo, d) {
  const m = PLAN[tipo];
  const activo = d >= 0 && d < m.dias;
  const reg = activo ? registro(tipo, d) : null;
  const chip = activo ? `Día ${d + 1} de ${m.dias}` : d < 0 ? `Empieza el ${fechaDia(0)}` : 'Tratamiento terminado';
  const recien = estado.recien === `${tipo}:${d}` ? ' recien' : '';
  const hora = `${ico('reloj')}<b>${h12(horaDe(tipo))}</b><small>hora programada</small>`;

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

function vistaTemperatura() {
  const u = ultimo('temperatura');
  const ult = u
    ? `Última: <b${u.temperatura >= 38.5 ? ' class="alta"' : ''}>${coma(u.temperatura)} °C</b> a las <b>${hhmm(u.t)}</b> (${haceTexto(u.t)})${u.temperatura >= 38.5 ? ' · fiebre' : ''}`
    : 'Aún sin temperaturas registradas';
  return `<article class="tarjeta">${ico('mono', 'mono')}
    <div class="med-cab"><span class="med-ico">${ico('termometro')}</span>
      <div><h3>Temperatura</h3><p class="frasco">Lecturas del día</p></div></div>
    <input id="temp" class="campo" type="text" inputmode="decimal" autocomplete="off" placeholder="Temperatura en °C (ej. 37,8)" aria-label="Temperatura en grados">
    <button class="btn" data-accion="temperatura">${ico('termometro')}Registrar temperatura</button>
    <div class="datos"><p>${ico('reloj')}<span>${ult}</span></p></div>
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
    <button class="btn" data-accion="aceta">${ico('gota')}Registrar dosis de 5 mL</button>
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

/* ---------- Evolucion: graficas SVG (sin librerias) y seguimiento ---------- */
const DIA_MS = 864e5;
const SEGUIMIENTO = {
  animo: { titulo: 'Ánimo', icono: 'corazon', ayuda: '¿Cómo ha estado de ánimo?', opciones: [[1, 'Mal'], [2, 'Regular'], [3, 'Bien']] },
  llanto: { titulo: 'Llanto', icono: 'gota', ayuda: '¿Ha llorado?', opciones: [[0, 'Nada'], [1, 'Poco'], [2, 'Mucho']] },
  malestar: { titulo: 'Malestar', icono: 'alerta', ayuda: '¿Se le nota molestia o dolor?', opciones: [[0, 'Ninguno'], [1, 'Leve'], [2, 'Fuerte']] },
};
const etiquetaNivel = (tipo, v) => SEGUIMIENTO[tipo].opciones.find((o) => o[0] === v)?.[1] ?? String(v);
const valorDe = (r) => (r.tipo === 'sueno' ? r.temperatura : r.dia);   // sueno: horas; el resto: nivel
const suma = (v) => v.reduce((a, b) => a + b, 0);
const media = (v) => suma(v) / v.length;

const ultimos7 = () => Array.from({ length: 7 }, (_, i) => fDia.format(ahora() - (6 - i) * DIA_MS));
const inicioDia = (d) => Date.parse(`${d}T00:00:00${OFFSET}`);

// Un punto por dia (a mediodia) con el valor agregado de los registros de ese dia.
function porDia(tipo, agregar) {
  return ultimos7().map((d) => {
    const v = de(tipo).filter((r) => fDia.format(r.t) === d).map(valorDe);
    return v.length ? { x: inicioDia(d) + DIA_MS / 2, y: agregar(v) } : null;
  }).filter(Boolean);
}

// Recta de minimos cuadrados. Con menos de 3 puntos no hay tendencia que valga.
function regresion(pts) {
  if (pts.length < 3) return null;
  const mx = media(pts.map((p) => p.x));
  const my = media(pts.map((p) => p.y));
  let sxy = 0;
  let sxx = 0;
  for (const p of pts) { sxy += (p.x - mx) * (p.y - my); sxx += (p.x - mx) ** 2; }
  if (!sxx) return null;
  const m = sxy / sxx;
  return { m, b: my - m * mx, porDia: m * DIA_MS };
}

function grafica({ titulo: nombre, icono, series, ymin, ymax, ticks, ref, unidad, umbral, vacio }) {
  const W = 340; const H = 176; const L = 50; const R = 12; const T = 12; const B = 26;
  const dias = ultimos7();
  const x0 = inicioDia(dias[0]);
  const X = (x) => L + ((x - x0) / (7 * DIA_MS)) * (W - L - R);
  const Y = (y) => T + (1 - (Math.min(Math.max(y, ymin), ymax) - ymin) / (ymax - ymin)) * (H - T - B);

  const hayDatos = series.some((s) => s.pts.length);
  let svg = '';
  if (hayDatos) {
    svg += ticks.map(([v, t]) => `<line class="gl" x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}"/><text class="gt" x="${L - 6}" y="${Y(v) + 3.5}" text-anchor="end">${t}</text>`).join('');
    svg += dias.map((d, i) => `<text class="gt" x="${X(x0 + (i + 0.5) * DIA_MS)}" y="${H - 8}" text-anchor="middle">${i === 6 ? 'Hoy' : `${d.slice(8, 10)}/${d.slice(5, 7)}`}</text>`).join('');
    if (ref !== undefined) svg += `<line class="gref" x1="${L}" x2="${W - R}" y1="${Y(ref)}" y2="${Y(ref)}"/>`;
    const bw = ((W - L - R) / 7) * 0.5;
    for (const s of series) {
      if (s.barras) {
        svg += s.pts.map((p) => `<rect x="${X(p.x) - bw / 2}" y="${Y(p.y)}" width="${bw}" height="${Math.max(0, Y(ymin) - Y(p.y))}" rx="4" fill="${s.color}"/>`).join('');
      } else {
        if (s.pts.length > 1) svg += `<polyline fill="none" stroke="${s.color}" stroke-width="2.5" stroke-linejoin="round" points="${s.pts.map((p) => `${X(p.x)},${Y(p.y)}`).join(' ')}"/>`;
        svg += s.pts.map((p) => `<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="3.6" fill="${s.color}"/>`).join('');
      }
      const r = s.regresion && regresion(s.pts);
      if (r) {
        const a = s.pts[0].x; const z = s.pts.at(-1).x;
        svg += `<line class="greg" x1="${X(a)}" y1="${Y(r.m * a + r.b)}" x2="${X(z)}" y2="${Y(r.m * z + r.b)}"/>`;
      }
    }
  }

  const leyendas = series.length > 1
    ? `<p class="leyendas">${series.map((s) => `<span><i style="background:${s.color}"></i>${s.nombre}</span>`).join('')}</p>` : '';
  const tendencias = hayDatos ? series.filter((s) => s.regresion).map((s) => {
    const r = regresion(s.pts);
    if (!r) return `<p class="tendencia nota">Tendencia: se necesitan datos de 3 o más ${s.barras ? 'días' : 'registros'}.</p>`;
    const p = Math.abs(r.porDia);
    const txt = p < umbral ? 'estable' : `${r.porDia > 0 ? 'sube' : 'baja'} ${coma(p.toFixed(1))} ${unidad} por día`;
    return `<p class="tendencia">Tendencia (línea punteada): ${txt}</p>`;
  }).join('') : '';

  return `<article class="tarjeta grafica"><h3 class="sub-titulo">${ico(icono)}${nombre}</h3>
    ${hayDatos ? `<svg class="gr" viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfica de ${nombre}">${svg}</svg>` : `<p class="nota">${vacio}</p>`}
    ${leyendas}${tendencias}</article>`;
}

function vistaGraficas() {
  const x0 = inicioDia(ultimos7()[0]);
  const temps = de('temperatura').filter((r) => r.t >= x0).map((r) => ({ x: r.t, y: r.temperatura }));
  const tmin = Math.min(36, Math.floor(Math.min(...temps.map((p) => p.y))));
  const tmax = Math.max(40, Math.ceil(Math.max(...temps.map((p) => p.y))));
  const sueno = porDia('sueno', suma);
  const smax = Math.max(12, Math.ceil(Math.max(0, ...sueno.map((p) => p.y)) / 6) * 6);

  return [
    grafica({
      titulo: 'Temperatura', icono: 'termometro', unidad: '°C', umbral: 0.1, ref: 38.5,
      ymin: tmin, ymax: tmax, ticks: Array.from({ length: tmax - tmin + 1 }, (_, i) => [tmin + i, tmin + i]),
      series: [{ nombre: 'Temperatura', color: 'var(--fucsia)', pts: temps, regresion: true }],
      vacio: 'Aún no hay temperaturas. Se registran en la pestaña Fiebre. La línea roja marca 38,5 °C.',
    }),
    grafica({
      titulo: 'Horas de sueño por día', icono: 'luna', unidad: 'h', umbral: 0.25,
      ymin: 0, ymax: smax, ticks: [0, 1, 2, 3].map((i) => [(smax / 3) * i, `${(smax / 3) * i} h`]),
      series: [{ nombre: 'Horas de sueño', color: 'var(--lila)', pts: sueno, barras: true, regresion: true }],
      vacio: 'Aún no hay horas de sueño. Regístralas abajo.',
    }),
    grafica({
      titulo: 'Ánimo', icono: 'corazon', unidad: 'puntos', umbral: 0.1,
      ymin: 0.6, ymax: 3.4, ticks: SEGUIMIENTO.animo.opciones,
      series: [{ nombre: 'Ánimo (promedio del día)', color: 'var(--menta-fuerte)', pts: porDia('animo', media), regresion: true }],
      vacio: 'Aún no hay registros de ánimo. Regístralos abajo.',
    }),
    grafica({
      titulo: 'Llanto y malestar', icono: 'gota', unidad: 'puntos', umbral: 0.1,
      ymin: -0.4, ymax: 2.4, ticks: [[0, 'Nada'], [1, 'Poco'], [2, 'Mucho']],
      series: [
        { nombre: 'Llanto (lo más alto del día)', color: 'var(--fucsia)', pts: porDia('llanto', (v) => Math.max(...v)) },
        { nombre: 'Malestar (lo más alto del día)', color: 'var(--lila)', pts: porDia('malestar', (v) => Math.max(...v)) },
      ],
      vacio: 'Aún no hay registros de llanto ni de malestar. Regístralos abajo.',
    }),
  ].join('');
}

function vistaSueno() {
  const hoy = hoyStr();
  const total = suma(de('sueno').filter((r) => fDia.format(r.t) === hoy).map((r) => r.temperatura));
  const u = ultimo('sueno');
  return `<article class="tarjeta" data-clave="sueno">${ico('mono', 'mono')}
    <div class="med-cab"><span class="med-ico">${ico('luna')}</span>
      <div><h3>Sueño</h3><p class="frasco">Horas dormidas (noche o siestas)</p></div></div>
    <input id="sueno" class="campo" type="text" inputmode="decimal" autocomplete="off" placeholder="Horas dormidas (ej. 2,5)" aria-label="Horas dormidas">
    <button class="btn" data-accion="sueno">${ico('luna')}Registrar sueño</button>
    <div class="datos">
      <p>${ico('reloj')}<span>${u ? `Último: <b>${coma(u.temperatura)} h</b> a las <b>${hhmm(u.t)}</b>` : 'Aún sin registros'}</span></p>
      <p>${ico('luna')}<span>Total de hoy: <b>${coma(Number(total.toFixed(1)))} h</b></span></p>
    </div></article>`;
}

function vistaNivel(tipo) {
  const n = SEGUIMIENTO[tipo];
  const u = ultimo(tipo);
  return `<article class="tarjeta" data-clave="${tipo}">${ico('mono', 'mono')}
    <div class="med-cab"><span class="med-ico">${ico(n.icono)}</span>
      <div><h3>${n.titulo}</h3><p class="frasco">${n.ayuda}</p></div></div>
    <div class="opciones">${n.opciones.map(([v, t]) => `<button class="btn fantasma" data-accion="nivel" data-tipo="${tipo}" data-valor="${v}">${t}</button>`).join('')}</div>
    <div class="datos"><p>${ico('reloj')}<span>${u ? `Último: <b>${etiquetaNivel(tipo, u.dia)}</b> a las <b>${hhmm(u.t)}</b> (${haceTexto(u.t)})` : 'Aún sin registros'}</span></p></div>
  </article>`;
}

function historialSeguimiento() {
  const tipos = ['sueno', ...Object.keys(SEGUIMIENTO)];
  const lista = estado.registros.filter((r) => tipos.includes(r.tipo)).slice(-10).reverse();
  if (!lista.length) return '';
  const items = lista.map((r) => {
    const txt = r.tipo === 'sueno' ? `Sueño · <b>${coma(r.temperatura)} h</b>` : `${SEGUIMIENTO[r.tipo].titulo} · <b>${etiquetaNivel(r.tipo, r.dia)}</b>`;
    return `<li><span>${cuando(r.t)} · ${hhmm(r.t)} · ${txt}</span>
      <button class="btn mini fantasma" data-accion="deshacer" data-id="${r.id}" aria-label="Borrar este registro">${ico('deshacer')}</button></li>`;
  }).join('');
  return `<article class="tarjeta"><h3 class="sub-titulo">Registros recientes</h3><ul class="hist">${items}</ul></article>`;
}

function vistaEvolucion() {
  return seccion(0, titulo('Gráficas', 'grafica') + vistaGraficas())
    + seccion(1, titulo('Seguimiento') + `<p class="nota ayuda">La temperatura se registra en la pestaña Fiebre. Las gráficas muestran los últimos 7 días; la línea punteada es la tendencia y sirve de apoyo, no es un diagnóstico.</p>`
      + `<div class="lista">${vistaSueno()}${Object.keys(SEGUIMIENTO).map(vistaNivel).join('')}</div>`)
    + seccion(2, historialSeguimiento());
}

const cuando = (t) => {
  const d = fDia.format(t);
  return d === hoyStr() ? 'Hoy' : d === fDia.format(ahora() - DIA_MS) ? 'Ayer' : `${d.slice(8, 10)}/${d.slice(5, 7)}`;
};

// Ultimos registros de un tipo, con boton para borrar uno si fue un error.
function historial(tipo, conTemp, titulo = 'Registros recientes') {
  const lista = de(tipo).slice(-8).reverse();
  if (!lista.length) return '';
  const items = lista.map((r) => `<li><span>${cuando(r.t)} · <b>${hhmm(r.t)}</b>${conTemp && r.temperatura ? ` · <b${r.temperatura >= 38.5 ? ' class="alta"' : ''}>${coma(r.temperatura)} °C</b>` : ''}</span>
    <button class="btn mini fantasma" data-accion="deshacer" data-id="${r.id}" aria-label="Borrar el registro de las ${hhmm(r.t)}">${ico('deshacer')}</button></li>`).join('');
  return `<article class="tarjeta"><h3 class="sub-titulo">${titulo}</h3><ul class="hist">${items}</ul></article>`;
}

// Contenido de la pantalla elegida en el menu inferior.
function vistaPantalla() {
  switch (estado.pantalla) {
    case 'fiebre':
      return seccion(0, vistaTemperatura()) + seccion(1, historial('temperatura', true, 'Temperaturas recientes'))
        + seccion(2, vistaAcetaminofen()) + seccion(3, historial('acetaminofen', true, 'Dosis recientes'));
    case 'lavados':
      return seccion(0, vistaLavados()) + seccion(1, historial('lavado_nasal', false));
    case 'plan':
      return seccion(0, `<p class="nota ayuda">Toca una casilla para marcar la dosis. Toca una marcada para deshacerla.</p><article class="tarjeta">${vistaPlan()}</article>`);
    case 'receta':
      return seccion(0, vistaReceta());
    case 'evolucion':
      return vistaEvolucion();
    default:
      return seccion(0, titulo('Hoy') + vistaListoHoy(diaActual()) + `<div class="lista">${ordenHoy(diaActual()).map((t) => tarjetaMed(t, diaActual())).join('')}</div>`)
        + seccion(1, vistaAvisos())
        + `<footer class="pie"><p>Esta app organiza lo que indicó la doctora y no reemplaza sus instrucciones.</p>
          <button class="btn texto" data-accion="clave">Cambiar clave</button></footer>`;
  }
}

function render() {
  // Lo escrito en los campos (temperatura, sueño) sobrevive al redibujado.
  const campos = [...document.querySelectorAll('input.campo')].map((i) => [i.id, i.value, i === document.activeElement]);

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

  for (const [id, valor, enfocado] of campos) {
    const nuevo = document.getElementById(id);
    if (!nuevo) continue;
    if (valor) nuevo.value = valor;
    if (enfocado) nuevo.focus();
  }

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
    const lectura = ultimo('temperatura');

    const motivos = [];
    if (n24 >= TOPE_24H) motivos.push(`Ya hay ${n24} dosis en las últimas 24 h. No des más sin hablar con la doctora.`);
    if (u && t < u.t + HORAS_ENTRE_DOSIS * HORA) motivos.push(`Pasaron solo ${Math.round((t - u.t) / 60e3)} min desde la última dosis. La próxima es desde las ${hhmm(u.t + HORAS_ENTRE_DOSIS * HORA)}.`);
    if (lectura && t - lectura.t < 2 * HORA && lectura.temperatura < 38.5) {
      motivos.push(`La última temperatura (${coma(lectura.temperatura)} °C a las ${hhmm(lectura.t)}) está por debajo de 38,5 °C. La receta indica acetaminofén solo con 38,5 °C o más.`);
    }
    if (motivos.length && !(await confirmar('¿Registrar de todos modos?', motivos.join(' ')))) return;

    await registrar({ tipo: 'acetaminofen' }, 'aceta');
  },

  async temperatura() {
    const campo = document.getElementById('temp');
    const texto = campo.value.trim().replace(',', '.');
    const temperatura = Number(texto);
    if (!texto || !Number.isFinite(temperatura) || temperatura < 30 || temperatura > 43) throw new Error('Escribe una temperatura entre 30 y 43 °C.');
    campo.value = '';
    try {
      await registrar({ tipo: 'temperatura', temperatura }, 'temp');
    } catch (e) {
      campo.value = texto;
      throw e;
    }
  },

  async nivel({ tipo, valor }) {
    await registrar({ tipo, valor: Number(valor) }, tipo);
  },

  async sueno() {
    const campo = document.getElementById('sueno');
    const texto = campo.value.trim().replace(',', '.');
    const horas = Number(texto);
    if (!texto || !Number.isFinite(horas) || horas < 0.5 || horas > 24) throw new Error('Escribe las horas dormidas, entre 0,5 y 24.');
    campo.value = '';
    try {
      await registrar({ tipo: 'sueno', valor: horas }, 'sueno');
    } catch (e) {
      campo.value = texto;
      throw e;
    }
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
