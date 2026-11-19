// Motor de dithering ordenado (Bayer 8×8), sin dependencias.
//
// Las escenas dibujan con Canvas 2D normal sobre un lienzo de baja resolución,
// pero no pintan colores: pintan *cantidades* por canal.
//   R = luz recibida (0 = tinta, 255 = plena luz)
//   G = emisión ámbar (luces encendidas)
//   B = bruma atmosférica (qué tanto se disuelve el objeto en el cielo)
//   A = sólido / hueco (un hueco deja ver el cielo)
// El pase final convierte cada píxel a un único color de la paleta de la hora,
// comparando esas cantidades contra la matriz de Bayer.

export type RGB = [number, number, number];

export interface Palette {
  zenith: RGB;
  horizon: RGB;
  ink: RGB;
  light: RGB;
  cloud: RGB;
  amber: RGB;
  stars: number;
}

export interface Sky {
  horizon: number; // y del horizonte, en píxeles internos
  cover: number; // nubosidad 0..1
  drift: number; // desplazamiento de las nubes
  sunX: number;
  sunY: number;
  sunR: number;
  glow: number;
}

// prettier-ignore
const BAYER = [
  0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26,
  12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22,
  3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25,
  15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21,
].map((v) => (v + 0.5) / 64);

const BAYER255 = BAYER.map((v) => v * 255);

// Curva de tono: las sombras caen a tinta plena y las luces a luz plena, para
// que el tramado quede en los medios tonos y no ensucie las zonas oscuras.
const TONE = new Uint8Array(256).map((_, i) => {
  let x = (i / 255 - 0.075) / 0.85;
  x = x < 0 ? 0 : x > 1 ? 1 : x;
  return Math.round(255 * (x * x * (3 - 2 * x) * 0.6 + x * 0.4));
});

export const g = (l: number, a = 0, hz = 0) =>
  `rgb(${Math.max(0, Math.min(255, l * 255)) | 0},${Math.max(0, Math.min(255, a * 255)) | 0},${Math.max(0, Math.min(255, hz * 255)) | 0})`;

const pack = (c: RGB) => (255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0];

