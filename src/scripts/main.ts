import gsap from 'gsap';
import { localize, tr } from './i18n';
import * as audio from './audio';
import { clockLabel, cond, loadWeather, palette, sunPosition, tick, weatherLabel } from './conditions';
import { g, Renderer, type Palette, type Sky } from './dither';
import { friends, type Friend } from '../data/friends';
import * as bunker from './scenes/bunker';
import * as cabina from './scenes/cabina';
import * as estribor from './scenes/estribor';
import * as exterior from './scenes/exterior';
import * as radio from './scenes/radio';
import * as taller from './scenes/taller';
import type { Env } from './scenes/types';

localize(); // antes que nada: lo demás lee los textos ya en su idioma

type SceneId = 'exterior' | 'taller' | 'lz20' | 'contacto' | 'bunker';

const scenes: Record<SceneId, { draw: typeof exterior.draw; horizon: (W: number, H: number) => number; title: string }> = {
  exterior: { ...exterior, title: 'Benjamín Ulloa' },
  taller: { ...taller, title: tr('Sobre mí — Benjamín Ulloa', 'About — Benjamín Ulloa') },
  lz20: { ...cabina, title: 'LZ 20 · Sound3ds — Benjamín Ulloa' },
  contacto: { ...radio, title: tr('Contacto — Benjamín Ulloa', 'Contact — Benjamín Ulloa') },
  bunker: { ...bunker, title: tr('El búnker — Benjamín Ulloa', 'The bunker — Benjamín Ulloa') }, // sin ruta: sólo se llega escribiendo en la máquina
};

const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = <T extends HTMLElement>(s: string) => document.querySelector<T>(s)!;
const ui = $('#ui');
const R = new Renderer($<HTMLCanvasElement>('#world'));

