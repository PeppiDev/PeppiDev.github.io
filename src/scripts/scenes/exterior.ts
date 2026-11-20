// Exterior del hangar: el punto de partida. Tres lugares clickeables:
// el hangar (Sobre mí), el LZ 20 (Proyectos) y la estación de radio (Contacto).

import { fbm, g } from '../dither';
import { boundsLZ20, drawLZ20, FINENESS, profile } from '../zeppelin';
import type { Env, Rect } from './types';

/** `doom`: después del fin del mundo el mismo lugar se dibuja en ruinas. */
export const fx = { doom: false, hit: -9 };
export const poke = () => (fx.hit = performance.now() / 1000);

export function layout(W: number, H: number) {
  const port = H > W * 1.05;
  const hz = Math.round(H * (port ? 0.77 : 0.75));
  const hw = Math.round(port ? W * 0.6 : Math.min(W * 0.34, H * 0.7));
  const hh = Math.round(hw * 0.62);
  const hcx = Math.round(port ? W * 0.66 : W * 0.785);
  const hbase = hz + Math.round((H - hz) * 0.36);
  const zl = Math.round(port ? W * 0.9 : Math.min(W * 0.54, H * 1.3));
  const zcx = Math.round(port ? W * 0.5 : W * 0.4);
  const zcy = Math.round(port ? H * 0.44 : H * 0.485);
  const mx = Math.round(port ? W * 0.15 : W * 0.115);
  const mh = Math.round(H * (port ? 0.24 : 0.3));
  const mbase = hz + Math.round((H - hz) * 0.22);
  // en ruinas: la nave está caída en el potrero y hay alguien de pie en la pista
  const wy = hz + Math.round((H - hz) * (port ? 0.5 : 0.46));
  const wr = (zl * 0.92) / FINENESS / 2;
  const meH = H * (port ? 0.2 : 0.32);
  const meX = port ? W * 0.34 : W * 0.7;
  const me: Rect = { x: meX - meH * 0.21, y: H * 0.975 - meH, w: meH * 0.42, h: meH };
  const zb = fx.doom ? { x: zcx - zl * 0.46, y: wy - wr * 1.9, w: zl * 0.92, h: wr * 2.8 } : boundsLZ20(zcx, zcy, zl);
  const spots: Record<'taller' | 'lz20' | 'contacto', Rect> = {
    taller: { x: hcx - hw / 2, y: hbase - hh, w: hw, h: hh },
    lz20: zb,
    contacto: { x: mx - mh * 0.2, y: mbase - mh, w: mh * 0.4, h: mh },
  };
  return { port, hz, hw, hh, hcx, hbase, zl, zcx, zcy, mx, mh, mbase, spots, wy, wr, me };
}

export const horizon = (W: number, H: number) => layout(W, H).hz;

function hangarPath(ctx: CanvasRenderingContext2D, x0: number, x1: number, base: number, hh: number) {
  // Frente de hangar: muros rectos y bóveda facetada, como las cerchas reales.
  const wall = base - hh * 0.5;
  const cx = (x0 + x1) / 2;
  const rx = (x1 - x0) / 2;
  const ry = hh * 0.5;
  ctx.beginPath();
  ctx.moveTo(x0, base);
  ctx.lineTo(x0, wall);
  const N = 8;
  for (let i = 1; i < N; i++) {
    const a = Math.PI - (Math.PI * i) / N;
    ctx.lineTo(cx + Math.cos(a) * rx, wall - Math.sin(a) * ry);
  }
  ctx.lineTo(x1, wall);
  ctx.lineTo(x1, base);
  ctx.closePath();
}

export function draw(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, env: Env) {
  const L = layout(W, H);
  const { hz } = L;
  if (fx.doom) return ruins(ctx, L, W, H, t, env);

  // Cordillera al fondo, disuelta en la bruma
  for (const [amp, base, haze, lum, seed] of [
    [0.13, 0.0, 0.72, 0.3, 3.1],
    [0.06, 0.0, 0.42, 0.16, 9.7],
  ] as const) {
    ctx.fillStyle = g(lum, 0, haze);
    ctx.beginPath();
    ctx.moveTo(0, hz + 1);
    for (let x = 0; x <= W; x += 2) {
      const u = x / W;
      let y = fbm(u * 4.2 + seed, seed) * amp + base;
      if (seed < 5) y += 0.07 * Math.exp(-Math.pow((u - 0.3) / 0.07, 2)); // volcán
      ctx.lineTo(x, hz - y * H);
    }
    ctx.lineTo(W, hz + 1);
    ctx.fill();
  }

  drawTown(ctx, L, W, H, env);

  // Campo
  const gg = ctx.createLinearGradient(0, hz, 0, H);
  gg.addColorStop(0, g(0.3));
  gg.addColorStop(0.12, g(0.17));
  gg.addColorStop(1, g(0.04));
  ctx.fillStyle = gg;
  ctx.fillRect(0, hz, W, H - hz);
  // la hilera de frutales al fondo del potrero
  ctx.fillStyle = g(0.09);
  for (let x = 0; x < W; x += 3) ctx.fillRect(x, hz, 2, Math.max(2, Math.round(H * 0.007)));
  // pista de maniobra frente al hangar
  ctx.fillStyle = g(0.3);
  ctx.beginPath();
  ctx.moveTo(L.hcx - L.hw * 0.31, L.hbase);
  ctx.lineTo(L.hcx + L.hw * 0.31, L.hbase);
  ctx.lineTo(L.hcx + L.hw * 0.75, H);
  ctx.lineTo(L.hcx - L.hw * 0.95, H);
  ctx.fill();

  drawRoadside(ctx, L, W, H);
  drawMast(ctx, L, t);
  drawHangar(ctx, L, env.door);

  const bob = env.still ? 0 : Math.round(Math.sin(t * 0.45) * 2);
  drawLZ20(ctx, L.zcx, L.zcy + bob, L.zl, env.still ? 0 : t);

  if (env.rain > 0) rain(ctx, W, H, t, env.rain);
}

/** El pueblo en el horizonte, sacado de las afueras de Chillán: la cortina de cipreses,
 *  el silo viejo de hormigón, la copa de agua y un par de casas bajas. */
