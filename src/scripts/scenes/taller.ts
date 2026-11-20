// Interior del hangar (Sobre mí): sentado frente al escritorio del taller.
// La máquina de escribir, el reloj de mesa, la lámpara y el plano del LZ 20
// se dibujan aquí; el texto de las dos hojas es HTML puesto encima.

import { g } from '../dither';
import { FINENESS, profile } from '../zeppelin';
import { deskY, lamp, lampLight, lampRect, paper, room, shadow, view, windowPane, type Lamp, breach, brokenPane, rubble, cracks } from './desk';
import { rain } from './exterior';
import type { Env, Rect } from './types';

export function layout(W: number, H: number) {
  const v = view(W, H);
  const S = v.sh;
  const tw = Math.min(W * (v.port ? 0.36 : 0.3), S * 0.52); // ancho de la máquina
  const tcx = W * (v.port ? 0.52 : 0.6);
  const platen = Math.round(S * 0.985 - tw * 0.82); // borde superior del rodillo
  const top = v.port ? platen - tw * 0.8 : S * 0.15;
  /** hoja 2: todavía en la máquina */
  const sheet2: Rect = { x: tcx - tw * 0.43, y: top, w: tw * 0.86, h: platen + 2 - top };
  /** hoja 1: ya escrita, sobre el tablero */
  const sheet1: Rect = v.port
    ? { x: W * 0.04, y: S * 0.66, w: W * 0.26, h: S * 0.3 }
    : { x: W * 0.03, y: S * 0.5, w: W * 0.42, h: S * 0.485 };
  const lampL: Lamp = { bx: W * (v.port ? 0.88 : 0.9), by: S * 0.66, s: Math.min(S * 0.46, W * 0.36), dir: -1 };
  return { v, tw, tcx, platen, sheet1, sheet2, lamp: lampL, lampRect: lampRect(lampL) };
}

export const horizon = (W: number, H: number) => view(W, H).sh * 0.34;
type Layout = ReturnType<typeof layout>;

// ── Teclado: cada tecla existe, se puede presionar y se hunde al escribir ──

const ROWS = ['1234567890-', 'QWERTYUIOP', 'ASDFGHJKLÑ,', 'ZXCVBNM.;:'];
const CHARS = ROWS.join('');
export const SPACE = CHARS.length;
/** Qué letra pone la tecla i (para reconocer lo que se escribe). */
export const charOf = (i: number) => (i === SPACE ? ' ' : (CHARS[i] ?? ''));

/** Estado vivo de la máquina: cuándo bajó cada tecla y dónde va el carro (-0.5..0.5). */
export const fx = { down: new Array<number>(SPACE + 1).fill(-9), carriage: 0, bones: -9, nuke: -999, hour: 0 };
/** Fin del mundo: el destello y el hongo a lo lejos. */
export const nuke = () => (fx.nuke = performance.now() / 1000);
/** Remezón cuando llega la onda (en fracción del ancho). */
export function shake(t: number) {
  const k = t - fx.nuke - 1.3;
  if (k < 0 || k > 2.6) return 0;
  return Math.sin(k * 47) * Math.sin(k * 31 + 1) * 0.012 * (1 - k / 2.6);
}
/** Alguien pasa corriendo por fuera del ventanal. */
export const bones = () => (fx.bones = performance.now() / 1000);

/** Cuánto se desplaza el carro, en píxeles del lienzo. */
export const carriageDx = (L: Layout) => fx.carriage * L.tw * 0.1;

export function keyboard(L: Layout) {
  const { tcx: cx, platen: py, tw: u } = L;
  const keys: { x: number; y: number; r: number }[] = [];
  ROWS.forEach((row, i) => {
    const y = py + u * (0.51 + i * 0.075);
    const half = u * (0.37 + i * 0.03);
    const n = row.length;
    const r = u * (0.026 + i * 0.002);
    for (let k = 0; k < n; k++) keys.push({ x: cx - half + (2 * half * (k + (i % 2 ? 0.5 : 0))) / (n - (i % 2 ? 0 : 1)), y, r });
  });
  const space: Rect = { x: cx - u * 0.27, y: py + u * 0.785, w: u * 0.54, h: Math.max(2, u * 0.026) };
  const rect: Rect = { x: cx - u * 0.52, y: py + u * 0.47, w: u * 1.04, h: u * 0.37 };
  return { keys, space, rect };
}

