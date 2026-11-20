// Sonido ambiente sintetizado (sin archivos). Activado por defecto, pero los
// navegadores no dejan sonar nada sin un gesto: arranca con el primer clic o tecla.

let ac: AudioContext | null = null;
let master: GainNode;
let wind: GainNode;
let windFilter: BiquadFilterNode;
let drone: GainNode;
let on = true;

// corte del viento: abierto afuera, amortiguado puertas adentro
const WIND_OUT = 1700;
const WIND_IN = 260;

/** Ruido rosa en bucle: las puntas se funden entre sí para que la vuelta no haga clic. */
function noiseBuffer(ctx: AudioContext, seconds: number) {
  const n = Math.floor(ctx.sampleRate * seconds);
  const fade = Math.floor(ctx.sampleRate * 0.6);
  const raw = new Float32Array(n + fade);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0; // prettier-ignore
  for (let i = 0; i < raw.length; i++) {
    const w = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179;
    b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.969 * b2 + w * 0.153852;
    b3 = 0.8665 * b3 + w * 0.3104856;
    b4 = 0.55 * b4 + w * 0.5329522;
    b5 = -0.7616 * b5 - w * 0.016898;
    raw[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
    b6 = w * 0.115926;
  }
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  d.set(raw.subarray(0, n));
  for (let i = 0; i < fade; i++) {
    const k = i / fade;
    d[i] = raw[i] * Math.sqrt(k) + raw[n + i] * Math.sqrt(1 - k);
  }
  return buf;
}

/** Oscilador lento que mueve un parámetro: así el viento respira en vez de quedarse fijo. */
function sway(ctx: AudioContext, hz: number, depth: number, ...targets: AudioParam[]) {
  const o = ctx.createOscillator();
  o.frequency.value = hz;
  const g = ctx.createGain();
  g.gain.value = depth;
  o.connect(g);
  for (const t of targets) g.connect(t);
  o.start();
  return g;
}

/** Viento: un fondo grave y parejo, ráfagas que suben y bajan de tono y de fuerza
 *  (tres vaivenes de períodos que no calzan, para que nunca se repita igual), y un
 *  poco de aire agudo que solo se oye afuera. */
function buildWind(ctx: AudioContext, dest: AudioNode) {
  // nivel calzado con el del viento anterior
  const out = ctx.createGain();
  out.gain.value = 0.72;
  out.connect(dest);
  const loop = (seconds: number) => {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, seconds);
    src.loop = true;
    src.start();
    return src;
  };
  const a = loop(11);
  const b = loop(13);

  // fondo
  const bodyLp = ctx.createBiquadFilter();
  bodyLp.type = 'lowpass';
  bodyLp.frequency.value = 300;
  bodyLp.Q.value = 0.4;
  const body = ctx.createGain();
  body.gain.value = 1.5;
  a.connect(bodyLp).connect(body).connect(out);
  sway(ctx, 0.047, 0.4, body.gain);

  // ráfagas
  const gustBp = ctx.createBiquadFilter();
  gustBp.type = 'bandpass';
  gustBp.frequency.value = 430;
  gustBp.Q.value = 0.8;
  const gust = ctx.createGain();
  gust.gain.value = 1.1;
  const pan = ctx.createStereoPanner();
  b.connect(gustBp).connect(gust).connect(pan).connect(out);
  // la misma ráfaga sube el tono y la fuerza a la vez
  for (const [hz, f, v] of [[0.083, 150, 0.5], [0.031, 90, 0.3], [0.137, 50, 0.16]] as const) {
    sway(ctx, hz, f, gustBp.frequency);
    sway(ctx, hz, v, gust.gain);
  }
  sway(ctx, 0.021, 0.45, pan.pan);

  // aire
  const airBp = ctx.createBiquadFilter();
  airBp.type = 'bandpass';
  airBp.frequency.value = 1500;
  airBp.Q.value = 0.5;
  const air = ctx.createGain();
  air.gain.value = 0.16;
  b.connect(airBp).connect(air).connect(out);
  sway(ctx, 0.083, 0.1, air.gain);
}

function init() {
  ac = new AudioContext();
  master = ac.createGain();
  master.gain.value = 0;
  master.connect(ac.destination);

  windFilter = ac.createBiquadFilter();
  windFilter.type = 'lowpass';
  windFilter.frequency.value = WIND_OUT;
  windFilter.Q.value = 0.3;
  wind = ac.createGain();
  wind.gain.value = 0.2;
  buildWind(ac, windFilter);
  windFilter.connect(wind).connect(master);

  drone = ac.createGain();
  drone.gain.value = 0;
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 160;
  for (const f of [46, 69.5, 92.3]) {
    const o = ac.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = f;
    o.connect(lp);
    o.start();
  }
  lp.connect(drone).connect(master);
}

