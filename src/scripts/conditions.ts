import { tr } from './i18n';
// Condiciones en vivo de Chillán: hora y clima reales del autor, no del visitante.
// Un solo sistema alimenta la paleta, el cielo, la lluvia y los instrumentos.

import type { Palette, RGB } from './dither';

export interface Conditions {
  hour: number;
  sunrise: number;
  sunset: number;
  cover: number; // nubosidad 0..1
  rain: number; // 0..1
  temp: number | null;
  wind: number | null;
  live: boolean; // false = la API falló y el clima es aleatorio
}

const LAT = -36.6066;
const LON = -72.1034;
const TZ = 'America/Santiago';

export const cond: Conditions = {
  hour: 12,
  sunrise: 7,
  sunset: 20.5,
  cover: 0.3,
  rain: 0,
  temp: null,
  wind: null,
  live: false,
};

const params = new URLSearchParams(location.search);

function chillanHour(): number {
  const forced = parseFloat(params.get('hora') ?? '');
  if (!Number.isNaN(forced)) return forced;
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const n = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return (n('hour') % 24) + n('minute') / 60;
}

export function tick() {
  cond.hour = chillanHour();
}

const isoHour = (iso: string) => {
  const m = /T(\d+):(\d+)/.exec(iso);
  return m ? Number(m[1]) + Number(m[2]) / 60 : NaN;
};

function randomWeather() {
  // Fallback decidido en las notas: si no hay dato real, se sortea el clima.
  const r = Math.random();
  cond.cover = r < 0.4 ? 0.1 : r < 0.75 ? 0.5 : 0.95;
  cond.rain = cond.cover > 0.9 && Math.random() < 0.5 ? 0.7 : 0;
  cond.temp = null;
  cond.wind = null;
  cond.live = false;
}

function applyOverride() {
  const c = params.get('clima');
  if (c === 'despejado') [cond.cover, cond.rain] = [0.05, 0];
  if (c === 'parcial') [cond.cover, cond.rain] = [0.45, 0];
  if (c === 'nublado') [cond.cover, cond.rain] = [0.95, 0];
  if (c === 'lluvia') [cond.cover, cond.rain] = [1, 0.8];
}

export async function loadWeather() {
  tick();
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
      `&current=temperature_2m,precipitation,cloud_cover,wind_speed_10m` +
      `&daily=sunrise,sunset&timezone=${encodeURIComponent(TZ)}&forecast_days=1`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(String(res.status));
    const d = await res.json();
    cond.temp = d.current.temperature_2m;
    cond.wind = d.current.wind_speed_10m;
    cond.cover = d.current.cloud_cover / 100;
    cond.rain = Math.min(1, d.current.precipitation / 2.5);
    if (cond.rain > 0) cond.rain = Math.max(0.35, cond.rain);
    const sr = isoHour(d.daily.sunrise[0]);
    const ss = isoHour(d.daily.sunset[0]);
    if (!Number.isNaN(sr) && !Number.isNaN(ss)) [cond.sunrise, cond.sunset] = [sr, ss];
    cond.live = true;
  } catch {
    randomWeather();
  }
  applyOverride();
}

export function weatherLabel() {
  if (cond.rain > 0) return tr('Lluvia', 'Rain');
  if (cond.cover > 0.7) return tr('Nublado', 'Overcast');
  if (cond.cover > 0.3) return tr('Parcial', 'Partly cloudy');
  return tr('Despejado', 'Clear');
}

export function clockLabel() {
  const h = Math.floor(cond.hour);
  const m = Math.floor((cond.hour - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// ── Paleta ────────────────────────────────────────────────────────────────

const hex = (s: string): RGB => [
  parseInt(s.slice(1, 3), 16),
  parseInt(s.slice(3, 5), 16),
  parseInt(s.slice(5, 7), 16),
];

const AMBER = hex('#f2a65a');

type Key = Omit<Palette, 'amber'>;

const NIGHT: Key = {
  zenith: hex('#0d1b2a'),
  horizon: hex('#1d3350'),
  ink: hex('#050b13'),
  light: hex('#a9bccd'),
  cloud: hex('#2c4560'),
  stars: 1,
};
const DAWN: Key = {
  zenith: hex('#6b5a8c'),
  horizon: hex('#e8b08c'),
  ink: hex('#1f1830'),
  light: hex('#f6e6d3'),
  cloud: hex('#f4d2b8'),
  stars: 0,
};
const DAY: Key = {
  zenith: hex('#3b72ab'),
  horizon: hex('#7fabd4'),
  ink: hex('#0e2136'),
  light: hex('#f2ede1'),
  cloud: hex('#e9f0f3'),
  stars: 0,
};
const DUSK: Key = {
  zenith: hex('#6b3b6e'),
  horizon: hex('#d9713f'),
  ink: hex('#1c0f26'),
  light: hex('#f8d6ab'),
  cloud: hex('#f0a070'),
  stars: 0,
};

const mix = (a: RGB, b: RGB, t: number): RGB => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
];

function mixKey(a: Key, b: Key, t: number): Key {
  return {
    zenith: mix(a.zenith, b.zenith, t),
    horizon: mix(a.horizon, b.horizon, t),
    ink: mix(a.ink, b.ink, t),
    light: mix(a.light, b.light, t),
    cloud: mix(a.cloud, b.cloud, t),
    stars: a.stars + (b.stars - a.stars) * t,
  };
}

/** Degradado continuo a lo largo del día, anclado al amanecer y atardecer reales. */
export function palette(): Palette {
  const { hour: h, sunrise: sr, sunset: ss, cover } = cond;
  const keys: [number, Key][] = [
    [sr - 1.3, NIGHT],
    [sr - 0.1, DAWN],
    [sr + 1.6, DAY],
    [ss - 1.7, DAY],
    [ss - 0.15, DUSK],
    [ss + 1.1, NIGHT],
  ];
  let k: Key = NIGHT;
  for (let i = 0; i < keys.length - 1; i++) {
    const [h0, a] = keys[i];
    const [h1, b] = keys[i + 1];
    if (h >= h0 && h <= h1) {
      const t = (h - h0) / (h1 - h0);
      k = mixKey(a, b, t * t * (3 - 2 * t));
      break;
    }
  }
  // Cielo cubierto: la paleta se apaga hacia gris sin perder la hora.
  const dull = cover * 0.5;
  const grey = (c: RGB): RGB => {
    const l = 0.3 * c[0] + 0.55 * c[1] + 0.15 * c[2];
    return mix(c, [l * 0.96, l, l * 1.06].map(Math.round) as RGB, dull);
  };
  return {
    zenith: grey(k.zenith),
    horizon: grey(k.horizon),
    cloud: grey(k.cloud),
    ink: k.ink,
    light: mix(k.light, k.horizon, cover * 0.18),
    amber: AMBER,
    stars: k.stars * (1 - cover),
  };
}

/** Posición del sol (o la luna) en el cielo, 0..1 en x y altura 0..1. */
export function sunPosition() {
  const { hour: h, sunrise: sr, sunset: ss } = cond;
  const day = h >= sr && h <= ss;
  let f: number;
  if (day) f = (h - sr) / (ss - sr);
  else {
    const night = 24 - (ss - sr);
    f = ((h < sr ? h + 24 : h) - ss) / night;
  }
  return { day, x: 0.9 - 0.8 * f, alt: Math.sin(Math.PI * f) };
}
