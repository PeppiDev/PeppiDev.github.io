// Caseta de radio (Contacto): sentado frente a la mesa del operador.
// El receptor, la lámpara, el manipulador y la ventana se dibujan aquí;
// la hoja con los datos de contacto es HTML puesto encima.

import { g } from '../dither';
import { box, deskY, lamp, lampLight, lampRect, paper, room, shadow, view, windowPane, type Lamp, breach, brokenPane, rubble, cracks } from './desk';
import { rain } from './exterior';
import { friends } from '../../data/friends';
import type { Env, Rect } from './types';

export function layout(W: number, H: number) {
  const v = view(W, H);
  const S = v.sh;
  const lampL: Lamp = { bx: W * 0.1, by: S * 0.63, s: Math.min(S * 0.46, W * 0.36), dir: 1 };
  const sheet: Rect = v.port
    ? { x: W * 0.3, y: S * 0.7, w: W * 0.3, h: S * 0.26 }
    : { x: W * 0.2, y: S * 0.56, w: W * 0.37, h: S * 0.42 };
  // receptor
  const rw = W * (v.port ? 0.5 : 0.44);
  const rh = Math.min(S * 0.29, rw * 0.42);
  const receiver: Rect = { x: W * (v.port ? 0.3 : 0.34), y: deskY(v, 0.09) - rh, w: rw, h: rh };
  // cuadro con la foto de los amigos, de pie al fondo del tablero
  const fh = S * 0.17;
  const frame: Rect = { x: W * (v.port ? 0.815 : 0.815), y: deskY(v, 0.1) - fh, w: W * (v.port ? 0.17 : 0.13), h: fh };
  // manipulador telegráfico
  const kw = W * (v.port ? 0.24 : 0.2);
  const key: Rect = { x: W * (v.port ? 0.68 : 0.67), y: S * 0.87, w: kw, h: Math.round(S * 0.028) };
  const keyHit: Rect = { x: key.x, y: key.y - S * 0.16, w: kw, h: S * 0.16 + key.h };
  return { v, sheet, lamp: lampL, lampRect: lampRect(lampL), receiver, frame, key, keyHit };
}
type Layout = ReturnType<typeof layout>;

/** Estado vivo: perillas (radianes), aguja del dial y manipulador presionado. */
export const fx = { k0: 0, k1: 0, k2: 0, sweep: 0.6, hold: false, key: 0 };

/** Dónde queda cada persona de la foto: la 0 soy yo, el resto son `friends` en orden. */
export function people(L: Layout): Rect[] {
  const F = L.frame;
  const b = Math.max(2, Math.round(F.h * 0.09));
  const n = friends.length + 1;
  const pw = F.w - b * 2;
  const ph = F.h - b * 2;
  const fw = Math.min((pw / n) * 0.86, ph * 0.62);
  return Array.from({ length: n }, (_, i) => {
    const h = ph * (0.74 + 0.1 * ((i * 5 + 1) % 3) / 2);
    return { x: F.x + b + (pw * (i + 0.5)) / n - fw / 2, y: F.y + b + ph - h, w: fw, h };
  });
}

function bust(ctx: CanvasRenderingContext2D, r: Rect, pilot: boolean) {
  const cx = r.x + r.w / 2;
  const hr = r.w * 0.24;
  const hy = r.y + hr;
  const by = r.y + r.h;
  ctx.fillStyle = g(0.03);
  ctx.beginPath();
  ctx.arc(cx, hy, hr, 0, 7);
  ctx.fill();
  ctx.fillRect(cx - hr * 0.4, hy, hr * 0.8, hr * 1.5);
  ctx.beginPath();
  ctx.moveTo(r.x, by);
  ctx.quadraticCurveTo(r.x, hy + hr * 1.5, cx - hr * 0.5, hy + hr * 1.35);
  ctx.lineTo(cx + hr * 0.5, hy + hr * 1.35);
  ctx.quadraticCurveTo(r.x + r.w, hy + hr * 1.5, r.x + r.w, by);
  ctx.fill();
  if (pilot) {
    // gorro de cuero con orejeras y antiparras sobre la frente
    ctx.fillRect(cx - hr * 1.12, hy - hr * 0.2, hr * 2.24, hr * 1.25);
    ctx.fillStyle = g(1);
    ctx.fillRect(Math.round(cx - hr * 0.8), Math.round(hy - hr * 0.55), Math.max(2, Math.round(hr * 0.65)), Math.max(1, Math.round(hr * 0.4)));
    ctx.fillRect(Math.round(cx + hr * 0.15), Math.round(hy - hr * 0.55), Math.max(2, Math.round(hr * 0.65)), Math.max(1, Math.round(hr * 0.4)));
  }
}