const route = (): SceneId => {
  const h = location.hash.replace(/^#\/?/, '');
  return h in scenes && h !== 'bunker' ? (h as SceneId) : 'exterior';
};

const state = {
  scene: route(),
  fade: 1,
  zoom: 0, // 0 = plano general, 1 = encima del lugar elegido
  focus: 'taller' as Exclude<SceneId, 'exterior' | 'bunker'>,
  door: 0.1,
  rise: 0, // el personaje se para de la silla del taller
};

let pal: Palette = palette();
const env: Env = { door: 0.1, rain: 0, hour: cond.hour, daylight: 1, lamp: 0, still };

// ── Condiciones en vivo ──────────────────────────────────────────────────

function refresh() {
  tick();
  pal = palette();
  env.rain = cond.rain;
  env.hour = cond.hour;
  const sun = sunPosition();
  env.daylight = sun.day ? (0.35 + 0.65 * Math.min(1, sun.alt * 2.5)) * (1 - 0.35 * cond.cover) : 0.05;
  if (lampOn === null) setLamp(env.daylight < 0.5, true);
  const css = (c: number[]) => c.join(' ');
  const root = document.documentElement.style;
  root.setProperty('--ink', css(pal.ink));
  root.setProperty('--sky', css(pal.zenith));
  const temp = cond.temp === null ? tr('sin señal', 'no signal') : `${Math.round(cond.temp)} °C`;
  $('#live').textContent = `Chillán · ${clockLabel()} · ${temp} · ${weatherLabel()}`;
  setDial(4, cond.temp);
  setDial(5, cond.wind);
}

// ── Instrumentos de la cabina ────────────────────────────────────────────

interface Dial {
  label: string;
  sub: string;
  min: number;
  max: number;
  value: number | null;
  step: number;
}

const dials: Dial[] = [
  { label: tr('Fuentes', 'Sources'), sub: 'SoundCloud · Bandcamp · Subsonic · SD', min: 0, max: 6, value: 4, step: 1 },
  { label: tr('Formatos', 'Formats'), sub: 'MP3 · AAC · FLAC', min: 0, max: 6, value: 3, step: 1 },
  { label: tr('Temas', 'Themes'), sub: tr('con visualizador de espectro', 'with spectrum visualizer'), min: 0, max: 10, value: 7, step: 1 },
  { label: 'FLAC kHz', sub: tr('hasta 24-bit / 96 kHz', 'up to 24-bit / 96 kHz'), min: 0, max: 120, value: 96, step: 20 },
  { label: 'Temp °C', sub: tr('Chillán, ahora', 'Chillán, right now'), min: -10, max: 40, value: null, step: 10 },
  { label: tr('Viento km/h', 'Wind km/h'), sub: tr('Chillán, ahora', 'Chillán, right now'), min: 0, max: 60, value: null, step: 10 },
];

const angle = (d: Dial, v: number) => -135 + 270 * Math.max(0, Math.min(1, (v - d.min) / (d.max - d.min)));

function buildDials() {
  const host = $('#dials');
  host.innerHTML = dials
    .map((d, i) => {
      let ticks = '';
      for (let v = d.min; v <= d.max + 1e-6; v += d.step / 2) {
        const major = Math.abs((v - d.min) / d.step - Math.round((v - d.min) / d.step)) < 1e-6;
        const a = ((angle(d, v) - 90) * Math.PI) / 180;
        const r0 = major ? 33 : 37;
        ticks += `<line x1="${(Math.cos(a) * r0).toFixed(2)}" y1="${(Math.sin(a) * r0).toFixed(2)}" x2="${(Math.cos(a) * 42).toFixed(2)}" y2="${(Math.sin(a) * 42).toFixed(2)}"/>`;
        if (major)
          ticks += `<text x="${(Math.cos(a) * 24).toFixed(2)}" y="${(Math.sin(a) * 24 + 3).toFixed(2)}">${v}</text>`;
      }
      return `<figure class="dial" data-i="${i}">
        <svg viewBox="-50 -50 100 100" aria-hidden="true">${ticks}
          <g class="needle"><line x1="0" y1="9" x2="0" y2="-38"/></g><circle r="3.5"/>
        </svg>
        <figcaption><b>${d.label}</b><output>—</output><small>${d.sub}</small></figcaption>
      </figure>`;
    })
    .join('');
}

function setDial(i: number, v: number | null, sweep = false) {
  const d = dials[i];
  d.value = v;
  const el = document.querySelector<HTMLElement>(`.dial[data-i="${i}"]`);
  if (!el) return;
  el.querySelector('output')!.textContent = v === null ? '—' : String(Math.round(v));
  const needle = el.querySelector('.needle')!;
  const to = angle(d, v ?? d.min);
  const turn = (a: number) => needle.setAttribute('transform', `rotate(${a.toFixed(2)})`);
  gsap.killTweensOf(needle);
  if (sweep && !still) {
    const p = { a: -135 };
    turn(p.a);
    gsap.to(p, { a: to, duration: 1.6, delay: 0.25 + i * 0.09, ease: 'elastic.out(1,0.55)', onUpdate: () => turn(p.a) });
    gsap.set(needle, {}); // registra el objetivo para killTweensOf
  } else turn(to);
}

// ── Bitácora: tecleo letra por letra ─────────────────────────────────────

const typed = new Set<string>();

interface TypeOpts {
  step?: number; // caracteres por golpe
  ms?: number;
  onChar?: (ch: string, done: HTMLElement, para: HTMLElement) => void;
  onEnd?: () => void;
}

function typeIn(sel: string, { step = 2, ms = 42, onChar, onEnd }: TypeOpts = {}) {
  if (typed.has(sel) || still) return;
  typed.add(sel);
  const host = $(sel);
  const paras = [...host.querySelectorAll<HTMLElement>('[data-type]')];
  const texts = paras.map((p) => (p.textContent ?? '').replace(/\s+/g, ' ').trim());
  paras.forEach((p, i) => {
    p.setAttribute('aria-label', texts[i]);
    p.innerHTML = `<span aria-hidden="true"></span><span class="pending" aria-hidden="true"></span>`;
    (p.lastChild as HTMLElement).textContent = texts[i];
  });
  let pi = 0;
  let ci = 0;
  let timer = 0;
  const finish = () => {
    clearInterval(timer);
    paras.forEach((p, i) => (p.textContent = texts[i]));
    host.removeEventListener('click', finish);
    onEnd?.();
  };
  host.addEventListener('click', finish);
  timer = window.setInterval(() => {
    if (pi >= paras.length) return finish();
    ci = Math.min(texts[pi].length, ci + step);
    const done = paras[pi].firstChild as HTMLElement;
    done.textContent = texts[pi].slice(0, ci);
    (paras[pi].lastChild as HTMLElement).textContent = texts[pi].slice(ci);
    const ch = texts[pi][ci - 1];
    if (ch !== ' ') audio.key();
    onChar?.(ch, done, paras[pi]);
    if (ci >= texts[pi].length) {
      pi++;
      ci = 0;
    }
  }, ms);
}

// ── Máquina de escribir: la hoja 2 se teclea de verdad ───────────────────

function typeSheet() {
  let lines = 0;
  const carriage = (to: number, duration: number) => gsap.to(taller.fx, { carriage: to, duration, ease: 'power1.out', overwrite: true });
  taller.fx.carriage = still || typed.has('#sheet2') ? 0 : 0.5;
  typeIn('#sheet2', {
    step: 1,
    ms: 46,
    onChar(ch, done, para) {
      // sólo golpea si se está mirando la máquina
      if (state.scene === 'taller') taller.press(taller.keyFor(ch));
      const rects = done.getClientRects();
      const row = rects[rects.length - 1];
      if (!row) return;
      const frac = Math.min(1, row.width / Math.max(1, para.getBoundingClientRect().width));
      if (rects.length > lines) {
        // línea nueva: campanilla y retorno de carro
        if (lines > 0 && state.scene === 'taller') audio.bell();
        lines = rects.length;
        carriage(0.5, 0.22);
      } else carriage(0.5 - frac, 0.06);
    },
    onEnd: () => carriage(0, 0.6),
  });
}

let written = '';

function pressKey(i: number) {
  if (i < 0) return;
  taller.press(i);
  audio.key();
  written = (written + taller.charOf(i)).slice(-9);
  if (written.endsWith('TRUE ME')) descend();
  if (written.endsWith('ESQUELETO') || written.endsWith('SKELETON')) taller.bones();
}

// ── Lámpara del escritorio ───────────────────────────────────────────────

let lampOn: boolean | null = null;

function setLamp(on: boolean, instant = false) {
  lampOn = on;
  gsap.killTweensOf(env);
  if (instant || still) env.lamp = on ? 1 : 0;
  else if (on) gsap.timeline().to(env, { lamp: 0.9, duration: 0.05 }).to(env, { lamp: 0.35, duration: 0.06 }).to(env, { lamp: 1, duration: 0.14 });
  else gsap.to(env, { lamp: 0, duration: 0.18 });
  document.querySelectorAll<HTMLElement>('[data-lamp]').forEach((b) => {
    b.setAttribute('aria-pressed', String(on));
    b.querySelector('[data-lamp-label]')!.textContent = on ? tr('apagar', 'turn off') : tr('encender', 'turn on');
  });
}

// ── Capa de interfaz sobre el lienzo ─────────────────────────────────────

function place() {
  const k = R.scale;
  const L = exterior.layout(R.W, R.H);
  for (const [id, r] of Object.entries(L.spots)) {
    const el = $(`.spot[data-to="${id}"]`);
    const pad = 4;
    el.style.left = `${(r.x - pad) * k}px`;
    el.style.top = `${(r.y - pad) * k}px`;
    el.style.width = `${(r.w + pad * 2) * k}px`;
    el.style.height = `${(r.h + pad * 2) * k}px`;
  }
  const put = (sel: string, r: { x: number; y: number; w: number; h: number } | null) => {
    const st = $(sel).style;
    st.left = r ? `${r.x * k}px` : '';
    st.top = r ? `${r.y * k}px` : '';
    st.width = r ? `${r.w * k}px` : '';
    st.height = r ? `${r.h * k}px` : '';
  };
  const T = taller.layout(R.W, R.H);
  put('#sheet1', T.v.port ? null : T.sheet1);
  put('#sheet2', T.v.port ? null : T.sheet2);
  put('[data-scene="taller"] .lampbtn', T.lampRect);
  put('#keys', taller.keyboard(T).rect);
  const Q = radio.layout(R.W, R.H);
  put('#card', Q.v.port ? null : Q.sheet);
  put('[data-scene="contacto"] [data-lamp]', Q.lampRect);
  put('#framebtn', Q.frame);
  put('#tkey', Q.keyHit);
  if (zoom === 'frame') openFrame(true);
  const C = cabina.layout(R.W, R.H);
  put('#log', C.log);
  put('#pilot', C.pilot);
  const say = $('#say').style;
  say.left = `${(C.pilot.x + C.pilot.w / 2) * k}px`;
  say.top = `${C.pilot.y * k - 10}px`;
  const S = estribor.layout(R.W, R.H);
  put('#lampS', S.lamp);
  put('#mug', S.mug);
  put('#spy', S.spy);
  const say3 = $('#say3').style;
  say3.left = `${(S.mug.x + S.mug.w / 2) * k}px`;
  say3.top = `${S.mug.y * k - 6}px`;
  const B = bunker.layout(R.W, R.H);
  put('#me', B.me);
  const say2 = $('#say2').style;
  say2.left = `${B.head.x * k}px`;
  say2.top = `${(B.head.y - B.u * 0.055) * k - 8}px`;
  const plate = $('#rocky').style;
  plate.left = `${(B.frame.x + B.frame.w / 2) * k}px`;
  plate.top = `${(B.frame.y + B.frame.h) * k + 7}px`;
  document.querySelectorAll<HTMLElement>('.dial').forEach((el, i) => {
    const d = C.dials[i];
    el.style.left = `${d.x * k}px`;
    el.style.top = `${d.y * k}px`;
    el.style.setProperty('--r', `${d.r * k}px`);
  });
}

function show(id: SceneId) {
  document.querySelectorAll<HTMLElement>('[data-scene]').forEach((s) => (s.hidden = s.dataset.scene !== id));
  document.querySelectorAll<HTMLAnchorElement>('nav a').forEach((a) => {
    const here = a.getAttribute('href') === (id === 'exterior' ? '#/' : `#/${id}`);
    here ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current');
  });
  ui.dataset.at = id;
  document.title = scenes[id].title;
  audio.ambience(id);
  if (id === 'lz20') {
    dials.forEach((d, i) => setDial(i, d.value, true));
    typeIn('#log');
  }
  if (id === 'taller') typeSheet();
}

// ── Navegación por click: acercarse al lugar, disolver, entrar ───────────

let tl: gsap.core.Timeline | undefined;

function go(to: SceneId, instant = false) {
  if (to === state.scene) return;
  tl?.kill();
  const from = state.scene;
  ui.classList.add('moving');
  const swap = () => {
    resetZoom();
    pokes = 0; // la paciencia del timonel se renueva al salir de la cabina
    cabina.calm();
    lookOut(false);
    state.rise = 0;
    bunker.fx.p = 3;
    written = '';
    state.scene = to;
    state.door = 0.1;
    if (to === 'exterior' && from !== 'exterior') {
      state.focus = from === 'bunker' ? 'taller' : from;
      state.zoom = still ? 0 : 1;
    } else state.zoom = 0;
    show(to);
    if (!instant) $(`[data-scene="${to}"] h1, [data-scene="${to}"] h2`)?.focus({ preventScroll: true });
  };
  if (instant) {
    swap();
    state.fade = 0;
    ui.classList.remove('moving');
    return;
  }
  tl = gsap.timeline();
  if (from === 'exterior' && to !== 'exterior' && !still) {
    state.focus = to;
    tl.to(state, { zoom: 1, duration: 1.15, ease: 'power2.in' }, 0);
    if (to === 'taller') tl.to(state, { door: 1, duration: 0.95, ease: 'power2.inOut' }, 0);
    tl.to(state, { fade: 1, duration: 0.5, ease: 'none' }, 0.7);
  } else {
    tl.to(state, { fade: 1, duration: still ? 0.15 : 0.4, ease: 'none' });
  }
  tl.call(swap);
  tl.to(state, { fade: 0, duration: still ? 0.15 : 0.6, ease: 'none' });
  if (to === 'exterior' && !still) tl.to(state, { zoom: 0, duration: 1, ease: 'power2.out' }, '<');
  tl.call(() => ui.classList.remove('moving'));
}

/** El globo se escribe letra por letra, con un ruidito por sílaba. Devuelve el intervalo. */
function talkInto(say: HTMLElement, text: string, prev: number): number {
  clearInterval(prev);
  say.innerHTML = '<span></span><span style="opacity:0"></span>';
  const [done, rest] = say.children as unknown as HTMLElement[];
  rest.textContent = text;
  say.setAttribute('aria-label', text);
  say.classList.add('on');
  let n = 0;
  const id = window.setInterval(() => {
    n++;
    done.textContent = text.slice(0, n);
    rest.textContent = text.slice(n);
    const ch = text[n - 1];
    if (n % 2 && /\p{L}/u.test(ch)) audio.blip(ch);
    if (n >= text.length) clearInterval(id);
  }, still ? 0 : 38);
  return id;
}

// ── "true me": pararse, cruzar la puerta blindada, bajar al búnker ───────

/** La música se oye lejos desde la escalera y de lleno ya en el cuarto. */
function bunkerMusic() {
  if (state.scene === 'bunker' && bunker.fx.p >= 2) audio.music(true, bunker.fx.p >= 3 ? 1 : 0);
}

function descend() {
  if (state.scene !== 'taller') return;
  written = '';
  tl?.kill();
  const arrive = () => {
    state.scene = 'bunker';
    state.rise = 0;
    show('bunker');
  };
  tl = gsap.timeline();
  if (still) {
    ui.classList.add('moving');
    tl.to(state, { fade: 1, duration: 0.15, ease: 'none' })
      .call(() => {
        bunker.fx.p = 3;
        arrive();
        bunkerMusic();
      })
      .to(state, { fade: 0, duration: 0.15, ease: 'none' })
      .call(() => ui.classList.remove('moving'));
    return;
  }
  const P = bunker.fx;
  const WALK = 2.7;
  const OPEN = 2.3;
  const DOWN = 3.4;
  // se levanta: la silla se corre y la mesa queda abajo
  tl.call(() => audio.rise(), [], 0.15)
    .to(state, { rise: 1, duration: 1.1, ease: 'power2.inOut' }, 0.15)
    .to(state, { fade: 1, duration: 0.4, ease: 'none' }, 0.85)
    .call(() => {
      ui.classList.add('moving');
      P.p = 0;
      arrive();
    })
    .addLabel('walk')
    .to(state, { fade: 0, duration: 0.45, ease: 'none' }, 'walk')
    .to(P, { p: 1, duration: WALK, ease: 'none' }, 'walk');
  for (let i = 1; i <= 6; i++) tl.call(() => audio.step(), [], `walk+=${(WALK * (i - 0.5)) / 6}`);
  // el volante chilla, cede el cerrojo y la hoja se abre
  tl.addLabel('open', `walk+=${WALK + 0.15}`)
    .call(() => audio.creak(OPEN * 0.42), [], 'open')
    .to(P, { p: 2, duration: OPEN, ease: 'none' }, 'open')
    .call(() => audio.clank(), [], `open+=${OPEN * 0.45}`)
    .call(() => audio.creak(OPEN * 0.4), [], `open+=${OPEN * 0.55}`)
    .addLabel('down', `open+=${OPEN + 0.25}`)
    .to(P, { p: 2.999, duration: DOWN, ease: 'none' }, 'down')
    .call(bunkerMusic, [], 'down+=0.05');
  for (let i = 0; i < 9; i++) tl.call(() => audio.step(true), [], `down+=${(DOWN * (i + 0.5)) / 9}`);
  tl.to(state, { fade: 1, duration: 0.6, ease: 'none' }, `down+=${DOWN - 0.6}`)
    .call(() => {
      P.p = 3;
      ui.classList.remove('moving');
      bunkerMusic();
    })
    .to(state, { fade: 0, duration: 0.9, ease: 'none' }, '+=0.25');
}

$('#upstairs').addEventListener('click', () => go('taller'));
// en el búnker la dirección sigue siendo la del taller: el enlace igual tiene que sacar de ahí
document.querySelectorAll<HTMLAnchorElement>('.bar a').forEach((a) =>
  a.addEventListener('click', () => {
    if (state.scene === 'bunker' && a.getAttribute('href') === (location.hash || '#/')) go(route());
  }),
);

// Abajo, el dueño de casa contesta en serio
{
  const lines = [
    tr('¿Cómo llegaste aquí?', 'How did you get here?'),
    tr('Arriba está lo que muestro. Acá abajo, lo que soy.', 'Upstairs is what I show. Down here is what I am.'),
    tr('Uno entiende mejor las cosas mientras más las mira. Las personas también.', 'You understand things better the longer you look at them. People too.'),
    tr('Cada pieza tiene una razón de estar ahí. Todavía busco la mía.', 'Every part has a reason to be there. I’m still looking for mine.'),
    tr('No dejé de querer volar. Solo cambié de aeronave.', 'I never stopped wanting to fly. I just changed aircraft.'),
    tr('Si escribiste eso en la máquina, algo ya sabías.', 'If you typed that on the machine, you already knew something.'),
    tr('Nadie llega al búnker por accidente. O sí, y esa es la gracia.', 'Nobody ends up in the bunker by accident. Or they do, and that’s the fun of it.'),
    tr('Ese de la foto es Rocky. El jefe de todo esto.', 'That’s Rocky in the picture. The boss of all this.'),
    tr('Lo que no se ve también sostiene el edificio.', 'What you can’t see holds the building up too.'),
  ];
  const say = $('#say2');
  let lastLine = -1;
  let hide = 0;
  let talk = 0;
  $('#me').addEventListener('click', () => {
    bunker.poke();
    let i = Math.floor(Math.random() * (lines.length - 1));
    if (i >= lastLine) i++;
    if (lastLine < 0) i = 0; // lo primero, siempre, la pregunta
    lastLine = i;
    const text = lines[i];
    talk = talkInto(say, text, talk);
    clearTimeout(hide);
    hide = window.setTimeout(() => say.classList.remove('on'), 2400 + text.length * 80);
  });
}

// ── Cabina: girar la vista al ventanal de estribor y volver al timón ──────

function spyOut(on: boolean) {
  estribor.fx.spy = on ? 1 : 0;
  const sec = $('[data-scene="lz20"]');
  on ? sec.setAttribute('data-spy', '') : sec.removeAttribute('data-spy');
  $('#spy').setAttribute('aria-label', on ? tr('Dejar los prismáticos', 'Put the binoculars down') : tr('Prismáticos: mirar el valle de cerca', 'Binoculars: take a closer look at the valley'));
}
$('#spy').addEventListener('click', () => {
  spyOut(!estribor.fx.spy);
  audio.key();
});
$('#lampS').addEventListener('click', () => {
  estribor.fx.lamp = !(estribor.fx.lamp ?? env.daylight < 0.3);
  audio.key();
});
{
  const es = ['Café de grano. Todavía tibio.', 'Se toma mirando el valle.', 'Queda la mitad. No se lo digas al timonel.', 'Con dos de azúcar, como debe ser.', 'El termo es del timonel. El jarro, de quien lo encuentre.'];
  const en = ['Fresh coffee. Still warm.', 'Best had while watching the valley.', "Half left. Don't tell the helmsman.", 'Two sugars, as it should be.', "The flask is the helmsman's. The mug is finders keepers."];
  const say = $('#say3');
  let n = -1;
  let hide = 0;
  let talk = 0;
  $('#mug').addEventListener('click', () => {
    estribor.sip();
    audio.key();
    n = (n + 1) % es.length;
    const text = tr(es[n], en[n]);
    talk = talkInto(say, text, talk);
    clearTimeout(hide);
    hide = window.setTimeout(() => say.classList.remove('on'), 2600 + text.length * 38);
  });
}

function lookOut(on: boolean) {
  cabina.look.to = on ? 1 : 0;
  if (!on && estribor.fx.spy) {
    spyOut(false);
    estribor.fx.sp = 0;
  }
  if (!on) $('#say3').classList.remove('on');
  const sec = $('[data-scene="lz20"]');
  on ? sec.setAttribute('data-look', '') : sec.removeAttribute('data-look');
  const b = $('#look');
  b.textContent = on ? tr('← Volver al timón', '← Back to the helm') : tr('Mirar a estribor →', 'Look to starboard →');
  b.setAttribute('aria-pressed', String(on));
}
$('#look').addEventListener('click', () => lookOut(cabina.look.to === 0));
{
  // deslizar el dedo: hacia la izquierda se mira afuera, hacia la derecha se vuelve
  let sx = 0;
  let sy = 0;
  addEventListener('touchstart', (e) => ([sx, sy] = [e.touches[0].clientX, e.touches[0].clientY]), { passive: true });
  addEventListener(
    'touchend',
    (e) => {
      if (state.scene !== 'lz20') return;
      const dx = e.changedTouches[0].clientX - sx;
      const dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.8) lookOut(dx < 0);
    },
    { passive: true },
  );
}