function hash(x: number, y: number) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function vnoise(x: number, y: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export function fbm(x: number, y: number) {
  return vnoise(x, y) * 0.5 + vnoise(x * 2.03, y * 2.03) * 0.3 + vnoise(x * 4.1, y * 4.1) * 0.2;
}

export class Renderer {
  W = 0;
  H = 0;
  scale = 2;
  readonly ctx: CanvasRenderingContext2D;
  private readonly out: CanvasRenderingContext2D;
  private readonly scene: HTMLCanvasElement;
  private img!: ImageData;
  private px!: Uint32Array;
  private sky!: Uint8Array;
  private cloud!: Float32Array;
  private cw = 0;
  private ch = 0;
  private skyAge = 99;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.out = canvas.getContext('2d')!;
    this.scene = document.createElement('canvas');
    this.ctx = this.scene.getContext('2d', { willReadFrequently: true })!;
    this.resize();
  }

  resize() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    // Ancho interno objetivo: suficiente para que una nave conserve su detalle,
    // lo bastante bajo para que el punto del tramado se vea.
    const target = Math.max(340, Math.min(880, vw / 2));
    const dev = Math.max(1, Math.round((vw * dpr) / target));
    this.scale = dev / dpr;
    this.W = Math.ceil(vw / this.scale);
    this.H = Math.ceil(vh / this.scale);
    for (const c of [this.canvas, this.scene]) {
      c.width = this.W;
      c.height = this.H;
    }
    this.canvas.style.width = `${this.W * this.scale}px`;
    this.canvas.style.height = `${this.H * this.scale}px`;
    this.img = this.out.createImageData(this.W, this.H);
    this.px = new Uint32Array(this.img.data.buffer);
    this.sky = new Uint8Array(this.W * this.H);
    this.cw = Math.ceil(this.W / 4) + 2;
    this.ch = Math.ceil(this.H / 4) + 2;
    this.cloud = new Float32Array(this.cw * this.ch);
    this.skyAge = 99;
    this.ctx.imageSmoothingEnabled = false;
  }

  begin() {
    const c = this.ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
    c.clearRect(0, 0, this.W, this.H);
    c.imageSmoothingEnabled = false;
  }

  /** Cielo: índice de color por píxel (0 cenit, 1 horizonte, 2 nube, 3 luz). */
  private buildSky(s: Sky, stars: number) {
    const { W, H, cw, ch, cloud, sky } = this;
    const hz = Math.max(8, s.horizon);
    const thr = 0.74 - 0.5 * s.cover;
    for (let j = 0; j < ch; j++) {
      const y = j * 4;
      // las nubes se aplastan hacia el horizonte (perspectiva)
      const persp = 1 + 2.2 * Math.pow(Math.min(1, y / hz), 2);
      for (let i = 0; i < cw; i++) {
        const n = fbm((i * 4) * 0.0085 + s.drift, y * 0.021 * persp + 7.3);
        let d = (n - thr) / 0.22;
        d = d < 0 ? 0 : d > 1 ? 1 : d;
        cloud[j * cw + i] = d * d * (3 - 2 * d);
      }
    }
    const r2 = s.sunR * s.sunR;
    const gl = 2 * Math.pow(s.sunR * 5, 2);
    for (let y = 0; y < H; y++) {
      const v = y < hz ? Math.pow(y / hz, 2.6) * 0.97 : 0.97;
      const fy = y / 4;
      const j = fy | 0;
      const ty = fy - j;
      const row = y * W;
      const dy = y - s.sunY;
      for (let x = 0; x < W; x++) {
        const th = BAYER[((y & 7) << 3) | (x & 7)];
        let idx = v > th ? 1 : 0;
        const fx = x / 4;
        const i = fx | 0;
        const tx = fx - i;
        const k = j * cw + i;
        const d =
          (cloud[k] * (1 - tx) + cloud[k + 1] * tx) * (1 - ty) +
          (cloud[k + cw] * (1 - tx) + cloud[k + cw + 1] * tx) * ty;
        const th2 = BAYER[(((y + 3) & 7) << 3) | ((x + 5) & 7)];
        const dx = x - s.sunX;
        const d2 = dx * dx + dy * dy;
        if (d2 < r2) idx = 3;
        else if (s.glow * Math.exp(-d2 / gl) > th) idx = 2;
        if (d * 0.92 > th2) idx = d * 0.55 > th2 || idx === 3 ? 2 : idx === 0 ? 1 : 2;
        else if (stars > 0 && idx !== 3 && y < hz * 0.82 && hash(x, y) < 0.0026 * stars) idx = 3;
        sky[row + x] = idx;
      }
    }
  }

  /** Pase final: de cantidades por canal a color de paleta, tramado. */
  end(pal: Palette, s: Sky, fade: number) {
    if (++this.skyAge > 5) {
      this.buildSky(s, pal.stars);
      this.skyAge = 0;
    }
    const { W, H, px, sky } = this;
    const src = this.ctx.getImageData(0, 0, W, H).data;
    const cols = [pack(pal.zenith), pack(pal.horizon), pack(pal.cloud), pack(pal.light)];
    const ink = pack(pal.ink);
    const light = pack(pal.light);
    const amber = pack(pal.amber);
    const haze = cols[1];
    const f = fade * 255;
    for (let y = 0; y < H; y++) {
      const by = (y & 7) << 3;
      const by2 = ((y + 2) & 7) << 3;
      for (let x = 0; x < W; x++) {
        const p = y * W + x;
        const th = BAYER255[by | (x & 7)];
        if (f > th) {
          px[p] = ink;
          continue;
        }
        const i = p << 2;
        if (src[i + 3] < 128) px[p] = cols[sky[p]];
        else if (src[i + 2] > BAYER255[by2 | ((x + 4) & 7)]) px[p] = haze;
        else if (src[i + 1] > th) px[p] = amber;
        else px[p] = TONE[src[i]] > th ? light : ink;
      }
    }
    this.out.putImageData(this.img, 0, 0);
  }
}
