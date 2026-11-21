// El búnker (huevo de pascua): se llega escribiendo "true me" en la máquina del
// taller. Primero la caminata hasta la puerta blindada y la escalera, en primera
// persona; después el cuarto, con el dueño de casa echado en el sillón.

import { g } from '../dither';
import type { Env, Rect } from './types';

/**
 * p: 0‥1 caminar hacia la puerta · 1‥2 se abre · 2‥3 bajar la escalera · ≥3 el cuarto.
 * hit: cuándo molestaron al del sillón.
 */
export const fx = { p: 3, hit: -9, run: false, cat: -9, rbx: -9 };
/** Hacia dónde se mira en el cuarto: 0 al sillón, 1 a la pared del lado. `p` va detrás, suavizado. */
export const look = { to: 0, p: 0, last: 0 };
export const pokeCat = () => (fx.cat = performance.now() / 1000);
export const pokeRbx = () => (fx.rbx = performance.now() / 1000);
export const poke = () => (fx.hit = performance.now() / 1000);

export const horizon = (_W: number, H: number) => H * 0.5;

const unit = (W: number, H: number) => Math.min(W, H * 1.12);

export function layout(W: number, H: number) {
  const u = unit(W, H);
  const port = H > W * 1.05;
  const fl = Math.round(H * (port ? 0.66 : 0.74)); // línea del piso
  const cx = W * (port ? 0.64 : 0.7); // sillón
  const me: Rect = { x: cx - u * 0.2, y: fl - u * 0.4, w: u * 0.4, h: u * 0.5 };
  const head = { x: cx - u * 0.015, y: fl - u * 0.305 };
  const frame: Rect = { x: W * (port ? 0.1 : 0.4) - u * 0.065, y: fl - u * (port ? 0.72 : 0.52), w: u * 0.13, h: u * 0.15 };
  const desk = { x: W * (port ? 0.03 : 0.1), y: fl - u * 0.2, w: u * (port ? 0.3 : 0.34) };
  // la pared del lado: librero, el avatar mal pegado, el puff del gato y Rocky echado
  const shelf: Rect = { x: W * (port ? 0.04 : 0.07), y: fl - u * 0.6, w: u * (port ? 0.42 : 0.34), h: u * 0.6 };
  const rh = u * 0.36;
  const rcx = port ? W * 0.63 : shelf.x + shelf.w + u * 0.1;
  const rbx: Rect = { x: rcx - rh * 0.385, y: fl - rh - u * 0.012, w: rh * 0.77, h: rh };
  const pcx = port ? W * 0.76 : W * 0.66;
  const pfl = fl + u * (port ? 0.2 : 0.035); // el puff está más acá
  const cat: Rect = { x: pcx - u * 0.075, y: pfl - u * 0.29, w: u * 0.15, h: u * 0.2 };
  const rocky = { x: port ? W * 0.3 : W * 0.86, y: fl + u * (port ? 0.26 : 0.1), s: u * (port ? 0.34 : 0.28) };
  const metro = { x: shelf.x + shelf.w / 2, y: shelf.y + shelf.h * 0.52 };
  const side = { shelf, rbx, pcx, pfl, cat, rocky, metro };
  return { u, port, fl, cx, me, head, frame, desk, side };
}

const ease = (x: number) => x * x * (3 - 2 * x);
const clamp = (x: number) => Math.max(0, Math.min(1, x));

function concrete(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, step: number, lum0: number, lum1: number) {
  const wg = ctx.createLinearGradient(0, y0, 0, y1);
  wg.addColorStop(0, g(lum0));
  wg.addColorStop(1, g(lum1));
  ctx.fillStyle = wg;
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  // juntas del encofrado
  ctx.fillStyle = g(0.02);
  for (let y = y1 - step; y > y0; y -= step) ctx.fillRect(x0, Math.round(y), x1 - x0, 1);
  let k = 0;
  for (let y = y1; y > y0; y -= step, k++)
    for (let x = x0 + (k % 2 ? step * 1.3 : step * 2.6); x < x1; x += step * 2.6) ctx.fillRect(Math.round(x), Math.round(y - step), 1, Math.round(step));
}

// ── Tramo 1: caminar hasta la puerta blindada y abrirla ──────────────────

function door(ctx: CanvasRenderingContext2D, W: number, H: number, p: number) {
  const u = unit(W, H);
  const walk = ease(clamp(p));
  const open = clamp(p - 1);
  const z = 0.42 + 0.72 * walk;
  const bob = p < 1 ? Math.abs(Math.sin(p * Math.PI * (fx.run ? 8 : 6))) * H * (fx.run ? 0.03 : 0.014) : 0;
  ctx.fillStyle = g(0.03);
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(W / 2, H * 0.5 - bob);
  ctx.scale(z, z);
  const dw = u * 0.32;
  const dh = u * 0.5;
  const fy = dh / 2 + u * 0.025;
  const far = W * 2;
  concrete(ctx, -far, -H * 2, far, fy, u * 0.085, 0.04, 0.2);
  // piso con vetas en fuga
  const fg = ctx.createLinearGradient(0, fy, 0, fy + H);
  fg.addColorStop(0, g(0.28));
  fg.addColorStop(1, g(0.1));
  ctx.fillStyle = fg;
  ctx.fillRect(-far, fy, far * 2, H * 3);
  ctx.strokeStyle = g(0.03);
  ctx.lineWidth = 1 / z;
  ctx.beginPath();
  for (let i = -12; i <= 12; i++) {
    ctx.moveTo(i * u * 0.09, fy);
    ctx.lineTo(i * u * 0.5, fy + H * 2);
  }
  ctx.stroke();
  ctx.fillStyle = g(0.7);
  ctx.fillRect(-far, fy, far * 2, 1 / z);

  // farol sobre el dintel
  ctx.globalCompositeOperation = 'lighter';
  const lg = ctx.createRadialGradient(0, -dh * 0.66, 1, 0, -dh * 0.66, u * 0.4);
  lg.addColorStop(0, g(0.25, 0.7));
  lg.addColorStop(1, g(0, 0));
  ctx.fillStyle = lg;
  ctx.fillRect(-u * 0.4, -dh * 0.66 - u * 0.4, u * 0.8, u * 0.8);
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = g(0.15);
  ctx.fillRect(-u * 0.022, -dh * 0.7, u * 0.044, u * 0.03);
  ctx.fillStyle = g(1, 1);
  ctx.fillRect(-u * 0.014, -dh * 0.67, u * 0.028, u * 0.026);

  // marco con franjas de advertencia
  const m = u * 0.03;
  ctx.fillStyle = g(0.02);
  ctx.fillRect(-dw / 2 - m, -dh / 2 - m, dw + m * 2, dh + m + (fy - dh / 2));
  ctx.save();
  ctx.beginPath();
  ctx.rect(-dw / 2 - m, -dh / 2 - m, dw + m * 2, dh + m + (fy - dh / 2));
  ctx.rect(-dw / 2, -dh / 2, dw, dh);
  ctx.clip('evenodd');
  ctx.strokeStyle = g(0.85, 1);
  ctx.lineWidth = m * 0.45;
  ctx.beginPath();
  for (let x = -dw * 4; x < dw * 1.5; x += m * 1.3) {
    ctx.moveTo(x, dh);
    ctx.lineTo(x + dh * 2, -dh);
  }
  ctx.stroke();
  ctx.restore();

  // el hueco: escalera que baja a la luz ámbar
  ctx.fillStyle = g(0);
  ctx.fillRect(-dw / 2, -dh / 2, dw, dh);
  for (let i = 0; i < 6; i++) {
    const f = i / 6;
    const y = dh * (0.5 - 0.42 * (1 - f));
    const hw = (dw / 2) * (0.45 + 0.55 * f);
    ctx.fillStyle = g(0.1 + 0.3 * f, 0.5 * (1 - f));
    ctx.fillRect(-hw, y, hw * 2, Math.max(1 / z, dh * 0.012));
  }

  // la hoja de acero, con bisagras a la izquierda
  const sw = ease(clamp((open - 0.45) / 0.55));
  const c = Math.cos(sw * 1.42);
  const x0 = -dw / 2;
  const w = dw * c;
  const sg = ctx.createLinearGradient(x0, 0, x0 + w, 0);
  sg.addColorStop(0, g(0.5 - 0.25 * sw));
  sg.addColorStop(1, g(0.3 - 0.2 * sw));
  ctx.fillStyle = sg;
  ctx.fillRect(x0, -dh / 2, w, dh);
  ctx.fillStyle = g(0.95);
  ctx.fillRect(x0, -dh / 2, w, 1 / z);
  ctx.fillRect(x0 + w - 1 / z, -dh / 2, 1 / z, dh);
  // refuerzos y remaches
  ctx.fillStyle = g(0.12);
  for (const f of [0.2, 0.8]) ctx.fillRect(x0, -dh / 2 + dh * f, w, dh * 0.02);
  ctx.fillStyle = g(0.9);
  for (let i = 0; i < 7; i++)
    for (const fx2 of [0.07, 0.93]) ctx.fillRect(x0 + w * fx2 - 1 / z, -dh / 2 + dh * (0.06 + i * 0.147), 2 / z, 2 / z);
  for (const f of [0.14, 0.86]) {
    ctx.fillStyle = g(0.05);
    ctx.fillRect(x0 - u * 0.012, -dh / 2 + dh * f - u * 0.02, u * 0.024, u * 0.04);
  }
  // volante de cierre: gira antes de que la puerta ceda
  const wa = ease(clamp(open / 0.45)) * 4.2;
  const wx = x0 + w * 0.5;
  const wr = dw * 0.2;
  ctx.save();
  ctx.translate(wx, 0);
  ctx.scale(Math.max(0.08, c), 1);
  ctx.strokeStyle = g(0.04);
  ctx.lineWidth = wr * 0.3;
  ctx.beginPath();
  ctx.arc(0, 0, wr, 0, 7);
  ctx.stroke();
  ctx.strokeStyle = g(0.9);
  ctx.lineWidth = wr * 0.14;
  ctx.beginPath();
  ctx.arc(0, 0, wr, 0, 7);
  for (let i = 0; i < 3; i++) {
    const a = wa + (i * Math.PI) / 3;
    ctx.moveTo(Math.cos(a) * wr, Math.sin(a) * wr);
    ctx.lineTo(-Math.cos(a) * wr, -Math.sin(a) * wr);
  }
  ctx.stroke();
  ctx.fillStyle = g(0.9, 1);
  ctx.beginPath();
  ctx.arc(0, 0, wr * 0.2, 0, 7);
  ctx.fill();
  ctx.restore();
  ctx.restore();
}

