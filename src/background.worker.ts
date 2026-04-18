// Multi-Scale Turing Pattern — Jonathan McCabe (2010)
//
// Concurrent Turing instabilities at multiple spatial scales.
// Large scales carve broad regions; finer scales add nested labyrinthine
// channels and micro-texture within those regions.
//
// ─── HOW TO TUNE ─────────────────────────────────────────────────────────────
//
//  STEPS        — sim steps per frame. More = faster evolution, heavier CPU.
//  TARGET_CELLS — grid resolution. More cells = finer detail but slower.
//  WARMUP       — steps computed before first render (hides the noise phase).
//  CONTRAST     — sigmoid steepness:  4 = soft/organic,  9 = stark/poster.
//  BRIGHTNESS   — max pixel value (0–255). Lower = dimmer overall.
//
//  SCALE_DEFS rows: [activatorRadiusFrac, inhibitorRadiusFrac, variation]
//    activatorRadiusFrac — fraction of min(W,H). Smaller = finer pattern scale.
//    inhibitorRadiusFrac — must be larger than activator (typically 2×).
//    variation           — how aggressively this scale drives the field
//                          (higher = this scale's pattern forms faster/bolder).
//    Add or remove rows freely; at least 2 scales recommended.
//
// ─────────────────────────────────────────────────────────────────────────────

const STEPS        = 2;
const TARGET_CELLS = 250_000;
const WARMUP       = 0;
const CONTRAST     = 7.5;
const BRIGHTNESS   = 232;
const FRAME_MS     = 1000 / 60;

const SCALE_DEFS = [
  // [actFrac,  inhFrac,  variation]
  [0.185, 0.370, 0.016],   // scale 1 — broad sweeping regions
  [0.058, 0.116, 0.038],   // scale 2 — medium labyrinthine channels
  [0.018, 0.036, 0.034],   // scale 3 — fine detail
  [0.006, 0.012, 0.029],   // scale 4 — micro texture
  [0.002, 0.004, 0.021],   // scale 5 — finest grain
] as const;

// ─── State ───────────────────────────────────────────────────────────────────

let canvas: OffscreenCanvas;
let ctx: OffscreenCanvasRenderingContext2D;
let simCanvas: OffscreenCanvas;
let simCtx: OffscreenCanvasRenderingContext2D;

let grid:  Float32Array;
let temp:  Float32Array;
let activ: Float32Array[];
let inhib: Float32Array[];
let lut:   Uint8Array;

let scales: { actR: number; inhR: number; variation: number }[];

let img:  ImageData;
let px32: Uint32Array;

let W = 0, H = 0;
let physW = 0, physH = 0;

// ─── Setup ───────────────────────────────────────────────────────────────────

function buildLut(): void {
  // Precomputed sigmoid contrast curve: field [−1,1] → brightness [0,255].
  // Changing CONTRAST here requires calling buildLut() again.
  lut = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    const t = i / 255.0;                                          // [0, 1]
    const s = 1.0 / (1.0 + Math.exp(-CONTRAST * (t * 2.0 - 1.0))); // sigmoid
    lut[i] = (s * BRIGHTNESS + 0.5) | 0;
  }
}

function rebuild(sw: number, sh: number, dpr: number): void {
  physW = Math.round(sw * dpr);
  physH = Math.round(sh * dpr);

  const asp = sw / sh;
  H = Math.max(50, Math.round(Math.sqrt(TARGET_CELLS / asp)));
  W = Math.max(50, Math.round(H * asp));

  canvas.width  = physW;
  canvas.height = physH;
  ctx.imageSmoothingEnabled = true;
  (ctx as any).imageSmoothingQuality = 'high';

  simCanvas = new OffscreenCanvas(W, H);
  simCtx    = simCanvas.getContext('2d', { alpha: false }) as OffscreenCanvasRenderingContext2D;

  const n    = W * H;
  const minD = Math.min(W, H);

  grid  = new Float32Array(n);
  temp  = new Float32Array(n);

  scales = (SCALE_DEFS as readonly (readonly [number, number, number])[]).map(
    ([af, hf, v]) => ({
      actR:      Math.max(1, Math.round(af * minD)),
      inhR:      Math.max(2, Math.round(hf * minD)),
      variation: v,
    }),
  );

  activ = scales.map(() => new Float32Array(n));
  inhib = scales.map(() => new Float32Array(n));

  img  = new ImageData(W, H);
  px32 = new Uint32Array(img.data.buffer);

  seed();

  // Run warmup steps silently (worker thread — never blocks the main thread).
  // This advances past the "noise organising" phase so the first render
  // already shows a developed pattern.
  for (let i = 0; i < WARMUP; i++) step();
}

function seed(): void {
  for (let i = 0, n = W * H; i < n; i++) {
    grid[i] = Math.random() * 2.0 - 1.0;
  }
}

// ─── Separable box blur — O(W×H) per scale regardless of radius ──────────────