export function press(i: number) {
  if (i >= 0) fx.down[i] = performance.now() / 1000;
}

export function keyFor(ch: string) {
  if (ch === ' ') return SPACE;
  const up = ch.toUpperCase();
  const base = up === 'Ñ' ? up : up.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return CHARS.indexOf(base[0] ?? '?');
}

/** Tecla bajo un punto del lienzo (o -1). */
export function keyAt(W: number, H: number, x: number, y: number) {
  const K = keyboard(layout(W, H));
  let best = -1;
  let bd = Infinity;
  K.keys.forEach((k, i) => {
    const d = Math.hypot(k.x - x, (k.y - y) * 1.2);
    if (d < bd && d < k.r * 1.9) {
      bd = d;
      best = i;
    }
  });
  if (best < 0 && x >= K.space.x && x <= K.space.x + K.space.w && Math.abs(y - K.space.y - K.space.h / 2) < K.keys[0].r * 1.6) return SPACE;
  return best;
}

function blueprint(ctx: CanvasRenderingContext2D, x: number, y0: number, w: number, y1: number) {
  const inset = w * 0.035;
  const h = y1 - y0;
  const quad = (dx: number, dy: number) => {
    ctx.beginPath();
    ctx.moveTo(x + inset + dx, y0 + dy);
    ctx.lineTo(x + w - inset + dx, y0 + dy);
    ctx.lineTo(x + w + dx, y1 + dy);
    ctx.lineTo(x + dx, y1 + dy);
    ctx.closePath();
  };
  ctx.fillStyle = g(0);
  ctx.globalAlpha = 0.7;
  quad(4, 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = g(0.13, 0, 0.35);
  quad(0, 0);
  ctx.fill();
  ctx.strokeStyle = g(0.7);
  ctx.lineWidth = 1;
  ctx.stroke();

  // alzado lateral
  const L = w * 0.76;
  const R = L / FINENESS / 2;
  const zx = x + w * 0.12;
  const zy = y0 + h * 0.36;
  ctx.strokeStyle = g(1);
  ctx.beginPath();
  for (const sgn of [-1, 1])
    for (let i = 0; i <= 60; i++) {
      const u = Math.min(0.999, Math.max(0.001, i / 60));
      const px = zx + u * L;
      const py = zy + sgn * profile(u) * R;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
  // aletas, quilla y góndolas
  ctx.moveTo(zx + 0.77 * L, zy - profile(0.77) * R);
  ctx.lineTo(zx + 0.9 * L, zy - R * 1.1);
  ctx.lineTo(zx + 0.945 * L, zy - R * 1.1);
  ctx.lineTo(zx + 0.945 * L, zy + R * 1.1);
  ctx.lineTo(zx + 0.9 * L, zy + R * 1.1);
  ctx.lineTo(zx + 0.77 * L, zy + profile(0.77) * R);
  ctx.moveTo(zx + 0.2 * L, zy + R * 1.16);
  ctx.lineTo(zx + 0.7 * L, zy + R * 1.16);
  for (const u of [0.27, 0.6])
    ctx.rect(Math.round(zx + u * L) + 0.5, Math.round(zy + R * 1.45) + 0.5, Math.round(L * 0.074), Math.max(2, Math.round(R * 0.45)));
  ctx.stroke();
  ctx.strokeStyle = g(0.55);
  ctx.beginPath();
  for (let i = 2; i < 17; i++) {
    const u = i / 18;
    const px = Math.round(zx + u * L) + 0.5;
    ctx.moveTo(px, zy - profile(u) * R);
    ctx.lineTo(px, zy + profile(u) * R);
  }
  // cota de eslora
  const dy = Math.round(zy + R * 2.6) + 0.5;
  ctx.moveTo(zx, dy);
  ctx.lineTo(zx + L, dy);
  for (const px of [zx, zx + L]) {
    ctx.moveTo(Math.round(px) + 0.5, dy - 3);
    ctx.lineTo(Math.round(px) + 0.5, dy + 3);
  }
  // sección transversal: el prisma de 17 caras
  const sr = h * 0.15;
  const sx = x + w * 0.2;
  const sy = y1 - h * 0.24;
  for (let i = 0; i <= 17; i++) {
    const a = (i / 17) * Math.PI * 2;
    const px = sx + Math.sin(a) * sr;
    const py = sy - Math.cos(a) * sr;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.moveTo(sx - sr * 1.3, sy);
  ctx.lineTo(sx + sr * 1.3, sy);
  ctx.moveTo(sx, sy - sr * 1.3);
  ctx.lineTo(sx, sy + sr * 1.3);
  ctx.stroke();
  // cajetín
  const tx = Math.round(x + w * 0.6);
  const ty = Math.round(y1 - h * 0.32);
  const tW = Math.round(w * 0.33);
  const tH = Math.round(h * 0.24);
  ctx.strokeStyle = g(0.8);
  ctx.strokeRect(tx + 0.5, ty + 0.5, tW, tH);
  ctx.fillStyle = g(0.95);
  ctx.fillRect(tx + 4, ty + 4, Math.round(tW * 0.42), 2);
  ctx.fillStyle = g(0.6);
  for (let i = 1; i < 4; i++) ctx.fillRect(tx + 4, ty + 4 + Math.round((i * (tH - 8)) / 4), Math.round(tW * (0.75 - i * 0.12)), 1);
  // cinta
  ctx.fillStyle = g(0.9, 0.7);
  ctx.fillRect(Math.round(x + inset + 4), Math.round(y0 - 2), 7, 4);
  ctx.fillRect(Math.round(x + w - inset - 11), Math.round(y0 - 2), 7, 4);
}

function clock(ctx: CanvasRenderingContext2D, cx: number, by: number, r: number, hour: number, sec: number) {
  const cy = by - r * 1.15;
  shadow(ctx, cx + r * 0.25, by, r * 1.15, r * 0.2);
  ctx.lineCap = 'round';
  ctx.strokeStyle = g(0.6);
  ctx.lineWidth = Math.max(2, r * 0.14);
  ctx.beginPath();
  for (const s of [-1, 1]) {
    ctx.moveTo(cx + s * r * 0.55, cy + r * 0.75);
    ctx.lineTo(cx + s * r * 0.85, by);
  }
  ctx.stroke();
  ctx.lineCap = 'butt';
  // campanillas y asa
  for (const s of [-1, 1]) {
    ctx.fillStyle = g(s < 0 ? 0.9 : 0.5);
    ctx.beginPath();
    ctx.ellipse(cx + s * r * 0.62, cy - r * 0.9, r * 0.42, r * 0.3, s * 0.6, Math.PI, 0);
    ctx.fill();
  }
  ctx.strokeStyle = g(0.75);
  ctx.lineWidth = Math.max(1, r * 0.08);
  ctx.beginPath();
  ctx.arc(cx, cy - r * 1.02, r * 0.42, Math.PI, 0);
  ctx.stroke();
  // caja con espesor, bisel y esfera
  ctx.fillStyle = g(0.12);
  ctx.beginPath();
  ctx.arc(cx + r * 0.1, cy + r * 0.04, r * 1.02, 0, 7);
  ctx.fill();
  const bz = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  bz.addColorStop(0, g(1));
  bz.addColorStop(0.5, g(0.5));
  bz.addColorStop(1, g(0.12));
  ctx.fillStyle = bz;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, 7);
  ctx.fill();
  ctx.fillStyle = g(0.94);
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.82, 0, 7);
  ctx.fill();
  ctx.strokeStyle = g(0);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.moveTo(cx + Math.sin(a) * r * 0.64, cy - Math.cos(a) * r * 0.64);
    ctx.lineTo(cx + Math.sin(a) * r * 0.76, cy - Math.cos(a) * r * 0.76);
  }
  ctx.stroke();
  const ha = ((hour % 12) / 12) * Math.PI * 2;
  const ma = (hour % 1) * Math.PI * 2;
  ctx.lineWidth = Math.max(1.5, r * 0.1);
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.sin(ha) * r * 0.42, cy - Math.cos(ha) * r * 0.42);
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.sin(ma) * r * 0.66, cy - Math.cos(ma) * r * 0.66);
  ctx.stroke();
  // segundero, a saltos
  const sa = (sec / 60) * Math.PI * 2;
  ctx.strokeStyle = g(0.75, 1);
  ctx.beginPath();
  ctx.moveTo(cx - Math.sin(sa) * r * 0.16, cy + Math.cos(sa) * r * 0.16);
  ctx.lineTo(cx + Math.sin(sa) * r * 0.74, cy - Math.cos(sa) * r * 0.74);
  ctx.stroke();
  ctx.fillStyle = g(0);
  ctx.beginPath();
  ctx.arc(cx, cy, Math.max(1.2, r * 0.07), 0, 7);
  ctx.fill();
}