addEventListener('hashchange', () => go(route()));
addEventListener('keydown', (e) => {
  if (state.scene === 'lz20' && (e.key === 'ArrowRight' || e.key === 'ArrowLeft') && !e.ctrlKey && !e.metaKey && !e.altKey) lookOut(e.key === 'ArrowRight');
  if (e.key === 'Escape' && zoom === 'frame') return closeFrame();
  if (e.key === 'Escape' && state.scene === 'lz20' && estribor.fx.spy) return spyOut(false);
  if (e.key === 'Escape' && state.scene !== 'exterior' && !zoom) location.hash = '#/';
  // el teclado de verdad también mueve las teclas de la máquina
  if (state.scene === 'taller' && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey && e.key.length === 1 && document.activeElement?.id !== 'keys')
    pressKey(taller.keyFor(e.key));
});

// ── Caseta: cámara sobre la mesa, cuadro de amigos y sintonía ────────────

type Zoom = '' | 'moving' | 'frame' | 'tuning';
let zoom: Zoom = '';
let ztl: gsap.core.Timeline | undefined;
const cam = { x: 0, y: 0, z: 1 }; // centro (en px del lienzo) y aumento
const radioEl = $('[data-scene="contacto"]');

/** Centro de la escena en el lienzo (en vertical la escena ocupa sólo la parte alta). */
const center = () => {
  const v = radio.layout(R.W, R.H).v;
  return { x: R.W / 2, y: v.port ? v.sh / 2 : R.H / 2, v };
};