/** Cuadro de pie con la foto del grupo. */
function photoFrame(ctx: CanvasRenderingContext2D, L: Layout) {
  const F = L.frame;
  const S = L.v.sh;
  const b = Math.max(2, Math.round(F.h * 0.09));
  shadow(ctx, F.x + F.w * 0.55, F.y + F.h + 1, F.w * 0.62, S * 0.014);
  // pata trasera
  ctx.fillStyle = g(0.04);
  ctx.beginPath();
  ctx.moveTo(F.x + F.w * 0.7, F.y + F.h * 0.4);
  ctx.lineTo(F.x + F.w * 1.06, F.y + F.h - S * 0.012);
  ctx.lineTo(F.x + F.w * 0.9, F.y + F.h);
  ctx.fill();
  box(ctx, L.v, F.x, F.y, F.w, F.h, S * 0.008, 0.3);
  ctx.fillStyle = g(1);
  ctx.fillRect(Math.round(F.x), Math.round(F.y), Math.round(F.w), 1);
  ctx.fillRect(Math.round(F.x), Math.round(F.y), 1, Math.round(F.h));
  // foto: cielo sepia y horizonte
  const px = Math.round(F.x) + b;
  const py = Math.round(F.y) + b;
  const pw = Math.round(F.w) - b * 2;
  const ph = Math.round(F.h) - b * 2;
  const pg = ctx.createLinearGradient(0, py, 0, py + ph);
  pg.addColorStop(0, g(0.95, 0.35));
  pg.addColorStop(1, g(0.6, 0.75));
  ctx.fillStyle = pg;
  ctx.fillRect(px, py, pw, ph);
  ctx.fillStyle = g(0.03);
  ctx.fillRect(px - 1, py - 1, pw + 2, 1);
  ctx.fillRect(px - 1, py - 1, 1, ph + 2);
  ctx.save();
  ctx.beginPath();
  ctx.rect(px, py, pw, ph);
  ctx.clip();
  people(L).forEach((r, i) => bust(ctx, r, i === 0));
  ctx.restore();
}

/** Micrófono de estación: cápsula colgada de resortes dentro de un aro. */
function mic(ctx: CanvasRenderingContext2D, cx: number, by: number, h: number) {
  const r = h * 0.27;
  const cy = by - h + r;
  shadow(ctx, cx + h * 0.03, by + 1, h * 0.26, h * 0.06);
  ctx.fillStyle = g(0.15);
  ctx.beginPath();
  ctx.ellipse(cx, by, h * 0.2, h * 0.055, 0, 0, 7);
  ctx.fill();
  ctx.fillStyle = g(0.8);
  ctx.beginPath();
  ctx.ellipse(cx, by - h * 0.03, h * 0.2, h * 0.05, 0, 0, 7);
  ctx.fill();
  // vástago
  const sw = Math.max(2, Math.round(h * 0.045));
  ctx.fillStyle = g(0.12);
  ctx.fillRect(Math.round(cx - sw / 2), Math.round(cy + r), sw, Math.round(by - h * 0.04 - cy - r));
  ctx.fillStyle = g(0.9);
  ctx.fillRect(Math.round(cx - sw / 2), Math.round(cy + r), 1, Math.round(by - h * 0.04 - cy - r));
  // aro y resortes
  ctx.strokeStyle = g(0.03);
  ctx.lineWidth = Math.max(3, h * 0.06);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, 7);
  ctx.stroke();
  ctx.strokeStyle = g(0.95);
  ctx.lineWidth = Math.max(1.2, h * 0.022);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, 7);
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    ctx.moveTo(cx + Math.cos(a) * r * 0.5, cy + Math.sin(a) * r * 0.5);
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  ctx.stroke();
  // cápsula con rejilla
  ctx.fillStyle = g(0.06);
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.62, 0, 7);
  ctx.fill();
  ctx.strokeStyle = g(0.8);
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.62, 0, 7);
  ctx.stroke();
  ctx.fillStyle = g(0.75, 0.5);
  for (let y = -2; y <= 2; y++) {
    const yy = cy + (y * r * 0.2);
    const half = Math.sqrt(Math.max(0, (r * 0.5) ** 2 - (yy - cy) ** 2));
    ctx.fillRect(Math.round(cx - half), Math.round(yy), Math.round(half * 2), 1);
  }
}