function drawTown(ctx: CanvasRenderingContext2D, L: ReturnType<typeof layout>, W: number, H: number, env: Env) {
  const { hz, port } = L;
  const night = env.daylight < 0.3;
  const dark = g(0.06, 0, 0.1);

  // cortina de árboles: cipreses en punta, con claros por donde asoma la cordillera
  ctx.fillStyle = dark;
  for (let x = 0; x < W; x++) {
    const n = fbm((x / W) * 26 + 5.3, 2.3);
    if (n < 0.4) continue;
    const spike = Math.abs(Math.sin(x * 1.9) + Math.sin(x * 0.67)) * 0.5;
    const h = Math.round(H * (0.006 + (n - 0.4) * 0.035 + spike * 0.012 * n));
    ctx.fillRect(x, hz - h, 1, h + 1);
  }
  const blob = (x: number, y: number, r: number) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 7);
    ctx.fill();
  };
  /** árbol de copa redonda (los pinos viejos de la orilla del camino) */
  const tree = (u: number, size: number) => {
    const x = W * u;
    const r = H * size;
    ctx.fillStyle = dark;
    ctx.fillRect(Math.round(x), Math.round(hz - r * 1.4), 1, Math.round(r * 1.4));
    blob(x, hz - r * 1.9, r);
    blob(x - r * 0.7, hz - r * 1.4, r * 0.75);
    blob(x + r * 0.75, hz - r * 1.3, r * 0.7);
  };
  /** álamo: alto y angosto */
  const poplar = (u: number, size: number) => {
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.ellipse(W * u, hz - H * size * 0.5, H * size * 0.14, H * size * 0.55, 0, 0, 7);
    ctx.fill();
  };
  const house = (u: number, w: number, h: number) => {
    const x = Math.round(W * u);
    const hg = ctx.createLinearGradient(0, hz - h, 0, hz);
    hg.addColorStop(0, g(0.6));
    hg.addColorStop(1, g(0.25));
    ctx.fillStyle = hg;
    ctx.fillRect(x, hz - h, w, h + 1);
    ctx.fillStyle = g(0.07);
    ctx.beginPath();
    ctx.moveTo(x - 2, hz - h);
    ctx.lineTo(x + w * 0.5, hz - h * 1.7);
    ctx.lineTo(x + w + 2, hz - h);
    ctx.fill();
    ctx.fillStyle = night ? g(0.9, 1) : g(0.1);
    ctx.fillRect(x + Math.round(w * 0.6), hz - Math.round(h * 0.7), Math.max(1, Math.round(w * 0.16)), Math.max(1, Math.round(h * 0.4)));
  };

  const sx = Math.round(W * (port ? 0.3 : 0.555)); // el silo
  const sh = Math.round(H * (port ? 0.06 : 0.09));
  const sw = Math.max(5, Math.round(sh * 0.3));

  for (const u of port ? [0.03, 0.42] : [0.03, 0.24, 0.47, 0.5]) poplar(u, port ? 0.04 : 0.05);
  tree(port ? 0.4 : 0.6, port ? 0.014 : 0.019);
  tree(port ? 0.06 : 0.31, 0.013);
  house(port ? 0.33 : 0.572, Math.round(sh * 0.62), Math.round(sh * 0.2));
  house(port ? 0.21 : 0.515, Math.round(sh * 0.5), Math.round(sh * 0.17));
  if (!port) house(0.35, Math.round(sh * 0.7), Math.round(sh * 0.18));

  // silo viejo: cilindro de hormigón con zunchos, la corona un poco más ancha y techo bajo
  const top = hz - sh;
  const body = ctx.createLinearGradient(sx, 0, sx + sw, 0);
  body.addColorStop(0, g(0.9));
  body.addColorStop(0.45, g(0.6));
  body.addColorStop(1, g(0.2));
  ctx.fillStyle = body;
  ctx.fillRect(sx, top, sw, sh + 1);
  ctx.fillStyle = g(0.15);
  ctx.globalAlpha = 0.45;
  for (let i = 1; i < 8; i++) ctx.fillRect(sx, Math.round(top + (sh * i) / 8), sw, 1);
  ctx.fillRect(sx + Math.round(sw * 0.3), top + Math.round(sh * 0.25), 1, Math.round(sh * 0.4)); // chorreado
  ctx.globalAlpha = 1;
  ctx.fillStyle = g(0.1);
  ctx.fillRect(sx + Math.round(sw * 0.72), top, 1, sh); // escalera de gato
  const capH = Math.max(3, Math.round(sh * 0.13));
  const cap = ctx.createLinearGradient(sx - 1, 0, sx + sw + 1, 0);
  cap.addColorStop(0, g(0.7));
  cap.addColorStop(1, g(0.12));
  ctx.fillStyle = cap;
  ctx.fillRect(sx - 1, top - capH, sw + 2, capH);
  ctx.fillStyle = g(0.1);
  ctx.fillRect(sx - 1, top, sw + 2, 1);
  ctx.beginPath();
  ctx.moveTo(sx - 2, top - capH);
  ctx.lineTo(sx + sw * 0.5, top - capH - Math.max(2, sh * 0.07));
  ctx.lineTo(sx + sw + 2, top - capH);
  ctx.fill();

  // copa de agua: torre de celosía con su estanque
  const wx = Math.round(W * (port ? 0.02 : 0.285));
  const wh = Math.round(sh * 0.9);
  const ww = Math.max(4, Math.round(wh * 0.2));
  if (!port || wx > 2) {
    ctx.strokeStyle = g(0.55, 0, 0.2);
    ctx.lineWidth = 1;
    ctx.beginPath();
    const legTop = hz - wh * 0.72;
    for (let i = 0; i < 3; i++) {
      const ya = hz - ((hz - legTop) * i) / 3;
      const yb = hz - ((hz - legTop) * (i + 1)) / 3;
      ctx.moveTo(wx - ww, ya);
      ctx.lineTo(wx + ww, yb);
      ctx.moveTo(wx + ww, ya);
      ctx.lineTo(wx - ww, yb);
    }
    ctx.moveTo(wx - ww, hz);
    ctx.lineTo(wx - ww, legTop);
    ctx.moveTo(wx + ww, hz);
    ctx.lineTo(wx + ww, legTop);
    ctx.stroke();
    const tk = ctx.createLinearGradient(wx - ww, 0, wx + ww, 0);
    tk.addColorStop(0, g(0.8));
    tk.addColorStop(1, g(0.2));
    ctx.fillStyle = tk;
    ctx.fillRect(wx - ww - 1, Math.round(hz - wh), ww * 2 + 2, Math.round(wh * 0.28));
    ctx.fillStyle = g(0.1);
    ctx.beginPath();
    ctx.moveTo(wx - ww - 2, Math.round(hz - wh));
    ctx.lineTo(wx, hz - wh * 1.12);
    ctx.lineTo(wx + ww + 2, Math.round(hz - wh));
    ctx.fill();
  }
}