function setZoom(z: Zoom) {
  zoom = z;
  radioEl.dataset.zoom = z;
}

function resetZoom() {
  ztl?.kill();
  cam.z = 1;
  setZoom('');
  Object.assign(radio.fx, { hold: false, key: 0 });
  audio.morse(false);
}

function aim(r: { x: number; y: number; w: number; h: number }, fw: number, fh: number) {
  const c = center();
  return { x: r.x + r.w / 2, y: r.y + r.h / 2, z: Math.min((R.W * fw) / r.w, (c.v.sh * fh) / r.h) };
}

/** Pone los enlaces de los amigos sobre sus siluetas, ya con la cámara encima del cuadro. */
function placeFriends(to: { x: number; y: number; z: number }) {
  const k = R.scale;
  const c = center();
  const P = radio.people(radio.layout(R.W, R.H));
  document.querySelectorAll<HTMLElement>('.friend').forEach((el) => {
    const r = P[Number(el.dataset.i) + 1];
    el.style.left = `${(c.x + (r.x - to.x) * to.z) * k - 6}px`;
    el.style.top = `${(c.y + (r.y - to.y) * to.z) * k - 6}px`;
    el.style.width = `${r.w * to.z * k + 12}px`;
    el.style.height = `${r.h * to.z * k + 6}px`;
  });
}