// ── Tramo 2: bajar la escalera ───────────────────────────────────────────

function stairs(ctx: CanvasRenderingContext2D, W: number, H: number, q: number) {
  const u = unit(W, H);
  const scroll = q * 9;
  const fr = scroll % 1;
  const bob = Math.abs(Math.sin(scroll * Math.PI)) * H * 0.02;
  const vx = W / 2;
  const vy = H * 0.7 + bob;
  ctx.fillStyle = g(0);
  ctx.fillRect(0, 0, W, H);
  const N = 10;
  for (let i = 0; i < N; i++) {
    const d = i - fr;
    const s = 1 / (1 + Math.max(-0.6, d) * 0.6);
    const hw = W * 0.6 * s;
    const top = vy - H * 1.05 * s;
    const bot = vy + H * 0.42 * s;
    const lum = 0.03 + 0.2 * (1 - i / N) + 0.1 * q * (i / N);
    ctx.fillStyle = g(lum, 0.35 * q * (i / N));
    ctx.fillRect(vx - hw, top, hw * 2, bot - top);
    ctx.fillStyle = g(0.02);
    ctx.fillRect(Math.round(vx - hw), Math.round(top), 1, Math.round(bot - top));
    ctx.fillRect(Math.round(vx + hw) - 1, Math.round(top), 1, Math.round(bot - top));
    // huella del peldaño y su canto
    const th = Math.max(1, H * 0.07 * s);
    ctx.fillStyle = g(0.25 + 0.5 * s * 0.8);
    ctx.fillRect(vx - hw, bot - th, hw * 2, th);
    ctx.fillStyle = g(1);
    ctx.fillRect(vx - hw, Math.round(bot - th), hw * 2, 1);
    ctx.fillStyle = g(0);
    ctx.fillRect(vx - hw, bot, hw * 2, Math.max(1, th * 0.5));
    // farol enrejado cada tres tramos
    if ((Math.floor(scroll) + i) % 3 === 0) {
      ctx.fillStyle = g(1, 1);
      ctx.fillRect(vx - u * 0.02 * s, top + H * 0.03 * s, u * 0.04 * s, Math.max(1, u * 0.02 * s));
    }
    // pasamanos
    ctx.fillStyle = g(0.8);
    ctx.fillRect(vx + hw * 0.86, bot - H * 0.36 * s, Math.max(1, 2 * s), Math.max(1, H * 0.02 * s));
  }
  // al fondo, la luz del cuarto
  ctx.globalCompositeOperation = 'lighter';
  const r = u * (0.06 + 0.3 * q);
  const lg = ctx.createRadialGradient(vx, vy - H * 0.05, 1, vx, vy - H * 0.05, r);
  lg.addColorStop(0, g(0.5 * q + 0.1, 1));
  lg.addColorStop(1, g(0, 0));
  ctx.fillStyle = lg;
  ctx.fillRect(vx - r, vy - H * 0.05 - r, r * 2, r * 2);
  ctx.globalCompositeOperation = 'source-over';
}

// ── El cuarto ────────────────────────────────────────────────────────────