export const horizon = (W: number, H: number) => view(W, H).sh * 0.36;

export function draw(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, env: Env) {
  const L = layout(W, H);
  const { v } = L;
  const S = v.sh;
  room(ctx, W, H, v, env);

  // Ventana recortada: afuera, el mástil de la antena contra el cielo real
  const win: Rect = { x: W * 0.83, y: -S * 0.04, w: W * 0.3, h: S * 0.33 };
  if (env.doom) {
    breach(ctx, W * (v.port ? 0.2 : 0.22), S * 0.13, W * (v.port ? 0.14 : 0.1), S * 0.12, 7.7);
    breach(ctx, W * 0.62, S * 0.04, W * 0.07, S * 0.06, 2.9);
    brokenPane(ctx, win, env.daylight);
  } else windowPane(ctx, win, 2, 2, env.daylight);
  ctx.save();
  ctx.beginPath();
  ctx.rect(win.x, win.y, win.w, win.h);
  ctx.clip();
  const mx = win.x + W * 0.1;
  const half = W * 0.018;
  ctx.strokeStyle = g(0.06);
  ctx.lineWidth = 1;
  ctx.beginPath();
  const seg = Math.max(6, win.h / 5);
  // en ruinas la torre llega hasta la mitad
  for (let y = win.y + win.h; y > (env.doom ? win.y + win.h * 0.5 : win.y - seg); y -= seg) {
    ctx.moveTo(mx - half, y);
    ctx.lineTo(mx - half, y - seg);
    ctx.moveTo(mx + half, y);
    ctx.lineTo(mx + half, y - seg);
    ctx.moveTo(mx - half, y);
    ctx.lineTo(mx + half, y - seg);
    ctx.moveTo(mx + half, y);
    ctx.lineTo(mx - half, y - seg);
  }
  ctx.stroke();
  if (env.rain > 0) rain(ctx, W, H, t, env.rain);
  ctx.restore();

  lampLight(ctx, L.lamp, env.lamp, v);

  if (env.doom) rubble(ctx, v, W, 20, 6.1);

  // ── Receptor: caja con tapa en fuga ──
  const { x: rx, y: ry0, w: rw, h: rh } = L.receiver;
  const ry1 = ry0 + rh;
  shadow(ctx, rx + rw * 0.52, ry1 + 1, rw * 0.56, S * 0.022);
  box(ctx, v, rx, ry0, rw, rh, S * 0.04, 0.5);
  // asa
  ctx.strokeStyle = g(0.2);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(rx + rw * 0.4, ry0 - S * 0.02);
  ctx.quadraticCurveTo(rx + rw * 0.5, ry0 - S * 0.045, rx + rw * 0.6, ry0 - S * 0.02);
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.fillStyle = g(1);
  ctx.fillRect(Math.round(rx), Math.round(ry0), Math.round(rw), 1);
  // frente embutido
  const inset = Math.max(3, Math.round(rh * 0.08));
  ctx.fillStyle = g(0.02);
  ctx.fillRect(Math.round(rx) + inset, Math.round(ry0) + inset, Math.round(rw) - inset * 2, Math.round(rh) - inset * 2);
  ctx.fillStyle = g(0.25);
  ctx.fillRect(Math.round(rx) + inset, Math.round(ry0) + inset, Math.round(rw) - inset * 2, 1);

  // parlante: rejilla con cono al fondo
  const scx = rx + rw * 0.26;
  const scy = ry0 + rh * 0.5;
  const sr = Math.min(rw * 0.19, rh * 0.36);
  const rim = ctx.createLinearGradient(scx - sr, scy - sr, scx + sr, scy + sr);
  rim.addColorStop(0, g(0.2));
  rim.addColorStop(1, g(0.9));
  ctx.fillStyle = rim;
  ctx.beginPath();
  ctx.arc(scx, scy, sr * 1.1, 0, 7);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.arc(scx, scy, sr, 0, 7);
  ctx.clip();
  const cone = ctx.createRadialGradient(scx - sr * 0.25, scy - sr * 0.25, 1, scx, scy, sr);
  cone.addColorStop(0, g(0.02));
  cone.addColorStop(1, g(0.5));
  ctx.fillStyle = cone;
  ctx.fillRect(scx - sr, scy - sr, sr * 2, sr * 2);
  ctx.fillStyle = g(0);
  for (let y = scy - sr; y < scy + sr; y += 3) ctx.fillRect(scx - sr, Math.round(y), sr * 2, 1);
  ctx.restore();

  // dial de sintonía, iluminado
  const dx0 = rx + rw * 0.52;
  const dx1 = rx + rw * 0.92;
  const dy0 = ry0 + rh * 0.18;
  const dy1 = ry0 + rh * 0.5;
  ctx.fillStyle = g(0.6);
  ctx.fillRect(dx0 - 2, dy0 - 2, dx1 - dx0 + 4, dy1 - dy0 + 4);
  const dg = ctx.createLinearGradient(0, dy0, 0, dy1);
  dg.addColorStop(0, g(0.3, 0.55));
  dg.addColorStop(1, g(0.5, 1));
  ctx.fillStyle = dg;
  ctx.fillRect(dx0, dy0, dx1 - dx0, dy1 - dy0);
  ctx.fillStyle = g(0.02);
  for (let i = 0; i <= 20; i++) {
    const x = Math.round(dx0 + 3 + ((dx1 - dx0 - 6) * i) / 20);
    const hh = Math.round((dy1 - dy0) * (i % 5 ? 0.25 : 0.45));
    ctx.fillRect(x, Math.round(dy1 - hh), 1, hh);
  }
  if (!fx.hold) fx.sweep = env.still ? 0.62 : 0.5 + 0.4 * Math.sin(t * 0.25);
  const sweep = fx.sweep;
  ctx.fillRect(Math.round(dx0 + 3 + (dx1 - dx0 - 6) * sweep), Math.round(dy0), 1, Math.round(dy1 - dy0));

  // perillas con sombra y marca
  for (let i = 0; i < 3; i++) {
    const kx = dx0 + (dx1 - dx0) * (0.14 + i * 0.36);
    const ky = ry0 + rh * 0.74;
    const kr = Math.min(rw * 0.042, rh * 0.11);
    ctx.fillStyle = g(0.3);
    ctx.beginPath();
    ctx.arc(kx + 1.5, ky + 2, kr * 1.1, 0, 7);
    ctx.fill();
    const kg = ctx.createLinearGradient(kx - kr, ky - kr, kx + kr, ky + kr);
    kg.addColorStop(0, g(1));
    kg.addColorStop(1, g(0.25));
    ctx.fillStyle = kg;
    ctx.beginPath();
    ctx.arc(kx, ky, kr, 0, 7);
    ctx.fill();
    const ka = [fx.k0 - 0.5, fx.k1 + 0.3, fx.k2 + 0.9][i];
    ctx.strokeStyle = g(0.02);
    ctx.lineWidth = Math.max(1, kr * 0.22);
    ctx.beginPath();
    ctx.moveTo(kx + Math.sin(ka) * kr * 0.15, ky - Math.cos(ka) * kr * 0.15);
    ctx.lineTo(kx + Math.sin(ka) * kr * 0.95, ky - Math.cos(ka) * kr * 0.95);
    ctx.stroke();
    ctx.lineWidth = 1;
  }
  // piloto
  ctx.fillStyle = g(0.9, 1);
  ctx.fillRect(Math.round(rx + rw * 0.46), Math.round(ry0 + rh * 0.72), 3, 3);

  // resplandor del dial sobre el tablero
  ctx.globalCompositeOperation = 'lighter';
  ctx.save();
  ctx.translate(rx + rw * 0.72, ry1 + S * 0.03);
  ctx.scale(1, 0.3);
  const spill = ctx.createRadialGradient(0, 0, 1, 0, 0, rw * 0.3);
  spill.addColorStop(0, g(0.2, 0.6));
  spill.addColorStop(1, g(0, 0));
  ctx.fillStyle = spill;
  ctx.fillRect(-rw * 0.3, 0, rw * 0.6, rw * 0.3);
  ctx.restore();
  ctx.globalCompositeOperation = 'source-over';

  // ── Micrófono de estación y cuadro de los amigos ──
  mic(ctx, W * (v.port ? 0.2 : 0.285), deskY(v, 0.13), S * (v.port ? 0.16 : 0.19));
  photoFrame(ctx, L);
  if (env.doom) cracks(ctx, L.frame, 5.5);

  // ── Manipulador telegráfico, cerca ──
  const { x: kx, y: ky, w: kw, h: kh } = L.key;
  const kd = S * 0.075;
  // cable hacia el receptor
  ctx.strokeStyle = g(0.03);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(kx + kw * 0.3, ky - kd);
  ctx.bezierCurveTo(kx + kw * 0.2, ky - kd - S * 0.14, rx + rw * 0.95, ry1 + S * 0.16, rx + rw * 0.9, ry1);
  ctx.stroke();
  ctx.lineWidth = 1;
  shadow(ctx, kx + kw * 0.52, ky + kh, kw * 0.6, S * 0.018);
  box(ctx, v, kx, ky, kw, kh, kd, 0.34);
  // puente, palanca y pomo
  const ty = ky - kd * 0.5; // centro de la tapa
  const u = S * 0.01;
  const dn = fx.key * u * 2.6; // cuánto baja el pomo al presionar
  ctx.fillStyle = g(0.05);
  for (const f of [0.34, 0.46]) ctx.fillRect(Math.round(kx + kw * f), Math.round(ty - u * 4.5), Math.max(3, Math.round(kw * 0.035)), Math.round(u * 5));
  ctx.strokeStyle = g(0.05);
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(4, u * 1.6);
  ctx.beginPath();
  ctx.moveTo(kx + kw * 0.14, ty - u * 1.6);
  ctx.lineTo(kx + kw * 0.84, ty - u * 4.6 + dn);
  ctx.stroke();
  ctx.strokeStyle = g(1);
  ctx.lineWidth = Math.max(1.5, u * 0.6);
  ctx.beginPath();
  ctx.moveTo(kx + kw * 0.14, ty - u * 2.1);
  ctx.lineTo(kx + kw * 0.84, ty - u * 5.1 + dn);
  ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.lineWidth = 1;
  ctx.fillStyle = g(0.9, 1);
  ctx.fillRect(Math.round(kx + kw * 0.13), Math.round(ty - u), 3, Math.round(u * 1.4));
  // pomo: disco con espesor
  const px = kx + kw * 0.84;
  const py = ty - u * 6.6 + dn;
  if (fx.key > 0.5) {
    // chispa en el contacto
    ctx.fillStyle = g(1, 1);
    ctx.fillRect(Math.round(px - 2), Math.round(ty - u * 0.6), 5, 3);
  }
  ctx.fillStyle = g(0.05);
  ctx.fillRect(Math.round(px - 1), Math.round(py), 3, Math.round(u * 2));
  ctx.beginPath();
  ctx.ellipse(px, py + u * 0.7, kw * 0.11, u * 1.5, 0, 0, 7);
  ctx.fill();
  ctx.fillStyle = g(0.95);
  ctx.beginPath();
  ctx.ellipse(px, py, kw * 0.11, u * 1.4, 0, 0, 7);
  ctx.fill();
  ctx.fillStyle = g(0.35);
  ctx.beginPath();
  ctx.ellipse(px + kw * 0.01, py + u * 0.2, kw * 0.075, u * 0.85, 0, 0, 7);
  ctx.fill();

  if (v.port) paper(ctx, L.sheet, -W * 0.01);
  lamp(ctx, L.lamp, env.lamp);
}