function openFrame(instant = false) {
  if (zoom && !instant) return;
  const c = center();
  const to = aim(radio.layout(R.W, R.H).frame, 0.46, 0.5);
  placeFriends(to);
  ztl?.kill();
  if (instant || still) {
    Object.assign(cam, to);
    return setZoom('frame');
  }
  Object.assign(cam, { x: c.x, y: c.y, z: 1 });
  setZoom('moving');
  ztl = gsap
    .timeline()
    .to(cam, { ...to, duration: 0.9, ease: 'power2.inOut' })
    .call(() => {
      setZoom('frame');
      document.querySelector<HTMLElement>('.friend')?.focus({ preventScroll: true });
    });
}

function closeFrame() {
  if (zoom !== 'frame') return;
  const c = center();
  ztl?.kill();
  setZoom('moving');
  ztl = gsap
    .timeline()
    .to(cam, { x: c.x, y: c.y, z: 1, duration: still ? 0 : 0.7, ease: 'power2.inOut' })
    .call(() => {
      setZoom('');
      $('#framebtn').focus({ preventScroll: true });
    });
}

/** Se mueven las perillas, aparece el nombre en el aire, y recién ahí se cambia de página. */
function tuneTo(f: Friend) {
  if (zoom !== 'frame') return;
  setZoom('tuning');
  const onair = $('#onair');
  onair.textContent = tr('Sintonizando…', 'Tuning…');
  const fxr = radio.fx;
  fxr.hold = true;
  audio.tuning(2.4);
  const to = aim(radio.layout(R.W, R.H).receiver, 0.74, 0.62);
  ztl?.kill();
  ztl = gsap
    .timeline()
    .to(cam, { ...to, duration: still ? 0 : 1.1, ease: 'power2.inOut' }, 0)
    .to(fxr, { k0: '+=5.2', duration: 1.9, ease: 'power1.inOut' }, 0.15)
    .to(fxr, { k1: '-=3.6', duration: 1.3, ease: 'power1.inOut' }, 0.5)
    .to(fxr, { k2: '+=2.3', duration: 0.9, ease: 'power2.out' }, 1.3)
    .to(fxr, { sweep: 0.1, duration: 0.7, ease: 'power1.inOut' }, 0.15)
    .to(fxr, { sweep: 0.92, duration: 0.65, ease: 'power1.inOut' }, 0.85)
    .to(fxr, { sweep: 0.37, duration: 0.8, ease: 'back.out(2.5)' }, 1.5)
    .call(() => {
      onair.textContent = `${tr('En el aire', 'On air')} · ${f.name}`;
      window.setTimeout(() => {
        if (zoom !== 'tuning') return;
        gsap.to(state, { fade: 1, duration: 0.45, ease: 'none', onComplete: () => location.assign(f.url) });
      }, 1300);
    });
}