function typewriter(ctx: CanvasRenderingContext2D, L: Layout, t: number) {
  const { tcx: cx, platen: py, tw: u } = L;
  const K = keyboard(L);
  const dx = carriageDx(L);
  const isDown = (i: number) => t - fx.down[i] < 0.13;
  shadow(ctx, cx + u * 0.05, py + u * 0.68, u * 0.6, u * 0.2);

  // ── carro: se mueve con el papel ──
  ctx.save();
  ctx.translate(dx, 0);
  if (L.v.port) {
    // en vertical la hoja se dibuja aquí; en horizontal es el HTML de encima
    ctx.fillStyle = g(0.93);
    ctx.fillRect(Math.round(L.sheet2.x), Math.round(L.sheet2.y), Math.round(L.sheet2.w), Math.round(L.sheet2.h));
  }
  ctx.fillStyle = g(0.13);
  ctx.fillRect(cx - u * 0.5, py + u * 0.045, u, u * 0.08);
  ctx.fillStyle = g(0.6);
  ctx.fillRect(cx - u * 0.5, py + u * 0.045, u, 1);
  // rodillo
  const pg = ctx.createLinearGradient(0, py, 0, py + u * 0.075);
  pg.addColorStop(0, g(0.7));
  pg.addColorStop(0.3, g(0.3));
  pg.addColorStop(1, g(0.03));
  ctx.fillStyle = pg;
  ctx.fillRect(cx - u * 0.47, py, u * 0.94, u * 0.075);
  for (const s of [-1, 1]) {
    ctx.fillStyle = g(0.1);
    ctx.beginPath();
    ctx.ellipse(cx + s * u * 0.5, py + u * 0.04, u * 0.028, u * 0.065, 0, 0, 7);
    ctx.fill();
    ctx.fillStyle = g(0.85);
    ctx.beginPath();
    ctx.ellipse(cx + s * u * 0.505 - u * 0.006, py + u * 0.035, u * 0.018, u * 0.05, 0, 0, 7);
    ctx.fill();
  }
  // pisapapel con sus rodillos
  ctx.fillStyle = g(1);
  ctx.fillRect(cx - u * 0.45, Math.round(py + u * 0.012), u * 0.9, 1);
  ctx.fillStyle = g(0.15);
  for (const k of [-0.24, 0.24]) ctx.fillRect(cx + u * k - u * 0.025, Math.round(py + u * 0.004), u * 0.05, Math.max(2, u * 0.022));
  // palanca de retorno
  ctx.strokeStyle = g(0.9);
  ctx.lineWidth = Math.max(1.5, u * 0.012);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - u * 0.5, py + u * 0.07);
  ctx.lineTo(cx - u * 0.6, py - u * 0.04);
  ctx.lineTo(cx - u * 0.68, py - u * 0.05);
  ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.lineWidth = 1;
  ctx.restore();

  // ── cuerpo ──
  const by0 = py + u * 0.125;
  const by1 = py + u * 0.46;
  const bg = ctx.createLinearGradient(0, by0, 0, by1);
  bg.addColorStop(0, g(0.7));
  bg.addColorStop(0.12, g(0.36));
  bg.addColorStop(1, g(0.16));
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.moveTo(cx - u * 0.4, by0);
  ctx.lineTo(cx + u * 0.4, by0);
  ctx.lineTo(cx + u * 0.47, by1);
  ctx.lineTo(cx - u * 0.47, by1);
  ctx.fill();
  // canasta de tipos
  const ky = by0 + u * 0.015;
  ctx.fillStyle = g(0);
  ctx.beginPath();
  ctx.ellipse(cx, ky, u * 0.28, u * 0.2, 0, 0, Math.PI);
  ctx.fill();
  ctx.strokeStyle = g(0.6);
  ctx.beginPath();
  for (let i = 0; i < 25; i++) {
    const a = (Math.PI * (i + 0.5)) / 25;
    ctx.moveTo(cx + Math.cos(a) * u * 0.07, ky + Math.sin(a) * u * 0.045 + 1);
    ctx.lineTo(cx + Math.cos(a) * u * 0.26, ky + Math.sin(a) * u * 0.185);
  }
  ctx.stroke();
  ctx.strokeStyle = g(0.85);
  ctx.beginPath();
  ctx.ellipse(cx, ky, u * 0.28, u * 0.2, 0, 0, Math.PI);
  ctx.stroke();
  // un tipo sale disparado hacia el rodillo con cada tecla
  const hit = K.keys.findIndex((_, i) => t - fx.down[i] < 0.09);
  if (hit >= 0) {
    const a = Math.PI * (1 - ((hit * 7) % 25 + 0.5) / 25);
    ctx.strokeStyle = g(1);
    ctx.lineWidth = Math.max(1.5, u * 0.012);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * u * 0.1, ky + Math.sin(a) * u * 0.06);
    ctx.lineTo(cx, py + u * 0.05);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = g(1);
    ctx.fillRect(Math.round(cx - u * 0.012), Math.round(py + u * 0.035), Math.max(2, Math.round(u * 0.024)), Math.max(2, Math.round(u * 0.024)));
  }
  // placa de latón
  ctx.fillStyle = g(0.7, 0.6);
  ctx.fillRect(Math.round(cx - u * 0.08), Math.round(by0 + u * 0.255), Math.round(u * 0.16), Math.max(2, Math.round(u * 0.028)));

  // ── teclado en gradas ──
  ctx.fillStyle = g(0.1);
  ctx.beginPath();
  ctx.moveTo(cx - u * 0.47, by1);
  ctx.lineTo(cx + u * 0.47, by1);
  ctx.lineTo(cx + u * 0.54, py + u * 0.83);
  ctx.lineTo(cx - u * 0.54, py + u * 0.83);
  ctx.fill();
  let n = 0;
  ROWS.forEach((row, i) => {
    const k0 = K.keys[n];
    const k1 = K.keys[n + row.length - 1];
    ctx.fillStyle = g(0.2);
    ctx.fillRect(k0.x - k0.r, Math.round(k0.y + k0.r * 0.9), k1.x - k0.x + k0.r * 2, 1);
    for (let k = 0; k < row.length; k++, n++) {
      const { x, y, r } = K.keys[n];
      const d = isDown(n) ? r * 0.55 : 0;
      ctx.fillStyle = d ? g(0.9, 1) : g(1);
      ctx.beginPath();
      ctx.ellipse(x, y + d, r, r * 0.8, 0, 0, 7);
      ctx.fill();
      ctx.fillStyle = g(0.02);
      ctx.beginPath();
      ctx.ellipse(x, y + d - r * 0.08, r * 0.66, r * 0.5, 0, 0, 7);
      ctx.fill();
    }
  });
  const sp = isDown(SPACE);
  ctx.fillStyle = sp ? g(0.9, 1) : g(0.85);
  ctx.fillRect(Math.round(K.space.x), Math.round(K.space.y + (sp ? K.space.h * 0.7 : 0)), Math.round(K.space.w), Math.round(K.space.h));
}

