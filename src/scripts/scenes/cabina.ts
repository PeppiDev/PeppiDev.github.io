// Cabina de mando del LZ 20 (proyecto Sound3ds), vista desde el puesto del
// timonel: la góndola fuga hacia el parabrisas del frente, con ventanas a los
// costados, la rueda del timón al medio y la consola en primer plano.
// Las esferas de los instrumentos y la bitácora son HTML puesto encima.

import { fbm, g } from '../dither';
import { rain } from './exterior';
import type { Env, Rect } from './types';

export const DIALS = 6;

export function layout(W: number, H: number) {
  const port = H > W * 1.05;
  // pared del frente (lejos)
  const far = port
    ? { x0: W * 0.16, x1: W * 0.84, y0: H * 0.085, y1: H * 0.225 }
    : { x0: W * 0.26, x1: W * 0.74, y0: H * 0.12, y1: H * 0.4 };
  const hz = Math.round(far.y0 + (far.y1 - far.y0) * 0.64);
  const shelf0 = Math.round(H * (port ? 0.275 : 0.5)); // fondo de la repisa de la consola
  const shelf1 = Math.round(H * (port ? 0.305 : 0.56)); // canto cercano
  const area = port
    ? { x: W * 0.04, y: H * 0.325, w: W * 0.92, h: H * 0.25 }
    : { x: W * 0.045, y: H * 0.585, w: W * 0.52, h: H * 0.415 };
  const cols = 3;
  const cw = area.w / cols;
  const ch = area.h / 2;
  const r = Math.min(cw * 0.3, ch * (port ? 0.27 : 0.25));
  const dials = Array.from({ length: DIALS }, (_, i) => ({
    x: area.x + cw * ((i % cols) + 0.5),
    y: area.y + ch * (Math.floor(i / cols) + 0.34),
    r,
  }));
  /** atril de la bitácora (solo en horizontal) */
  const board: Rect | null = port ? null : { x: W * 0.59, y: H * 0.27, w: W * 0.385, h: H * 0.73 };
  const log: Rect | null = board && { x: board.x + W * 0.014, y: board.y + H * 0.035, w: board.w - W * 0.028, h: H * 0.955 - board.y - H * 0.035 };
  /** el timonel: zona clickeable */
  const hs = (far.y1 - far.y0) * 0.105;
  const headY = far.y0 + (far.y1 - far.y0) * 0.5;
  const pilot: Rect = { x: W / 2 - hs * 2.6, y: headY - hs * 1.2, w: hs * 5.2, h: shelf0 - headY + hs * 1.2 };
  return { port, far, hz, vx: W / 2, shelf0, shelf1, dials, board, log, pilot };
}

/** Cuándo le dieron el último golpecito al timonel (segundos de performance.now). */
export const fx = { hit: -9, shoot: -9 };
/** Huevo de pascua: se da vuelta y dispara. El fogonazo sale a los SHOT_AT segundos. */
export const SHOT_AT = 1.3;
export const shoot = () => (fx.shoot = performance.now() / 1000);
export const calm = () => (fx.shoot = -9);
export const poke = () => (fx.hit = performance.now() / 1000);

export const horizon = (W: number, H: number) => layout(W, H).hz;

type Pt = [number, number];

