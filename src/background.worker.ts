// FitzHugh-Nagumo excitable-media background.
// Produces self-organizing spiral waves on a dark field.
//
// Equations:
//   du/dt = Du∇²u  +  u − u³/3 − v
//   dv/dt =  ε (u + β − γv)          (no spatial diffusion on v)

const Du    = 0.3;    // activator diffusion
const EPS   = 0.40;   // time-scale separation
const BETA  = 0.0;    // 0 = Hopf bifurcation point → every cell oscillates continuously
const GAMMA = 0.5;    // inhibitor recovery rate
const DT    = 0.1;    // Euler timestep

const STEPS        = 3;
const TARGET_CELLS = 500_000;
const FRAME_MS     = 1000 / 60;

// ─── State ───────────────────────────────────────────────────────────────────

let canvas: OffscreenCanvas;
let ctx: OffscreenCanvasRenderingContext2D;
let simCanvas: OffscreenCanvas;
let simCtx: OffscreenCanvasRenderingContext2D;

// Ghost-bordered ping-pong buffers: (W+2)×(H+2).
// Real cells at rows 1..H, cols 1..W.
let U: Float32Array, V: Float32Array;
let nU: Float32Array, nV: Float32Array;

let img:  ImageData;
let px32: Uint32Array;
let lut:  Uint8Array;

let W = 0, H = 0;
let STRIDE = 0;
let physW = 0, physH = 0;

// ─── Setup ───────────────────────────────────────────────────────────────────

function buildLut(): void {
  // u lives in [-2.5, 2.5]. LUT index = ((u + 2.5) / 5) * 255.
  // Rest state ≈ u = −1.2 → dark; excited front ≈ u = 2 → dim white.
  lut = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    const u = (i / 255.0) * 5.0 - 2.5;
    let t = (u + 0.2) / 2.2;
    if (t < 0.0) t = 0.0; else if (t > 1.0) t = 1.0;
    lut[i] = (t * t * 68.0 + 0.5) | 0;
  }
}

function rebuild(sw: number, sh: number, dpr: number): void {
  physW = Math.round(sw * dpr);
  physH = Math.round(sh * dpr);

  const asp = sw / sh;
  H = Math.max(50, Math.round(Math.sqrt(TARGET_CELLS / asp)));
  W = Math.max(50, Math.round(H * asp));
  STRIDE = W + 2;

  // Main canvas at native device-pixel resolution.
  canvas.width  = physW;
  canvas.height = physH;
  ctx.imageSmoothingEnabled = true;
  (ctx as any).imageSmoothingQuality = 'high';

  // Intermediate canvas for putImageData at sim-grid size.
  simCanvas = new OffscreenCanvas(W, H);
  simCtx    = simCanvas.getContext('2d', { alpha: false }) as OffscreenCanvasRenderingContext2D;

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
  // Full random init — works in the oscillatory regime (BETA=0),
  // every cell cycles continuously so the pattern never collapses.
  for (let y = 1; y <= H; y++) {
    const row = y * STRIDE;
    for (let x = 1; x <= W; x++) {
      U[row + x] = Math.random() * 4.0 - 2.0;
      V[row + x] = Math.random() * 4.0 - 2.0;
    }
  }
}

// ─── Per-frame ───────────────────────────────────────────────────────────────

function copyBorders(): void {
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
  for (let y = 0; y <= H + 1; y++) {
    const row = y * STRIDE;
    U[row]         = U[row + W];
    U[row + W + 1] = U[row + 1];
    V[row]         = V[row + W];
    V[row + W + 1] = V[row + 1];
  }
}

function step(): void {
  for (let y = 1; y <= H; y++) {
    const row  = y * STRIDE;
    const rowN = row - STRIDE;
    const rowS = row + STRIDE;
    for (let x = 1; x <= W; x++) {
      const i    = row + x;
      const u    = U[i];
      const v    = V[i];
      const lapu = U[rowN + x] + U[rowS + x] + U[i - 1] + U[i + 1] - 4.0 * u;

      let nu = u + DT * (Du * lapu + u - (u * u * u) / 3.0 - v);
      let nv = v + DT * (EPS * (u + BETA - GAMMA * v));

      if (nu < -2.5) nu = -2.5; else if (nu > 2.5) nu = 2.5;
      if (nv < -2.5) nv = -2.5; else if (nv > 2.5) nv = 2.5;

      nU[i] = nu;
      nV[i] = nv;
    }
  }
  const tU = U; U = nU; nU = tU;
  const tV = V; V = nV; nV = tV;
}

function render(): void {
  const scale = 255.0 / 5.0;
  const shift = 2.5;
  for (let y = 1; y <= H; y++) {
    const srcRow = y * STRIDE + 1;
    const dstRow = (y - 1) * W;
    for (let x = 0; x < W; x++) {
      let idx = ((U[srcRow + x] + shift) * scale + 0.5) | 0;
      if (idx < 0) idx = 0; else if (idx > 255) idx = 255;
      const c = lut[idx];
      px32[dstRow + x] = (0xFF000000 | (c << 16) | (c << 8) | c) >>> 0;
    }
  }
  simCtx.putImageData(img, 0, 0);
  const ox = Math.ceil(physW / W) * 4;
  const oy = Math.ceil(physH / H) * 4;
  ctx.drawImage(simCanvas, -ox, -oy, physW + ox * 2, physH + oy * 2);
}

function frame(): void {
  const t0 = performance.now();
  copyBorders();
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