function mug(ctx: CanvasRenderingContext2D, cx: number, by: number, r: number) {
  shadow(ctx, cx + r * 0.3, by, r * 1.3, r * 0.3);
  ctx.strokeStyle = g(0.7);
  ctx.lineWidth = Math.max(2, r * 0.22);
  ctx.beginPath();
  ctx.arc(cx + r, by - r * 0.95, r * 0.5, -1.3, 1.3);
  ctx.stroke();
  ctx.lineWidth = 1;
  const bg = ctx.createLinearGradient(cx - r, 0, cx + r, 0);
  bg.addColorStop(0, g(0.95));
  bg.addColorStop(0.45, g(0.6));
  bg.addColorStop(1, g(0.15));
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.ellipse(cx, by, r, r * 0.3, 0, 0, Math.PI);
  ctx.lineTo(cx - r, by - r * 1.8);
  ctx.lineTo(cx + r, by - r * 1.8);
  ctx.fill();
  ctx.fillStyle = g(1);
  ctx.beginPath();
  ctx.ellipse(cx, by - r * 1.8, r, r * 0.3, 0, 0, 7);
  ctx.fill();
  ctx.fillStyle = g(0.03);
  ctx.beginPath();
  ctx.ellipse(cx, by - r * 1.76, r * 0.82, r * 0.22, 0, 0, 7);
  ctx.fill();
}