function dog(ctx: CanvasRenderingContext2D, r: Rect) {
  const b = Math.max(2, Math.round(r.h * 0.1));
  ctx.fillStyle = g(0);
  ctx.fillRect(Math.round(r.x) + 2, Math.round(r.y) + 3, Math.round(r.w), Math.round(r.h));
  ctx.fillStyle = g(0.35);
  ctx.fillRect(Math.round(r.x), Math.round(r.y), Math.round(r.w), Math.round(r.h));
  ctx.fillStyle = g(1);
  ctx.fillRect(Math.round(r.x), Math.round(r.y), Math.round(r.w), 1);
  ctx.fillRect(Math.round(r.x), Math.round(r.y), 1, Math.round(r.h));
  const px = Math.round(r.x) + b;
  const py = Math.round(r.y) + b;
  const pw = Math.round(r.w) - b * 2;
  const ph = Math.round(r.h) - b * 2;
  const pg = ctx.createLinearGradient(0, py, 0, py + ph);
  pg.addColorStop(0, g(0.95, 0, 0.5));
  pg.addColorStop(1, g(0.6, 0.1, 0.4));
  ctx.fillStyle = pg;
  ctx.fillRect(px, py, pw, ph);
  ctx.save();
  ctx.beginPath();
  ctx.rect(px, py, pw, ph);
  ctx.clip();
  const cx = px + pw / 2;
  const s = pw * 0.5;
  const hy = py + ph * 0.44;
  const ink = g(0.03);
  const tan = g(0.8, 1);
  // pecho color fuego, lomo negro
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.95, py + ph);
  ctx.quadraticCurveTo(cx - s * 0.8, hy + s * 0.2, cx, hy + s * 0.2);
  ctx.quadraticCurveTo(cx + s * 0.8, hy + s * 0.2, cx + s * 0.95, py + ph);
  ctx.fill();
  ctx.fillStyle = tan;
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.45, py + ph);
  ctx.quadraticCurveTo(cx - s * 0.5, hy + s * 0.5, cx, hy + s * 0.45);
  ctx.quadraticCurveTo(cx + s * 0.5, hy + s * 0.5, cx + s * 0.45, py + ph);
  ctx.fill();
  // orejas caídas, negras y peludas
  ctx.fillStyle = ink;
  for (const k of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(cx + k * s * 0.6, hy - s * 0.1, s * 0.22, s * 0.46, k * 0.4, 0, 7);
    ctx.fill();
  }
  // cabeza negra con las mejillas y las cejas fuego
  ctx.beginPath();
  ctx.arc(cx, hy - s * 0.12, s * 0.5, 0, 7);
  ctx.fill();
  ctx.fillStyle = tan;
  for (const k of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(cx + k * s * 0.33, hy + s * 0.12, s * 0.17, s * 0.24, k * -0.3, 0, 7);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + k * s * 0.24, hy - s * 0.4, s * 0.08, s * 0.06, k * 0.4, 0, 7);
    ctx.fill();
  }
  // hocico largo y oscuro, la nariz grande
  ctx.fillStyle = g(0.6, 0.15);
  ctx.beginPath();
  ctx.ellipse(cx, hy + s * 0.16, s * 0.19, s * 0.3, 0, 0, 7);
  ctx.fill();
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.ellipse(cx, hy + s * 0.33, s * 0.15, s * 0.11, 0, 0, 7);
  ctx.fill();
  ctx.fillStyle = g(1);
  ctx.fillRect(Math.round(cx - s * 0.07), Math.round(hy + s * 0.27), Math.max(1, Math.round(s * 0.08)), 1);
  // ojos
  const e = Math.max(2, Math.round(s * 0.1));
  ctx.fillStyle = g(1);
  for (const k of [-1, 1]) ctx.fillRect(Math.round(cx + k * s * 0.24 - e / 2), Math.round(hy - s * 0.24), e, e);
  ctx.restore();
}