function apply() {
  if (!ac) init();
  void ac!.resume();
  master.gain.setTargetAtTime(on ? 0.5 : 0, ac!.currentTime, 0.3);
}

/** Intenta hacer sonar el audio si está activado. Devuelve true si ya suena
 *  (o si está apagado: no hay nada que desbloquear). */
export function unlock(): boolean {
  if (!on) return true;
  apply();
  return ac!.state === 'running';
}

export const running = () => !on || ac?.state === 'running';

export function toggle(): boolean {
  on = !on;
  apply();
  return on;
}

/** Afuera: viento abierto. Adentro: todo lejano y amortiguado. */
export function ambience(scene: string) {
  if (!ac) return;
  const t = ac.currentTime;
  const inside = scene !== 'exterior';
  windFilter.frequency.setTargetAtTime(inside ? WIND_IN : WIND_OUT, t, 0.4);
  wind.gain.setTargetAtTime(scene === 'bunker' ? 0.06 : inside ? 0.3 : 0.2, t, 0.4);
  // motores del dirigible; bajo tierra, apenas el zumbido del generador
  drone.gain.setTargetAtTime(scene === 'lz20' ? 0.05 : scene === 'bunker' ? 0.022 : 0, t, 0.6);
  radioStatic(scene === 'contacto');
  if (scene !== 'bunker') music(false); // la del búnker la enciende la bajada
}

/** Golpe de tecla de máquina de escribir. */
export function key() {
  if (!ac || !on) return;
  const t = ac.currentTime;
  const src = ac.createBufferSource();
  const len = Math.floor(ac.sampleRate * 0.03);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  src.buffer = buf;
  const bp = ac.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 1800 + Math.random() * 900;
  bp.Q.value = 1.2;
  const gn = ac.createGain();
  gn.gain.value = 0.5;
  src.connect(bp).connect(gn).connect(master);
  src.start(t);
  const o = ac.createOscillator();
  const og = ac.createGain();
  o.frequency.setValueAtTime(140, t);
  o.frequency.exponentialRampToValueAtTime(60, t + 0.05);
  og.gain.setValueAtTime(0.25, t);
  og.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
  o.connect(og).connect(master);
  o.start(t);
  o.stop(t + 0.07);
}

function click(freq: number, gain: number, dur = 0.02) {
  if (!ac || !on) return;
  const t = ac.currentTime;
  const o = ac.createOscillator();
  const og = ac.createGain();
  o.type = 'square';
  o.frequency.value = freq;
  og.gain.setValueAtTime(gain, t);
  og.gain.exponentialRampToValueAtTime(0.001, t + dur);
  const bp = ac.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = freq;
  bp.Q.value = 4;
  o.connect(bp).connect(og).connect(master);
  o.start(t);
  o.stop(t + dur + 0.01);
}

/** Tic (0) y tac (1) del reloj de mesa. */
export function tick(alt: number) {
  click(alt ? 2100 : 2900, 0.12);
}

/** Campanilla de fin de línea de la máquina de escribir. */
export function bell() {
  if (!ac || !on) return;
  const t = ac.currentTime;
  for (const [f, g0] of [[2637, 0.12], [5274, 0.04]] as const) {
    const o = ac.createOscillator();
    const og = ac.createGain();
    o.frequency.value = f;
    og.gain.setValueAtTime(g0, t);
    og.gain.exponentialRampToValueAtTime(0.0005, t + 0.9);
    o.connect(og).connect(master);
    o.start(t);
    o.stop(t + 1);
  }
}

// ── Radio: estática de fondo, sintonía, telégrafo y voz ──

let staticGain: GainNode | null = null;

function ensureStatic() {
  if (!ac || staticGain) return;
  const len = ac.sampleRate * 2;
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    // siseo con chasquidos sueltos
    d[i] = (Math.random() * 2 - 1) * 0.5 + (Math.random() < 0.0006 ? (Math.random() * 2 - 1) * 3 : 0);
  }
  const src = ac.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const bp = ac.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 2400;
  bp.Q.value = 0.6;
  staticGain = ac.createGain();
  staticGain.gain.value = 0;
  src.connect(bp).connect(staticGain).connect(master);
  src.start();
}

