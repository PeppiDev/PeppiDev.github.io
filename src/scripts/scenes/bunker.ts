// El búnker (huevo de pascua): se llega escribiendo "true me" en la máquina del
// taller. Primero la caminata hasta la puerta blindada y la escalera, en primera
// persona; después el cuarto, con el dueño de casa echado en el sillón.

import { g } from '../dither';
import type { Env, Rect } from './types';

/**
 * p: 0‥1 caminar hacia la puerta · 1‥2 se abre · 2‥3 bajar la escalera · ≥3 el cuarto.
 * hit: cuándo molestaron al del sillón.
 */
export const fx = { p: 3, hit: -9, run: false };
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
  return { u, port, fl, cx, me, head, frame, desk };
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
  pg.addColorStop(0, g(0.95, 0.4));
  pg.addColorStop(1, g(0.65, 0.8));
  ctx.fillStyle = pg;
  ctx.fillRect(px, py, pw, ph);
  ctx.save();
  ctx.beginPath();
  ctx.rect(px, py, pw, ph);
  ctx.clip();
  const cx = px + pw / 2;
  const s = pw * 0.5;
  const hy = py + ph * 0.46;
  const ink = g(0.04);
  // cuerpo sentado
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.7, py + ph);
  ctx.quadraticCurveTo(cx - s * 0.6, hy + s * 0.2, cx, hy + s * 0.2);
  ctx.quadraticCurveTo(cx + s * 0.6, hy + s * 0.2, cx + s * 0.7, py + ph);
  ctx.fill();
  // orejas caídas
  for (const k of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(cx + k * s * 0.52, hy - s * 0.05, s * 0.2, s * 0.42, k * 0.35, 0, 7);
    ctx.fill();
  }
  // cabeza, hocico claro, nariz y ojos
  ctx.beginPath();
  ctx.arc(cx, hy - s * 0.1, s * 0.46, 0, 7);
  ctx.fill();
  ctx.fillStyle = g(0.9);
  ctx.beginPath();
  ctx.ellipse(cx, hy + s * 0.12, s * 0.24, s * 0.2, 0, 0, 7);
  ctx.fill();
  ctx.fillStyle = ink;
  ctx.fillRect(Math.round(cx - s * 0.08), Math.round(hy + s * 0.02), Math.max(2, Math.round(s * 0.16)), Math.max(2, Math.round(s * 0.11)));
  ctx.fillRect(Math.round(cx), Math.round(hy + s * 0.1), 1, Math.max(1, Math.round(s * 0.12)));
  ctx.fillStyle = g(1);
  for (const k of [-1, 1]) ctx.fillRect(Math.round(cx + k * s * 0.2 - 1), Math.round(hy - s * 0.22), 2, 2);
  // collar
  ctx.fillStyle = g(0.9, 1);
  ctx.fillRect(Math.round(cx - s * 0.3), Math.round(hy + s * 0.36), Math.round(s * 0.6), Math.max(1, Math.round(s * 0.08)));
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

export function draw(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, env: Env) {
  if (fx.p < 2) door(ctx, W, H, fx.p);
  else if (fx.p < 3) stairs(ctx, W, H, fx.p - 2);
  else room(ctx, W, H, t, env);
}