$('#framebtn').addEventListener('click', () => openFrame());
$('#unzoom').addEventListener('click', closeFrame);
document.querySelectorAll<HTMLAnchorElement>('.friend').forEach((a) =>
  a.addEventListener('click', (e) => {
    if (e.ctrlKey || e.metaKey || e.shiftKey) return; // abrir en otra pestaña: sin ceremonia
    e.preventDefault();
    tuneTo(friends[Number(a.dataset.i)]);
  }),
);
// al volver con "atrás" desde la página del amigo, la mesa está como se dejó
addEventListener('pageshow', (e) => {
  if (!e.persisted) return;
  resetZoom();
  gsap.to(state, { fade: 0, duration: 0.4, ease: 'none' });
});

// El timonel contesta cuando le dan un golpecito… y a los 50 se le acaba la paciencia
let pokes = 0;
let shooting = false;
const LIMIT = Number(new URLSearchParams(location.search).get('golpes')) || 50; // ?golpes=N para probar
{
  const lines = [
    'Ouch!',
    'Hey! Coffee first, alright?',
    "Easy — I'm flying here.",
    'Do you mind? Steering a zeppelin.',
    'One more and you take the wheel.',
    'Ow! What was that for?',
    'Hands off the pilot, please.',
    'Careful, this cap is vintage.',
  ];
  const say = $('#say');
  let lastLine = -1;
  let hide = 0;
  let talk = 0;
  const speakUp = (text: string) => {
    talk = talkInto(say, text, talk);
    clearTimeout(hide);
    hide = window.setTimeout(() => say.classList.remove('on'), 2600 + text.length * 38);
  };
  $('#pilot').addEventListener('click', () => {
    if (shooting) return;
    pokes++;
    cabina.poke();
    audio.key();
    if (pokes >= LIMIT) {
      // se da vuelta, dispara, y el visitante despierta afuera del hangar
      shooting = true;
      pokes = 0;
      speakUp("That's it.");
      cabina.shoot();
      const flash = $('#flash');
      window.setTimeout(() => {
        audio.shot();
        say.classList.remove('on');
        flash.classList.remove('on');
        void flash.offsetWidth;
        flash.classList.add('on');
      }, cabina.SHOT_AT * 1000);
      window.setTimeout(() => {
        shooting = false;
        if (state.scene === 'lz20') {
          tl?.kill();
          go('exterior', true);
          gsap.to(state, { zoom: 0, duration: still ? 0 : 1.2, ease: 'power2.out' }); // se aleja hasta el plano general
          history.replaceState(null, '', '#/');
        }
        cabina.calm();
      }, cabina.SHOT_AT * 1000 + 180);
      return;
    }
    if (pokes === LIMIT - 10) return speakUp("I'm warning you…");
    if (pokes === LIMIT - 1) return speakUp('Last warning.');
    let i = Math.floor(Math.random() * (lines.length - 1));
    if (i >= lastLine) i++; // nunca la misma dos veces seguidas
    if (lastLine < 0) i = 0; // la primera siempre es el quejido
    lastLine = i;
    speakUp(lines[i]);
  });
}