/** Estática suave mientras se está en la caseta. */
export function radioStatic(inRoom: boolean) {
  if (!ac) return;
  ensureStatic();
  staticGain!.gain.setTargetAtTime(inRoom ? 0.035 : 0, ac.currentTime, 0.4);
}

/** Barrido de sintonía: sube la estática y silba el heterodino. */
export function tuning(seconds: number) {
  if (!ac || !on) return;
  ensureStatic();
  const t = ac.currentTime;
  staticGain!.gain.cancelScheduledValues(t);
  staticGain!.gain.setTargetAtTime(0.3, t, 0.08);
  staticGain!.gain.setTargetAtTime(0.06, t + seconds * 0.45, 0.2);
  const o = ac.createOscillator();
  const og = ac.createGain();
  o.frequency.setValueAtTime(3200, t);
  o.frequency.exponentialRampToValueAtTime(260, t + seconds * 0.25);
  o.frequency.exponentialRampToValueAtTime(1900, t + seconds * 0.4);
  o.frequency.exponentialRampToValueAtTime(90, t + seconds * 0.55);
  og.gain.setValueAtTime(0.0001, t);
  og.gain.linearRampToValueAtTime(0.06, t + 0.05);
  og.gain.setValueAtTime(0.06, t + seconds * 0.5);
  og.gain.linearRampToValueAtTime(0.0001, t + seconds * 0.58);
  o.connect(og).connect(master);
  o.start(t);
  o.stop(t + seconds * 0.6);
}

let morseOsc: OscillatorNode | null = null;
let morseGain: GainNode | null = null;

/** Tono del manipulador telegráfico mientras está presionado. */
export function morse(down: boolean) {
  if (!ac || !on) return;
  if (!morseOsc) {
    morseOsc = ac.createOscillator();
    morseOsc.frequency.value = 640;
    morseGain = ac.createGain();
    morseGain.gain.value = 0;
    morseOsc.connect(morseGain).connect(master);
    morseOsc.start();
  }
  morseGain!.gain.setTargetAtTime(down ? 0.16 : 0, ac.currentTime, 0.004);
}

export const enabled = () => on;

/** Disparo: estampido de ruido con golpe grave. */
export function shot() {
  if (!ac || !on) return;
  const t = ac.currentTime;
  const len = Math.floor(ac.sampleRate * 0.5);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.12));
  const src = ac.createBufferSource();
  src.buffer = buf;
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(6000, t);
  lp.frequency.exponentialRampToValueAtTime(400, t + 0.4);
  const ng = ac.createGain();
  ng.gain.value = 0.9;
  src.connect(lp).connect(ng).connect(master);
  src.start(t);
  const o = ac.createOscillator();
  const og = ac.createGain();
  o.frequency.setValueAtTime(160, t);
  o.frequency.exponentialRampToValueAtTime(35, t + 0.3);
  og.gain.setValueAtTime(0.7, t);
  og.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
  o.connect(og).connect(master);
  o.start(t);
  o.stop(t + 0.4);
}

// ── Búnker: levantarse, caminar, la puerta blindada ──

function burst(dur: number, type: BiquadFilterType, f0: number, f1: number, gain: number, q = 1, attack = 0.005) {
  if (!ac || !on) return;
  const t = ac.currentTime;
  const len = Math.floor(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buf;
  const f = ac.createBiquadFilter();
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(f0, t);
  f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const gn = ac.createGain();
  gn.gain.setValueAtTime(0.0001, t);
  gn.gain.linearRampToValueAtTime(gain, t + attack);
  gn.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f).connect(gn).connect(master);
  src.start(t);
}

/** La silla se corre hacia atrás al levantarse. */
export function rise() {
  burst(0.55, 'bandpass', 320, 520, 0.5, 5, 0.12);
  burst(0.2, 'lowpass', 200, 80, 0.5);
}

/** Un paso: sobre el piso del hangar o, más seco y metálico, en la escalera. */
export function step(metal = false) {
  burst(0.11, 'lowpass', metal ? 900 : 380, 90, metal ? 0.55 : 0.7);
  if (metal) click(520 + Math.random() * 60, 0.05, 0.12);
}

