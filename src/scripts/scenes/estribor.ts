// Vista a estribor desde la cabina del LZ 20: el dirigible viaja hacia Chillán
// (al oeste) y por la ventana derecha se mira al norte. El valle pasa de
// izquierda a derecha: potreros, alamedas, el camino a Coihueco con su
// postación, el río Cato, el pueblo del silo y el aeródromo. El recorrido es
// un bucle de PERIOD kilómetros.

import { fbm, g } from '../dither';
import { rain } from './exterior';
import type { Env } from './types';

const PERIOD = 6; // km que dura una vuelta
const SPEED = 0.026; // km por segundo
const TALL = 2; // lo que tiene altura se exagera para que se lea desde arriba
/** franjas de terreno, de cerca a lejos (km al norte del dirigible) */
const ROWS = [0.3, 0.5, 0.75, 1.1, 1.6, 2.3, 3.3, 4.8, 7, 11, 20];
/** ancho de los potreros de cada franja: todos caben justo en PERIOD */
const WIDTH = [0.25, 0.3, 0.375, 0.5, 0.6, 0.75, 1, 1.2, 1.5, 2];
const ROAD = [0.4, 0.445];
const TOWN_X = 1.2;
const FIELD_X = 4.1; // aeródromo

const hash = (a: number, b: number) => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const mod = (a: number, n: number) => ((a % n) + n) % n;

export function view(W: number, H: number) {
  const port = H > W * 1.05;
  const win = port
    ? { x0: W * 0.05, x1: W * 0.95, y0: H * 0.1, y1: H * 0.7 }
    : { x0: W * 0.06, x1: W * 0.94, y0: H * 0.1, y1: H * 0.8 };
  const hz = Math.round(win.y0 + (win.y1 - win.y0) * (port ? 0.3 : 0.34));
  return { port, win, hz };
}

export const horizon = (W: number, H: number) => view(W, H).hz;

/** Lo que se puede tocar: `lamp` nula = sola (encendida de noche); `spy` = mirando por los prismáticos. */
export const fx = { lamp: null as boolean | null, spy: 0, sp: 0, last: 0, sip: -9 };
export const sip = () => (fx.sip = performance.now() / 1000);
const smooth = (x: number) => x * x * (3 - 2 * x);

/** La mesita plegable bajo el ventanal y lo que hay encima. */
function furniture(W: number, H: number) {
  const { port, win } = view(W, H);
  const u = win.y1 - win.y0;
  const post = Math.max(4, Math.round(W * 0.016));
  const panes = port ? 2 : 3;
  const pw = (win.x1 - win.x0 - post * (panes - 1)) / panes;
  const yb = win.y1 + u * 0.035;
  const yf = Math.min(H * 0.985, win.y1 + u * 0.3);
  const xb0 = W * 0.09;
  const xb1 = W * (port ? 0.91 : 0.57);
  const xf0 = W * 0.05;
  const xf1 = W * (port ? 0.95 : 0.61);
  /** punto sobre la cubierta: fx de izquierda a derecha, fy del fondo al canto */
  const at = (px: number, py: number): [number, number] => {
    const a = xb0 + (xf0 - xb0) * py;
    const b = xb1 + (xf1 - xb1) * py;
    return [a + (b - a) * px, yb + (yf - yb) * py];
  };
  const s = u * (port ? 0.055 : 0.075);
  const mug = at(0.21, 0.55);
  const spy = at(0.82, 0.5);
  const lamp: [number, number] = [port ? W * 0.5 : win.x0 + pw + post / 2, win.y0 + u * 0.17];
  return { u, post, panes, pw, yb, yf, xb0, xb1, xf0, xf1, at, s, mug, spy, lamp };
}

export function layout(W: number, H: number) {
  const { s, mug, spy, lamp } = furniture(W, H);
  return {
    mug: { x: mug[0] - s * 0.8, y: mug[1] - s * 1.7, w: s * 1.9, h: s * 2 },
    spy: { x: spy[0] - s * 1.1, y: spy[1] - s * 1.6, w: s * 2.2, h: s * 2 },
    lamp: { x: lamp[0] - s * 1.2, y: lamp[1] - s * 0.9, w: s * 2.4, h: s * 1.8 },
  };
}

type Thing = { z: number; draw: () => void };

