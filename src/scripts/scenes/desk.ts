// Base compartida de las vistas "sentado al escritorio" (taller y radio):
// tablero en perspectiva, volúmenes simples y la lámpara que se puede encender.

import { g } from '../dither';
import type { Env, Rect } from './types';

export function view(W: number, H: number) {
  const port = H > W * 1.05;
  const sh = port ? Math.round(H * 0.46) : H; // alto de la escena
  const back = Math.round(sh * (port ? 0.5 : 0.44)); // borde del fondo del escritorio
  return { port, sh, back, vx: W / 2, vy: sh * 0.08 };
}
export type View = ReturnType<typeof view>;

/** y en pantalla a una fracción de profundidad del tablero (0 = fondo, 1 = borde cercano). */
export const deskY = (v: View, f: number) => Math.round(v.back + (v.sh - v.back) * f);

/** Muro y tablero del escritorio con las vetas fugando al punto de vista. */
// Los rellenos se pasan de los bordes: con la cámara encima de un objeto del
// costado se alcanza a ver más allá del lienzo y ahí también tiene que haber muro.
export function room(ctx: CanvasRenderingContext2D, W: number, H: number, v: View, env: Env) {
  const amb = 0.5 + 0.5 * env.daylight;
  const wall = ctx.createLinearGradient(0, 0, 0, v.back);
  wall.addColorStop(0, g(0.02));
  wall.addColorStop(1, g(0.05 + 0.15 * env.daylight));
  ctx.fillStyle = wall;
  ctx.fillRect(-W, 0, W * 3, v.back);

  const top = ctx.createLinearGradient(0, v.back, 0, v.sh);
  top.addColorStop(0, g(0.4 * amb));
  top.addColorStop(1, g(0.2 * amb));
  ctx.fillStyle = top;
  ctx.fillRect(-W, v.back, W * 3, v.sh - v.back);
  // vetas
  ctx.strokeStyle = g(0.03);
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 1;
  ctx.beginPath();
  const k = (v.sh - v.vy) / (v.back - v.vy);
  for (let u = -3; u <= 3.01; u += 0.15) {
    ctx.moveTo(v.vx + (u * W) / 2, v.back);
    ctx.lineTo(v.vx + ((u * W) / 2) * k, v.sh);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
  // canto del fondo: sombra contra el muro y filo de luz
  ctx.fillStyle = g(0);
  ctx.fillRect(-W, v.back - 2, W * 3, 2);
  ctx.fillStyle = g(0.75 * amb);
  ctx.fillRect(-W, v.back, W * 3, 1);
  if (v.port) {
    ctx.fillStyle = g(0);
    ctx.fillRect(-W, v.sh, W * 3, H - v.sh);
  }
}

/** Caja con cara frontal y tapa en fuga: el recurso básico de volumen. */
export function box(
  ctx: CanvasRenderingContext2D,
  v: View,
  x: number,
  y: number,
  w: number,
  h: number,
  depth: number,
  lum: number,
) {
  const s = 0.86;
  const bx0 = v.vx + (x - v.vx) * s;
  const bx1 = v.vx + (x + w - v.vx) * s;
  ctx.fillStyle = g(Math.min(1, lum * 1.7 + 0.12));
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(bx1, y - depth);
  ctx.lineTo(bx0, y - depth);
  ctx.fill();
  const f = ctx.createLinearGradient(0, y, 0, y + h);
  f.addColorStop(0, g(lum));
  f.addColorStop(1, g(lum * 0.45));
  ctx.fillStyle = f;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/** Sombra de contacto sobre el tablero. */
export function shadow(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number) {
  ctx.fillStyle = g(0);
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, Math.max(1.5, ry), 0, 0, 7);
  ctx.fill();
  ctx.globalAlpha = 1;
}

export interface Lamp {
  bx: number; // base
  by: number;
  s: number; // tamaño
  dir: number; // hacia dónde se inclina la pantalla (-1 izquierda, 1 derecha)
}

const head = (l: Lamp) => ({ x: l.bx + l.dir * l.s * 0.34, y: l.by - l.s * 0.78 });

/** Área clickeable de la lámpara. */
export function lampRect(l: Lamp): Rect {
  const h = head(l);
  const x0 = Math.min(l.bx - l.s * 0.14, h.x - l.s * 0.2);
  const x1 = Math.max(l.bx + l.s * 0.14, h.x + l.s * 0.2);
  return { x: x0, y: h.y - l.s * 0.14, w: x1 - x0, h: l.by - h.y + l.s * 0.2 };
}

/** Luz de la lámpara sobre tablero y muro. Va antes de dibujar los objetos. */
export function lampLight(ctx: CanvasRenderingContext2D, l: Lamp, on: number, v: View) {
  if (on <= 0.01) return;
  const h = head(l);
  ctx.globalCompositeOperation = 'lighter';
  // resplandor en el muro
  const wr = l.s * 0.62;
  const wg = ctx.createRadialGradient(h.x, h.y + l.s * 0.1, 1, h.x, h.y + l.s * 0.1, wr);
  wg.addColorStop(0, g(0.1 * on, 0.42 * on));
  wg.addColorStop(1, g(0, 0));
  ctx.fillStyle = wg;
  ctx.fillRect(h.x - wr, h.y - wr, wr * 2, wr * 2);
  // charco de luz sobre el tablero
  const px = h.x + l.dir * l.s * 0.25;
  const py = l.by + l.s * 0.22;
  const pr = l.s * 1.25;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, v.back + 1, v.vx * 2, v.sh - v.back);
  ctx.clip();
  ctx.translate(px, py);
  ctx.scale(1, 0.42);
  const pg = ctx.createRadialGradient(0, 0, 1, 0, 0, pr);
  pg.addColorStop(0, g(0.55 * on, 0.75 * on));
  pg.addColorStop(0.5, g(0.22 * on, 0.3 * on));
  pg.addColorStop(1, g(0, 0));
  ctx.fillStyle = pg;
  ctx.beginPath();
  ctx.arc(0, 0, pr, 0, 7);
  ctx.fill();
  ctx.restore();
  ctx.globalCompositeOperation = 'source-over';
}