function computer(ctx: CanvasRenderingContext2D, L: ReturnType<typeof layout>, t: number, still: boolean) {
  const { u, fl, desk } = L;
  const top = desk.y;
  // escritorio
  ctx.fillStyle = g(0.1);
  for (const f of [0.05, 0.92]) ctx.fillRect(Math.round(desk.x + desk.w * f), top, Math.max(2, Math.round(u * 0.012)), fl - top);
  ctx.fillStyle = g(0.07);
  ctx.fillRect(Math.round(desk.x + desk.w * 0.05), Math.round(top + (fl - top) * 0.55), Math.round(desk.w * 0.87), 2);
  ctx.fillStyle = g(0.45);
  ctx.fillRect(Math.round(desk.x), top, Math.round(desk.w), Math.max(3, Math.round(u * 0.014)));
  ctx.fillStyle = g(1);
  ctx.fillRect(Math.round(desk.x), top, Math.round(desk.w), 1);
  // monitor de tubo
  const mw = u * 0.17;
  const mh = u * 0.135;
  const mx = desk.x + desk.w * 0.1;
  const my = top - mh - u * 0.022;
  ctx.fillStyle = g(0.2);
  ctx.fillRect(Math.round(mx + mw * 0.3), Math.round(my + mh), Math.round(mw * 0.4), Math.round(u * 0.012));
  ctx.fillStyle = g(0.5);
  ctx.fillRect(Math.round(mx + mw * 0.15), Math.round(top - u * 0.012), Math.round(mw * 0.7), Math.round(u * 0.012));
  const bg = ctx.createLinearGradient(0, my, 0, my + mh);
  bg.addColorStop(0, g(0.7));
  bg.addColorStop(1, g(0.35));
  ctx.fillStyle = bg;
  ctx.fillRect(Math.round(mx), Math.round(my), Math.round(mw), Math.round(mh));
  ctx.fillStyle = g(1);
  ctx.fillRect(Math.round(mx), Math.round(my), Math.round(mw), 1);
  const b = Math.max(2, Math.round(mh * 0.11));
  const sx = Math.round(mx) + b;
  const sy = Math.round(my) + b;
  const sw = Math.round(mw) - b * 2;
  const sh = Math.round(mh * 0.8) - b;
  ctx.fillStyle = g(0.02);
  ctx.fillRect(sx - 1, sy - 1, sw + 2, sh + 2);
  ctx.fillStyle = g(0.55, 1);
  ctx.fillRect(sx, sy, sw, sh);
  // la pantalla dice CFM
  ctx.fillStyle = g(0);
  ctx.font = `700 ${Math.max(7, Math.round(sh * 0.62))}px "IBM Plex Mono", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('CFM', sx + sw / 2, sy + sh * 0.5);
  if (still || Math.floor(t * 1.6) % 2) ctx.fillRect(sx + Math.round(sw * 0.84), sy + Math.round(sh * 0.68), Math.max(2, Math.round(sw * 0.06)), Math.max(1, Math.round(sh * 0.08)));
  // líneas de barrido
  ctx.fillStyle = g(0.3, 0.8);
  for (let y = sy + 1; y < sy + sh; y += 3) ctx.fillRect(sx, y, sw, 1);
  ctx.fillStyle = g(0);
  ctx.fillText('CFM', sx + sw / 2, sy + sh * 0.5);
  // luz de encendido, teclado y taza
  ctx.fillStyle = g(1, 1);
  ctx.fillRect(Math.round(mx + mw * 0.82), Math.round(my + mh * 0.87), 2, 2);
  ctx.fillStyle = g(0.75);
  ctx.fillRect(Math.round(mx + mw * 0.05), Math.round(top - u * 0.008), Math.round(mw * 0.9), Math.max(2, Math.round(u * 0.008)));
  ctx.fillStyle = g(0.2);
  ctx.fillRect(Math.round(mx + mw * 0.05), Math.round(top - u * 0.002), Math.round(mw * 0.9), 1);
  const cx = desk.x + desk.w * 0.82;
  ctx.fillStyle = g(0.85);
  ctx.fillRect(Math.round(cx), Math.round(top - u * 0.03), Math.round(u * 0.022), Math.round(u * 0.03));
  ctx.fillStyle = g(0.1);
  ctx.fillRect(Math.round(cx), Math.round(top - u * 0.03), Math.round(u * 0.022), 1);
  // resplandor de la pantalla
  ctx.globalCompositeOperation = 'lighter';
  const gx = mx + mw / 2;
  const gy = my + mh / 2;
  const gl = ctx.createRadialGradient(gx, gy, 1, gx, gy, u * 0.3);
  gl.addColorStop(0, g(0.08, 0.4));
  gl.addColorStop(1, g(0, 0));
  ctx.fillStyle = gl;
  ctx.fillRect(gx - u * 0.3, gy - u * 0.3, u * 0.6, u * 0.6);
  ctx.globalCompositeOperation = 'source-over';
  // silla de oficina, vacía
  const chx = desk.x + desk.w * 0.62;
  ctx.fillStyle = g(0.06);
  ctx.fillRect(Math.round(chx - 1), Math.round(fl - u * 0.1), 3, Math.round(u * 0.09));
  ctx.fillRect(Math.round(chx - u * 0.04), fl - 3, Math.round(u * 0.08), 3);
  ctx.fillStyle = g(0.3);
  ctx.fillRect(Math.round(chx - u * 0.045), Math.round(fl - u * 0.115), Math.round(u * 0.09), Math.round(u * 0.02));
  ctx.fillRect(Math.round(chx + u * 0.03), Math.round(fl - u * 0.24), Math.round(u * 0.018), Math.round(u * 0.13));
}

function me(ctx: CanvasRenderingContext2D, L: ReturnType<typeof layout>, t: number, still: boolean) {
  const { u, fl, cx } = L;
  const ink = g(0.015);
  const rim = g(0.7);
  // ── sillón ──
  ctx.fillStyle = g(0);
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.ellipse(cx, fl + u * 0.012, u * 0.24, u * 0.03, 0, 0, 7);
  ctx.fill();
  ctx.globalAlpha = 1;
  const back = ctx.createLinearGradient(0, fl - u * 0.38, 0, fl);
  back.addColorStop(0, g(0.5));
  back.addColorStop(1, g(0.22));
  ctx.fillStyle = back;
  ctx.beginPath();
  ctx.roundRect(cx - u * 0.15, fl - u * 0.38, u * 0.3, u * 0.36, u * 0.04);
  ctx.fill();
  ctx.strokeStyle = g(0.95);
  ctx.lineWidth = 1;
  ctx.stroke();
  // capitoné
  ctx.fillStyle = g(0.1);
  for (let j = 0; j < 2; j++) for (let i = 0; i < 3; i++) ctx.fillRect(Math.round(cx - u * 0.085 + i * u * 0.085 - (j ? u * 0.04 : 0)), Math.round(fl - u * 0.33 + j * u * 0.07), 2, 2);
  ctx.fillStyle = g(0.3);
  ctx.fillRect(Math.round(cx - u * 0.13), Math.round(fl - u * 0.13), Math.round(u * 0.26), Math.round(u * 0.1));
  ctx.fillStyle = g(0.05);
  for (const k of [-1, 1]) ctx.fillRect(Math.round(cx + k * u * 0.15 - u * 0.012), fl - Math.round(u * 0.025), Math.round(u * 0.024), Math.round(u * 0.025));

  // ── yo, echado ──
  const k = still ? 0 : Math.max(0, 1 - (t - fx.hit) / 0.6);
  const breath = still ? 0 : Math.sin(t * 1.3) * u * 0.003;
  const hs = u * 0.036;
  const hx = L.head.x + Math.sin(k * Math.PI * 4) * hs * 0.35 * k;
  const hy = L.head.y - Math.sin(k * Math.PI) * hs * 0.45 + breath;
  const shY = hy + hs * 1.55;
  const hipY = fl - u * 0.11;
  const limb = (pts: [number, number][], w: number) => {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const [lw, c] of [[w + 2, rim], [w, ink]] as const) {
      ctx.strokeStyle = c;
      ctx.lineWidth = lw;
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
  };
  // piernas estiradas, botas hacia acá
  for (const s of [-1, 1]) {
    const bx = cx + s * u * 0.085 + (s > 0 ? u * 0.015 : 0);
    const by = fl + u * 0.06;
    limb(
      [
        [cx + s * u * 0.035, hipY],
        [cx + s * u * 0.062, fl - u * 0.035],
        [bx, by - u * 0.02],
      ],
      hs * 1.15,
    );
    ctx.fillStyle = g(0.6);
    ctx.beginPath();
    ctx.ellipse(bx, by, hs * 0.72, hs * 1.05, s * 0.25, 0, 7);
    ctx.fill();
    ctx.fillStyle = g(0.1);
    for (let i = -1; i <= 1; i++) ctx.fillRect(Math.round(bx - hs * 0.45), Math.round(by + i * hs * 0.45), Math.round(hs * 0.9), 1);
  }
  // torso hundido en el respaldo
  const torso = () => {
    ctx.beginPath();
    ctx.moveTo(hx - hs * 1.9, shY + hs * 0.2);
    ctx.quadraticCurveTo(hx - hs * 1.8, shY - hs * 0.45, hx - hs * 0.6, shY - hs * 0.5);
    ctx.lineTo(hx + hs * 0.6, shY - hs * 0.5);
    ctx.quadraticCurveTo(hx + hs * 1.8, shY - hs * 0.45, hx + hs * 1.9, shY + hs * 0.2);
    ctx.lineTo(cx + u * 0.062, hipY + hs * 0.4);
    ctx.lineTo(cx - u * 0.062, hipY + hs * 0.4);
    ctx.closePath();
  };
  ctx.strokeStyle = rim;
  ctx.lineWidth = 2;
  torso();
  ctx.stroke();
  ctx.fillStyle = ink;
  torso();
  ctx.fill();
  // cierre de la chaqueta
  ctx.fillStyle = g(0.5);
  ctx.fillRect(Math.round(cx), Math.round(shY), 1, Math.round(hipY - shY));
  // un brazo detrás de la cabeza, el otro colgando del apoyabrazos con la taza
  limb(
    [
      [hx - hs * 1.6, shY + hs * 0.2],
      [hx - hs * 2.7, hy - hs * 0.5],
      [hx - hs * 0.9, hy - hs * 0.9],
    ],
    hs * 0.8,
  );
  limb(
    [
      [hx + hs * 1.6, shY + hs * 0.25],
      [cx + u * 0.125, fl - u * 0.17],
      [cx + u * 0.15, fl - u * 0.12],
    ],
    hs * 0.8,
  );
  ctx.fillStyle = g(0.9);
  ctx.fillRect(Math.round(cx + u * 0.14), Math.round(fl - u * 0.125), Math.round(u * 0.024), Math.round(u * 0.03));
  // apoyabrazos por delante
  for (const s of [-1, 1]) {
    ctx.fillStyle = g(0.42);
    ctx.beginPath();
    ctx.roundRect(cx + s * u * 0.155 - u * 0.04, fl - u * 0.2, u * 0.08, u * 0.18, u * 0.03);
    ctx.fill();
    ctx.strokeStyle = g(0.95);
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.fillStyle = g(0.9);
  ctx.fillRect(Math.round(cx + u * 0.143), Math.round(fl - u * 0.225), Math.round(u * 0.026), Math.round(u * 0.03));
  ctx.fillStyle = g(0.1);
  ctx.fillRect(Math.round(cx + u * 0.143), Math.round(fl - u * 0.225), Math.round(u * 0.026), 1);
  // cuello, cara y gorro de piloto con las antiparras en la frente
  ctx.fillStyle = g(0.55);
  ctx.beginPath();
  ctx.moveTo(hx - hs, shY - hs * 0.3);
  ctx.lineTo(hx + hs, shY - hs * 0.3);
  ctx.lineTo(hx + hs * 0.6, shY - hs * 0.8);
  ctx.lineTo(hx - hs * 0.6, shY - hs * 0.8);
  ctx.fill();
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.arc(hx, hy, hs, Math.PI, 0);
  ctx.lineTo(hx + hs * 1.12, hy + hs * 1.05);
  ctx.quadraticCurveTo(hx, hy + hs * 1.5, hx - hs * 1.12, hy + hs * 1.05);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = g(0.75);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = g(0.66);
  ctx.beginPath();
  ctx.ellipse(hx, hy + hs * 0.3, hs * 0.72, hs * 0.85, 0, 0, 7);
  ctx.fill();
  ctx.fillStyle = ink;
  ctx.fillRect(Math.round(hx - hs), Math.round(hy - hs * 0.55), Math.round(hs * 2), Math.round(hs * 0.5));
  const eye = Math.max(1, Math.round(hs * (k > 0 ? 0.3 : 0.1))); // abre los ojos si lo molestan
  for (const s of [-1, 1]) ctx.fillRect(Math.round(hx + s * hs * 0.34 - hs * 0.14), Math.round(hy + hs * 0.22), Math.max(2, Math.round(hs * 0.28)), eye);
  ctx.fillRect(Math.round(hx - hs * 0.25), Math.round(hy + hs * 0.74), Math.round(hs * 0.5), 1);
  ctx.fillStyle = g(1);
  for (const s of [-1, 1]) ctx.fillRect(Math.round(hx + s * hs * 0.45 - hs * 0.32), Math.round(hy - hs * 0.5), Math.round(hs * 0.64), Math.max(2, Math.round(hs * 0.38)));
}

function room(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, env: Env) {
  const L = layout(W, H);
  const { u, fl } = L;
  concrete(ctx, 0, 0, W, fl, u * 0.075, 0.03, 0.17);
  // piso
  const fg = ctx.createLinearGradient(0, fl, 0, H);
  fg.addColorStop(0, g(0.3));
  fg.addColorStop(1, g(0.08));
  ctx.fillStyle = fg;
  ctx.fillRect(0, fl, W, H - fl);
  ctx.strokeStyle = g(0.03);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = -10; i <= 10; i++) {
    ctx.moveTo(W / 2 + i * u * 0.11, fl);
    ctx.lineTo(W / 2 + i * u * 0.32, H);
  }
  ctx.stroke();
  ctx.fillStyle = g(0);
  ctx.fillRect(0, fl - 2, W, 2);
  ctx.fillStyle = g(0.7);
  ctx.fillRect(0, fl, W, 1);

  // cañerías del cielo
  for (const [y, h, l] of [[H * 0.05, u * 0.022, 0.4], [H * 0.05 + u * 0.035, u * 0.01, 0.25]] as const) {
    ctx.fillStyle = g(l);
    ctx.fillRect(0, Math.round(y), W, Math.max(2, Math.round(h)));
    ctx.fillStyle = g(0.95);
    ctx.fillRect(0, Math.round(y), W, 1);
  }
  ctx.fillStyle = g(0.05);
  for (let x = W * 0.08; x < W; x += u * 0.24) ctx.fillRect(Math.round(x), Math.round(H * 0.05 - 2), Math.max(2, Math.round(u * 0.012)), Math.round(u * 0.022 + 4));

  // farol enrejado: la única luz
  const lx = W * (L.port ? 0.36 : 0.52);
  const ly = H * 0.05 + u * 0.09;
  const flick = env.still ? 1 : 0.94 + 0.06 * Math.sin(t * 9) * Math.sin(t * 2.3);
  ctx.globalCompositeOperation = 'lighter';
  const lg = ctx.createRadialGradient(lx, ly, 1, lx, ly, u * 0.62);
  lg.addColorStop(0, g(0.3 * flick, 0.75 * flick));
  lg.addColorStop(0.5, g(0.08 * flick, 0.28 * flick));
  lg.addColorStop(1, g(0, 0));
  ctx.fillStyle = lg;
  ctx.fillRect(lx - u * 0.62, ly - u * 0.62, u * 1.24, u * 1.24);
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = g(0.05);
  ctx.fillRect(Math.round(lx - 1), Math.round(H * 0.05), 2, Math.round(u * 0.07));
  ctx.fillStyle = g(1, 1);
  ctx.beginPath();
  ctx.ellipse(lx, ly, u * 0.014, u * 0.02, 0, 0, 7);
  ctx.fill();
  ctx.strokeStyle = g(0.05);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const k of [-1, 0, 1]) {
    ctx.moveTo(lx + k * u * 0.012, ly - u * 0.024);
    ctx.lineTo(lx + k * u * 0.016, ly + u * 0.026);
  }
  ctx.rect(lx - u * 0.02, ly - u * 0.024, u * 0.04, u * 0.05);
  ctx.stroke();

  // por donde se bajó: el pie de la escalera, a la izquierda
  if (!L.port) {
    ctx.fillStyle = g(0);
    ctx.fillRect(0, Math.round(fl - u * 0.46), Math.round(W * 0.055), Math.round(u * 0.46));
    ctx.fillStyle = g(0.6);
    ctx.fillRect(Math.round(W * 0.055), Math.round(fl - u * 0.47), 2, Math.round(u * 0.47));
    ctx.fillRect(0, Math.round(fl - u * 0.47), Math.round(W * 0.055), 2);
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = g(0.5 - i * 0.09);
      ctx.fillRect(0, Math.round(fl - u * 0.03 - i * u * 0.05), Math.round(W * 0.055 * (1 - i * 0.14)), 2);
    }
  }

  // repisa con latas y libros
  const sx0 = W * (L.port ? 0.42 : 0.6);
  const sx1 = W * 0.96;
  const sy = Math.round(fl - u * (L.port ? 0.6 : 0.49));
  ctx.fillStyle = g(0);
  ctx.fillRect(Math.round(sx0) + 2, sy + 3, Math.round(sx1 - sx0), 2);
  let x = sx0 + u * 0.012;
  for (let i = 0; x < sx1 - u * 0.04; i++) {
    const kind = (i * 7 + 3) % 5;
    const w = u * (kind < 2 ? 0.028 : kind < 4 ? 0.014 : 0.05);
    const h = u * (kind < 2 ? 0.04 : kind < 4 ? 0.055 + (i % 3) * 0.006 : 0.032);
    ctx.fillStyle = g(kind === 1 ? 0.75 : kind === 3 ? 0.55 : 0.3, kind === 0 ? 0.7 : 0);
    ctx.fillRect(Math.round(x), Math.round(sy - h), Math.max(2, Math.round(w)), Math.round(h));
    ctx.fillStyle = g(0.03);
    if (kind < 2) ctx.fillRect(Math.round(x), Math.round(sy - h * 0.6), Math.max(2, Math.round(w)), 1);
    x += w + u * (kind === 4 ? 0.03 : 0.006);
  }
  ctx.fillStyle = g(0.6);
  ctx.fillRect(Math.round(sx0), sy, Math.round(sx1 - sx0), Math.max(2, Math.round(u * 0.008)));
  ctx.fillStyle = g(0.1);
  for (const f of [0.08, 0.92]) ctx.fillRect(Math.round(sx0 + (sx1 - sx0) * f), sy, 2, Math.round(u * 0.035));

  dog(ctx, L.frame);
  computer(ctx, L, t, env.still);
  me(ctx, L, t, env.still);
}

// ── La pared del lado ────────────────────────────────────────────────────

const hash = (n: number) => {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
};

function bookcase(ctx: CanvasRenderingContext2D, r: Rect, u: number) {
  const x = Math.round(r.x);
  const y = Math.round(r.y);
  const w = Math.round(r.w);
  const h = Math.round(r.h);
  const b = Math.max(2, Math.round(u * 0.012));
  ctx.fillStyle = g(0);
  ctx.fillRect(x + 3, y + 3, w, h);
  const wood = ctx.createLinearGradient(x, 0, x + w, 0);
  wood.addColorStop(0, g(0.5, 0.25));
  wood.addColorStop(1, g(0.22, 0.1));
  ctx.fillStyle = wood;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = g(1);
  ctx.fillRect(x, y, w, 1);
  ctx.fillRect(x, y, 1, h);
  ctx.fillStyle = g(0.02);
  ctx.fillRect(x + b, y + b, w - b * 2, h - b * 2);
  const rows = 4;
  const rh = (h - b) / rows;
  for (let j = 0; j < rows; j++) {
    const base = Math.round(y + rh * (j + 1));
    const x0 = x + b + 1;
    const x1 = x + w - b - 1;
    if (j === 1) {
      // los tres Metro, de frente
      const cw = (x1 - x0) * 0.2;
      const ch = rh * 0.8;
      ['2033', '2034', '2035'].forEach((yr, i) => {
        const bx = Math.round(x0 + (x1 - x0) * (0.06 + i * 0.235));
        const by = Math.round(base - b - ch);
        ctx.fillStyle = g(0.35);
        ctx.fillRect(bx + 2, by, Math.round(cw), Math.round(ch));
        ctx.fillStyle = g(0.03);
        ctx.fillRect(bx, by, Math.round(cw), Math.round(ch));
        ctx.fillStyle = g(0.9);
        ctx.fillRect(bx, by, Math.round(cw), 1);
        // el túnel de la portada
        ctx.strokeStyle = g(0.4);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(bx + cw / 2, by + ch * 0.95, cw * 0.32, Math.PI, 0);
        ctx.moveTo(bx + cw / 2, by + ch * 0.95);
        ctx.lineTo(bx + cw / 2, by + ch * 0.68);
        ctx.stroke();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = g(0.95);
        ctx.font = `700 ${Math.max(5, Math.round(cw * 0.26))}px "IBM Plex Sans Condensed", sans-serif`;
        ctx.fillText('METRO', bx + cw / 2, by + ch * 0.2);
        ctx.fillStyle = g(1, 1);
        ctx.font = `700 ${Math.max(7, Math.round(cw * 0.42))}px "IBM Plex Sans Condensed", sans-serif`;
        ctx.fillText(yr, bx + cw / 2, by + ch * 0.45);
      });
      // y una linterna al lado
      const lx = x0 + (x1 - x0) * 0.82;
      ctx.fillStyle = g(0.5);
      ctx.fillRect(Math.round(lx), Math.round(base - b - rh * 0.4), Math.round(u * 0.03), Math.round(rh * 0.4));
      ctx.fillStyle = g(1, 1);
      ctx.fillRect(Math.round(lx + u * 0.006), Math.round(base - b - rh * 0.32), Math.round(u * 0.018), Math.round(rh * 0.18));
      ctx.fillStyle = g(0.2);
      ctx.fillRect(Math.round(lx + u * 0.008), Math.round(base - b - rh * 0.5), Math.round(u * 0.014), Math.round(rh * 0.1));
    } else {
      let bx = x0 + 1;
      for (let i = 0; bx < x1 - u * 0.03; i++) {
        const n = hash(j * 31 + i * 1.7);
        const lean = n > 0.9;
        const bw = Math.max(2, Math.round(u * (0.012 + 0.016 * hash(i * 3.3 + j))));
        const bh = Math.round(rh * (0.5 + 0.32 * hash(i * 5.1 + j * 2)));
        if (n < 0.12) {
          bx += u * 0.03; // un hueco
          continue;
        }
        ctx.fillStyle = g(0.25 + 0.6 * hash(i * 9.7 + j * 4), n > 0.7 ? 0.7 : 0, n < 0.4 ? 0.6 : 0);
        if (lean) {
          ctx.save();
          ctx.translate(bx, base - b);
          ctx.rotate(0.25);
          ctx.fillRect(0, -bh, bw, bh);
          ctx.restore();
          bx += bw + bh * 0.26;
        } else {
          ctx.fillRect(Math.round(bx), base - b - bh, bw, bh);
          ctx.fillStyle = g(0.03);
          ctx.fillRect(Math.round(bx), base - b - Math.round(bh * 0.8), bw, 1);
          bx += bw + 1;
        }
      }
    }
    ctx.fillStyle = g(0.45, 0.2);
    ctx.fillRect(x + b, base - b, w - b * 2, b);
    ctx.fillStyle = g(0.95);
    ctx.fillRect(x + b, base - b, w - b * 2, 1);
  }
}

/** El gato: la cara del dibujo (ojeras, cicatriz, mechones) y un cuerpecito chico de monito. Blanco. */
function cat(ctx: CanvasRenderingContext2D, L: ReturnType<typeof layout>, t: number, still: boolean) {
  const { u } = L;
  const { pcx, pfl } = L.side;
  // puff
  ctx.fillStyle = g(0);
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.ellipse(pcx, pfl + u * 0.01, u * 0.17, u * 0.025, 0, 0, 7);
  ctx.fill();
  ctx.globalAlpha = 1;
  const pg = ctx.createLinearGradient(0, pfl - u * 0.15, 0, pfl);
  pg.addColorStop(0, g(0.75, 0.75));
  pg.addColorStop(1, g(0.25, 0.4));
  ctx.fillStyle = pg;
  ctx.beginPath();
  ctx.moveTo(pcx - u * 0.15, pfl);
  ctx.bezierCurveTo(pcx - u * 0.2, pfl - u * 0.1, pcx - u * 0.1, pfl - u * 0.16, pcx, pfl - u * 0.12);
  ctx.bezierCurveTo(pcx + u * 0.1, pfl - u * 0.16, pcx + u * 0.2, pfl - u * 0.1, pcx + u * 0.15, pfl);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = g(0.95);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.strokeStyle = g(0.15, 0.3);
  ctx.beginPath();
  ctx.moveTo(pcx - u * 0.1, pfl - u * 0.03);
  ctx.quadraticCurveTo(pcx - u * 0.05, pfl - u * 0.07, pcx - u * 0.07, pfl - u * 0.11);
  ctx.moveTo(pcx + u * 0.11, pfl - u * 0.03);
  ctx.quadraticCurveTo(pcx + u * 0.06, pfl - u * 0.06, pcx + u * 0.08, pfl - u * 0.11);
  ctx.stroke();

  const k = still ? 0 : Math.max(0, 1 - (t - fx.cat) / 0.5);
  const s = u * 0.052; // radio de la cabeza
  const hop = Math.sin(k * Math.PI) * s * 0.5;
  const cx = pcx + Math.sin(k * Math.PI * 5) * s * 0.12 * k;
  const by = pfl - u * 0.105 - hop; // donde se sienta
  const cy = by - s * 1.35 + (still ? 0 : Math.sin(t * 1.1) * 0.6);
  const ink = g(0.02);
  const fur = g(0.98);
  const lw = Math.max(1.5, s * 0.1);
  // cuerpo: tronco corto, bracitos y patitas
  const body = () => {
    ctx.beginPath();
    ctx.roundRect(cx - s * 0.52, by - s * 0.75, s * 1.04, s * 0.8, s * 0.22);
    ctx.roundRect(cx - s * 0.78, by - s * 0.68, s * 0.3, s * 0.5, s * 0.12);
    ctx.roundRect(cx + s * 0.48, by - s * 0.68, s * 0.3, s * 0.5, s * 0.12);
    ctx.roundRect(cx - s * 0.46, by - s * 0.1, s * 0.38, s * 0.42, s * 0.1);
    ctx.roundRect(cx + s * 0.08, by - s * 0.1, s * 0.38, s * 0.42, s * 0.1);
  };
  ctx.lineJoin = 'round';
  ctx.strokeStyle = ink;
  ctx.lineWidth = lw * 2;
  body();
  ctx.stroke();
  ctx.fillStyle = fur;
  body();
  ctx.fill();
  // cola
  ctx.strokeStyle = ink;
  ctx.lineWidth = s * 0.34;
  ctx.lineCap = 'round';
  const tail = () => {
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.5, by - s * 0.1);
    ctx.quadraticCurveTo(cx + s * 1.3, by, cx + s * 1.2, by - s * (0.7 + (still ? 0 : 0.15 * Math.sin(t * 2.2))));
    ctx.stroke();
  };
  tail();
  ctx.strokeStyle = fur;
  ctx.lineWidth = s * 0.34 - lw * 1.4;
  tail();
  ctx.lineCap = 'butt';
  // cabeza: orejas redondeadas, mechones a los lados y abajo
  const P = (x: number, y: number): [number, number] => [cx + x * s, cy + y * s];
  const half: [number, number][] = [[0.3, -0.72], [0.42, -1.0], [0.62, -1.12], [0.86, -1.02], [0.95, -0.35], [1.02, 0.02], [0.9, 0.06], [1.08, 0.42], [0.98, 0.98], [0.74, 0.64], [0.56, 0.98], [0.4, 0.66]];
  const head = () => {
    ctx.beginPath();
    half.forEach(([x, y], i) => (i ? ctx.lineTo(...P(x, y)) : ctx.moveTo(...P(x, y))));
    [...half].reverse().forEach(([x, y]) => ctx.lineTo(...P(-x, y)));
    ctx.closePath();
  };
  ctx.strokeStyle = ink;
  ctx.lineWidth = lw * 2;
  head();
  ctx.stroke();
  ctx.fillStyle = fur;
  head();
  ctx.fill();
  ctx.lineJoin = 'miter';
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const m of [-1, 1]) {
    // interior de la oreja
    ctx.moveTo(...P(m * 0.5, -0.74));
    ctx.quadraticCurveTo(...P(m * 0.62, -1.0), ...P(m * 0.8, -0.7));
    // párpado caído, ojo a medio cerrar y ojera
    const open = k > 0 ? 0.3 : 0.15;
    ctx.moveTo(...P(m * 0.16, -0.04));
    ctx.lineTo(...P(m * 0.74, -0.2));
    ctx.moveTo(...P(m * 0.24, 0));
    ctx.quadraticCurveTo(...P(m * 0.46, open), ...P(m * 0.7, -0.08));
    ctx.moveTo(...P(m * 0.24, 0.2));
    ctx.quadraticCurveTo(...P(m * 0.48, 0.34), ...P(m * 0.74, 0.14));
  }
  // cicatriz en la frente
  ctx.moveTo(...P(-0.02, -0.5));
  ctx.lineTo(...P(0.04, -0.34));
  ctx.lineTo(...P(-0.03, -0.24));
  ctx.lineTo(...P(0.02, -0.1));
  // boca
  ctx.moveTo(...P(0, 0.14));
  ctx.lineTo(...P(0, 0.26));
  ctx.moveTo(...P(-0.08, 0.36));
  ctx.lineTo(...P(0, 0.26));
  ctx.lineTo(...P(0.08, 0.36));
  ctx.stroke();
  ctx.fillStyle = ink;
  for (const m of [-1, 1]) ctx.fillRect(Math.round(cx + m * s * 0.46 - 1), Math.round(cy - s * 0.06), 2, Math.max(1, Math.round(s * (k > 0 ? 0.2 : 0.1))));
  ctx.beginPath();
  ctx.moveTo(...P(-0.09, 0.05));
  ctx.lineTo(...P(0.09, 0.05));
  ctx.lineTo(...P(0, 0.16));
  ctx.fill();
}

/** Rocky, echado en su frazada: negro y fuego, orejas caídas, hocico largo. */
function rocky(ctx: CanvasRenderingContext2D, L: ReturnType<typeof layout>, t: number, still: boolean) {
  const { x, y, s } = L.side.rocky;
  const ink = g(0.03);
  const tan = g(0.8, 1);
  const rim = g(0.75);
  const br = still ? 0 : Math.sin(t * 1.5) * s * 0.008;
  // frazada
  ctx.fillStyle = g(0.55, 0.15, 0.3);
  ctx.beginPath();
  ctx.ellipse(x, y, s * 0.62, s * 0.1, 0, 0, 7);
  ctx.fill();
  ctx.strokeStyle = g(0.9);
  ctx.lineWidth = 1;
  ctx.stroke();
  const outline = (draw: () => void, fill: string) => {
    ctx.strokeStyle = rim;
    ctx.lineWidth = 2;
    draw();
    ctx.stroke();
    ctx.fillStyle = fill;
    draw();
    ctx.fill();
  };
  // cola peluda
  outline(() => {
    ctx.beginPath();
    ctx.ellipse(x + s * 0.46, y - s * 0.06, s * 0.16, s * 0.045, still ? -0.2 : -0.2 + 0.25 * Math.max(0, Math.sin(t * 6)) * Math.max(0, Math.sin(t * 0.7)), 0, 7);
  }, ink);
  // lomo
  outline(() => {
    ctx.beginPath();
    ctx.moveTo(x - s * 0.22, y);
    ctx.quadraticCurveTo(x - s * 0.26, y - s * 0.24 - br, x, y - s * 0.26 - br);
    ctx.quadraticCurveTo(x + s * 0.42, y - s * 0.27 - br, x + s * 0.44, y);
    ctx.closePath();
  }, ink);
  // pecho y panza fuego, pata trasera recogida
  ctx.fillStyle = tan;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.22, y);
  ctx.quadraticCurveTo(x - s * 0.2, y - s * 0.12, x - s * 0.06, y - s * 0.08);
  ctx.lineTo(x + s * 0.3, y - s * 0.05);
  ctx.lineTo(x + s * 0.4, y);
  ctx.fill();
  outline(() => {
    ctx.beginPath();
    ctx.ellipse(x + s * 0.3, y - s * 0.07, s * 0.13, s * 0.08, 0, 0, 7);
  }, ink);
  // patas delanteras estiradas
  for (const d of [0, 1]) {
    outline(() => {
      ctx.beginPath();
      ctx.roundRect(x - s * 0.44 + d * s * 0.05, y - s * 0.055 + d * s * 0.03, s * 0.24, s * 0.05, s * 0.025);
    }, tan);
  }
  // cabeza apoyada: oreja caída, mejilla y ceja fuego, hocico oscuro
  const hx = x - s * 0.3;
  const hy = y - s * 0.19;
  outline(() => {
    ctx.beginPath();
    ctx.ellipse(hx, hy, s * 0.13, s * 0.115, 0, 0, 7);
  }, ink);
  ctx.fillStyle = tan;
  ctx.beginPath();
  ctx.ellipse(hx - s * 0.03, hy + s * 0.05, s * 0.07, s * 0.05, 0.3, 0, 7);
  ctx.fill();
  outline(() => {
    ctx.beginPath();
    ctx.roundRect(hx - s * 0.24, hy - s * 0.01, s * 0.17, s * 0.085, s * 0.03);
  }, g(0.6, 0.15));
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.ellipse(hx - s * 0.235, hy + s * 0.02, s * 0.03, s * 0.03, 0, 0, 7);
  ctx.fill();
  ctx.fillStyle = tan;
  ctx.fillRect(Math.round(hx - s * 0.085), Math.round(hy - s * 0.065), Math.max(2, Math.round(s * 0.035)), Math.max(1, Math.round(s * 0.02)));
  ctx.fillStyle = g(1);
  ctx.fillRect(Math.round(hx - s * 0.08), Math.round(hy - s * 0.04), Math.max(2, Math.round(s * 0.03)), 2);
  outline(() => {
    ctx.beginPath();
    ctx.ellipse(hx + s * 0.07, hy + s * 0.02, s * 0.05, s * 0.11, -0.25, 0, 7);
  }, ink);
}

/**
 * El avatar del amigo. El chiste es que está mal puesto: pocos píxeles, estirado,
 * chueco, sin sombra, flotando un poco y con el fondo gris de la captura todavía pegado.
 */
function avatar(ctx: CanvasRenderingContext2D, L: ReturnType<typeof layout>, t: number) {
  const r = L.side.rbx;
  const c = r.w / 20; // una "celda" de la captura
  const k = Math.max(0, 1 - (t - fx.rbx) / 0.4);
  const jx = k > 0 ? (Math.floor(t * 14) % 2 ? 3 : -3) : 0; // no se anima: salta de lugar
  ctx.save();
  ctx.translate(r.x + r.w / 2 + jx, r.y + r.h / 2);
  ctx.rotate(-0.045);
  ctx.translate(-r.w / 2, -r.h / 2);
  const B = (x: number, y: number, w: number, h: number, col: string) => {
    ctx.fillStyle = col;
    ctx.fillRect(x * c, y * c, w * c, h * c);
  };
  const dark = g(0.05);
  const blue = g(0.3, 0, 1);
  const teal = g(0.4, 0, 0.8);
  const amber = g(0.85, 1);
  B(0, 0, 20, 26, g(0.82, 0, 0.3)); // el fondo de la captura
  B(0, 0, 20, 0.4, g(1));
  B(0, 0, 0.4, 26, g(1));
  B(15, 1, 2, 2, g(0.5, 1)); // la bolita
  B(9, 1, 3, 1, dark); // gorro
  B(8, 2, 5, 2, dark);
  B(5.5, 3.4, 10, 0.8, amber); // aureola
  B(8, 3.2, 5, 1, dark);
  B(6.5, 4, 8, 5, blue); // pelo
  B(7.5, 4, 6, 1.2, dark);
  B(8, 5.2, 5, 3.6, g(0.75, 1)); // la carita naranja
  B(8.8, 6.3, 1, 1, dark);
  B(11.2, 6.3, 1, 1, dark);
  B(9.6, 7.6, 1.8, 0.5, dark);
  B(4.5, 9, 2.5, 5.5, g(0.7, 0.3, 0.6)); // mochila
  B(13.5, 9, 2, 5.5, blue);
  B(7, 9, 7, 9, dark); // abrigo
  B(10, 10, 1, 1, g(0.9));
  B(10.2, 11, 0.6, 7, g(0.3));
  B(2.5, 9.2, 5, 1.8, dark); // brazo estirado
  B(1.5, 8.2, 2, 2.2, dark);
  B(14, 10.5, 1.6, 1.6, dark); // el otro brazo
  B(15.2, 11.8, 1.6, 1.6, dark);
  B(16.2, 13, 1.6, 1.8, dark);
  B(6.6, 18, 3.2, 3.4, teal); // pantalón
  B(10.6, 18, 3.2, 3.4, teal);
  for (let i = 0; i < 4; i++) {
    B(7.6, 21.4 + i * 0.6, 1.2, 0.6, i % 2 ? dark : g(0.9)); // medias a rayas
    B(11.6, 21.4 + i * 0.6, 1.2, 0.6, i % 2 ? dark : g(0.9));
  }
  B(6, 23.6, 3.6, 1.6, dark); // botas
  B(11, 23.6, 3.6, 1.6, dark);
  // "compresión": bloques sueltos alrededor
  for (let i = 0; i < 22; i++) B(Math.floor(hash(i * 3.1) * 19), Math.floor(hash(i * 7.7) * 25), 1, 1, hash(i) > 0.5 ? g(0.9, 0, 0.2) : g(0.7, 0, 0.5));
  ctx.restore();
}

function side(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, env: Env) {
  const L = layout(W, H);
  const { u, fl } = L;
  concrete(ctx, 0, 0, W, fl, u * 0.075, 0.03, 0.17);
  const fg = ctx.createLinearGradient(0, fl, 0, H);
  fg.addColorStop(0, g(0.3));
  fg.addColorStop(1, g(0.08));
  ctx.fillStyle = fg;
  ctx.fillRect(0, fl, W, H - fl);
  ctx.strokeStyle = g(0.03);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = -10; i <= 10; i++) {
    ctx.moveTo(W / 2 + i * u * 0.11, fl);
    ctx.lineTo(W / 2 + i * u * 0.32, H);
  }
  ctx.stroke();
  ctx.fillStyle = g(0);
  ctx.fillRect(0, fl - 2, W, 2);
  ctx.fillStyle = g(0.7);
  ctx.fillRect(0, fl, W, 1);
  // las mismas cañerías siguen de largo
  for (const [y, h, l] of [[H * 0.05, u * 0.022, 0.4], [H * 0.05 + u * 0.035, u * 0.01, 0.25]] as const) {
    ctx.fillStyle = g(l);
    ctx.fillRect(0, Math.round(y), W, Math.max(2, Math.round(h)));
    ctx.fillStyle = g(0.95);
    ctx.fillRect(0, Math.round(y), W, 1);
  }
  // otro farol
  const lx = W * (L.port ? 0.6 : 0.56);
  const ly = H * 0.05 + u * 0.09;
  const flick = env.still ? 1 : 0.94 + 0.06 * Math.sin(t * 7 + 2) * Math.sin(t * 1.9);
  ctx.globalCompositeOperation = 'lighter';
  const lg = ctx.createRadialGradient(lx, ly, 1, lx, ly, u * 0.7);
  lg.addColorStop(0, g(0.3 * flick, 0.75 * flick));
  lg.addColorStop(0.5, g(0.08 * flick, 0.28 * flick));
  lg.addColorStop(1, g(0, 0));
  ctx.fillStyle = lg;
  ctx.fillRect(lx - u * 0.7, ly - u * 0.7, u * 1.4, u * 1.4);
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = g(0.05);
  ctx.fillRect(Math.round(lx - 1), Math.round(H * 0.05), 2, Math.round(u * 0.07));
  ctx.fillStyle = g(1, 1);
  ctx.beginPath();
  ctx.ellipse(lx, ly, u * 0.014, u * 0.02, 0, 0, 7);
  ctx.fill();
  // afiche del metro en el muro y un mapa de líneas
  {
    const pw = u * (L.port ? 0.4 : 0.2);
    const ph = pw * 0.75;
    const px = L.port ? W * 0.5 : W * 0.74;
    const py = L.port ? fl - u * 1.05 : fl - u * 0.5;
    ctx.fillStyle = g(0.8, 0.2);
    ctx.fillRect(Math.round(px), Math.round(py), Math.round(pw), Math.round(ph));
    ctx.lineWidth = 1;
    for (const [a, b2, col] of [[0.2, 0.8, g(0.1)], [0.75, 0.3, g(0.4, 1)], [0.5, 0.55, g(0.3, 0, 1)]] as const) {
      ctx.strokeStyle = col;
      ctx.beginPath();
      ctx.moveTo(px + pw * 0.08, py + ph * a);
      ctx.lineTo(px + pw * 0.4, py + ph * a);
      ctx.lineTo(px + pw * 0.6, py + ph * b2);
      ctx.lineTo(px + pw * 0.92, py + ph * b2);
      ctx.stroke();
    }
    ctx.fillStyle = g(0.03);
    for (const [a, b2] of [[0.25, 0.2], [0.5, 0.5], [0.75, 0.3], [0.6, 0.8]]) ctx.fillRect(Math.round(px + pw * a) - 1, Math.round(py + ph * b2) - 1, 2, 2);
  }
  bookcase(ctx, L.side.shelf, u);
  // planta en maceta arriba del librero
  {
    const sx = L.side.shelf.x + L.side.shelf.w * 0.75;
    const sy = L.side.shelf.y;
    ctx.fillStyle = g(0.5, 0.5);
    ctx.fillRect(Math.round(sx), Math.round(sy - u * 0.03), Math.round(u * 0.035), Math.round(u * 0.03));
    ctx.strokeStyle = g(0.6, 0, 0.6);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      ctx.moveTo(sx + u * 0.017, sy - u * 0.03);
      ctx.quadraticCurveTo(sx + u * 0.017 + (i - 2.5) * u * 0.012, sy - u * 0.08, sx + u * 0.017 + (i - 2.5) * u * 0.028, sy - u * (0.05 + 0.02 * hash(i)));
    }
    ctx.stroke();
  }
  avatar(ctx, L, t);
  cat(ctx, L, t, env.still);
  rocky(ctx, L, t, env.still);
}

export function draw(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, env: Env) {
  if (fx.p >= 3) {
    const dt = Math.min(0.1, Math.max(0, t - look.last));
    look.last = t;
    const step = env.still ? 1 : dt / 0.8;
    look.p = look.to > look.p ? Math.min(look.to, look.p + step) : Math.max(look.to, look.p - step);
    const e = Math.round(ease(look.p) * W);
    const pane = (dx: number, f: () => void) => {
      ctx.save();
      ctx.beginPath();
      ctx.rect(dx, 0, W, H);
      ctx.clip();
      ctx.translate(dx, 0);
      f();
      ctx.restore();
    };
    if (e < W) pane(-e, () => room(ctx, W, H, t, env));
    if (e > 0) pane(W - e, () => side(ctx, W, H, t, env));
    return;
  }
  look.p = look.to = 0;
  if (fx.p < 2) door(ctx, W, H, fx.p);
  else if (fx.p < 3) stairs(ctx, W, H, fx.p - 2);
}