/** El volante de la puerta girando: chirrido que sube y baja. */
export function creak(seconds = 0.9) {
  if (!ac || !on) return;
  const t = ac.currentTime;
  const o = ac.createOscillator();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(210, t);
  o.frequency.linearRampToValueAtTime(340, t + seconds * 0.4);
  o.frequency.linearRampToValueAtTime(250, t + seconds * 0.7);
  o.frequency.linearRampToValueAtTime(390, t + seconds);
  const wob = ac.createOscillator();
  wob.frequency.value = 23;
  const wg = ac.createGain();
  wg.gain.value = 30;
  wob.connect(wg).connect(o.frequency);
  const bp = ac.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 1500;
  bp.Q.value = 7;
  const og = ac.createGain();
  og.gain.setValueAtTime(0.0001, t);
  og.gain.linearRampToValueAtTime(0.16, t + 0.08);
  og.gain.setValueAtTime(0.16, t + seconds * 0.85);
  og.gain.linearRampToValueAtTime(0.0001, t + seconds);
  o.connect(bp).connect(og).connect(master);
  o.start(t);
  wob.start(t);
  o.stop(t + seconds + 0.02);
  wob.stop(t + seconds + 0.02);
}

/** Cede el cerrojo: golpe de acero con cola. */
/** Explosión lejana: el chasquido y después el trueno largo que llega rodando. */
export function boom() {
  if (!ac || !on) return;
  burst(0.35, 'lowpass', 2200, 150, 0.7);
  burst(4.5, 'lowpass', 260, 32, 1.5, 0.7, 0.25);
}

