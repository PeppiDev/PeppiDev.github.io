// LZ 20 (Z V, 1913) — vista lateral.
// El casco se calcula como sólido de revolución facetado (los zepelines de
// preguerra eran prismas de 17 caras, no cilindros lisos): cada píxel tiene una
// normal real y recibe luz real. Recién después se trama.

import { g } from './dither';

/** Esbeltez del casco: eslora / diámetro. */
export const FINENESS = 9.5;
const SIDES = 17;

/** Radio relativo del casco a lo largo de la eslora (u: 0 proa → 1 popa). */
export function profile(u: number) {
  if (u <= 0 || u >= 1) return 0;
  if (u < 0.15) {
    const k = 1 - u / 0.15;
    return Math.pow(1 - k * k, 0.6);
  }
  if (u < 0.64) return 1;
  const k = (u - 0.64) / 0.36;
  return Math.pow(1 - Math.pow(k, 1.9), 0.8);
}

const cache = new Map<number, HTMLCanvasElement>();

function hull(L: number) {
  const hit = cache.get(L);
  if (hit) return hit;
  const R = L / FINENESS / 2;
  const h = Math.ceil(R * 2) + 2;
  const cv = document.createElement('canvas');
  cv.width = L;
  cv.height = h;
  const ctx = cv.getContext('2d')!;
  const img = ctx.createImageData(L, h);
  const cy = h / 2;
  // luz cenital, algo adelantada y hacia el observador
  const lx = -0.3;
  const ly = -0.74;
  const lz = 0.6;
  const delta = (Math.PI * 2) / SIDES;
  const ring = L / 18;
  for (let x = 0; x < L; x++) {
    const u = (x + 0.5) / L;
    const r = profile(u) * R;
    if (r < 0.5) continue;
    const slope = ((profile(u + 0.004) - profile(u - 0.004)) * R) / (0.008 * L);
    const onRing = (x + ring * 0.5) % ring < 1;
    for (let y = 0; y < h; y++) {
      const dy = y + 0.5 - cy;
      if (Math.abs(dy) > r) continue;
      const th = Math.asin(dy / r);
      const q = (Math.floor(th / delta) + 0.5) * delta;
      const edge = Math.abs(th / delta - Math.round(th / delta)) < 0.07 && R > 12;
      let nx = -slope;
      let ny = Math.sin(q);
      let nz = Math.cos(q);
      const n = Math.hypot(nx, ny, nz);
      nx /= n;
      ny /= n;
      nz /= n;
      let v = 0.1 + 0.9 * Math.max(0, nx * lx + ny * ly + nz * lz);
      v += 0.2 * Math.max(0, ny) * Math.max(0, ny); // rebote del suelo
      if (onRing) v *= 0.8;
      if (edge) v *= 0.86;
      const i = (y * L + x) * 4;
      img.data[i] = Math.min(255, v * 255);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  cache.set(L, cv);
  return cv;
}

/** Dibuja el LZ 20 centrado en (cx, cy) con eslora L, proa a la izquierda. */
export function drawLZ20(ctx: CanvasRenderingContext2D, cx: number, cy: number, L: number, t: number) {
  L = Math.round(L);
  const R = L / FINENESS / 2;
  const x0 = Math.round(cx - L / 2);
  const y0 = Math.round(cy);
  const X = (u: number) => x0 + u * L;
  const Y = (k: number) => y0 + k * R;
  const poly = (pts: [number, number][], fill: string) => {
    ctx.beginPath();
    pts.forEach(([u, k], i) => (i ? ctx.lineTo(X(u), Y(k)) : ctx.moveTo(X(u), Y(k))));
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  };
  const line = (u0: number, k0: number, u1: number, k1: number, c: string) => {
    ctx.strokeStyle = c;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(Math.round(X(u0)) + 0.5, Math.round(Y(k0)) + 0.5);
    ctx.lineTo(Math.round(X(u1)) + 0.5, Math.round(Y(k1)) + 0.5);
    ctx.stroke();
  };

  // Aletas estabilizadoras verticales (detrás del casco)
  poly([[0.77, -profile(0.77)], [0.9, -1.02], [0.945, -1.02], [0.945, -profile(0.945)]], g(0.62));
  poly([[0.77, profile(0.77)], [0.9, 1.02], [0.945, 1.02], [0.945, profile(0.945)]], g(0.2));

  // Quilla: pasarela triangular bajo el casco, entre las góndolas
  poly([[0.17, 0.96], [0.2, 1.14], [0.7, 1.14], [0.74, 0.86]], g(0.16));

  ctx.drawImage(hull(L), x0, Math.round(y0 - hull(L).height / 2));

  // Aleta horizontal vista de canto
  line(0.77, 0, 0.945, 0, g(0.95));

  // Timones de cajón a popa: planos de dirección (verticales) y de altura
  for (const s of [-1, 1]) {
    const c = s < 0 ? 0.78 : 0.34;
    for (const u of [0.953, 0.972]) {
      ctx.fillStyle = g(c);
      ctx.fillRect(Math.round(X(u)), Math.round(Y(s < 0 ? -1.0 : 0.3)), Math.max(1, Math.round(L * 0.012)), Math.round(R * 0.7));
    }
    line(0.948, s * 0.3, 0.988, s * 0.3, g(c));
    line(0.948, s * 1.0, 0.988, s * 1.0, g(c));
    line(0.948, s * 0.65, 0.988, s * 0.65, g(c * 0.8));
  }

  // Góndolas abiertas (proa y popa) con sus montantes
  for (const u of [0.27, 0.6]) {
    const w = 0.074;
    for (const d of [0.012, 0.037, 0.062]) line(u + d, 1.1, u + d, 1.42, g(0.3));
    line(u + 0.012, 1.42, u + 0.037, 1.1, g(0.22));
    line(u + 0.062, 1.42, u + 0.037, 1.1, g(0.22));
    const gx0 = X(u);
    const gx1 = X(u + w);
    const top = Y(1.4);
    const bot = Y(1.82);
    const grad = ctx.createLinearGradient(0, top, 0, bot);
    grad.addColorStop(0, g(0.7));
    grad.addColorStop(0.35, g(0.4));
    grad.addColorStop(1, g(0.1));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(gx0, top);
    ctx.lineTo(gx1, top);
    ctx.quadraticCurveTo(gx1 - (gx1 - gx0) * 0.08, bot, gx1 - (gx1 - gx0) * 0.3, bot);
    ctx.lineTo(gx0 + (gx1 - gx0) * 0.3, bot);
    ctx.quadraticCurveTo(gx0 + (gx1 - gx0) * 0.08, bot, gx0, top);
    ctx.fill();
    // luz de la góndola
    ctx.fillStyle = g(0.9, 1);
    ctx.fillRect(Math.round(X(u + w * 0.5)), Math.round(Y(1.5)), Math.max(1, Math.round(R * 0.1)), Math.max(1, Math.round(R * 0.1)));

    // Hélices en ménsulas al costado del casco, sobre cada góndola
    const pu = u + 0.045;
    line(pu - 0.012, 0.9, pu, 0.52, g(0.25));
    line(pu + 0.012, 0.9, pu, 0.52, g(0.25));
    line(pu, 0.52, pu, 1.42, g(0.18));
    const blade = 0.34 * (0.55 + 0.45 * Math.abs(Math.sin(t * 9 + u * 20)));
    line(pu, 0.52 - blade, pu, 0.52 + blade, g(1));
  }
}

/** Caja que ocupa la nave, para el área clickeable. */
export function boundsLZ20(cx: number, cy: number, L: number) {
  const R = L / FINENESS / 2;
  return { x: cx - L / 2, y: cy - R * 1.2, w: L, h: R * 3.2 };
}