/** Lo de la orilla del camino: la postación con sus cables y el cerco del potrero. */
function drawRoadside(ctx: CanvasRenderingContext2D, L: ReturnType<typeof layout>, W: number, H: number) {
  const { hz, hcx, hw, hbase } = L;
  const depth = H - hz;
  /** borde izquierdo de la pista a profundidad f (0 = horizonte, 1 = borde de abajo) */
  const edge = (f: number) => {
    const k = Math.max(0, (hz + depth * f - hbase) / (H - hbase));
    return hcx - hw * (0.31 + 0.64 * k);
  };

  // postación a lo lejos, siguiendo el camino: postes de madera con cruceta y cables colgando
  const [u0, u1] = L.port ? [0.04, 0.3] : [0.2, 0.53];
  const tops: [number, number, number][] = [];
  const N = L.port ? 4 : 6;
  for (let i = 0; i < N; i++) {
    const x = Math.round(W * (u0 + ((u1 - u0) * (i + 0.5)) / N));
    const h = Math.round(H * (0.05 - 0.003 * i));
    const arm = Math.max(2, Math.round(h * 0.16));
    ctx.fillStyle = g(0.07);
    ctx.fillRect(x, hz - h, 1, h + 2);
    ctx.fillRect(x - arm, hz - h + 2, arm * 2 + 1, 1);
    tops.push([x, hz - h + 2, arm]);
  }
  ctx.strokeStyle = g(0.1);
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  for (let i = 0; i + 1 < tops.length; i++) {
    const [xa, ya, aa] = tops[i];
    const [xb, yb, ab] = tops[i + 1];
    for (const s of [-1, 1]) {
      ctx.moveTo(xa + s * aa, ya);
      ctx.quadraticCurveTo((xa + xb) / 2, (ya + yb) / 2 + H * 0.014, xb + s * ab, yb);
    }
  }
  ctx.stroke();
  ctx.globalAlpha = 1;

  // cerco: estacas y dos hebras de alambre, con el esquinero apuntalado
  const x1 = Math.min(W * 0.44, edge(0.3) - W * 0.1);
  const fy = (x: number) => hz + depth * (0.5 - 0.2 * (x / x1));
  const n = 9;
  ctx.strokeStyle = g(0.55);
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  for (const k of [0.35, 0.75]) {
    ctx.moveTo(0, fy(0) - H * 0.04 * k);
    ctx.lineTo(x1, fy(x1) - H * 0.028 * k);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
  for (let i = 0; i <= n; i++) {
    const x = Math.round((x1 * (i + 0.35)) / (n + 0.35));
    const ph = Math.round(H * (0.04 - 0.012 * (x / x1)));
    ctx.fillStyle = g(0.75);
    ctx.fillRect(x, Math.round(fy(x)) - ph, 1, ph);
    ctx.fillStyle = g(0.05);
    ctx.fillRect(x + 1, Math.round(fy(x)) - ph, 1, ph);
    if (i === n) {
      ctx.strokeStyle = g(0.7);
      ctx.beginPath();
      ctx.moveTo(x, fy(x) - ph * 0.85);
      ctx.lineTo(x - ph * 0.6, fy(x) + 1);
      ctx.stroke();
    }
  }
}

function drawHangar(ctx: CanvasRenderingContext2D, L: ReturnType<typeof layout>, door: number) {
  const { hcx, hw, hh, hbase } = L;
  const x0 = hcx - hw / 2;
  const x1 = hcx + hw / 2;

  ctx.save();
  hangarPath(ctx, x0, x1, hbase, hh);
  ctx.clip();
  const f = ctx.createLinearGradient(0, hbase - hh, 0, hbase);
  f.addColorStop(0, g(0.82));
  f.addColorStop(0.45, g(0.5));
  f.addColorStop(1, g(0.24));
  ctx.fillStyle = f;
  ctx.fillRect(x0, hbase - hh, hw, hh);
  // banda de luz rasante en diagonal
  ctx.globalCompositeOperation = 'lighter';
  const d = ctx.createLinearGradient(x0, hbase - hh, x0 + hw * 0.7, hbase);
  d.addColorStop(0.15, g(0));
  d.addColorStop(0.32, g(0.3));
  d.addColorStop(0.5, g(0));
  ctx.fillStyle = d;
  ctx.fillRect(x0, hbase - hh, hw, hh);
  ctx.globalCompositeOperation = 'source-over';
  // planchas del revestimiento
  ctx.fillStyle = g(0.12);
  ctx.globalAlpha = 0.35;
  for (let x = x0; x < x1; x += Math.max(4, hw / 34)) ctx.fillRect(Math.round(x), hbase - hh, 1, hh);
  ctx.globalAlpha = 1;
  ctx.restore();

  // Vano del portón: interior del taller, con la luz encendida
  const dw = Math.round(hw * 0.6);
  const dh = Math.round(hh * 0.7);
  const dx = Math.round(hcx - dw / 2);
  const dy = hbase - dh;
  const glow = ctx.createRadialGradient(hcx, hbase - dh * 0.25, 1, hcx, hbase - dh * 0.25, dw * 0.7);
  glow.addColorStop(0, g(0.1, 0.95));
  glow.addColorStop(0.55, g(0.05, 0.5));
  glow.addColorStop(1, g(0.02, 0.12));
  ctx.fillStyle = glow;
  ctx.fillRect(dx, dy, dw, dh);
  // siluetas del taller a contraluz
  ctx.fillStyle = g(0.02);
  ctx.fillRect(dx + dw * 0.12, hbase - dh * 0.22, dw * 0.3, dh * 0.03);
  ctx.fillRect(dx + dw * 0.15, hbase - dh * 0.22, dw * 0.02, dh * 0.22);
  ctx.fillRect(dx + dw * 0.38, hbase - dh * 0.22, dw * 0.02, dh * 0.22);
  ctx.fillRect(dx + dw * 0.2, hbase - dh * 0.36, dw * 0.12, dh * 0.14);

  // Hojas del portón: corren hacia los costados
  const leaf = dw / 2;
  const slide = door * leaf * 0.94;
  for (const s of [-1, 1]) {
    const lx = s < 0 ? dx - slide : dx + leaf + slide;
    const lg = ctx.createLinearGradient(0, dy, 0, hbase);
    lg.addColorStop(0, g(0.6));
    lg.addColorStop(1, g(0.2));
    ctx.fillStyle = lg;
    ctx.fillRect(Math.round(lx), dy, Math.ceil(leaf), dh);
    ctx.fillStyle = g(0.08);
    ctx.globalAlpha = 0.5;
    for (let i = 1; i < 6; i++) ctx.fillRect(Math.round(lx + (leaf * i) / 6), dy, 1, dh);
    ctx.fillRect(Math.round(lx), Math.round(dy + dh * 0.33), Math.ceil(leaf), 1);
    ctx.fillRect(Math.round(lx), Math.round(dy + dh * 0.66), Math.ceil(leaf), 1);
    ctx.globalAlpha = 1;
  }
  // marco del portón
  ctx.fillStyle = g(0.14);
  ctx.fillRect(dx - 1, dy - 2, dw + 2, 2);

  // Nose art: el apodo pintado a plantilla sobre el frontón
  const fs = Math.max(8, Math.round(hh * 0.15));
  ctx.font = `700 ${fs}px "IBM Plex Sans Condensed", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const ty = Math.round(dy - (dy - (hbase - hh)) * 0.47);
  ctx.fillStyle = g(0.08);
  if ('letterSpacing' in ctx) (ctx as any).letterSpacing = `${Math.round(fs * 0.3)}px`;
  ctx.fillText('PEPPI', hcx + fs * 0.15, ty);
  if ('letterSpacing' in ctx) (ctx as any).letterSpacing = '0px';

  // luz derramada sobre la pista
  ctx.globalAlpha = 0.55 + 0.4 * door;
  const sp = ctx.createLinearGradient(0, hbase, 0, hbase + hh * 0.5);
  sp.addColorStop(0, g(0.3, 0.75));
  sp.addColorStop(1, g(0.3, 0));
  ctx.fillStyle = sp;
  const open = Math.max(2, slide);
  ctx.beginPath();
  ctx.moveTo(hcx - open, hbase);
  ctx.lineTo(hcx + open, hbase);
  ctx.lineTo(hcx + open * 1.5 + hh * 0.12, hbase + hh * 0.5);
  ctx.lineTo(hcx - open * 1.5 - hh * 0.3, hbase + hh * 0.5);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawMast(ctx: CanvasRenderingContext2D, L: ReturnType<typeof layout>, t: number) {
  const { mx, mh, mbase } = L;
  const top = mbase - mh;
  const half = mh * 0.075;
  ctx.strokeStyle = g(0.85);
  ctx.lineWidth = 1;
  const seg = 9;
  ctx.beginPath();
  for (let i = 0; i < seg; i++) {
    const a = i / seg;
    const b = (i + 1) / seg;
    const ya = mbase - mh * a;
    const yb = mbase - mh * b;
    const wa = half * (1 - a * 0.85);
    const wb = half * (1 - b * 0.85);
    ctx.moveTo(mx - wa, ya);
    ctx.lineTo(mx - wb, yb);
    ctx.moveTo(mx + wa, ya);
    ctx.lineTo(mx + wb, yb);
    ctx.moveTo(mx - wa, ya);
    ctx.lineTo(mx + wb, yb);
    ctx.moveTo(mx + wa, ya);
    ctx.lineTo(mx - wb, yb);
  }
  ctx.stroke();
  // vientos
  ctx.strokeStyle = g(0.4, 0, 0.35);
  ctx.beginPath();
  for (const s of [-1, 1]) {
    ctx.moveTo(mx, top + mh * 0.25);
    ctx.lineTo(mx + s * mh * 0.42, mbase + 2);
  }
  ctx.stroke();
  // antena en la punta y baliza ámbar
  ctx.fillStyle = g(0.7);
  ctx.fillRect(Math.round(mx), Math.round(top - mh * 0.08), 1, Math.round(mh * 0.08));
  if (Math.sin(t * 2.2) > -0.3) {
    ctx.fillStyle = g(1, 1);
    ctx.fillRect(Math.round(mx) - 1, Math.round(top) - 1, 3, 3);
  }
  // caseta de radio
  const sw = Math.round(mh * 0.2);
  const sh = Math.round(mh * 0.1);
  const sx = Math.round(mx + half * 1.6);
  const sg = ctx.createLinearGradient(0, mbase - sh, 0, mbase);
  sg.addColorStop(0, g(0.6));
  sg.addColorStop(1, g(0.2));
  ctx.fillStyle = sg;
  ctx.fillRect(sx, mbase - sh, sw, sh);
  ctx.fillStyle = g(0.12);
  ctx.beginPath();
  ctx.moveTo(sx - 2, mbase - sh);
  ctx.lineTo(sx + sw / 2, mbase - sh * 1.5);
  ctx.lineTo(sx + sw + 2, mbase - sh);
  ctx.fill();
  ctx.fillStyle = g(0.9, 1);
  ctx.fillRect(sx + Math.round(sw * 0.56), mbase - Math.round(sh * 0.7), Math.max(2, Math.round(sw * 0.24)), Math.max(2, Math.round(sh * 0.36)));
}

export function rain(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, amount: number) {
  ctx.fillStyle = g(0.75);
  const n = Math.round(((W * H) / 900) * amount);
  const f = Math.floor(t * 20);
  for (let i = 0; i < n; i++) {
    const s = Math.sin(i * 127.1 + f * 311.7) * 43758.5453;
    const s2 = Math.sin(i * 269.5 + f * 183.3) * 43758.5453;
    const x = Math.round((s - Math.floor(s)) * W);
    const y = Math.round((s2 - Math.floor(s2)) * H);
    for (let k = 0; k < 4; k++) ctx.fillRect(x - k, y + k * 2, 1, 2);
  }
}

// ── Después del fin del mundo ────────────────────────────────────────────

const hash = (n: number) => {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
};

/** Columna de humo que sube y se la lleva el viento. */
function smoke(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, t: number, seed: number) {
  for (let i = 0; i < 16; i++) {
    const f = (i + ((t * 0.35 + seed) % 1)) / 16;
    const px = x + (fbm(f * 2.2 - t * 0.12 + seed, seed) - 0.5) * h * 0.45 * f + f * f * h * 0.45;
    ctx.fillStyle = g(0.07, 0, 0.25 + 0.6 * f);
    ctx.globalAlpha = 0.85 * (1 - f);
    ctx.beginPath();
    ctx.arc(px, y - f * h, 1.5 + f * h * 0.13, 0, 7);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function fire(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, t: number, seed: number) {
  for (let i = 0; i < 9; i++) {
    const f = Math.floor(t * 9) + i * 13.7 + seed;
    const px = x + (hash(f) - 0.5) * r * 2;
    const h = (0.3 + hash(f * 1.7)) * r * (1 - Math.abs(px - x) / (r * 1.2));
    ctx.fillStyle = g(0.6 + 0.4 * hash(f * 2.3), 1);
    ctx.fillRect(Math.round(px), Math.round(y - h), Math.max(1, Math.round(r * 0.3)), Math.max(1, Math.round(h)));
  }
}

function ruins(ctx: CanvasRenderingContext2D, L: ReturnType<typeof layout>, W: number, H: number, t: number, env: Env) {
  const { hz, port } = L;
  const depth = H - hz;
  const T = env.still ? 0 : t;

  // la cordillera sigue ahí
  for (const [amp, haze, lum, seed] of [[0.13, 0.8, 0.25, 3.1], [0.06, 0.5, 0.12, 9.7]] as const) {
    ctx.fillStyle = g(lum, 0, haze);
    ctx.beginPath();
    ctx.moveTo(0, hz + 1);
    for (let x = 0; x <= W; x += 2) {
      const u = x / W;
      let y = fbm(u * 4.2 + seed, seed) * amp;
      if (seed < 5) y += 0.07 * Math.exp(-Math.pow((u - 0.3) / 0.07, 2));
      ctx.lineTo(x, hz - y * H);
    }
    ctx.lineTo(W, hz + 1);
    ctx.fill();
  }

  // el hongo, ya frío, deshaciéndose detrás de los cerros
  {
    const cx = W * (port ? 0.86 : 0.13);
    const h = H * (port ? 0.2 : 0.3);
    const r = h * 0.3;
    ctx.fillStyle = g(0.4, 0.12, 0.8);
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.5, hz);
    ctx.quadraticCurveTo(cx - r * 0.1, hz - h * 0.5, cx - r * 0.3 + Math.sin(T * 0.2) * 1.5, hz - h * 0.85);
    ctx.lineTo(cx + r * 0.3, hz - h * 0.85);
    ctx.quadraticCurveTo(cx + r * 0.15, hz - h * 0.5, cx + r * 0.5, hz);
    ctx.fill();
    for (const [ox, oy, k] of [[0, 0, 1], [-0.75, 0.12, 0.6], [0.8, 0.1, 0.62], [-0.3, -0.3, 0.6], [0.35, -0.28, 0.55], [1.5, 0.02, 0.35], [2.1, 0.06, 0.22]]) {
      ctx.beginPath();
      ctx.ellipse(cx + ox * r, hz - h * 0.88 + oy * r, k * r, k * r * 0.6, 0, 0, 7);
      ctx.fill();
    }
    ctx.fillStyle = g(0.15, 0.1, 0.7);
    ctx.beginPath();
    ctx.ellipse(cx, hz - h * 0.8, r * 0.95, r * 0.22, 0, 0, 7);
    ctx.fill();
  }

  // el pueblo: troncos quemados, el silo partido, cascarones de casas
  {
    const dark = g(0.05, 0, 0.1);
    ctx.fillStyle = dark;
    for (let x = 0; x < W; x++) {
      const n = fbm((x / W) * 26 + 5.3, 2.3);
      if (n < 0.5 || hash(x) < 0.45) continue;
      const h = Math.round(H * (0.004 + (n - 0.5) * 0.05 * hash(x * 3.1)));
      ctx.fillRect(x, hz - h, 1, h + 1);
    }
    ctx.strokeStyle = dark;
    ctx.lineWidth = 1;
    for (const u of port ? [0.03, 0.42, 0.06, 0.4] : [0.03, 0.24, 0.47, 0.5, 0.6, 0.31]) {
      const x = Math.round(W * u) + 0.5;
      const h = H * (0.025 + 0.03 * hash(u * 91));
      const lean = (hash(u * 37) - 0.5) * h * 0.4;
      ctx.beginPath();
      ctx.moveTo(x, hz);
      ctx.lineTo(x + lean, hz - h);
      ctx.moveTo(x + lean * 0.5, hz - h * 0.5);
      ctx.lineTo(x + lean * 0.5 + h * 0.2, hz - h * 0.72);
      ctx.moveTo(x + lean * 0.7, hz - h * 0.7);
      ctx.lineTo(x + lean * 0.7 - h * 0.16, hz - h * 0.9);
      ctx.stroke();
    }
    const sx = Math.round(W * (port ? 0.3 : 0.555));
    const sh = Math.round(H * (port ? 0.06 : 0.09));
    const sw = Math.max(5, Math.round(sh * 0.3));
    for (const [u, w, h] of port ? [[0.33, 0.62, 0.2], [0.21, 0.5, 0.17]] : [[0.572, 0.62, 0.2], [0.515, 0.5, 0.17], [0.35, 0.7, 0.18]]) {
      const x = Math.round(W * u);
      const ww = Math.round(sh * w);
      const hh = Math.round(sh * h);
      ctx.fillStyle = g(0.3);
      ctx.beginPath();
      ctx.moveTo(x, hz + 1);
      ctx.lineTo(x, hz - hh * 1.3);
      ctx.lineTo(x + ww * 0.25, hz - hh * 0.6);
      ctx.lineTo(x + ww * 0.6, hz - hh * 0.9);
      ctx.lineTo(x + ww * 0.75, hz - hh * 0.3);
      ctx.lineTo(x + ww, hz - hh * 0.7);
      ctx.lineTo(x + ww, hz + 1);
      ctx.fill();
    }
    // el silo: quedó la mitad, con el borde mordido
    const body = ctx.createLinearGradient(sx, 0, sx + sw, 0);
    body.addColorStop(0, g(0.7));
    body.addColorStop(1, g(0.12));
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(sx, hz + 1);
    ctx.lineTo(sx, hz - sh * 0.62);
    ctx.lineTo(sx + sw * 0.3, hz - sh * 0.5);
    ctx.lineTo(sx + sw * 0.5, hz - sh * 0.58);
    ctx.lineTo(sx + sw * 0.75, hz - sh * 0.36);
    ctx.lineTo(sx + sw, hz - sh * 0.42);
    ctx.lineTo(sx + sw, hz + 1);
    ctx.fill();
    smoke(ctx, sx + sw * 0.5, hz - sh * 0.5, H * 0.16, T, 4.2);
    // la copa de agua, de rodillas
    const wx = Math.round(W * (port ? 0.02 : 0.285));
    if (!port) {
      const wh = sh * 0.9;
      ctx.strokeStyle = g(0.4, 0, 0.2);
      ctx.beginPath();
      ctx.moveTo(wx - wh * 0.2, hz);
      ctx.lineTo(wx + wh * 0.15, hz - wh * 0.45);
      ctx.lineTo(wx + wh * 0.2, hz);
      ctx.moveTo(wx + wh * 0.15, hz - wh * 0.45);
      ctx.lineTo(wx + wh * 0.5, hz - wh * 0.12);
      ctx.stroke();
      ctx.fillStyle = g(0.35);
      ctx.fillRect(Math.round(wx + wh * 0.42), Math.round(hz - wh * 0.22), Math.round(wh * 0.4), Math.round(wh * 0.22));
    }
  }

  // el campo, quemado
  const gg = ctx.createLinearGradient(0, hz, 0, H);
  gg.addColorStop(0, g(0.5, 0, 0.3));
  gg.addColorStop(0.2, g(0.4));
  gg.addColorStop(1, g(0.22));
  ctx.fillStyle = gg;
  ctx.fillRect(0, hz, W, depth);
  // pista agrietada
  ctx.fillStyle = g(0.56);
  ctx.beginPath();
  ctx.moveTo(L.hcx - L.hw * 0.31, L.hbase);
  ctx.lineTo(L.hcx + L.hw * 0.31, L.hbase);
  ctx.lineTo(L.hcx + L.hw * 0.75, H);
  ctx.lineTo(L.hcx - L.hw * 0.95, H);
  ctx.fill();
  ctx.strokeStyle = g(0.03);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    let x = L.hcx + (hash(i * 5.1) - 0.5) * L.hw * 0.7;
    let y = L.hbase + (H - L.hbase) * hash(i * 2.7) * 0.7;
    ctx.moveTo(x, y);
    for (let k = 0; k < 5; k++) {
      x += (hash(i * 9 + k) - 0.5) * L.hw * 0.14;
      y += (H - L.hbase) * 0.07;
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();
  // cráteres
  for (const [u, f, w] of [[0.24, 0.16, 0.035], [0.52, 0.8, 0.07], [0.06, 0.72, 0.05], [0.93, 0.5, 0.03]]) {
    const x = W * u;
    const y = hz + depth * f;
    const rx = W * w * (0.5 + f);
    ctx.fillStyle = g(0.7);
    ctx.beginPath();
    ctx.ellipse(x, y, rx * 1.12, rx * 0.3, 0, 0, 7);
    ctx.fill();
    ctx.fillStyle = g(0.01);
    ctx.beginPath();
    ctx.ellipse(x, y + rx * 0.04, rx, rx * 0.22, 0, 0, 7);
    ctx.fill();
  }

  // postes: unos en pie, otros vencidos, ningún cable
  {
    const [u0, u1] = port ? [0.04, 0.3] : [0.2, 0.53];
    const N = port ? 4 : 6;
    ctx.strokeStyle = g(0.06);
    ctx.beginPath();
    for (let i = 0; i < N; i++) {
      const x = Math.round(W * (u0 + ((u1 - u0) * (i + 0.5)) / N)) + 0.5;
      const h = H * (0.05 - 0.003 * i);
      const lean = (hash(i * 3.3) - 0.35) * h * 1.2;
      const hh = h * (hash(i * 7.7) < 0.35 ? 0.45 : 1);
      ctx.moveTo(x, hz + 2);
      ctx.lineTo(x + lean * (hh / h), hz - hh * 0.95);
    }
    ctx.stroke();
    // lo que queda del cerco
    const x1 = W * 0.4;
    for (let i = 0; i <= 9; i++) {
      if (hash(i * 4.1) < 0.4) continue;
      const x = Math.round((x1 * (i + 0.35)) / 9.35);
      const y = hz + depth * (0.5 - 0.2 * (x / x1));
      const ph = H * (0.04 - 0.012 * (x / x1));
      ctx.strokeStyle = g(0.05);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (hash(i * 8.8) - 0.5) * ph * 1.2, y - ph * 0.9);
      ctx.stroke();
    }
  }

  // la torre de radio: quebrada a media altura, la punta colgando
  {
    const { mx, mh, mbase } = L;
    const half = mh * 0.075;
    const lattice = (a0: number, a1: number) => {
      ctx.beginPath();
      for (let i = a0; i < a1; i++) {
        const a = i / 9;
        const b = (i + 1) / 9;
        const wa = half * (1 - a * 0.85);
        const wb = half * (1 - b * 0.85);
        const ya = -mh * (a - a0 / 9);
        const yb = -mh * (b - a0 / 9);
        ctx.moveTo(-wa, ya);
        ctx.lineTo(-wb, yb);
        ctx.moveTo(wa, ya);
        ctx.lineTo(wb, yb);
        ctx.moveTo(-wa, ya);
        ctx.lineTo(wb, yb);
        ctx.moveTo(wa, ya);
        ctx.lineTo(-wb, yb);
      }
      ctx.stroke();
    };
    ctx.strokeStyle = g(0.7);
    ctx.lineWidth = 1;
    ctx.save();
    ctx.translate(mx, mbase);
    lattice(0, 4);
    ctx.translate(0, (-mh * 4) / 9);
    ctx.rotate(2.15);
    ctx.strokeStyle = g(0.5);
    lattice(4, 9);
    ctx.restore();
    // la caseta: sin techo, con el muro del fondo a la vista y dos machones en pie
    const sw = Math.round(mh * 0.3);
    const sh = Math.round(mh * 0.16);
    const sx = Math.round(mx + half * 1.6);
    ctx.fillStyle = g(0.08);
    ctx.beginPath();
    ctx.moveTo(sx + sw * 0.1, mbase);
    ctx.lineTo(sx + sw * 0.1, mbase - sh * 0.75);
    ctx.lineTo(sx + sw * 0.35, mbase - sh * 0.5);
    ctx.lineTo(sx + sw * 0.5, mbase - sh * 0.62);
    ctx.lineTo(sx + sw * 0.7, mbase - sh * 0.3);
    ctx.lineTo(sx + sw * 0.95, mbase - sh * 0.4);
    ctx.lineTo(sx + sw * 0.95, mbase);
    ctx.fill();
    ctx.fillStyle = g(0.85);
    ctx.beginPath();
    ctx.moveTo(sx, mbase);
    ctx.lineTo(sx, mbase - sh * 1.05);
    ctx.lineTo(sx + sw * 0.1, mbase - sh * 0.9);
    ctx.lineTo(sx + sw * 0.16, mbase - sh * 0.55);
    ctx.lineTo(sx + sw * 0.24, mbase - sh * 0.3);
    ctx.lineTo(sx + sw * 0.3, mbase);
    ctx.fill();
    ctx.fillStyle = g(0.6);
    ctx.beginPath();
    ctx.moveTo(sx + sw * 0.72, mbase);
    ctx.lineTo(sx + sw * 0.78, mbase - sh * 0.45);
    ctx.lineTo(sx + sw * 0.9, mbase - sh * 0.7);
    ctx.lineTo(sx + sw, mbase - sh * 0.6);
    ctx.lineTo(sx + sw, mbase);
    ctx.fill();
    // una viga del techo, caída adentro
    ctx.strokeStyle = g(0.02);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx + sw * 0.08, mbase - sh * 0.95);
    ctx.lineTo(sx + sw * 0.66, mbase - sh * 0.08);
    ctx.stroke();
    ctx.fillStyle = g(0.15);
    for (let i = 0; i < 9; i++) {
      const x = sx - sw * 0.1 + sw * 1.25 * hash(i * 2.9 + 1);
      const r = Math.max(1, sh * 0.1 * (0.5 + hash(i * 7.1)));
      ctx.beginPath();
      ctx.moveTo(x - r, mbase + 1);
      ctx.lineTo(x, mbase - r);
      ctx.lineTo(x + r, mbase + 1);
      ctx.fill();
    }
  }

  hangarRuin(ctx, L, T);
  wreck(ctx, L, T);
  survivor(ctx, L.me, t, env.still);

  // ceniza cayendo
  ctx.fillStyle = g(0.8, 0, 0.3);
  const n = Math.round((W * H) / 2200);
  for (let i = 0; i < n; i++) {
    const x = (hash(i) * W + Math.sin(T * 0.4 + i) * 5 + T * 3) % W;
    const y = (hash(i * 3.3) * H + T * (5 + hash(i * 1.9) * 8)) % H;
    ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  }
  if (env.rain > 0) rain(ctx, W, H, t, env.rain);
}

function hangarRuin(ctx: CanvasRenderingContext2D, L: ReturnType<typeof layout>, t: number) {
  const { hcx, hw, hh, hbase } = L;
  const x0 = hcx - hw / 2;
  const x1 = hcx + hw / 2;
  const P = (a: number, b: number): [number, number] => [x0 + hw * a, hbase - hh * b];

  ctx.save();
  hangarPath(ctx, x0, x1, hbase, hh);
  ctx.clip();
  // las cerchas desnudas donde voló el revestimiento
  ctx.fillStyle = g(0.1);
  for (let i = 0; i <= 12; i++) ctx.fillRect(Math.round(x0 + (hw * i) / 12), hbase - hh, 1, hh);
  for (let j = 4; j <= 10; j++) ctx.fillRect(x0, Math.round(hbase - (hh * j) / 10), hw, 1);
  // lo que queda de plancha: todo menos el mordisco del techo
  ctx.beginPath();
  ctx.rect(x0 - 9, hbase - hh - 9, hw + 18, hh + 18);
  const bite: [number, number][] = [P(-0.03, 1.06), P(0.56, 1.06), P(0.52, 0.9), P(0.45, 0.94), P(0.4, 0.78), P(0.31, 0.83), P(0.27, 0.66), P(0.17, 0.72), P(0.12, 0.55), P(-0.03, 0.6)];
  bite.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  const hole: [number, number][] = [P(0.8, 0.62), P(0.9, 0.66), P(0.93, 0.5), P(0.84, 0.46)];
  hole.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.clip('evenodd');
  const f = ctx.createLinearGradient(0, hbase - hh, 0, hbase);
  f.addColorStop(0, g(0.55));
  f.addColorStop(0.45, g(0.32));
  f.addColorStop(1, g(0.14));
  ctx.fillStyle = f;
  ctx.fillRect(x0, hbase - hh, hw, hh);
  ctx.fillStyle = g(0.08);
  ctx.globalAlpha = 0.4;
  for (let x = x0; x < x1; x += Math.max(4, hw / 34)) ctx.fillRect(Math.round(x), hbase - hh, 1, hh);
  // hollín chorreando desde los bordes rotos
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = g(0.02);
  for (let i = 0; i < 14; i++) {
    const x = x0 + hw * hash(i * 6.1);
    ctx.fillRect(Math.round(x), hbase - hh, Math.max(2, Math.round(hw * 0.02)), Math.round(hh * (0.3 + 0.5 * hash(i * 2.9))));
  }
  ctx.globalAlpha = 1;
  // el apodo sigue ahí, a medias
  const dh0 = Math.round(hh * 0.7);
  const fs = Math.max(8, Math.round(hh * 0.15));
  ctx.font = `700 ${fs}px "IBM Plex Sans Condensed", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = g(0.05);
  if ('letterSpacing' in ctx) (ctx as any).letterSpacing = `${Math.round(fs * 0.3)}px`;
  ctx.fillText('PEPPI', hcx + fs * 0.15, Math.round(hbase - dh0 - (hh - dh0) * 0.47));
  if ('letterSpacing' in ctx) (ctx as any).letterSpacing = '0px';
  ctx.restore();

  // el vano, a oscuras; una hoja colgando de un riel, la otra en el suelo
  const dw = Math.round(hw * 0.6);
  const dh = dh0;
  const dx = Math.round(hcx - dw / 2);
  const dy = hbase - dh;
  ctx.fillStyle = g(0.02);
  ctx.fillRect(dx, dy, dw, dh);
  const leaf = dw / 2;
  const lg = ctx.createLinearGradient(0, dy, 0, hbase);
  lg.addColorStop(0, g(0.42));
  lg.addColorStop(1, g(0.12));
  ctx.save();
  ctx.translate(dx + dw + leaf * 0.55, dy);
  ctx.rotate(0.13);
  ctx.fillStyle = lg;
  ctx.fillRect(-leaf, 0, leaf, dh * 0.96);
  ctx.fillStyle = g(0.05);
  ctx.globalAlpha = 0.5;
  for (let i = 1; i < 6; i++) ctx.fillRect(Math.round(-leaf + (leaf * i) / 6), 0, 1, dh * 0.96);
  ctx.restore();
  ctx.fillStyle = g(0.3);
  ctx.beginPath();
  ctx.moveTo(dx - leaf * 0.5, hbase + hh * 0.05);
  ctx.lineTo(dx + leaf * 0.55, hbase + hh * 0.02);
  ctx.lineTo(dx + leaf * 0.35, hbase + hh * 0.17);
  ctx.lineTo(dx - leaf * 0.85, hbase + hh * 0.2);
  ctx.fill();
  ctx.fillStyle = g(0.14);
  ctx.fillRect(dx - 1, dy - 2, dw + 2, 2);
  // escombros al pie
  ctx.fillStyle = g(0.08);
  for (let i = 0; i < 26; i++) {
    const x = x0 - hw * 0.05 + hw * 0.6 * hash(i * 1.3);
    const s = hh * (0.02 + 0.05 * hash(i * 4.4));
    ctx.beginPath();
    ctx.moveTo(x - s, hbase + 1);
    ctx.lineTo(x + (hash(i) - 0.5) * s, hbase - s * (0.6 + hash(i * 2)));
    ctx.lineTo(x + s, hbase + 1);
    ctx.fill();
  }
  smoke(ctx, x0 + hw * 0.3, hbase - hh * 0.72, hh * 1.1, t, 1.7);
}

/** El LZ 20 caído en el potrero: la proa todavía con tela, el resto puro esqueleto de duraluminio. */
function wreck(ctx: CanvasRenderingContext2D, L: ReturnType<typeof layout>, t: number) {
  const len = L.zl * 0.92;
  const R = L.wr * 1.7;
  const X = (u: number) => (u - 0.5) * len;
  const G = R * 0.55; // el suelo, en coordenadas de la nave
  /** cuánto queda en pie de cada cuaderna: la popa se vino abajo */
  const up = (u: number) => profile(u) * R * 1.75 * (u < 0.45 ? 1 : Math.max(0.3, 1 - (u - 0.45) * 1.5)) * (0.85 + 0.15 * hash(Math.round(u * 18)));
  ctx.save();
  ctx.translate(L.zcx, L.wy);
  ctx.rotate(-0.045);
  ctx.fillStyle = g(0);
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.ellipse(0, G + R * 0.1, len * 0.52, R * 0.45, 0, 0, 7);
  ctx.fill();
  ctx.globalAlpha = 1;
  // aleta de cola clavada en el aire
  ctx.fillStyle = g(0.1);
  ctx.beginPath();
  ctx.moveTo(X(0.8), G - up(0.8));
  ctx.lineTo(X(0.9), G - R * 1.5);
  ctx.lineTo(X(0.95), G - R * 1.35);
  ctx.lineTo(X(0.93), G - up(0.93) * 0.6);
  ctx.fill();
  // tela que quedó en la proa
  const skin = ctx.createLinearGradient(0, G - R * 1.75, 0, G);
  skin.addColorStop(0, g(0.95));
  skin.addColorStop(0.5, g(0.7));
  skin.addColorStop(1, g(0.25));
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.moveTo(X(0.005), G);
  for (let u = 0.005; u <= 0.3; u += 0.01) ctx.lineTo(X(u), G - up(u));
  ctx.lineTo(X(0.27), G - R * 1.2);
  ctx.lineTo(X(0.31), G - R * 0.9);
  ctx.lineTo(X(0.25), G - R * 0.55);
  ctx.lineTo(X(0.3), G - R * 0.25);
  ctx.lineTo(X(0.26), G);
  ctx.fill();
  // cuadernas y largueros
  ctx.lineWidth = 1;
  for (let i = 1; i < 18; i++) {
    const u = i / 18;
    const h = up(u);
    ctx.strokeStyle = g(u < 0.3 ? 0.15 : 0.04);
    ctx.globalAlpha = u < 0.3 ? 0.5 : 1;
    ctx.lineWidth = u < 0.3 ? 1 : 2;
    ctx.beginPath();
    ctx.ellipse(X(u), G, R * 0.2, h, 0, Math.PI, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.lineWidth = 1;
  ctx.strokeStyle = g(0.04);
  ctx.beginPath();
  for (const k of [1, 0.82, 0.5, 0.2]) {
    for (let i = 5; i < 17; i++) {
      if (hash(i * 7.3 + k * 31) < 0.28) continue;
      const a = i / 18;
      const b = (i + 1) / 18;
      ctx.moveTo(X(a), G - up(a) * k);
      ctx.lineTo(X(b), G - up(b) * k);
    }
  }
  ctx.stroke();
  // góndola aplastada
  ctx.fillStyle = g(0.2);
  ctx.fillRect(Math.round(X(0.33)), Math.round(G - R * 0.25), Math.round(len * 0.07), Math.round(R * 0.35));
  ctx.fillStyle = g(0.5);
  ctx.fillRect(Math.round(X(0.33)), Math.round(G - R * 0.25), Math.round(len * 0.07), 1);
  fire(ctx, X(0.56), G, R * 0.3, t, 3);
  fire(ctx, X(0.74), G, R * 0.22, t, 8);
  ctx.restore();
  smoke(ctx, L.zcx + X(0.56), L.wy + G - R * 0.3, R * 5, t, 2.4);
  smoke(ctx, L.zcx + X(0.74), L.wy + G - R * 0.2, R * 3.5, t, 6.1);
}

/** El dueño de casa, de pie en la pista: abrigo largo, mochila y máscara antigás. Tranquilo. */
function survivor(ctx: CanvasRenderingContext2D, r: Rect, t: number, still: boolean) {
  const h = r.h;
  const cx = r.x + r.w / 2;
  const k = still ? 0 : Math.max(0, 1 - (t - fx.hit) / 0.5);
  const b = r.y + r.h - Math.sin(k * Math.PI) * h * 0.035;
  const sway = still ? 0 : Math.sin(t * 1.7);
  const box = (x: number, y: number, w: number, hh: number) => ctx.fillRect(Math.round(cx + x * h), Math.round(b - y * h), Math.round(w * h), Math.round(hh * h));
  ctx.fillStyle = g(0);
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.ellipse(cx + h * 0.08, r.y + r.h, h * 0.24, h * 0.03, 0, 0, 7);
  ctx.fill();
  ctx.globalAlpha = 1;
  // piernas y botas
  ctx.fillStyle = g(0.09);
  box(-0.1, 0.4, 0.08, 0.38);
  box(0.02, 0.4, 0.08, 0.38);
  ctx.fillStyle = g(0.02);
  box(-0.115, 0.06, 0.11, 0.06);
  box(0.015, 0.06, 0.11, 0.06);
  // mochila con el saco de dormir arriba
  ctx.fillStyle = g(0.14);
  box(-0.15, 0.82, 0.3, 0.3);
  ctx.fillStyle = g(0.5);
  box(-0.17, 0.87, 0.34, 0.06);
  ctx.fillStyle = g(0.1);
  box(-0.09, 0.87, 0.015, 0.06);
  box(0.075, 0.87, 0.015, 0.06);
  // abrigo: el faldón se mueve con el viento
  const coat = ctx.createLinearGradient(cx - h * 0.18, 0, cx + h * 0.18, 0);
  coat.addColorStop(0, g(0.85));
  coat.addColorStop(0.5, g(0.6));
  coat.addColorStop(1, g(0.3));
  ctx.fillStyle = coat;
  ctx.beginPath();
  ctx.moveTo(cx - h * 0.13, b - h * 0.78);
  ctx.lineTo(cx + h * 0.13, b - h * 0.78);
  ctx.lineTo(cx + h * (0.17 + 0.02 * sway), b - h * 0.27);
  ctx.lineTo(cx + h * 0.02, b - h * 0.3);
  ctx.lineTo(cx - h * 0.17, b - h * 0.28);
  ctx.fill();
  ctx.fillStyle = g(0.03);
  box(-0.005, 0.76, 0.01, 0.46);
  box(-0.145, 0.5, 0.29, 0.022);
  ctx.fillStyle = g(0.6);
  box(-0.02, 0.505, 0.04, 0.032);
  ctx.fillStyle = g(0.16);
  box(0.06, 0.48, 0.07, 0.08);
  // brazos y guantes
  ctx.fillStyle = g(0.75);
  box(-0.19, 0.76, 0.065, 0.33);
  ctx.fillStyle = g(0.3);
  box(0.125, 0.76, 0.065, 0.33);
  ctx.fillStyle = g(0.02);
  box(-0.19, 0.44, 0.065, 0.05);
  box(0.125, 0.44, 0.065, 0.05);
  // bufanda
  ctx.fillStyle = g(0.9, 0.9);
  box(-0.1, 0.8, 0.2, 0.04);
  ctx.beginPath();
  ctx.moveTo(cx + h * 0.08, b - h * 0.8);
  ctx.lineTo(cx + h * (0.2 + 0.03 * sway), b - h * (0.74 + 0.02 * sway));
  ctx.lineTo(cx + h * (0.19 + 0.03 * sway), b - h * 0.69);
  ctx.lineTo(cx + h * 0.08, b - h * 0.76);
  ctx.fill();
  // capucha y máscara
  const hy = b - h * 0.895;
  ctx.fillStyle = g(0.06);
  ctx.beginPath();
  ctx.arc(cx, hy, h * 0.092, 0, 7);
  ctx.fill();
  ctx.fillStyle = g(0.6);
  ctx.beginPath();
  ctx.ellipse(cx, hy + h * 0.012, h * 0.066, h * 0.072, 0, 0, 7);
  ctx.fill();
  ctx.fillStyle = g(0.2);
  box(-0.066, 0.9, 0.132, 0.012); // correa
  const lr = Math.max(1.5, h * 0.026);
  for (const s of [-1, 1]) {
    const lx = cx + s * h * 0.032;
    const ly = hy - h * 0.012;
    ctx.fillStyle = g(0.85);
    ctx.beginPath();
    ctx.arc(lx, ly, lr + 1, 0, 7);
    ctx.fill();
    ctx.fillStyle = g(0.02);
    ctx.beginPath();
    ctx.arc(lx, ly, lr, 0, 7);
    ctx.fill();
    ctx.fillStyle = g(1, 1);
    ctx.fillRect(Math.round(lx - lr * 0.5), Math.round(ly - lr * 0.5), Math.max(1, Math.round(lr * 0.6)), Math.max(1, Math.round(lr * 0.6)));
  }
  // filtro
  ctx.fillStyle = g(0.75);
  ctx.beginPath();
  ctx.arc(cx, hy + h * 0.055, h * 0.034, 0, 7);
  ctx.fill();
  ctx.fillStyle = g(0.1);
  ctx.beginPath();
  ctx.arc(cx, hy + h * 0.055, h * 0.016, 0, 7);
  ctx.fill();
}