// Manipulador telegráfico: suena mientras se mantiene presionado
{
  const key = $('#tkey');
  const set = (down: boolean) => {
    if ((radio.fx.key > 0) === down) return;
    radio.fx.key = down ? 1 : 0;
    audio.morse(down);
  };
  key.addEventListener('pointerdown', (e) => {
    key.setPointerCapture(e.pointerId);
    set(true);
  });
  for (const ev of ['pointerup', 'pointercancel', 'blur'] as const) key.addEventListener(ev, () => set(false));
  key.addEventListener('keydown', (e) => (e.key === ' ' || e.key === 'Enter') && set(true));
  key.addEventListener('keyup', () => set(false));
}

// Teclado de la máquina: cada tecla se hunde donde se toca
{
  const keys = $('#keys');
  keys.addEventListener('pointerdown', (e) => pressKey(taller.keyAt(R.W, R.H, e.clientX / R.scale, e.clientY / R.scale)));
  keys.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.key === ' ' || e.key === 'Enter') e.preventDefault();
    pressKey(e.key === 'Enter' ? taller.SPACE : taller.keyFor(e.key));
  });
}

// ── Bucle de dibujo ──────────────────────────────────────────────────────

const FPS = still ? 4 : 20;
let last = 0;
const drift0 = Math.random() * 50;
let lastLit = '';
let lastCar = '';
let lastCam = '';
let lastSec = -1;
const sheet2 = $('#sheet2');
const stage = $('[data-scene="contacto"] .stage');
const card = $('[data-scene="contacto"] .papers');
const tallerEl = $('[data-scene="taller"]');
let lastRise = '';