/** Esqueleto a toda carrera, de perfil: `h` de alto, pies en (x, y), `ph` la fase de la zancada. */
function skeleton(ctx: CanvasRenderingContext2D, x: number, y0: number, h: number, ph: number) {
  const y = y0 - Math.abs(Math.sin(ph)) * h * 0.05;
  const leg = h * 0.24;
  const arm = h * 0.17;
  const hip: [number, number] = [x, y - h * 0.46];
  const neck: [number, number] = [x + h * 0.13, y - h * 0.8];
  const head: [number, number] = [x + h * 0.2, y - h * 0.9];
  const seg = (p: [number, number], a: number, l: number): [number, number] => [p[0] + Math.sin(a) * l, p[1] + Math.cos(a) * l];
  const limbs: [number, number][][] = [];
  for (const side of [0, Math.PI]) {
    const a = Math.sin(ph + side) * 1.05;
    const knee = seg(hip, a, leg);
    const foot = seg(knee, a - 0.25 - 1.3 * Math.max(0, Math.cos(ph + side)), leg);
    limbs.push([hip, knee, foot, [foot[0] + h * 0.06, foot[1]]]);
    const b = -Math.sin(ph + side) * 1.2;
    const elbow = seg(neck, b, arm);
    limbs.push([neck, elbow, seg(elbow, b + 1.5, arm)]);
  }
  const r = h * 0.095;
  // dos pasadas: contorno oscuro y hueso claro encima
  for (const [tone, grow] of [[0, 2], [0.97, 0]] as const) {
    ctx.strokeStyle = ctx.fillStyle = g(tone);
    ctx.lineWidth = Math.max(1.5, h * 0.035) + grow;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (const l of limbs) l.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
    ctx.moveTo(hip[0], hip[1]);
    ctx.lineTo(neck[0], neck[1]);
    // costillas y pelvis
    for (let i = 1; i <= 3; i++) {
      const cx = neck[0] + (hip[0] - neck[0]) * i * 0.2;
      const cy = neck[1] + (hip[1] - neck[1]) * i * 0.2;
      ctx.moveTo(cx - h * 0.055, cy + h * 0.015);
      ctx.lineTo(cx + h * 0.085, cy - h * 0.01);
    }
    ctx.moveTo(hip[0] - h * 0.05, hip[1]);
    ctx.lineTo(hip[0] + h * 0.05, hip[1]);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(head[0], head[1], r + grow / 2, 0, 7);
    ctx.fill();
    ctx.fillRect(Math.round(head[0] - r * 0.1 - grow / 2), Math.round(head[1] + r * 0.5), Math.round(r * 0.95 + grow), Math.round(r * 0.75 + grow / 2));
  }
  ctx.lineWidth = 1;
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';
  // cuenca, nariz y dientes
  ctx.fillStyle = g(0);
  const e = Math.max(2, Math.round(r * 0.5));
  ctx.fillRect(Math.round(head[0] + r * 0.15), Math.round(head[1] - r * 0.35), e, e);
  ctx.fillRect(Math.round(head[0] + r * 0.8), Math.round(head[1] + r * 0.2), 1, Math.max(1, Math.round(r * 0.3)));
  for (let i = 0; i < 3; i++) ctx.fillRect(Math.round(head[0] + r * 0.1 + i * 2), Math.round(head[1] + r * 0.85), 1, Math.max(1, Math.round(r * 0.35)));
}