export function draw(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, env: Env) {
  const L = layout(W, H);
  const { far, hz, vx, shelf0, shelf1 } = L;
  const fh = far.y1 - far.y0;
  const day = env.daylight;
  const night = Math.max(0, Math.min(1, (0.4 - day) / 0.3));
  /** como g(), pero translúcido: para luces y sombras que se suman a lo ya pintado */
  const ga = (l: number, a: number, alpha: number) => `rgba(${Math.min(255, l * 255) | 0},${Math.min(255, a * 255) | 0},0,${alpha})`;
  const sway = env.still ? 0 : Math.sin(t * 0.6) * 0.6 + Math.sin(t * 1.7) * 0.25; // vaivén de lo que cuelga
  const poly = (pts: Pt[]) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
  };
  /** punto de un costado (s = -1 babor, 1 estribor) a profundidad k (1 = pared del frente, >1 = más cerca) */
  const P = (s: number, k: number, yf: number): Pt => {
    const xf = s < 0 ? far.x0 : far.x1;
    return [vx + (xf - vx) * k, hz + (yf - hz) * k];
  };

  // ── Afuera: valle y cordillera en la bruma (el cielo lo pone el tramado) ──
  ctx.fillStyle = g(0.3, 0, 0.7);
  ctx.beginPath();
  ctx.moveTo(0, hz + 1);
  for (let x = 0; x <= W; x += 2) ctx.lineTo(x, hz - fbm((x / W) * 5 + 2.2, 1.7) * fh * 0.22);
  ctx.lineTo(W, hz + 1);
  ctx.fill();
  const gr = ctx.createLinearGradient(0, hz, 0, hz + fh);
  gr.addColorStop(0, g(0.3, 0, 0.6));
  gr.addColorStop(1, g(0.08, 0, 0.15));
  ctx.fillStyle = gr;
  ctx.fillRect(0, hz, W, H - hz);
  if (env.rain > 0) rain(ctx, W, shelf1, t, env.rain * 1.4);

  // ── Vanos: tres paños al frente y dos por costado ──
  const post = Math.max(3, Math.round(W * 0.011));
  const panes = 3;
  const holes: Pt[][] = [];
  const pw = (far.x1 - far.x0 - post * (panes + 1)) / panes;
  for (let i = 0; i < panes; i++) {
    const x = far.x0 + post + i * (pw + post);
    holes.push([
      [x, far.y0],
      [x + pw, far.y0],
      [x + pw, far.y1],
      [x, far.y1],
    ]);
  }
  const yt = far.y0 + fh * 0.03;
  const yb = far.y1 - fh * 0.02;
  const bays: [number, number][] = [
    [1.1, 1.52],
    [1.62, 2.6],
  ];
  for (const s of [-1, 1]) for (const [k0, k1] of bays) holes.push([P(s, k0, yt), P(s, k1, yt), P(s, k1, yb), P(s, k0, yb)]);

  // ── Estructura: todo menos los vanos ──
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  for (const h of holes) {
    h.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
  }
  ctx.clip('evenodd');

  const yc = far.y0 - fh * 0.14; // encuentro de la pared del frente con el techo
  const yf = far.y1 + fh * 0.6; // y con el piso
  // techo
  ctx.fillStyle = g(0.03);
  ctx.fillRect(0, 0, W, H);
  poly([[far.x0, yc], [far.x1, yc], P(1, 6, yc), P(-1, 6, yc)]);
  const cg = ctx.createLinearGradient(0, yc, 0, Math.min(0, yc - fh * 0.5));
  cg.addColorStop(0, g(0.1 + 0.1 * day)); // el parabrisas alumbra el techo de cerca
  cg.addColorStop(1, g(0.03));
  ctx.fillStyle = cg;
  ctx.fill();
  // costados: babor recibe la luz, estribor queda en sombra
  for (const s of [-1, 1]) {
    poly([P(s, 1, yc), P(s, 6, yc), P(s, 6, yf), P(s, 1, yf)]);
    const wg = ctx.createLinearGradient(s < 0 ? far.x0 : far.x1, 0, s < 0 ? 0 : W, 0);
    wg.addColorStop(0, g((s < 0 ? 0.13 : 0.09) * (0.5 + 0.5 * day)));
    wg.addColorStop(1, g(0.04));
    ctx.fillStyle = wg;
    ctx.fill();
    // zócalo en sombra bajo las ventanas, con su pasamanos
    const yz = far.y1 + fh * 0.1;
    poly([P(s, 1, yz), P(s, 6, yz), P(s, 6, yf), P(s, 1, yf)]);
    ctx.fillStyle = ga(0, 0, 0.45);
    ctx.fill();
    for (const [dy, c] of [[1.5, g(0)], [0, g(s < 0 ? 0.55 : 0.4)]] as const) {
      const a = P(s, 1, yz);
      const b = P(s, 6, yz);
      ctx.strokeStyle = c;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(a[0], a[1] + dy);
      ctx.lineTo(b[0], b[1] + dy * 6);
      ctx.stroke();
    }
  }
  // pared del frente
  ctx.fillStyle = g(0.07 + 0.04 * day);
  ctx.fillRect(far.x0, yc, far.x1 - far.x0, yf - yc);
  ctx.fillStyle = g(0.05);
  ctx.fillRect(far.x0, far.y1, far.x1 - far.x0, yf - far.y1);
  ctx.fillStyle = g(0.3);
  for (let x = far.x0 + 5; x < far.x1 - 3; x += Math.max(6, (far.x1 - far.x0) / 26)) ctx.fillRect(Math.round(x), Math.round(far.y1 + fh * 0.07), 1, 1);

  // cuadernas: anillos que se repiten hacia el frente
  ctx.lineWidth = 1;
  for (const k of [1, 1.57, 2.7]) {
    const lw = Math.max(1, Math.round(k * 1.2));
    // primero la cara en sombra (el espesor del perfil), después el canto con luz
    for (const [dk, c] of [[lw * 0.012 + 0.012, g(0)], [0, g(k === 1 ? 0.5 : 0.36)]] as const) {
      ctx.strokeStyle = c;
      ctx.lineWidth = dk ? lw + 1 : lw;
      ctx.beginPath();
      const a = P(-1, k + dk, yf);
      const b = P(-1, k + dk, yc);
      const c2 = P(1, k + dk, yc);
      const d = P(1, k + dk, yf);
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.lineTo(c2[0], c2[1]);
      ctx.lineTo(d[0], d[1]);
      ctx.stroke();
    }
  }
  // largueros del techo, fugando
  ctx.lineWidth = 1;
  ctx.strokeStyle = g(0.24);
  ctx.beginPath();
  for (const f of [0.2, 0.5, 0.8]) {
    const x = far.x0 + (far.x1 - far.x0) * f;
    ctx.moveTo(x, yc);
    ctx.lineTo(vx + (x - vx) * 6, hz + (yc - hz) * 6);
  }
  ctx.stroke();
  // marcos de los vanos: filo de luz arriba y a la izquierda
  ctx.lineWidth = 2;
  for (const h of holes) {
    ctx.strokeStyle = g(0.2);
    poly(h);
    ctx.stroke();
    ctx.strokeStyle = g(0.5 + 0.4 * day);
    ctx.beginPath();
    ctx.moveTo(h[3][0], h[3][1]);
    ctx.lineTo(h[2][0], h[2][1]);
    ctx.stroke();
  }
  ctx.lineWidth = 1;
  ctx.restore();

  // parantes del parabrisas con su canto iluminado
  for (let i = 0; i <= panes; i++) {
    const x = Math.round(far.x0 + i * (pw + post));
    ctx.fillStyle = g(0.55);
    ctx.fillRect(x, Math.round(far.y0), 1, Math.round(fh));
  }

  // ── Tiradores de lastre colgando del techo ──
  const hang = (i: number) => (env.still ? 0 : Math.sin(t * 0.9 + i * 1.3) * 0.7 + sway * 0.5);
  ctx.strokeStyle = g(0.4);
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const x = Math.round(W * (0.6 + i * 0.022)) + 0.5;
    const y1 = far.y0 + fh * (0.1 + 0.05 * ((i * 3) % 4));
    ctx.moveTo(x, 0);
    ctx.lineTo(x + Math.round(hang(i)), y1);
  }
  ctx.stroke();
  for (let i = 0; i < 5; i++) {
    const x = Math.round(W * (0.6 + i * 0.022)) + Math.round(hang(i));
    const y1 = Math.round(far.y0 + fh * (0.1 + 0.05 * ((i * 3) % 4)));
    ctx.fillStyle = g(i === 2 ? 0.9 : 0.75, i === 2 ? 1 : 0);
    ctx.fillRect(x - 2, y1, 5, 3);
  }

  // ── Lámpara colgante: de noche es la que da volumen a la cabina ──
  {
    const lx0 = W * (L.port ? 0.3 : 0.405);
    const ly = far.y0 + fh * 0.16;
    const lx = lx0 + sway * fh * 0.012;
    const lr = Math.max(4, fh * 0.055);
    ctx.strokeStyle = g(0.4);
    ctx.beginPath();
    ctx.moveTo(Math.round(lx0) + 0.5, 0);
    ctx.lineTo(Math.round(lx) + 0.5, ly - lr);
    ctx.stroke();
    if (night > 0) {
      // el resplandor solo tiñe lo que ya es cabina, no el cielo de los vanos
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      const R = fh * 1.25;
      const glow = ctx.createRadialGradient(lx, ly, 1, lx, ly, R);
      glow.addColorStop(0, ga(0.7, 1, 0.6 * night));
      glow.addColorStop(0.25, ga(0.4, 0.9, 0.2 * night));
      glow.addColorStop(1, ga(0.2, 0.5, 0));
      ctx.fillStyle = glow;
      ctx.fillRect(lx - R, ly - R, R * 2, R * 2);
      ctx.restore();
    }
    // pantalla de latón y ampolleta
    poly([[lx - lr * 0.35, ly - lr], [lx + lr * 0.35, ly - lr], [lx + lr, ly], [lx - lr, ly]]);
    ctx.fillStyle = g(0.04);
    ctx.fill();
    ctx.fillStyle = g(0.6);
    ctx.fillRect(Math.round(lx - lr), Math.round(ly), Math.round(lr * 2), 1);
    ctx.fillStyle = night > 0 ? g(1, 1) : g(0.75);
    ctx.beginPath();
    ctx.arc(lx, ly + 1, lr * 0.42, 0, Math.PI);
    ctx.fill();
  }

  // ── Inclinómetro en la pared del frente: un tubo curvo con su burbuja ──
  {
    const ix = far.x0 + (far.x1 - far.x0) * 0.17;
    const iy = far.y1 + (shelf0 - far.y1) * 0.18;
    const ir = (far.x1 - far.x0) * 0.1;
    const span = 0.5;
    ctx.fillStyle = g(0.02);
    ctx.fillRect(Math.round(ix - ir * 0.62), Math.round(iy), Math.round(ir * 1.24), Math.round(ir * 0.42));
    ctx.strokeStyle = g(0.45);
    ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(ix - ir * 0.62) + 0.5, Math.round(iy) + 0.5, Math.round(ir * 1.24), Math.round(ir * 0.42));
    const cyI = iy + ir * 0.3 - ir; // centro del arco, arriba
    ctx.strokeStyle = g(0.85);
    ctx.lineWidth = Math.max(2, ir * 0.07);
    ctx.beginPath();
    ctx.arc(ix, cyI, ir, Math.PI / 2 - span, Math.PI / 2 + span);
    ctx.stroke();
    const tilt = env.still ? 0 : Math.sin(t * 0.45 - 0.5) * 0.24 + Math.sin(t * 0.8) * 0.06;
    const ba = Math.PI / 2 + tilt;
    ctx.fillStyle = g(0.9, 1);
    ctx.beginPath();
    ctx.arc(ix + Math.cos(ba) * ir, cyI + Math.sin(ba) * ir, Math.max(1.5, ir * 0.06), 0, 7);
    ctx.fill();
    ctx.fillStyle = g(0.9);
    ctx.fillRect(Math.round(ix), Math.round(iy + ir * 0.34), 1, 2);
  }

  // ── Rueda del timón, a contraluz ──
  const wr = fh * 0.36;
  const wx = vx;
  const wy = far.y1 - fh * 0.04;
  ctx.fillStyle = g(0.08);
  ctx.fillRect(Math.round(wx - wr * 0.12), Math.round(wy), Math.round(wr * 0.24), shelf0 - Math.round(wy));
  // madera clara: se recorta contra el muro oscuro bajo los ventanales
  ctx.strokeStyle = g(0.62);
  ctx.lineWidth = Math.max(2, wr * 0.13);
  ctx.beginPath();
  ctx.arc(wx, wy, wr, 0, 7);
  ctx.stroke();
  ctx.lineWidth = Math.max(1.5, wr * 0.07);
  ctx.beginPath();
  const turn = env.still ? 0.1 : Math.sin(t * 0.45) * 0.24 + Math.sin(t * 1.3) * 0.05;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + turn;
    ctx.moveTo(wx, wy);
    ctx.lineTo(wx + Math.cos(a) * wr * 1.28, wy + Math.sin(a) * wr * 1.28);
  }
  ctx.stroke();
  // filo de luz en el aro y pomos en la punta de cada rayo
  ctx.strokeStyle = g(0.8);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(wx, wy, wr + Math.max(1, wr * 0.065), 0, 7);
  ctx.stroke();
  ctx.strokeStyle = g(0.02);
  ctx.beginPath();
  ctx.arc(wx, wy, wr - Math.max(1, wr * 0.065), 0, 7);
  ctx.stroke();
  ctx.fillStyle = g(0.85);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + turn;
    ctx.beginPath();
    ctx.arc(wx + Math.cos(a) * wr * 1.28, wy + Math.sin(a) * wr * 1.28, Math.max(1.5, wr * 0.07), 0, 7);
    ctx.fill();
  }
  ctx.fillStyle = g(0.85, 0.5);
  ctx.beginPath();
  ctx.arc(wx, wy, Math.max(2, wr * 0.13), 0, 7);
  ctx.fill();

  // ── El timonel (yo), de espaldas y a contraluz, con gorro de piloto ──
  {
    const hs = fh * 0.105; // radio de la cabeza
    // golpecito: se encoge de hombros y sacude la cabeza un momento
    const k = env.still ? 0 : Math.max(0, 1 - (t - fx.hit) / 0.55);
    const hx = wx + turn * hs * 1.1 + Math.sin(k * Math.PI * 4) * hs * 0.45 * k;
    const hy = far.y0 + fh * 0.5 + Math.sin(k * Math.PI) * hs * 0.5;
    const shY = hy + hs * 1.8;
    const shW = hs * 2.45;
    const ink = g(0.015);
    // giro: la figura se angosta de espaldas y se abre de frente
    const aim = t - fx.shoot;
    const turning = aim >= 0 && aim < 6;
    const front = turning && aim >= 0.4;
    const sx = !turning ? 1 : Math.max(0.1, aim < 0.4 ? Math.cos((aim / 0.4) * 1.57) : Math.sin(Math.min(1, (aim - 0.4) / 0.4) * 1.57));
    ctx.save();
    ctx.translate(hx, 0);
    ctx.scale(sx, 1);
    ctx.translate(-hx, 0);
    const torso = () => {
      ctx.beginPath();
      ctx.moveTo(wx - shW * 0.82, shelf0);
      ctx.lineTo(hx - shW, shY + hs * 0.6);
      ctx.quadraticCurveTo(hx - shW, shY - hs * 0.35, hx - hs * 0.7, shY - hs * 0.5);
      ctx.lineTo(hx + hs * 0.7, shY - hs * 0.5);
      ctx.quadraticCurveTo(hx + shW, shY - hs * 0.35, hx + shW, shY + hs * 0.6);
      ctx.lineTo(wx + shW * 0.82, shelf0);
    };
    // brazos hasta el aro: las manos giran con la rueda
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const s of front ? [] : [-1, 1]) {
      const a = (s < 0 ? Math.PI + 0.3 : -0.3) + turn;
      const mx = wx + Math.cos(a) * wr;
      const my = wy + Math.sin(a) * wr;
      const sx = hx + s * shW * 0.86;
      const sy = shY + hs * 0.35;
      const ex = (sx + mx) / 2 + s * hs * 0.75;
      const ey = (sy + my) / 2 + hs * 0.95;
      for (const [w, c] of [[hs * 0.95 + 2, g(0.7)], [hs * 0.95, ink]] as const) {
        ctx.strokeStyle = c;
        ctx.lineWidth = w;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.lineTo(mx, my);
        ctx.stroke();
      }
      ctx.fillStyle = g(0.8);
      ctx.beginPath();
      ctx.arc(mx, my, hs * 0.5, 0, 7);
      ctx.fill();
    }
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
    ctx.strokeStyle = g(0.7);
    ctx.lineWidth = 2;
    torso();
    ctx.stroke();
    ctx.fillStyle = ink;
    torso();
    ctx.fill();
    if (!front) {
      // chaqueta de cuero: la luz de babor le saca brillo al hombro, y de noche la lámpara
      ctx.save();
      torso();
      ctx.clip();
      const lit = 0.12 + 0.3 * day;
      const jg = ctx.createLinearGradient(hx - shW, 0, hx + shW, 0);
      jg.addColorStop(0, g(lit, 0.3 * night));
      jg.addColorStop(0.45, g(lit * 0.25, 0.06 * night));
      jg.addColorStop(0.75, ink);
      ctx.fillStyle = jg;
      ctx.fillRect(hx - shW * 1.1, shY - hs, shW * 2.2, shelf0 - shY + hs);
      const sh = ctx.createLinearGradient(0, shY + hs * 0.4, 0, shelf0);
      sh.addColorStop(0, ga(0, 0, 0));
      sh.addColorStop(1, ga(0, 0, 0.85));
      ctx.fillStyle = sh;
      ctx.fillRect(hx - shW * 1.1, shY, shW * 2.2, shelf0 - shY);
      // canesú, costura de la espalda y cinturón
      ctx.strokeStyle = g(0.34);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(hx - shW, shY + hs * 0.95);
      ctx.quadraticCurveTo(hx, shY + hs * 0.45, hx + shW, shY + hs * 0.95);
      ctx.moveTo(Math.round(hx) + 0.5, shY + hs * 0.7);
      ctx.lineTo(Math.round(hx) + 0.5, shelf0);
      ctx.stroke();
      const by = Math.round(shY + (shelf0 - shY) * 0.72);
      ctx.fillStyle = g(0.3);
      ctx.fillRect(hx - shW, by, shW * 2, Math.max(2, Math.round(hs * 0.3)));
      ctx.fillStyle = g(0.02);
      ctx.fillRect(hx - shW, by + Math.max(2, Math.round(hs * 0.3)), shW * 2, 1);
      ctx.restore();
    }
    // cuello de la chaqueta
    ctx.fillStyle = g(0.55);
    ctx.beginPath();
    ctx.moveTo(hx - hs * 1.05, shY - hs * 0.3);
    ctx.lineTo(hx + hs * 1.05, shY - hs * 0.3);
    ctx.lineTo(hx + hs * 0.7, shY - hs * 0.85);
    ctx.lineTo(hx - hs * 0.7, shY - hs * 0.85);
    ctx.fill();
    // gorro de cuero: casco redondo y orejeras
    ctx.fillStyle = ink;
    ctx.beginPath();
    ctx.arc(hx, hy, hs, Math.PI, 0);
    ctx.lineTo(hx + hs * 1.12, hy + hs * 1.05);
    ctx.quadraticCurveTo(hx, hy + hs * 1.5, hx - hs * 1.12, hy + hs * 1.05);
    ctx.closePath();
    ctx.fill();
    if (!front) {
      const hg = ctx.createRadialGradient(hx - hs * 0.45, hy - hs * 0.45, 0, hx - hs * 0.2, hy, hs * 1.3);
      hg.addColorStop(0, g(0.3 + 0.25 * day, 0.4 * night));
      hg.addColorStop(0.6, g(0.05));
      hg.addColorStop(1, ink);
      ctx.fillStyle = hg;
      ctx.fill();
    }
    ctx.strokeStyle = g(0.75);
    ctx.lineWidth = 1;
    ctx.stroke();
    if (front) {
      // de frente: cara, antiparras sobre la frente y el revólver apuntando acá
      ctx.fillStyle = g(0.62);
      ctx.beginPath();
      ctx.ellipse(hx, hy + hs * 0.3, hs * 0.72, hs * 0.85, 0, 0, 7);
      ctx.fill();
      ctx.fillStyle = ink;
      ctx.fillRect(Math.round(hx - hs * 0.45), Math.round(hy + hs * 0.2), Math.max(1, Math.round(hs * 0.25)), Math.max(1, Math.round(hs * 0.14)));
      ctx.fillRect(Math.round(hx + hs * 0.2), Math.round(hy + hs * 0.2), Math.max(1, Math.round(hs * 0.25)), Math.max(1, Math.round(hs * 0.14)));
      ctx.fillRect(Math.round(hx - hs * 0.3), Math.round(hy + hs * 0.72), Math.round(hs * 0.6), 1);
      ctx.fillRect(Math.round(hx - hs), Math.round(hy - hs * 0.55), Math.round(hs * 2), Math.round(hs * 0.5));
      ctx.fillStyle = g(1);
      for (const s of [-1, 1]) ctx.fillRect(Math.round(hx + s * hs * 0.45 - hs * 0.32), Math.round(hy - hs * 0.5), Math.round(hs * 0.64), Math.max(2, Math.round(hs * 0.38)));
      const up = Math.min(1, Math.max(0, (aim - 0.75) / 0.3)); // sube el brazo
      if (up > 0) {
        const gx = hx + hs * 0.5;
        const gy = shY + hs * (2.6 - 1.7 * up) - (aim > SHOT_AT ? Math.max(0, 1 - (aim - SHOT_AT) / 0.25) * hs * 0.7 : 0);
        const gr = hs * (0.6 + 0.5 * up);
        ctx.fillStyle = g(0.7);
        ctx.beginPath();
        ctx.arc(gx, gy + gr * 0.5, gr * 1.05, 0, 7); // puño enguantado
        ctx.fill();
        ctx.fillStyle = ink;
        ctx.beginPath();
        ctx.arc(gx, gy, gr * 0.78, 0, 7);
        ctx.fill();
        ctx.fillStyle = g(1);
        ctx.beginPath();
        ctx.arc(gx, gy, gr * 0.62, 0, 7); // boca del cañón
        ctx.fill();
        ctx.fillStyle = g(0);
        ctx.beginPath();
        ctx.arc(gx, gy, gr * 0.36, 0, 7);
        ctx.fill();
        ctx.fillStyle = g(1);
        ctx.fillRect(Math.round(gx - 1), Math.round(gy - gr * 1.1), 2, Math.round(gr * 0.35)); // mira
        const f = (aim - SHOT_AT) / 0.22;
        if (f >= 0 && f < 1) {
          // fogonazo
          const R1 = hs * (3 + 9 * f);
          for (const [rr, c] of [[R1, g(1, 1)], [R1 * 0.55, g(1)]] as const) {
            ctx.fillStyle = c;
            ctx.beginPath();
            for (let i = 0; i < 16; i++) {
              const a = (i / 16) * Math.PI * 2 + 0.2;
              const r = i % 2 ? rr * 0.42 : rr;
              ctx.lineTo(gx + Math.cos(a) * r, gy + Math.sin(a) * r);
            }
            ctx.fill();
          }
        }
      }
    }
    // correa de las antiparras con su hebilla
    if (!front) {
    ctx.fillStyle = g(0.9);
    ctx.fillRect(Math.round(hx - hs * 0.98), Math.round(hy - hs * 0.1), Math.round(hs * 1.96), Math.max(2, Math.round(hs * 0.2)));
    ctx.fillStyle = g(0.9, 1);
    ctx.fillRect(Math.round(hx - hs * 0.2), Math.round(hy - hs * 0.2), Math.max(2, Math.round(hs * 0.4)), Math.max(3, Math.round(hs * 0.4)));
    // costura del casco
    ctx.fillStyle = g(0.4);
    ctx.fillRect(Math.round(hx), Math.round(hy - hs * 0.95), 1, Math.round(hs * 0.8));
    }
    ctx.restore();
  }

  // ── Repisa de la consola, iluminada por el cielo ──
  const lum = 0.2 + 0.4 * day;
  ctx.fillStyle = g(0);
  ctx.fillRect(0, shelf0 - 3, W, 3);
  const sg = ctx.createLinearGradient(0, shelf0, 0, shelf1);
  sg.addColorStop(0, g(lum * 0.7));
  sg.addColorStop(1, g(lum));
  ctx.fillStyle = sg;
  ctx.fillRect(0, shelf0, W, shelf1 - shelf0);
  const kk = (shelf1 - hz) / (shelf0 - hz);
  {
    // manchas de sol de los tres paños, corridas hacia estribor, y la sombra del timonel
    const k0 = (shelf0 - hz) / (far.y1 - hz);
    const lean = (shelf1 - shelf0) * 0.9;
    if (day > 0.2) {
      ctx.fillStyle = ga(1, 0, Math.min(0.6, (day - 0.2) * 0.75));
      for (let i = 0; i < panes; i++) {
        const xa = far.x0 + post + i * (pw + post);
        const a = vx + (xa + pw * 0.14 - vx) * k0 * 0.8;
        const b = vx + (xa + pw * 0.86 - vx) * k0 * 0.8;
        poly([[a + lean * 0.3, shelf0], [b + lean * 0.3, shelf0], [vx + (b - vx) * kk + lean, shelf1], [vx + (a - vx) * kk + lean, shelf1]]);
        ctx.fill();
      }
    }
    ctx.fillStyle = ga(0, 0, 0.7);
    const pwid = fh * 0.3;
    poly([[vx - pwid, shelf0], [vx + pwid, shelf0], [vx + pwid * kk + lean, shelf1], [vx - pwid * kk + lean, shelf1]]);
    ctx.fill();
    if (night > 0) {
      // de noche: el charco de luz de la lámpara
      const lxp = W * (L.port ? 0.3 : 0.405);
      const pool = ctx.createRadialGradient(lxp, (shelf0 + shelf1) / 2, 1, lxp, (shelf0 + shelf1) / 2, fh * 1.1);
      pool.addColorStop(0, ga(0.9, 1, 0.6 * night));
      pool.addColorStop(1, ga(0.3, 0.6, 0));
      ctx.fillStyle = pool;
      ctx.fillRect(0, shelf0, W, shelf1 - shelf0);
    }
  }
  ctx.strokeStyle = g(0.04);
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  for (let u = -0.9; u <= 0.91; u += 0.2) {
    ctx.moveTo(vx + u * W * 0.5, shelf0);
    ctx.lineTo(vx + u * W * 0.5 * kk, shelf1);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;

  // bitácula del compás sobre la repisa
  const cx = W * (L.port ? 0.3 : 0.36);
  const cr = (shelf1 - shelf0) * (L.port ? 0.8 : 0.62);
  const cy = shelf0 + (shelf1 - shelf0) * 0.45;
  ctx.fillStyle = g(0);
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.ellipse(cx + cr * 0.4, cy + cr * 0.1, cr * 1.4, cr * 0.32, 0, 0, 7);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = g(0.25);
  ctx.fillRect(cx - cr, cy - cr * 0.5, cr * 2, cr * 0.5);
  ctx.beginPath();
  ctx.ellipse(cx, cy, cr, cr * 0.25, 0, 0, Math.PI);
  ctx.fill();
  const dome = ctx.createRadialGradient(cx - cr * 0.35, cy - cr * 1.1, 1, cx, cy - cr * 0.5, cr * 1.1);
  dome.addColorStop(0, g(1, 0.2));
  dome.addColorStop(0.35, g(0.9, 1));
  dome.addColorStop(1, g(0.5, 1));
  ctx.fillStyle = dome;
  ctx.beginPath();
  ctx.ellipse(cx, cy - cr * 0.5, cr, cr * 0.95, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = g(0.9);
  ctx.fillRect(cx - cr, Math.round(cy - cr * 0.5), cr * 2, 1);

  // ── Frente inclinado de la consola ──
  const pg = ctx.createLinearGradient(0, shelf1, 0, H);
  pg.addColorStop(0, g(0.16));
  pg.addColorStop(0.2, g(0.07));
  pg.addColorStop(1, g(0.02));
  ctx.fillStyle = pg;
  ctx.fillRect(0, shelf1, W, H - shelf1);
  ctx.fillStyle = g(0.85);
  ctx.fillRect(0, shelf1, W, 1);
  ctx.fillStyle = g(0);
  ctx.fillRect(0, shelf1 + 1, W, 2);

  // placas atornilladas: una por instrumento, con el canto de arriba tomando luz
  {
    const dx = L.dials[1].x - L.dials[0].x;
    const dy = L.dials[3].y - L.dials[0].y;
    for (const d of L.dials) {
      const x = Math.round(d.x - dx * 0.46);
      const y = Math.round(d.y - d.r * 1.27);
      const w = Math.round(dx * 0.92);
      const h = Math.round(dy * 0.9);
      ctx.fillStyle = g(0.035);
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = g(0.5);
      ctx.fillRect(x, y, w, 1);
      ctx.fillStyle = g(0.28);
      ctx.fillRect(x, y, 1, h);
      ctx.fillStyle = g(0);
      ctx.fillRect(x, y + h, w + 1, 1);
      ctx.fillRect(x + w, y, 1, h);
      ctx.fillStyle = g(0.7);
      for (const [rx, ry] of [[2, 2], [w - 3, 2], [2, h - 3], [w - 3, h - 3]]) ctx.fillRect(x + rx, y + ry, 1, 1);
    }
    // fila de interruptores de palanca bajo el canto de la repisa
    const sy = shelf1 + Math.round(H * 0.015);
    const x0 = Math.round(W * 0.05) + 48;
    const xEnd = L.board ? L.board.x - W * 0.05 : W * 0.95;
    const gap = Math.max(9, Math.round(W * 0.018));
    for (let i = 0, x = x0; x < xEnd; i++, x += gap + (i % 4 === 0 ? gap : 0)) {
      const up = (i * 7 + 3) % 5 < 3;
      ctx.fillStyle = g(0);
      ctx.fillRect(x - 1, sy + 1, 4, 3);
      ctx.fillStyle = g(0.45);
      ctx.fillRect(x, sy + 2, 2, 1);
      ctx.fillStyle = g(0.9);
      ctx.fillRect(x, up ? sy - 1 : sy + 3, 2, 3);
    }
  }

  // biseles de los instrumentos, embutidos (las esferas van encima, en SVG)
  for (const d of L.dials) {
    ctx.fillStyle = g(0);
    ctx.beginPath();
    ctx.arc(d.x + d.r * 0.08, d.y + d.r * 0.12, d.r * 1.2, 0, 7);
    ctx.fill();
    const bz = ctx.createLinearGradient(d.x - d.r, d.y - d.r, d.x + d.r, d.y + d.r);
    bz.addColorStop(0, g(1));
    bz.addColorStop(0.5, g(0.4));
    bz.addColorStop(1, g(0.1));
    ctx.fillStyle = bz;
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r * 1.14, 0, 7);
    ctx.fill();
    ctx.fillStyle = g(0.02);
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r, 0, 7);
    ctx.fill();
  }
  // testigos
  for (let i = 0; i < 5; i++) {
    const on = i === 0 || (i === 3 && Math.sin(t * 1.3) > 0) || i === 4;
    ctx.fillStyle = on ? g(0.8, 1) : g(0.15);
    ctx.fillRect(Math.round(W * 0.05) + i * 7, shelf1 + Math.round(H * 0.015) + 1, 3, 3);
  }

  // ── Telégrafo de máquinas, en primer plano a babor ──
  if (!L.port) {
    const tx = W * 0.075;
    const tr = H * 0.07;
    const ty = shelf0 - tr * 1.75;
    ctx.fillStyle = g(0);
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.ellipse(tx + tr * 0.5, shelf0 + (shelf1 - shelf0) * 0.5, tr * 1.2, (shelf1 - shelf0) * 0.4, 0, 0, 7);
    ctx.fill();
    ctx.globalAlpha = 1;
    const col = ctx.createLinearGradient(tx - tr * 0.3, 0, tx + tr * 0.3, 0);
    col.addColorStop(0, g(0.8));
    col.addColorStop(0.4, g(0.35));
    col.addColorStop(1, g(0.06));
    ctx.fillStyle = col;
    ctx.fillRect(tx - tr * 0.26, ty, tr * 0.52, shelf0 + (shelf1 - shelf0) * 0.5 - ty);
    ctx.fillRect(tx - tr * 0.5, shelf0 + (shelf1 - shelf0) * 0.3, tr, (shelf1 - shelf0) * 0.3);
    ctx.fillStyle = g(0.06);
    ctx.beginPath();
    ctx.arc(tx + tr * 0.12, ty + tr * 0.06, tr * 1.04, 0, 7);
    ctx.fill();
    const bz = ctx.createLinearGradient(tx - tr, ty - tr, tx + tr, ty + tr);
    bz.addColorStop(0, g(1));
    bz.addColorStop(0.55, g(0.45));
    bz.addColorStop(1, g(0.12));
    ctx.fillStyle = bz;
    ctx.beginPath();
    ctx.arc(tx, ty, tr, 0, 7);
    ctx.fill();
    ctx.fillStyle = g(0.92);
    ctx.beginPath();
    ctx.arc(tx, ty, tr * 0.8, 0, 7);
    ctx.fill();
    ctx.strokeStyle = g(0);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.moveTo(tx + Math.cos(a) * tr * 0.3, ty + Math.sin(a) * tr * 0.3);
      ctx.lineTo(tx + Math.cos(a) * tr * 0.8, ty + Math.sin(a) * tr * 0.8);
    }
    ctx.stroke();
    ctx.fillStyle = g(0.05);
    ctx.beginPath();
    ctx.arc(tx, ty, tr * 0.3, 0, 7);
    ctx.fill();
    // manilla en "avante"
    const a = -Math.PI * 0.3;
    ctx.strokeStyle = g(0.06);
    ctx.lineWidth = Math.max(2, tr * 0.12);
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx + Math.cos(a) * tr * 1.35, ty + Math.sin(a) * tr * 1.35);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = g(0.9, 1);
    ctx.beginPath();
    ctx.arc(tx + Math.cos(a) * tr * 1.4, ty + Math.sin(a) * tr * 1.4, Math.max(2, tr * 0.16), 0, 7);
    ctx.fill();
  }

  // ── Atril: la bitácora va apoyada aquí ──
  if (L.board) {
    const b = L.board;
    const inset = b.w * 0.03;
    const th = Math.max(3, W * 0.008);
    // sombra arrojada sobre la consola
    ctx.fillStyle = g(0);
    ctx.globalAlpha = 0.75;
    poly([[b.x + inset - th * 3.2, b.y + th * 2], [b.x + inset, b.y], [b.x, H], [b.x - th * 4.5, H]]);
    ctx.fill();
    ctx.globalAlpha = 1;
    // canto (espesor) y cara
    ctx.fillStyle = g(0.95);
    poly([[b.x + inset - th, b.y + th * 0.6], [b.x + inset, b.y], [b.x, H], [b.x - th * 1.3, H]]);
    ctx.fill();
    const bg = ctx.createLinearGradient(0, b.y, 0, H);
    bg.addColorStop(0, g(0.12 + 0.06 * day));
    bg.addColorStop(1, g(0.06));
    ctx.fillStyle = bg;
    poly([[b.x + inset, b.y], [b.x + b.w - inset, b.y], [b.x + b.w, H], [b.x, H]]);
    ctx.fill();
    ctx.fillStyle = g(0.95);
    ctx.fillRect(Math.round(b.x + inset), Math.round(b.y), Math.round(b.w - inset * 2), 1);
    // pinzas y pestaña inferior
    ctx.fillStyle = g(0.95);
    for (const f of [0.3, 0.7]) ctx.fillRect(Math.round(b.x + b.w * f - W * 0.012), Math.round(b.y + H * 0.012), Math.round(W * 0.024), Math.round(H * 0.04));
    ctx.fillStyle = g(0.95);
    ctx.fillRect(Math.round(b.x), Math.round(H * 0.955), Math.round(b.w), Math.max(2, Math.round(H * 0.012)));
    ctx.fillStyle = g(0.03);
    ctx.fillRect(Math.round(b.x), Math.round(H * 0.955) + Math.max(2, Math.round(H * 0.012)), Math.round(b.w), H);
  }
}