function blurRows(src: Float32Array, dst: Float32Array, r: number): void {
  const inv = 1.0 / (2 * r + 1);
  for (let y = 0; y < H; y++) {
    const off = y * W;
    let sum = 0;
    for (let k = W - r; k < W; k++) sum += src[off + k];
    for (let k = 0;     k <= r; k++) sum += src[off + k];
    dst[off] = sum * inv;

    for (let x = 1; x <= r && x < W; x++) {
      sum -= src[off + (x - r - 1 + W)];
      const ar = x + r; sum += src[off + (ar < W ? ar : ar - W)];
      dst[off + x] = sum * inv;
    }
    const mid = W - r - 1;
    for (let x = r + 1; x <= mid; x++) {
      sum -= src[off + x - r - 1];
      sum += src[off + x + r];
      dst[off + x] = sum * inv;
    }
    for (let x = mid + 1; x < W; x++) {
      sum -= src[off + x - r - 1];
      sum += src[off + (x + r - W)];
      dst[off + x] = sum * inv;
    }
  }
}

function blurCols(src: Float32Array, dst: Float32Array, r: number): void {
  const inv = 1.0 / (2 * r + 1);
  for (let x = 0; x < W; x++) {
    let sum = 0;
    for (let k = H - r; k < H; k++) sum += src[k * W + x];
    for (let k = 0;     k <= r; k++) sum += src[k * W + x];
    dst[x] = sum * inv;

    for (let y = 1; y <= r && y < H; y++) {
      sum -= src[(y - r - 1 + H) * W + x];
      const ar = y + r; sum += src[(ar < H ? ar : ar - H) * W + x];
      dst[y * W + x] = sum * inv;
    }
    const mid = H - r - 1;
    for (let y = r + 1; y <= mid; y++) {
      sum -= src[(y - r - 1) * W + x];
      sum += src[(y + r) * W + x];
      dst[y * W + x] = sum * inv;
    }
    for (let y = mid + 1; y < H; y++) {
      sum -= src[(y - r - 1) * W + x];
      sum += src[(y + r - H) * W + x];
      dst[y * W + x] = sum * inv;
    }
  }
}

function boxBlur(src: Float32Array, dst: Float32Array, r: number): void {
  blurRows(src, temp, r);
  blurCols(temp, dst, r);
}

// ─── Per-frame ───────────────────────────────────────────────────────────────

function step(): void {
  const ns = scales.length;
  const n  = W * H;

  for (let s = 0; s < ns; s++) {
    boxBlur(grid, activ[s], scales[s].actR);
    boxBlur(grid, inhib[s], scales[s].inhR);
  }

  for (let i = 0; i < n; i++) {
    let minDiff = Infinity, bestS = 0;
    for (let s = 0; s < ns; s++) {
      const d = activ[s][i] - inhib[s][i];
      const ad = d < 0 ? -d : d;
      if (ad < minDiff) { minDiff = ad; bestS = s; }
    }
    const d = activ[bestS][i] - inhib[bestS][i];
    grid[i] += scales[bestS].variation * (d > 0 ? 1.0 : -1.0);
  }

  // Renormalise to [−1, 1].
  let mn = grid[0], mx = grid[0];
  for (let i = 1; i < n; i++) {
    if (grid[i] < mn) mn = grid[i];
    if (grid[i] > mx) mx = grid[i];
  }
  const range = mx - mn;
  if (range > 1e-9) {
    const inv2 = 2.0 / range;
    for (let i = 0; i < n; i++) grid[i] = (grid[i] - mn) * inv2 - 1.0;
  }
}

function render(): void {
  const n = W * H;
  for (let i = 0; i < n; i++) {
    let idx = ((grid[i] + 1.0) * 127.5 + 0.5) | 0;
    if (idx < 0) idx = 0; else if (idx > 255) idx = 255;
    const c = lut[idx];
    px32[i] = (0xFF000000 | (c << 16) | (c << 8) | c) >>> 0;
  }
  simCtx.putImageData(img, 0, 0);
  const ox = Math.ceil(physW / W) * 4;
  const oy = Math.ceil(physH / H) * 4;
  ctx.drawImage(simCanvas, -ox, -oy, physW + ox * 2, physH + oy * 2);
}

function frame(): void {
  const t0 = performance.now();
  for (let s = 0; s < STEPS; s++) step();
  render();
  setTimeout(frame, Math.max(1, FRAME_MS - (performance.now() - t0)));
}

// ─── Message handler ─────────────────────────────────────────────────────────

addEventListener('message', (e: MessageEvent) => {
  const { type } = e.data as { type: string };

  if (type === 'init') {
    const d = e.data as { canvas: OffscreenCanvas; sw: number; sh: number; dpr: number };
    canvas = d.canvas;
    ctx    = canvas.getContext('2d', { alpha: false }) as OffscreenCanvasRenderingContext2D;
    buildLut();
    rebuild(d.sw, d.sh, d.dpr ?? 1);
    frame();
  } else if (type === 'resize') {
    const d = e.data as { sw: number; sh: number; dpr: number };
    rebuild(d.sw, d.sh, d.dpr ?? 1);
  }
});