let lastTurn = '';
const boardEl = $('.board');
function frame(now: number) {
  requestAnimationFrame(frame);
  if (document.hidden || now - last < 1000 / FPS) return;
  last = now;
  const t = now / 1000;
  const { W, H } = R;
  const sc = scenes[state.scene];
  const hz = sc.horizon(W, H);
  const sun = sunPosition();
  const sky: Sky = {
    horizon: hz,
    cover: cond.cover,
    drift: drift0 + (still ? 0 : t * (state.scene === 'lz20' ? 0.03 : 0.008)),
    sunX: W * sun.x,
    sunY: hz - sun.alt * hz * 0.86 + (sun.day ? hz * 0.03 : 0),
    sunR: Math.max(3, Math.min(W, H) * (sun.day ? 0.034 : 0.022)),
    glow: sun.day ? 0.75 : 0.25,
  };
  env.door = state.door;
  const lit = (0.5 + 0.5 * Math.max(env.lamp, env.daylight)).toFixed(2);
  if (lit !== lastLit) {
    lastLit = lit;
    ui.style.setProperty('--lit', lit);
    ui.style.setProperty('--lit-cab', (0.72 + 0.28 * env.daylight).toFixed(2));
  }
  R.begin();
  const ctx = R.ctx;
  if (state.scene === 'exterior' && state.zoom > 0) {
    const r = exterior.layout(W, H).spots[state.focus];
    const z = 1 + state.zoom * (state.focus === 'lz20' ? 3.2 : 4.5);
    const fx = W / 2 + (r.x + r.w / 2 - W / 2) * state.zoom;
    const fy = H / 2 + (r.y + r.h * (state.focus === 'lz20' ? 0.5 : 0.7) - H / 2) * state.zoom;
    ctx.translate(W / 2, H / 2);
    ctx.scale(z, z);
    ctx.translate(-fx, -fy);
    sky.horizon = H / 2 + (hz - fy) * z;
  }
  const up = state.scene === 'taller' ? state.rise * H * 0.34 : 0;
  const rise = up ? `translateY(${(up * R.scale).toFixed(1)}px)` : '';
  if (rise !== lastRise) tallerEl.style.transform = lastRise = rise;
  if (up) {
    // de pie: el escritorio se va hacia abajo y arriba queda el muro en penumbra
    ctx.fillStyle = g(0.02);
    ctx.fillRect(0, 0, W, H);
    ctx.translate(0, up);
  }
  if (state.scene === 'taller') {
    // el papel viaja con el carro; el reloj da el tic y el tac
    const car = (taller.carriageDx(taller.layout(W, H)) * R.scale).toFixed(1);
    if (car !== lastCar) sheet2.style.setProperty('--car', `${(lastCar = car)}px`);
    const sec = new Date().getSeconds();
    if (sec !== lastSec) {
      lastSec = sec;
      if (!still && state.fade < 0.5) audio.tick(sec % 2);
    }
  }
  let tf = '';
  if (state.scene === 'contacto' && cam.z > 1.001) {
    const c = center();
    ctx.translate(c.x, c.y);
    ctx.scale(cam.z, cam.z);
    ctx.translate(-cam.x, -cam.y);
    sky.horizon = c.y + (hz - cam.y) * cam.z;
    const k = R.scale;
    tf = `translate(${(c.x * k).toFixed(1)}px,${(c.y * k).toFixed(1)}px) scale(${cam.z.toFixed(4)}) translate(${(-cam.x * k).toFixed(1)}px,${(-cam.y * k).toFixed(1)}px)`;
  }
  if (tf !== lastCam) stage.style.transform = card.style.transform = lastCam = tf;
  sc.draw(ctx, W, H, t, env);
  // los diales y la bitácora están atornillados al tablero: se van con él al girar la vista
  let turn = '';
  if (state.scene === 'lz20' && cabina.shift.a > 0.0005) {
    const f = ((W / 2) * R.scale).toFixed(1);
    turn = `perspective(${f}px) translateZ(${f}px) rotateY(${cabina.shift.a.toFixed(4)}rad) translateZ(-${f}px) translateY(${(cabina.shift.y * R.scale).toFixed(1)}px)`;
  }
  if (turn !== lastTurn) boardEl.style.transform = lastTurn = turn;
  R.end(pal, sky, state.fade);
}

// ── Arranque ─────────────────────────────────────────────────────────────

buildDials();
refresh();
place();
show(state.scene);

addEventListener('resize', () => {
  R.resize();
  place();
});

document.querySelectorAll<HTMLElement>('[data-lamp]').forEach((b) =>
  b.addEventListener('click', () => {
    setLamp(!lampOn);
    audio.key();
  }),
);

const sndBtn = $('#snd');
const showSnd = (on: boolean) => {
  ui.toggleAttribute('data-snd', on);
  sndBtn.setAttribute('aria-pressed', String(on));
  sndBtn.textContent = on ? tr('Sonido · sí', 'Sound · on') : tr('Sonido · no', 'Sound · off');
};
showSnd(audio.enabled());
// activado por defecto. El navegador no deja sonar nada hasta que el visitante
// interactúa, así que se reintenta en cada gesto hasta que el audio corre de verdad
// (y se prueba al cargar, por si el navegador ya lo permite).
const GESTURES = ['pointerdown', 'pointerup', 'click', 'touchend', 'keydown'] as const;
const wake = () => {
  audio.unlock();
  audio.ambience(state.scene);
  bunkerMusic();
  if (audio.running()) GESTURES.forEach((g) => removeEventListener(g, wake, true));
  else setTimeout(() => audio.running() && GESTURES.forEach((g) => removeEventListener(g, wake, true)), 200);
};
GESTURES.forEach((g) => addEventListener(g, wake, true));
wake();
sndBtn.addEventListener('click', () => {
  showSnd(audio.toggle());
  audio.ambience(state.scene);
  bunkerMusic();
});

void loadWeather().then(refresh);
setInterval(refresh, 30_000);
setInterval(() => void loadWeather().then(refresh), 15 * 60_000);

void document.fonts.ready.then(() => {
  requestAnimationFrame(frame);
  gsap.to(state, { fade: 0, duration: still ? 0.2 : 1.1, ease: 'none', delay: 0.1 });
});