/** La lámpara de brazo: base, dos tramos articulados y pantalla. */
export function lamp(ctx: CanvasRenderingContext2D, l: Lamp, on: number) {
  const { bx, by, s, dir } = l;
  const h = head(l);
  const jx = bx - dir * s * 0.1;
  const jy = by - s * 0.42;
  shadow(ctx, bx + s * 0.03, by + 1, s * 0.17, s * 0.045);
  // base
  ctx.fillStyle = g(0.2);
  ctx.beginPath();
  ctx.ellipse(bx, by, s * 0.13, s * 0.04, 0, 0, 7);
  ctx.fill();
  ctx.fillStyle = g(0.75);
  ctx.beginPath();
  ctx.ellipse(bx, by - s * 0.02, s * 0.13, s * 0.035, 0, 0, 7);
  ctx.fill();
  // brazo
  ctx.lineCap = 'round';
  for (const [w, c] of [
    [Math.max(2, s * 0.035), g(0.16)],
    [1, g(0.85)],
  ] as const) {
    ctx.strokeStyle = c;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(bx, by - s * 0.03);
    ctx.lineTo(jx, jy);
    ctx.lineTo(h.x - dir * s * 0.06, h.y);
    ctx.stroke();
  }
  ctx.lineWidth = 1;
  ctx.lineCap = 'butt';
  ctx.fillStyle = g(0.9);
  ctx.beginPath();
  ctx.arc(jx, jy, Math.max(1.5, s * 0.022), 0, 7);
  ctx.fill();
  // pantalla: cono truncado inclinado
  ctx.save();
  ctx.translate(h.x, h.y);
  ctx.rotate(dir * 0.38);
  const sg = ctx.createLinearGradient(-s * 0.16, 0, s * 0.16, 0);
  sg.addColorStop(0, g(dir > 0 ? 0.9 : 0.25));
  sg.addColorStop(0.5, g(0.5));
  sg.addColorStop(1, g(dir > 0 ? 0.2 : 0.9));
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.moveTo(-s * 0.055, -s * 0.1);
  ctx.lineTo(s * 0.055, -s * 0.1);
  ctx.lineTo(s * 0.17, s * 0.06);
  ctx.lineTo(-s * 0.17, s * 0.06);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = g(0.95);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = on > 0.5 ? g(1, 1) : g(0.04);
  ctx.beginPath();
  ctx.ellipse(0, s * 0.06, s * 0.17, s * 0.035, 0, 0, 7);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/** Ventana recortada por el borde de la pantalla: por los vidrios se ve el cielo real. */
export function windowPane(ctx: CanvasRenderingContext2D, r: Rect, cols: number, rows: number, daylight: number) {
  const x = Math.round(r.x);
  const y = Math.round(r.y);
  const w = Math.round(r.w);
  const h = Math.round(r.h);
  // derrame y alféizar con espesor
  ctx.fillStyle = g(0.12 + 0.5 * daylight);
  ctx.fillRect(x - 4, y - 4, w + 8, h + 8);
  ctx.fillStyle = g(0.5 + 0.4 * daylight);
  ctx.fillRect(x - 6, y + h + 4, w + 12, 3);
  ctx.clearRect(x, y, w, h);
  ctx.fillStyle = g(0.1 + 0.3 * daylight);
  for (let i = 1; i < cols; i++) ctx.fillRect(Math.round(x + (w * i) / cols) - 1, y, 2, h);
  for (let j = 1; j < rows; j++) ctx.fillRect(x, Math.round(y + (h * j) / rows) - 1, w, 2);
}

/** Hoja en blanco sobre el tablero (en vertical el texto va aparte, en HTML). */
export function paper(ctx: CanvasRenderingContext2D, r: Rect, skew: number) {
  const inset = r.w * 0.07;
  ctx.fillStyle = g(0);
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.moveTo(r.x + inset + skew - 2, r.y + 2);
  ctx.lineTo(r.x + r.w - inset + skew - 2, r.y + 2);
  ctx.lineTo(r.x + r.w - 2, r.y + r.h + 2);
  ctx.lineTo(r.x - 2, r.y + r.h + 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = g(0.93);
  ctx.beginPath();
  ctx.moveTo(r.x + inset + skew, r.y);
  ctx.lineTo(r.x + r.w - inset + skew, r.y);
  ctx.lineTo(r.x + r.w, r.y + r.h);
  ctx.lineTo(r.x, r.y + r.h);
  ctx.fill();
  ctx.fillStyle = g(0.3);
  for (let i = 1; i < 7; i++) {
    const f = i / 7.5;
    const y = Math.round(r.y + r.h * f);
    const x0 = r.x + (inset + skew) * (1 - f) + r.w * 0.1;
    ctx.fillRect(Math.round(x0), y, Math.round((r.w - inset * 2 * (1 - f)) * (i === 6 ? 0.4 : 0.78)), 1);
  }
}