export function draw(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, env: Env) {
  const L = layout(W, H);
  const { v } = L;
  const S = v.sh;
  room(ctx, W, H, v, env);

  if (env.doom) {
    breach(ctx, W * (v.port ? 0.55 : 0.58), S * 0.15, W * (v.port ? 0.13 : 0.1), S * 0.13, 4.2);
    breach(ctx, W * 0.36, S * 0.03, W * 0.05, S * 0.05, 11.5);
  }
  lampLight(ctx, L.lamp, env.lamp, v);

  // Ventanal del hangar, recortado por el borde
  const win: Rect = { x: W * (v.port ? 0.74 : 0.8), y: -S * 0.04, w: W * 0.3, h: S * 0.28 };
  env.doom ? brokenPane(ctx, win, env.daylight) : windowPane(ctx, win, 2, 2, env.daylight);
  let bars = false;
  {
    // el esqueleto: cruza el ventanal de izquierda a derecha, por detrás de los palillos
    const k = (t - fx.bones) / 1.25;
    if (k > 0 && k < 1) {
      const wx = Math.round(win.x);
      const wy = Math.round(win.y);
      const wh = Math.round(win.h);
      const vis = Math.min(W, win.x + win.w) - win.x;
      const sh = win.h * 1.3; // tamaño natural: se ve de la cadera hacia arriba, el resto lo tapa el muro
      ctx.save();
      ctx.beginPath();
      ctx.rect(wx, wy, Math.round(win.w), wh);
      ctx.clip();
      skeleton(ctx, win.x - sh * 0.5 + (vis + sh) * k, win.y + win.h * 1.02 + sh * 0.46, sh, t * 21);
      ctx.restore();
      bars = true;
    }
  }
  const nk = t - fx.nuke;
  if (nk > 0 && nk < 30 && !env.doom) {
    // el hongo: bola de fuego que sube, tallo, anillo de condensación y el horizonte a contraluz
    bars = true;
    const vis = Math.min(W, win.x + win.w) - win.x;
    const cx = win.x + vis * 0.45;
    const gy = win.y + win.h * 0.9;
    const e = 1 - Math.exp(-nk / 1.1);
    const hot = Math.max(0.2, 1 - nk / 3.5);
    const rx = win.h * 0.3 * e;
    const top = gy - win.h * 0.62 * e;
    ctx.save();
    ctx.beginPath();
    ctx.rect(Math.round(win.x), Math.round(win.y), Math.round(win.w), Math.round(win.h));
    ctx.clip();
    ctx.fillStyle = g(0.3, hot * 0.6, 0.5);
    ctx.beginPath();
    ctx.ellipse(cx, gy, rx * 1.5, win.h * 0.07 * e, 0, 0, 7);
    ctx.fill();
    const stem = ctx.createLinearGradient(cx - rx * 0.3, 0, cx + rx * 0.3, 0);
    stem.addColorStop(0, g(0.8, hot));
    stem.addColorStop(1, g(0.15, hot * 0.5));
    ctx.fillStyle = stem;
    ctx.beginPath();
    ctx.moveTo(cx - rx * 0.42, gy);
    ctx.quadraticCurveTo(cx - rx * 0.12, (gy + top) / 2, cx - rx * 0.3, top);
    ctx.lineTo(cx + rx * 0.3, top);
    ctx.quadraticCurveTo(cx + rx * 0.12, (gy + top) / 2, cx + rx * 0.42, gy);
    ctx.fill();
    ctx.fillStyle = g(0.2, hot * 0.5);
    ctx.beginPath();
    ctx.ellipse(cx, top + rx * 0.16, rx * 0.9, rx * 0.4, 0, 0, 7);
    ctx.fill();
    ctx.fillStyle = g(0.9, hot);
    for (const [ox, oy, r] of [[0, -0.1, 1], [-0.55, 0.08, 0.6], [0.55, 0.06, 0.62], [-0.2, -0.38, 0.6], [0.28, -0.34, 0.55]]) {
      ctx.beginPath();
      ctx.ellipse(cx + ox * rx, top + oy * rx, r * rx * 0.75, r * rx * 0.5, 0, 0, 7);
      ctx.fill();
    }
    ctx.strokeStyle = g(0.95, 0, 0.4);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(cx, gy - win.h * 0.3 * e, rx * (0.6 + nk * 0.5), rx * 0.1, 0, 0, 7);
    ctx.stroke();
    ctx.fillStyle = g(0.03);
    ctx.beginPath();
    ctx.moveTo(win.x, win.y + win.h);
    for (let x = 0; x <= win.w; x += 2) ctx.lineTo(win.x + x, gy - Math.abs(Math.sin(x * 0.21) + Math.sin(x * 0.083)) * win.h * 0.02);
    ctx.lineTo(win.x + win.w, win.y + win.h);
    ctx.fill();
    // el destello
    const flash = Math.max(0, 1 - nk / 0.7);
    if (flash > 0) {
      ctx.globalAlpha = flash;
      ctx.fillStyle = g(1, 0.5);
      ctx.fillRect(win.x, win.y, win.w, win.h);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
  if (bars && !env.doom) {
    ctx.fillStyle = g(0.1 + 0.3 * env.daylight);
    ctx.fillRect(Math.round(win.x + win.w / 2) - 1, Math.round(win.y), 2, Math.round(win.h));
    ctx.fillRect(Math.round(win.x), Math.round(win.y + win.h / 2) - 1, Math.round(win.w), 2);
  }
  if (env.rain > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(win.x, win.y, win.w, win.h);
    ctx.clip();
    rain(ctx, W, H, t, env.rain);
    ctx.restore();
  }

  // Al fondo del tablero: el plano del LZ 20 apoyado contra el muro
  blueprint(ctx, W * 0.03, S * (v.port ? 0.2 : 0.17), W * (v.port ? 0.36 : 0.31), v.back + S * 0.02);
  if (env.doom) {
    // el plano: chamuscado, con una esquina menos
    const bx = W * 0.03;
    const by = S * (v.port ? 0.2 : 0.17);
    const bw = W * (v.port ? 0.36 : 0.31);
    const bh = v.back + S * 0.02 - by;
    ctx.fillStyle = g(0.03 + 0.1 * env.daylight);
    ctx.beginPath();
    ctx.moveTo(bx + bw * 0.6, by - 3);
    ctx.lineTo(bx + bw * 0.68, by + bh * 0.16);
    ctx.lineTo(bx + bw * 0.78, by + bh * 0.1);
    ctx.lineTo(bx + bw * 0.84, by + bh * 0.3);
    ctx.lineTo(bx + bw * 0.93, by + bh * 0.26);
    ctx.lineTo(bx + bw * 1.05, by + bh * 0.5);
    ctx.lineTo(bx + bw * 1.05, by - 3);
    ctx.fill();
    ctx.fillStyle = g(0.02);
    for (const [u, w2, r] of [[0.25, 0.7, 0.13], [0.55, 0.45, 0.09], [0.12, 0.25, 0.07], [0.7, 0.85, 0.1]]) {
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.ellipse(bx + bw * u, by + bh * w2, bw * r, bw * r * 0.7, 0.4, 0, 7);
      ctx.fill();
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.ellipse(bx + bw * u, by + bh * w2, bw * r * 1.5, bw * r, 0.4, 0, 7);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    rubble(ctx, v, W, 22, 3.3);
  }
  // planos enrollados
  for (let i = 0; i < 2; i++) {
    const y = deskY(v, 0.07 + i * 0.035);
    const x0 = W * (0.05 + i * 0.03);
    const len = W * 0.2;
    const rr = Math.max(2, S * 0.011);
    const rg = ctx.createLinearGradient(0, y - rr, 0, y + rr);
    rg.addColorStop(0, g(0.95));
    rg.addColorStop(1, g(0.3));
    ctx.fillStyle = g(0);
    ctx.fillRect(x0 + 2, y + rr, len, 2);
    ctx.fillStyle = rg;
    ctx.fillRect(x0, y - rr, len, rr * 2);
    ctx.fillStyle = g(0.1);
    ctx.beginPath();
    ctx.ellipse(x0 + len, y, rr * 0.5, rr, 0, 0, 7);
    ctx.fill();
  }

  if (env.doom) {
    // el despertador, tumbado y parado a la hora en que pasó
    ctx.save();
    ctx.translate(W * (v.port ? 0.765 : 0.405), deskY(v, 0.07) - S * 0.05);
    ctx.rotate(1.25);
    clock(ctx, 0, S * 0.05, S * 0.06, fx.hour, 17);
    ctx.restore();
  } else {
    fx.hour = env.hour;
    clock(ctx, W * (v.port ? 0.765 : 0.405), deskY(v, 0.07), S * 0.06, env.hour, env.still ? 0 : new Date().getSeconds());
  }

  if (v.port) paper(ctx, L.sheet1, W * 0.02);
  typewriter(ctx, L, t);
  mug(ctx, W * (v.port ? 0.86 : 0.87), S * (v.port ? 0.93 : 0.9), S * 0.034);
  lamp(ctx, L.lamp, env.lamp);
  if (nk > 0 && nk < 1.2) {
    // la luz entra de golpe y baña todo el taller
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = `rgba(255,200,0,${(0.8 * (1 - nk / 1.2)).toFixed(3)})`;
    ctx.fillRect(-W, -H, W * 3, H * 3);
    ctx.restore();
  }
}
