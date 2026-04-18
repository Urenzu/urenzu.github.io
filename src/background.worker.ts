const Du           = 0.2097;
const Dv           = 0.105;
const F            = 0.025;
const K            = 0.060;
const FK           = F + K;
const STEPS        = 10;
const TARGET_CELLS = 500_000;
const FRAME_MS     = 1000 / 60;

// ─── State ───────────────────────────────────────────────────────────────────

let canvas: OffscreenCanvas;
let ctx: OffscreenCanvasRenderingContext2D;
let simCanvas: OffscreenCanvas;
let simCtx: OffscreenCanvasRenderingContext2D;

// Ghost-bordered ping-pong buffers: (W+2) × (H+2).
// Real cells live at rows 1..H, cols 1..W.
// Ghost border holds periodic copies of the opposite edge.
let U: Float32Array, V: Float32Array;
let nU: Float32Array, nV: Float32Array;

let img:  ImageData;
let px32: Uint32Array;
let lut:  Uint8Array;

let W = 0, H = 0;        // simulation grid (real cells)
let STRIDE = 0;          // W + 2
let physW = 0, physH = 0; // native canvas pixel dimensions

// ─── Setup ───────────────────────────────────────────────────────────────────

function buildLut(): void {
  lut = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    const v = i / 255.0;
    let t = (v - 0.12) / 0.22;
    if (t < 0.0) t = 0.0; else if (t > 1.0) t = 1.0;
    lut[i] = (t * t * (3.0 - 2.0 * t) * 90.0 + 0.5) | 0;
  }
}

function rebuild(sw: number, sh: number, dpr: number): void {
  physW = Math.round(sw * dpr);
  physH = Math.round(sh * dpr);

  const asp = sw / sh;
  H = Math.max(50, Math.round(Math.sqrt(TARGET_CELLS / asp)));
  W = Math.max(50, Math.round(H * asp));
  STRIDE = W + 2;

  // Main canvas at native device-pixel resolution — no CSS upscaling blur.
  canvas.width  = physW;
  canvas.height = physH;
  ctx.imageSmoothingEnabled = true;
  (ctx as any).imageSmoothingQuality = 'high';

  // Intermediate canvas at simulation grid size for putImageData.
  simCanvas = new OffscreenCanvas(W, H);
  simCtx    = simCanvas.getContext('2d', { alpha: false }) as OffscreenCanvasRenderingContext2D;

  // Ghost-bordered buffers: (W+2) × (H+2).
  const n = STRIDE * (H + 2);
  U  = new Float32Array(n);
  V  = new Float32Array(n);
  nU = new Float32Array(n);
  nV = new Float32Array(n);

  img  = new ImageData(W, H);
  px32 = new Uint32Array(img.data.buffer);

  seed();
}

function seed(): void {
  for (let y = 1; y <= H; y++) {
    const row = y * STRIDE;
    for (let x = 1; x <= W; x++) {
      U[row + x] = 1.0;
      V[row + x] = 0.0;
    }
  }
  for (let s = 0; s < 80; s++) {
    const cx = 1 + ((Math.random() * W) | 0);
    const cy = 1 + ((Math.random() * H) | 0);
    const r  = 4 + ((Math.random() * 10) | 0);
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r * r) continue;
        const x = ((cx + dx - 1 + W) % W) + 1;
        const y = ((cy + dy - 1 + H) % H) + 1;
        const i = y * STRIDE + x;
        U[i] = 0.5;
        V[i] = 0.25;
      }
    }
  }
}

// ─── Per-frame ───────────────────────────────────────────────────────────────

function copyBorders(): void {
  // Top/bottom ghost rows get the opposite real edge.
  const ghostTop = 0;
  const realTop  = STRIDE;
  const realBot  = H * STRIDE;
  const ghostBot = (H + 1) * STRIDE;
  for (let x = 0; x < STRIDE; x++) {
    U[ghostTop + x] = U[realBot + x];
    U[ghostBot + x] = U[realTop + x];
    V[ghostTop + x] = V[realBot + x];
    V[ghostBot + x] = V[realTop + x];
  }
  // Left/right ghost columns.
  for (let y = 0; y <= H + 1; y++) {
    const row = y * STRIDE;
    U[row]         = U[row + W];
    U[row + W + 1] = U[row + 1];
    V[row]         = V[row + W];
    V[row + W + 1] = V[row + 1];
  }
}

function step(): void {
  // Single uniform loop — row offsets precomputed to reduce address arithmetic.
  for (let y = 1; y <= H; y++) {
    const row  = y * STRIDE;
    const rowN = row - STRIDE;
    const rowS = row + STRIDE;
    for (let x = 1; x <= W; x++) {
      const i   = row + x;
      const u   = U[i];
      const v   = V[i];
      const lu  = U[rowN + x] + U[rowS + x] + U[i - 1] + U[i + 1] - 4.0 * u;
      const lv  = V[rowN + x] + V[rowS + x] + V[i - 1] + V[i + 1] - 4.0 * v;
      const uvv = u * v * v;
      let nu = u + Du * lu - uvv + F  * (1.0 - u);
      let nv = v + Dv * lv + uvv - FK * v;
      if (nu < 0.0) nu = 0.0; else if (nu > 1.0) nu = 1.0;
      if (nv < 0.0) nv = 0.0; else if (nv > 1.0) nv = 1.0;
      nU[i] = nu;
      nV[i] = nv;
    }
  }
  const tU = U; U = nU; nU = tU;
  const tV = V; V = nV; nV = tV;
}

function render(): void {
  // Extract real cells from ghost-bordered buffer into flat ImageData.
  for (let y = 1; y <= H; y++) {
    const srcRow = y * STRIDE + 1;
    const dstRow = (y - 1) * W;
    for (let x = 0; x < W; x++) {
      const c = lut[(V[srcRow + x] * 255.0) | 0];
      px32[dstRow + x] = (0xFF000000 | (c << 16) | (c << 8) | c) >>> 0;
    }
  }
  // Blit grid to intermediate canvas, then upscale to native resolution.
  simCtx.putImageData(img, 0, 0);
  ctx.drawImage(simCanvas, 0, 0, physW, physH);
}

function frame(): void {
  const t0 = performance.now();
  copyBorders(); // once per frame rather than once per step
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
