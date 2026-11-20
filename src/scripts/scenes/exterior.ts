// Exterior del hangar: el punto de partida. Tres lugares clickeables:
// el hangar (Sobre mí), el LZ 20 (Proyectos) y la estación de radio (Contacto).

import { fbm, g } from '../dither';
import { boundsLZ20, drawLZ20 } from '../zeppelin';
import type { Env, Rect } from './types';

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
  const zb = boundsLZ20(zcx, zcy, zl);
  const spots: Record<'taller' | 'lz20' | 'contacto', Rect> = {
    taller: { x: hcx - hw / 2, y: hbase - hh, w: hw, h: hh },
    lz20: zb,
    contacto: { x: mx - mh * 0.2, y: mbase - mh, w: mh * 0.4, h: mh },
  };
  return { port, hz, hw, hh, hcx, hbase, zl, zcx, zcy, mx, mh, mbase, spots };
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