export function draw(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, env: Env) {
  const V = view(W, H);
  const { win, hz } = V;
  const day = env.daylight;
  const night = day < 0.3;
  const lit = 0.3 + 0.7 * day;
  const cx = W / 2;
  // prismáticos: todo se acerca y se cierra la máscara de los dos lentes
  {
    const dt = Math.min(0.1, Math.max(0, t - fx.last));
    fx.last = t;
    const step = env.still ? 1 : dt / 0.45;
    fx.sp = fx.spy > fx.sp ? Math.min(fx.spy, fx.sp + step) : Math.max(fx.spy, fx.sp - step);
  }
  const sp = smooth(fx.sp);
  ctx.save();
  if (sp > 0) {
    // en vertical el poste queda al centro: se apunta al medio del paño izquierdo
    const zx = V.port ? win.x0 + (win.x1 - win.x0) * 0.2 : W / 2;
    const zy = hz + (win.y1 - win.y0) * 0.14;
    const z = 1 + 1.9 * sp;
    ctx.translate(zx, zy);
    ctx.scale(z, z);
    ctx.translate(-zx, -zy);
  }
  const cam = env.still ? TOWN_X + 0.1 : t * SPEED;
  // proyección: el suelo a z km queda a A/z bajo el horizonte; F es la escala a 1 km
  const A = (win.y1 - hz) * ROWS[0];
  const F = A / 0.15; // el suelo queda a 150 m
  const Y = (z: number) => hz + A / z;
  /** x de pantalla de un punto a dx km hacia el oeste (adelante = izquierda) */
  const X = (dx: number, z: number) => cx - (dx * F) / z;
  const half = (z: number) => ((W / 2) * z) / F; // medio ancho visible a esa distancia
  /** tinte de lejanía: lo lejano se aclara y se va a la bruma */
  const far = (l: number, z: number, a = 0) => {
    const f = Math.min(1, z / 10);
    return g((l * (1 - 0.5 * f) + 0.3 * f) * lit, a * (1 - f) * day, f * 0.7);
  };
  /** distancia en x, por el camino corto del bucle */
  const rel = (wx: number) => mod(wx - cam + PERIOD / 2, PERIOD) - PERIOD / 2;

  // ── Lejos: lomas en la bruma, más altas hacia el este (la cordillera queda atrás) ──
  ctx.fillStyle = g(0.3 * lit, 0, 0.75);
  ctx.beginPath();
  ctx.moveTo(0, hz + 1);
  for (let x = 0; x <= W; x += 2) {
    const u = x / W;
    ctx.lineTo(x, hz - (fbm(u * 3 - cam * 0.012 + 4, 5.1) * 0.035 + Math.pow(u, 3) * 0.05) * H);
  }
  ctx.lineTo(W, hz + 1);
  ctx.fill();
  ctx.fillStyle = far(0.4, 20);
  ctx.fillRect(0, hz, W, H - hz);

  // ── Potreros: un damero en perspectiva ──
  const things: Thing[] = [];
  const dark = (z: number) => far(0.05, z);
  for (let r = ROWS.length - 2; r >= 0; r--) {
    const z0 = ROWS[r];
    const z1 = ROWS[r + 1];
    const w = WIDTH[r];
    const n = PERIOD / w;
    const y0 = Y(z0);
    const y1 = Y(z1);
    const span = half(z1) + w;
    for (let i = Math.floor((cam - span) / w); i <= Math.floor((cam + span) / w); i++) {
      const id = mod(i, n);
      const k = hash(id, r * 7.3 + 1);
      const k2 = hash(id + 31, r * 3.1 + 5);
      const dxa = i * w - cam;
      const dxb = dxa + w;
      // verdes oscuros, praderas claras y rastrojos ocres
      const lum = k < 0.22 ? 0.14 : k < 0.5 ? 0.3 : k < 0.75 ? 0.46 : k < 0.9 ? 0.6 : 0.36;
      ctx.fillStyle = far(lum, (z0 + z1) / 2, k >= 0.8 && k < 0.9 ? 0.16 : 0);
      ctx.beginPath();
      ctx.moveTo(X(dxa, z0), y0);
      ctx.lineTo(X(dxb, z0), y0);
      ctx.lineTo(X(dxb, z1), y1);
      ctx.lineTo(X(dxa, z1), y1);
      ctx.fill();
      if (r < 5 && k2 < 0.35) {
        // surcos
        ctx.strokeStyle = far(lum * 0.55, z0);
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        for (let q = 1; q < 6; q++) {
          const zz = z0 + ((z1 - z0) * q) / 6;
          ctx.moveTo(X(dxa, zz), Y(zz));
          ctx.lineTo(X(dxb, zz), Y(zz));
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      if (r >= 2 && r <= 6 && k2 > 0.88) {
        // riego de pivote: el círculo verde con su brazo
        const zc = (z0 + z1) / 2;
        const rr = Math.min(w, z1 - z0) * 0.42;
        const px = X(dxa + w / 2, zc);
        const py = Y(zc);
        const rx = (rr * F) / zc;
        const ry = (Y(zc - rr) - Y(zc + rr)) / 2;
        ctx.fillStyle = far(lum > 0.3 ? 0.12 : 0.5, zc);
        ctx.beginPath();
        ctx.ellipse(px, py, rx, Math.max(1, ry), 0, 0, 7);
        ctx.fill();
        ctx.strokeStyle = far(0.6, zc);
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + rx * Math.cos(id * 1.7), py + ry * Math.sin(id * 1.7));
        ctx.stroke();
      }
      // deslindes con alameda o cortina de cipreses
      if (r < 8 && k2 > 0.4) {
        const th = Math.max(1, (0.012 * TALL * F) / z1);
        things.push({
          z: z1,
          draw: () => {
            ctx.fillStyle = dark(z1);
            const xa = X(dxb, z1);
            const xb = X(dxa, z1);
            if (th < 3) ctx.fillRect(xa, y1 - th, xb - xa, th + 1);
            else
              for (let x = Math.floor(xa); x < xb; x += 2) {
                const hh = th * (0.6 + 0.4 * hash(Math.floor((x - xa) / 2) + id * 13, r));
                ctx.fillRect(x, Math.round(y1 - hh), 2, Math.round(hh) + 1);
              }
          },
        });
      }
      // casa de campo con su árbol
      if (r >= 1 && r < 6 && k > 0.62 && k2 < 0.5) {
        const zc = z0 + (z1 - z0) * (0.3 + 0.4 * k2);
        things.push({ z: zc, draw: () => house(dxa + w * (0.2 + 0.6 * k), zc, 0.012 + 0.008 * k2, true) });
      }
    }
  }

  // ── Río Cato: serpentea a media distancia; el agua refleja el cielo ──
  const river = (dx: number) => {
    const wx = dx + cam;
    return 2.75 + 0.42 * Math.sin((wx / PERIOD) * Math.PI * 4) + 0.2 * Math.sin((wx / PERIOD) * Math.PI * 10 + 1);
  };
  const strip = (zOf: (dx: number) => number, wide: number) => {
    ctx.beginPath();
    const pts: [number, number][] = [];
    for (let x = -4; x <= W + 4; x += 4) {
      // aproximación: la distancia del río cambia poco de un paso al siguiente
      let dx = ((cx - x) * 2.75) / F;
      const z = zOf(dx);
      dx = ((cx - x) * z) / F;
      pts.push([x, zOf(dx)]);
    }
    pts.forEach(([x, z], i) => (i ? ctx.lineTo(x, Y(z + wide)) : ctx.moveTo(x, Y(z + wide))));
    for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(pts[i][0], Y(pts[i][1] - wide) + 1);
    ctx.closePath();
  };
  ctx.fillStyle = dark(2.7); // bosque de ribera
  strip(river, 0.17);
  ctx.fill();
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  strip(river, 0.05);
  ctx.fill();
  ctx.restore();
  // el Ñuble, ancho y pedregoso, casi en el horizonte
  ctx.fillStyle = g(0.6 * lit, 0, 0.6);
  strip((dx) => 9 + 0.9 * Math.sin(((dx + cam) / PERIOD) * Math.PI * 2 + 2), 1.1);
  ctx.fill();

  // ── Cosas con altura ──
  /** rectángulo parado en el suelo: dx, z, ancho y alto en km */
  const box = (dx: number, z: number, w: number, h: number, fill: string | CanvasGradient) => {
    const x = X(dx, z);
    const pw = Math.max(1, (w * F) / z);
    const ph = Math.max(1, (h * TALL * F) / z);
    ctx.fillStyle = fill;
    ctx.fillRect(Math.round(x - pw), Math.round(Y(z) - ph), Math.round(pw), Math.round(ph) + 1);
    return { x: Math.round(x - pw), y: Math.round(Y(z) - ph), w: Math.round(pw), h: Math.round(ph) };
  };
  const blobTree = (dx: number, z: number, h: number) => {
    const x = X(dx, z);
    const r = (h * TALL * F) / z / 2;
    ctx.fillStyle = dark(z);
    ctx.beginPath();
    ctx.ellipse(x, Y(z) - r, r * 0.8, r, 0, 0, 7);
    ctx.fill();
  };
  function house(dx: number, z: number, h: number, tree: boolean) {
    const b = box(dx, z, h * 2.2, h, far(0.75, z));
    ctx.fillStyle = far(0.06, z);
    ctx.fillRect(b.x - 1, b.y - Math.max(1, Math.round(b.h * 0.5)), b.w + 2, Math.max(1, Math.round(b.h * 0.5)));
    if (night && b.w > 2) {
      ctx.fillStyle = g(0.9, 1);
      ctx.fillRect(b.x + Math.round(b.w * 0.5), b.y + Math.round(b.h * 0.4), Math.max(1, Math.round(b.w * 0.2)), Math.max(1, Math.round(b.h * 0.4)));
    }
    if (tree) blobTree(dx + h * 2.4, z + 0.01, h * 1.6);
  }
  const lattice = (dx: number, z: number, w: number, h: number, c: string) => {
    const x = X(dx, z);
    const pw = Math.max(1.5, (w * F) / z);
    const ph = (h * TALL * F) / z;
    const y = Y(z);
    ctx.strokeStyle = c;
    ctx.lineWidth = 1;
    ctx.beginPath();
    const N = Math.max(2, Math.round(ph / (pw * 2.2)));
    for (let i = 0; i < N; i++) {
      const ya = y - (ph * i) / N;
      const yb = y - (ph * (i + 1)) / N;
      ctx.moveTo(x - pw, ya);
      ctx.lineTo(x + pw, yb);
      ctx.moveTo(x + pw, ya);
      ctx.lineTo(x - pw, yb);
    }
    ctx.moveTo(x - pw, y);
    ctx.lineTo(x - pw, y - ph);
    ctx.moveTo(x + pw, y);
    ctx.lineTo(x + pw, y - ph);
    ctx.stroke();
    return { x, top: y - ph, pw };
  };

  // el pueblo: silo, copa de agua, las antenas y un puñado de casas
  {
    const d = rel(TOWN_X);
    const z = 0.64;
    if (Math.abs(d) < half(z) + 0.6) {
      things.push({
        z,
        draw: () => {
          for (let i = 0; i < 16; i++) blobTree(d - 0.42 + i * 0.022, z + 0.09, 0.022 + 0.008 * hash(i, 3));
          for (const [ox, oz, hh] of [[-0.3, 0.05, 0.011], [-0.2, -0.03, 0.012], [-0.08, 0.04, 0.01], [0.13, 0.02, 0.012], [0.25, -0.04, 0.011], [0.34, 0.05, 0.01]]) house(d + ox, z + oz, hh, ox > 0);
          // antenas rojiblancas con baliza
          for (const [ox, hh] of [[0.2, 0.075], [0.17, 0.06]]) {
            const m = lattice(d + ox, z + 0.03, 0.004, hh, far(0.8, z));
            if (Math.sin(t * 2.2 + hh * 40) > -0.2) {
              ctx.fillStyle = g(1, 1);
              ctx.fillRect(Math.round(m.x) - 1, Math.round(m.top) - 1, 2, 2);
            }
          }
          // copa de agua
          const wt = lattice(d - 0.13, z, 0.006, 0.032, far(0.6, z));
          ctx.fillStyle = far(0.7, z);
          ctx.fillRect(Math.round(wt.x - wt.pw - 1), Math.round(wt.top - wt.pw * 1.6), Math.round(wt.pw * 2 + 2), Math.round(wt.pw * 1.6));
          // el silo viejo
          const x = X(d, z);
          const sw = Math.max(3, (0.017 * F) / z);
          const sh = (0.05 * TALL * F) / z;
          const y = Y(z);
          const body = ctx.createLinearGradient(x - sw, 0, x, 0);
          body.addColorStop(0, far(0.25, z));
          body.addColorStop(0.5, far(0.65, z));
          body.addColorStop(1, far(0.95, z)); // el sol pega desde el norte-oeste
          ctx.fillStyle = body;
          ctx.fillRect(Math.round(x - sw), Math.round(y - sh), Math.round(sw), Math.round(sh) + 1);
          ctx.fillStyle = far(0.12, z);
          ctx.globalAlpha = 0.5;
          for (let i = 1; i < 7; i++) ctx.fillRect(Math.round(x - sw), Math.round(y - (sh * i) / 7), Math.round(sw), 1);
          ctx.globalAlpha = 1;
          const cap = Math.max(2, sh * 0.13);
          ctx.fillStyle = far(0.5, z);
          ctx.fillRect(Math.round(x - sw) - 1, Math.round(y - sh - cap), Math.round(sw) + 2, Math.round(cap));
          ctx.fillStyle = far(0.1, z);
          ctx.beginPath();
          ctx.moveTo(x - sw - 2, y - sh - cap);
          ctx.lineTo(x - sw / 2, y - sh - cap - Math.max(2, sh * 0.08));
          ctx.lineTo(x + 2, y - sh - cap);
          ctx.fill();
        },
      });
    }
  }
  // aeródromo: la pista clara, un hangar y la manga de viento
  {
    const d = rel(FIELD_X);
    const z = 1.85;
    if (Math.abs(d) < half(z) + 1) {
      things.push({
        z,
        draw: () => {
          ctx.fillStyle = far(0.7, z);
          ctx.beginPath();
          ctx.moveTo(X(d - 0.55, z + 0.02), Y(z + 0.02));
          ctx.lineTo(X(d + 0.55, z + 0.02), Y(z + 0.02));
          ctx.lineTo(X(d + 0.55, z - 0.04), Y(z - 0.04));
          ctx.lineTo(X(d - 0.55, z - 0.04), Y(z - 0.04));
          ctx.fill();
          const b = box(d + 0.3, z + 0.1, 0.07, 0.02, far(0.8, z));
          ctx.fillStyle = far(0.1, z);
          ctx.fillRect(b.x, b.y - 1, b.w, 2);
          box(d - 0.2, z + 0.06, 0.002, 0.02, far(0.1, z));
          ctx.fillStyle = g(0.9, 1);
          ctx.fillRect(Math.round(X(d - 0.2, z + 0.06)), Math.round(Y(z + 0.06) - (0.02 * TALL * F) / z), 3, 2);
        },
      });
    }
  }
  things.sort((a, b) => b.z - a.z);
  for (const th of things) th.draw();

  // ── El camino a Coihueco, casi debajo: línea amarilla, postes y cables ──
  {
    const [za, zb] = ROAD;
    ctx.fillStyle = g(0.04);
    ctx.fillRect(0, Y(zb) - 1, W, Y(za) - Y(zb) + 3);
    ctx.fillStyle = g(0.4 * lit);
    ctx.fillRect(0, Y(zb), W, Y(za) - Y(zb));
    const zm = (za + zb) / 2;
    ctx.fillStyle = g(0.9 * lit, 0.8);
    const dash = 0.03;
    const R = half(zm) + dash;
    for (let i = Math.floor((cam - R) / dash); i <= (cam + R) / dash; i++) {
      const xa = X(i * dash - cam + dash * 0.55, zm);
      ctx.fillRect(Math.round(xa), Math.round(Y(zm)), Math.max(2, Math.round((dash * 0.55 * F) / zm)), 1);
    }
    // postación por la orilla norte
    const gap = 0.075;
    const zp = zb + 0.012;
    const ph = (0.011 * TALL * F) / zp;
    const yb = Y(zp);
    ctx.strokeStyle = g(0.05);
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    const R2 = half(zp) + gap;
    for (let i = Math.floor((cam - R2) / gap); i <= (cam + R2) / gap; i++) {
      const xa = X(i * gap - cam, zp);
      const xb = X((i + 1) * gap - cam, zp);
      ctx.moveTo(xa, yb - ph * 0.92);
      ctx.quadraticCurveTo((xa + xb) / 2, yb - ph * 0.7, xb, yb - ph * 0.92);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
    for (let i = Math.floor((cam - R2) / gap); i <= (cam + R2) / gap; i++) {
      const x = Math.round(X(i * gap - cam, zp));
      ctx.fillStyle = g(0.05);
      ctx.fillRect(x, Math.round(yb - ph), 2, Math.round(ph));
      ctx.fillRect(x - 3, Math.round(yb - ph * 0.92), 8, 1);
      ctx.fillStyle = g(0.7 * lit);
      ctx.fillRect(x, Math.round(yb - ph), 1, Math.round(ph));
    }
    // cerco del potrero por la orilla sur
    const zf = za - 0.02;
    const fgap = 0.012;
    const R3 = half(zf) + fgap;
    const fh = Math.max(3, (0.0035 * TALL * F) / zf);
    ctx.fillStyle = g(0.5 * lit);
    ctx.globalAlpha = 0.6;
    ctx.fillRect(0, Math.round(Y(zf) - fh * 0.7), W, 1);
    ctx.globalAlpha = 1;
    ctx.fillStyle = g(0.75 * lit);
    for (let i = Math.floor((cam - R3) / fgap); i <= (cam + R3) / fgap; i++) ctx.fillRect(Math.round(X(i * fgap - cam, zf)), Math.round(Y(zf) - fh), 1, Math.round(fh));
  }

  if (env.rain > 0) rain(ctx, W, win.y1, t, env.rain * 1.4);

  // ── La góndola del motor de estribor, colgando hacia popa ──
  {
    const u = win.y1 - win.y0;
    const ex = win.x1 - u * (V.port ? 0.17 : 0.24);
    const ey = win.y0 + u * 0.22;
    const el = u * (V.port ? 0.13 : 0.17);
    ctx.strokeStyle = g(0.12);
    ctx.lineWidth = Math.max(2, u * 0.008);
    ctx.beginPath();
    for (const o of [-0.55, 0.35]) {
      ctx.moveTo(ex + el * o, ey);
      ctx.lineTo(ex + el * (o + 0.25), win.y0 - 2);
    }
    ctx.stroke();
    ctx.lineWidth = 1;
    const th = el * 0.26;
    const pod = ctx.createLinearGradient(0, ey - th, 0, ey + th);
    pod.addColorStop(0, g(0.9 * lit));
    pod.addColorStop(0.3, g(0.55 * lit));
    pod.addColorStop(0.7, g(0.15 * lit));
    pod.addColorStop(1, g(0.03));
    ctx.fillStyle = pod;
    // gota: nariz roma a proa (izquierda), cola afinada hacia la hélice
    ctx.beginPath();
    ctx.moveTo(ex - el, ey);
    ctx.bezierCurveTo(ex - el, ey - th * 1.3, ex - el * 0.1, ey - th * 1.15, ex + el, ey - th * 0.2);
    ctx.lineTo(ex + el, ey + th * 0.2);
    ctx.bezierCurveTo(ex - el * 0.1, ey + th * 1.15, ex - el, ey + th * 1.3, ex - el, ey);
    ctx.fill();
    ctx.fillStyle = g(0.03);
    for (let i = 0; i < 3; i++) ctx.fillRect(Math.round(ex - el * 0.6 + i * el * 0.22), Math.round(ey - th * 0.25), Math.max(2, Math.round(el * 0.1)), Math.max(2, Math.round(th * 0.35)));
    ctx.fillRect(Math.round(ex - el * 0.8), Math.round(ey + th * 0.45), Math.round(el * 1.3), 1);
    // la hélice, a popa: un disco borroso con las palas pasando
    const hx = ex + el * 1.02;
    ctx.fillStyle = g(0.5);
    ctx.fillRect(Math.round(hx - 1), Math.round(ey - el * 0.06), 3, Math.max(2, Math.round(el * 0.12)));
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = g(0.9 * lit);
    ctx.beginPath();
    ctx.ellipse(hx + 2, ey, el * 0.06, el * 0.62, 0, 0, 7);
    ctx.fill();
    ctx.globalAlpha = 1;
    if (!env.still) {
      const a = t * 31;
      ctx.strokeStyle = g(0.1);
      ctx.beginPath();
      ctx.moveTo(hx + 1, ey - Math.sin(a) * el * 0.62);
      ctx.lineTo(hx + 1, ey + Math.sin(a) * el * 0.62);
      ctx.stroke();
    }
  }

  // ── El costado de la cabina: todo menos los tres paños del ventanal ──
  const M = furniture(W, H);
  const { u, post, panes, pw } = M;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  for (let i = 0; i < panes; i++) ctx.rect(win.x0 + i * (pw + post), win.y0, pw, u);
  ctx.clip('evenodd');
  const wall = ctx.createLinearGradient(0, 0, 0, H);
  wall.addColorStop(0, g(0.03));
  wall.addColorStop(win.y0 / H, g(0.1 + 0.05 * day));
  wall.addColorStop(win.y1 / H, g(0.12 + 0.06 * day));
  wall.addColorStop(1, g(0.02));
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, W, H);
  if (night) {
    // la lámpara de la cabina alcanza el marco
    const glow = ctx.createRadialGradient(W * 0.2, win.y0, 1, W * 0.2, win.y0, u * 1.3);
    glow.addColorStop(0, 'rgba(180,255,0,0.4)');
    glow.addColorStop(1, 'rgba(60,130,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
  }
  // marcos: canto con luz abajo y a la izquierda, sombra al otro lado
  for (let i = 0; i < panes; i++) {
    const x = Math.round(win.x0 + i * (pw + post));
    const y = Math.round(win.y0);
    const w = Math.round(pw);
    const h = Math.round(u);
    ctx.fillStyle = g(0);
    ctx.fillRect(x - 3, y - 3, w + 6, 3);
    ctx.fillRect(x + w, y - 3, 3, h + 6);
    ctx.fillStyle = g(0.5 + 0.4 * day);
    ctx.fillRect(x - 3, y + h, w + 6, 2);
    ctx.fillStyle = g(0.35 + 0.2 * day);
    ctx.fillRect(x - 2, y, 2, h);
  }
  // remaches del larguero bajo y pasamanos
  ctx.fillStyle = g(0.5);
  for (let x = 8; x < W; x += Math.max(10, Math.round(W / 46))) ctx.fillRect(x, Math.round(win.y1 + u * 0.06), 1, 1);
  const ry = Math.round(win.y1 + u * 0.13);
  ctx.fillStyle = g(0);
  ctx.fillRect(0, ry + 2, W, 2);
  ctx.fillStyle = g(0.6 + 0.3 * day);
  ctx.fillRect(0, ry, W, 2);
  ctx.fillStyle = g(0.3);
  for (let i = 0; i <= 6; i++) ctx.fillRect(Math.round((W * (i + 0.5)) / 7), ry, 3, Math.round(u * 0.05));
  // cuadernas verticales bajo el ventanal
  ctx.fillStyle = g(0.22);
  for (let i = 0; i <= panes; i++) ctx.fillRect(Math.round(win.x0 + i * (pw + post) - post / 2), Math.round(win.y1 + 2), 1, H);
  ctx.restore();

  // ── La mesita plegable y sus cosas ──
  const lampOn = fx.lamp ?? night;
  const now = performance.now() / 1000;
  const poly = (pts: [number, number][]) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
  };
  {
    const { yb, yf, xb0, xb1, xf0, xf1, at, s } = M;
    const lip = Math.max(3, Math.round(u * 0.022));
    // sombra bajo la mesa
    ctx.fillStyle = g(0);
    ctx.globalAlpha = 0.7;
    ctx.fillRect(xf0 + lip, yf, xf1 - xf0, H - yf);
    ctx.globalAlpha = 1;
    const top = ctx.createLinearGradient(0, yb, 0, yf);
    top.addColorStop(0, g(0.3 * lit + 0.05));
    top.addColorStop(1, g(0.62 * lit + 0.08));
    ctx.fillStyle = top;
    poly([[xb0, yb], [xb1, yb], [xf1, yf], [xf0, yf]]);
    ctx.fill();
    // tablas
    ctx.strokeStyle = g(0.05);
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    for (const q of [0.25, 0.5, 0.75]) {
      ctx.moveTo(...at(q, 0));
      ctx.lineTo(...at(q, 1));
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
    if (lampOn) {
      // charco de luz de la lámpara
      ctx.save();
      poly([[xb0, yb], [xb1, yb], [xf1, yf], [xf0, yf]]);
      ctx.clip();
      const [lx] = M.lamp;
      const pool = ctx.createRadialGradient(lx, (yb + yf) / 2, 1, lx, (yb + yf) / 2, u * 0.55);
      pool.addColorStop(0, `rgba(255,255,0,${night ? 0.6 : 0.35})`);
      pool.addColorStop(1, 'rgba(120,160,0,0)');
      ctx.fillStyle = pool;
      ctx.fillRect(0, yb, W, yf - yb);
      ctx.restore();
    }
    // canto del frente
    ctx.fillStyle = g(0.05);
    ctx.fillRect(Math.round(xf0), Math.round(yf), Math.round(xf1 - xf0), lip);
    ctx.fillStyle = g(0.9 * lit + 0.05);
    ctx.fillRect(Math.round(xf0), Math.round(yf), Math.round(xf1 - xf0), 1);
    ctx.fillStyle = g(0);
    ctx.fillRect(Math.round(xb0), Math.round(yb) - 1, Math.round(xb1 - xb0), 1);

    // carta de ruta: el camino a Chillán marcado a lápiz
    {
      const c = [at(0.36, 0.2), at(0.68, 0.14), at(0.7, 0.86), at(0.34, 0.92)] as [number, number][];
      ctx.fillStyle = g(0);
      ctx.globalAlpha = 0.5;
      poly(c.map(([x, y]) => [x + 2, y + 2] as [number, number]));
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = g(lampOn && night ? 0.7 : 0.85 * lit + 0.12, lampOn && night ? 0.2 : 0);
      poly(c);
      ctx.fill();
      ctx.strokeStyle = g(0.3);
      ctx.globalAlpha = 0.45;
      ctx.beginPath();
      for (const q of [0.33, 0.66]) {
        ctx.moveTo(...at(0.36 + 0.33 * q, 0.18));
        ctx.lineTo(...at(0.34 + 0.36 * q, 0.9));
        ctx.moveTo(...at(0.36, 0.2 + 0.7 * q));
        ctx.lineTo(...at(0.69, 0.16 + 0.7 * q));
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = g(0.5, 1);
      ctx.setLineDash([3, 2]);
      ctx.beginPath();
      ctx.moveTo(...at(0.64, 0.3));
      ctx.lineTo(...at(0.56, 0.42));
      ctx.lineTo(...at(0.5, 0.4));
      ctx.lineTo(...at(0.41, 0.7));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = g(0.05);
      for (const q of [at(0.64, 0.3), at(0.41, 0.7)]) ctx.fillRect(Math.round(q[0]) - 1, Math.round(q[1]) - 1, 3, 3);
      // lápiz
      const [ax, ay] = at(0.6, 0.62);
      const [bx, by] = at(0.74, 0.78);
      ctx.strokeStyle = g(0.9, 0.9);
      ctx.lineWidth = Math.max(2, s * 0.09);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.fillStyle = g(0.05);
      ctx.fillRect(Math.round(ax) - 1, Math.round(ay) - 1, 2, 2);
    }

    // termo
    {
      const [x, y] = at(0.08, 0.38);
      const w = s * 0.55;
      const h = s * 1.9;
      ctx.fillStyle = g(0);
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.ellipse(x + w * 0.5, y, w * 1.1, s * 0.16, 0, 0, 7);
      ctx.fill();
      ctx.globalAlpha = 1;
      const body = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
      body.addColorStop(0, g(0.75 * lit + 0.1));
      body.addColorStop(0.35, g(0.3 * lit + 0.05));
      body.addColorStop(1, g(0.03));
      ctx.fillStyle = body;
      ctx.fillRect(Math.round(x - w / 2), Math.round(y - h), Math.round(w), Math.round(h));
      ctx.fillStyle = g(0.9 * lit + 0.08);
      ctx.fillRect(Math.round(x - w * 0.4), Math.round(y - h - s * 0.3), Math.round(w * 0.8), Math.round(s * 0.3));
      ctx.fillStyle = g(0.6, 0.8);
      ctx.fillRect(Math.round(x - w / 2), Math.round(y - h * 0.72), Math.round(w), Math.max(1, Math.round(s * 0.08)));
    }

    // jarro enlozado, con su vapor
    {
      const k = (now - fx.sip) / 1.3;
      const lift = k > 0 && k < 1 ? Math.sin(k * Math.PI) : 0;
      const [x0, y0] = M.mug;
      const x = x0 + lift * s * 0.5;
      const y = y0 - lift * s * 1.6;
      const w = s * 0.85;
      const h = s * 0.8;
      ctx.fillStyle = g(0);
      ctx.globalAlpha = 0.5 * (1 - lift);
      ctx.beginPath();
      ctx.ellipse(x0 + w * 0.3, y0, w * 0.8, s * 0.16, 0, 0, 7);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = g(0.85 * lit + 0.1);
      ctx.lineWidth = Math.max(2, s * 0.12);
      ctx.beginPath();
      ctx.arc(x + w * 0.5, y - h * 0.5, h * 0.3, -1.3, 1.3);
      ctx.stroke();
      ctx.lineWidth = 1;
      const body = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
      body.addColorStop(0, g(0.95 * lit + 0.05));
      body.addColorStop(0.6, g(0.6 * lit + 0.05));
      body.addColorStop(1, g(0.2 * lit));
      ctx.fillStyle = body;
      ctx.fillRect(Math.round(x - w / 2), Math.round(y - h), Math.round(w), Math.round(h));
      ctx.fillStyle = g(0.04);
      ctx.fillRect(Math.round(x - w / 2), Math.round(y - h), Math.round(w), Math.max(2, Math.round(s * 0.12)));
      ctx.fillRect(Math.round(x - w / 2), Math.round(y) - 1, Math.round(w), 1);
      if (!lift && !env.still) {
        ctx.fillStyle = g(0.95, 0, 0.5);
        for (let i = 0; i < 3; i++)
          for (let q = 0; q < 9; q++) {
            const r = (q + ((t * 4 + i * 3) % 9)) / 9; // 0 al salir, 1 arriba
            if ((q + i) % 2 && r > 0.5) continue;
            const px = x + (i - 1) * w * 0.22 + Math.sin(r * 5 + t * 1.3 + i * 2) * s * 0.18 * (0.3 + r);
            ctx.fillRect(Math.round(px), Math.round(y - h - r * s * 1.5), 1, 1);
          }
      }
    }

    // prismáticos (si no están en la mano)
    if (!fx.spy) {
      const [x, y] = M.spy;
      const w = s * 0.5;
      const h = s * 1.15;
      ctx.strokeStyle = g(0.04);
      ctx.lineWidth = Math.max(1, s * 0.06);
      ctx.beginPath();
      ctx.moveTo(x - w * 1.1, y - h * 0.5);
      ctx.bezierCurveTo(x - w * 4, y + s * 0.5, x + w * 3.5, y + s * 0.75, x + w * 1.1, y - h * 0.4);
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.fillStyle = g(0);
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.ellipse(x + w * 0.4, y, w * 2, s * 0.16, 0, 0, 7);
      ctx.fill();
      ctx.globalAlpha = 1;
      for (const o of [-0.62, 0.62]) {
        const bx = x + o * w;
        ctx.fillStyle = g(0.05);
        ctx.fillRect(Math.round(bx - w / 2), Math.round(y - h), Math.round(w), Math.round(h));
        ctx.fillRect(Math.round(bx - w * 0.62), Math.round(y - h * 0.38), Math.round(w * 1.24), Math.round(h * 0.38));
        ctx.fillStyle = g(0.6 * lit + 0.15);
        ctx.fillRect(Math.round(bx - w / 2), Math.round(y - h), 1, Math.round(h));
        ctx.fillStyle = g(0.5 * lit + 0.2, 0, 0.7);
        ctx.fillRect(Math.round(bx - w / 2), Math.round(y - h), Math.round(w), Math.max(2, Math.round(s * 0.12)));
      }
      ctx.fillStyle = g(0.3);
      ctx.fillRect(Math.round(x - w * 0.15), Math.round(y - h * 0.75), Math.round(w * 0.3), Math.round(h * 0.3));
    }
  }

  // ── Lámpara colgante sobre la mesa ──
  {
    const s = M.s;
    const [lx0, ly] = M.lamp;
    const lx = lx0 + (env.still ? 0 : Math.sin(t * 0.7) * s * 0.06);
    ctx.fillStyle = g(0.02);
    ctx.fillRect(Math.round(lx0), 0, 1, Math.round(ly - s * 0.45));
    const shade = ctx.createLinearGradient(lx - s * 0.8, 0, lx + s * 0.8, 0);
    shade.addColorStop(0, g(0.75 * lit + 0.1));
    shade.addColorStop(0.5, g(0.3 * lit + 0.05));
    shade.addColorStop(1, g(0.04));
    ctx.fillStyle = shade;
    poly([[lx - s * 0.22, ly - s * 0.5], [lx + s * 0.22, ly - s * 0.5], [lx + s * 0.8, ly + s * 0.12], [lx - s * 0.8, ly + s * 0.12]]);
    ctx.fill();
    ctx.fillStyle = g(0.02);
    ctx.fillRect(Math.round(lx - s * 0.8), Math.round(ly + s * 0.12), Math.round(s * 1.6), 1);
    ctx.fillStyle = lampOn ? g(1, 1) : g(0.35);
    ctx.beginPath();
    ctx.ellipse(lx, ly + s * 0.2, s * 0.2, s * 0.16, 0, 0, 7);
    ctx.fill();
    if (lampOn) {
      ctx.save();
      // la luz cae sobre el marco y la pared, no sobre el paisaje de afuera
      ctx.beginPath();
      ctx.rect(0, 0, W, H);
      for (let i = 0; i < panes; i++) ctx.rect(win.x0 + i * (pw + post), win.y0, pw, u);
      ctx.clip('evenodd');
      ctx.globalCompositeOperation = 'source-atop';
      const glow = ctx.createRadialGradient(lx, ly + s * 0.3, 1, lx, ly + s * 0.3, u * (night ? 0.42 : 0.22));
      glow.addColorStop(0, `rgba(255,255,0,${night ? 0.55 : 0.4})`);
      glow.addColorStop(1, 'rgba(120,160,0,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  }

  ctx.restore(); // fin del acercamiento
  if (sp > 0) {
    // máscara de los prismáticos: dos círculos que se cierran como un iris
    const rf = Math.min(W * (V.port ? 0.34 : 0.25), H * 0.4);
    const r = rf / Math.pow(Math.max(0.08, sp), 1.6);
    const half = r * (V.port ? 0.42 : 0.6);
    const cy = H * (V.port ? 0.4 : 0.52);
    const a = Math.acos(half / r);
    ctx.fillStyle = g(0);
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.arc(W / 2 - half, cy, r, a, Math.PI * 2 - a);
    ctx.arc(W / 2 + half, cy, r, Math.PI + a, Math.PI * 3 - a);
    ctx.closePath();
    ctx.fill('evenodd');
  }
}