export function clank() {
  if (!ac || !on) return;
  const t = ac.currentTime;
  burst(0.3, 'lowpass', 1400, 70, 0.9);
  for (const [f, g0, dur] of [[187, 0.2, 1.1], [311, 0.12, 0.8], [523, 0.07, 0.6], [842, 0.04, 0.4]] as const) {
    const o = ac.createOscillator();
    const og = ac.createGain();
    o.type = 'triangle';
    o.frequency.value = f;
    og.gain.setValueAtTime(g0, t);
    og.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    o.connect(og).connect(master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
}

// ── Búnker: la radio de otro cuarto, en 8 bits ──
// Balada original al estilo de los años 40 (I–vi–ii–V con corcheas atresilladas),
// tocada con ondas cuadradas y triangulares y apagada como si sonara pared por medio.

const BEAT = 60 / 74;
const hz = (m: number) => 440 * 2 ** ((m - 69) / 12);
const CHORDS: Record<string, number[]> = {
  F: [53, 57, 60, 64],
  Dm: [50, 53, 57, 60],
  Gm: [55, 58, 62, 65],
  C7: [48, 52, 55, 58],
  Am: [57, 60, 64, 67],
  D7: [50, 54, 57, 60],
  F6: [53, 57, 60, 62],
};
// un acorde por cada medio compás (dos tiempos)
const HARMONY = ['F', 'F', 'Dm', 'Dm', 'Gm', 'Gm', 'C7', 'C7', 'Am', 'Am', 'D7', 'D7', 'Gm', 'C7', 'F6', 'F6', 'F', 'F', 'Dm', 'Dm', 'Gm', 'Gm', 'C7', 'C7', 'Am', 'D7', 'Gm', 'C7', 'F6', 'C7', 'F6', 'F6'];
// melodía: [tiempo, duración, nota]
const TUNE: [number, number, number][] = [
  [0, 2, 69], [2, 1, 72], [3, 1, 69],
  [4, 1.67, 65], [5.67, 0.33, 69], [6, 2, 74],
  [8, 1, 70], [9, 1, 69], [10, 1, 67], [11, 1, 70],
  [12, 2, 67], [14, 1.5, 64],
  [16, 2, 72], [18, 1, 76], [19, 1, 72],
  [20, 1.67, 69], [21.67, 0.33, 66], [22, 2, 69],
  [24, 1, 70], [25, 1, 74], [26, 1, 72], [27, 1, 67],
  [28, 3, 65],
  // segunda vuelta, con respuesta más arriba
  [32, 1.67, 72], [33.67, 0.33, 74], [34, 1, 77], [35, 1, 72],
  [36, 2, 74], [38, 0.67, 72], [38.67, 0.33, 69], [39, 1, 65],
  [40, 1, 67], [41, 0.67, 70], [41.67, 0.33, 74], [42, 2, 77],
  [44, 1.67, 76], [45.67, 0.33, 74], [46, 1.5, 72],
  [48, 1, 76], [49, 1, 72], [50, 1, 74], [51, 1, 69],
  [52, 1, 70], [53, 1, 67], [54, 1, 64], [55, 1, 67],
  [56, 3, 65], [60, 0.67, 60], [60.67, 0.33, 62], [61, 3, 65],
];
const LOOP = 64;

let musicBus: GainNode | null = null;
let musicLp: BiquadFilterNode;
let musicTimer = 0;
let nextBeat = 0;
let nextAt = 0;

function note(type: OscillatorType, m: number, at: number, dur: number, gain: number, vibrato = 0) {
  const o = ac!.createOscillator();
  const og = ac!.createGain();
  o.type = type;
  o.frequency.value = hz(m);
  if (vibrato) {
    const l = ac!.createOscillator();
    const lg = ac!.createGain();
    l.frequency.value = 5.2;
    lg.gain.setValueAtTime(0, at);
    lg.gain.linearRampToValueAtTime(vibrato, at + Math.min(0.5, dur));
    l.connect(lg).connect(o.frequency);
    l.start(at);
    l.stop(at + dur + 0.1);
  }
  og.gain.setValueAtTime(0.0001, at);
  og.gain.linearRampToValueAtTime(gain, at + 0.015);
  og.gain.exponentialRampToValueAtTime(gain * 0.55, at + Math.min(0.25, dur * 0.5));
  og.gain.setValueAtTime(gain * 0.55, at + dur * 0.85);
  og.gain.linearRampToValueAtTime(0.0001, at + dur);
  o.connect(og).connect(musicBus!);
  o.start(at);
  o.stop(at + dur + 0.05);
}

function scheduleBeat(b: number, at: number) {
  const ch = CHORDS[HARMONY[b >> 1]];
  // bajo: fundamental y quinta, alternando
  note('triangle', ch[b % 2 ? 2 : 0] - 12, at, BEAT * 0.9, 0.5);
  // acompañamiento arpegiado, atresillado
  note('square', ch[(b * 2) % 4] + 12, at, BEAT * 0.5, 0.045);
  note('square', ch[(b * 2 + 1) % 4] + 12, at + BEAT * 0.67, BEAT * 0.3, 0.035);
  for (const [t0, d, m] of TUNE) if (t0 >= b && t0 < b + 1) note('square', m, at + (t0 - b) * BEAT, d * BEAT * 0.96, 0.11, 3);
}

/** Enciende o apaga la musiquita del búnker. near: 0 = lejos, escalera arriba · 1 = en el cuarto. */
export function music(play: boolean, near = 1) {
  if (!ac) return;
  if (!musicBus) {
    musicBus = ac.createGain();
    musicBus.gain.value = 0;
    // "en otra pieza": sin agudos ni graves profundos, como parlante chico
    const lp = (musicLp = ac.createBiquadFilter());
    lp.type = 'lowpass';
    lp.frequency.value = 350;
    const hp = ac.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 140;
    musicBus.connect(lp).connect(hp).connect(master);
    // crepitar de disco
    const len = ac.sampleRate * 3;
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * 0.04 + (Math.random() < 0.0004 ? (Math.random() * 2 - 1) * 1.5 : 0);
    const src = ac.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const cg = ac.createGain();
    cg.gain.value = 0.35;
    src.connect(cg).connect(musicBus);
    src.start();
  }
  musicBus.gain.setTargetAtTime(play ? 0.1 + 0.4 * near : 0, ac.currentTime, play ? 0.8 : 0.3);
  if (play) musicLp.frequency.setTargetAtTime(350 + 1350 * near, ac.currentTime, 0.8);
  if (play === !!musicTimer) return;
  if (!play) {
    clearInterval(musicTimer);
    musicTimer = 0;
    return;
  }
  nextBeat = 0;
  nextAt = ac.currentTime + 0.15;
  musicTimer = window.setInterval(() => {
    if (!on) return void (nextAt = Math.max(nextAt, ac!.currentTime + 0.1)); // en silencio no avanza
    while (nextAt < ac!.currentTime + 0.4) {
      scheduleBeat(nextBeat, nextAt);
      nextBeat = (nextBeat + 1) % LOOP;
      nextAt += BEAT;
    }
  }, 120);
}

/** Ruidito de voz: una sílaba por letra, grave y con su tono según la letra. */
export function blip(ch: string) {
  if (!ac || !on) return;
  const t = ac.currentTime;
  const o = ac.createOscillator();
  const og = ac.createGain();
  o.type = 'square';
  const f = 150 + ((ch.toLowerCase().charCodeAt(0) * 7) % 6) * 14 + (/[aeiouáéíóú]/i.test(ch) ? 30 : 0);
  o.frequency.setValueAtTime(f, t);
  o.frequency.linearRampToValueAtTime(f * 0.92, t + 0.06);
  og.gain.setValueAtTime(0.13, t);
  og.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
  o.connect(og).connect(master);
  o.start(t);
  o.stop(t + 0.08);
}
