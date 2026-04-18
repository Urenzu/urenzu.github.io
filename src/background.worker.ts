// Gray-Scott reaction-diffusion — simulation worker.
// Owns the OffscreenCanvas, simulation buffers, and the render loop.
// Main thread sends: 'init' | 'resize' messages.
//
// Pattern reference (adjust F / K):
//   F=0.037, K=0.060  →  coral / fingerprint
//   F=0.035, K=0.065  →  isolated spots
//   F=0.060, K=0.062  →  labyrinthine worms
//   F=0.025, K=0.060  →  moving Turing spots  (active)

const Du           = 0.2097;
const Dv           = 0.105;
const F            = 0.025;
const K            = 0.060;
const FK           = F + K;          // precomputed kill + feed
const STEPS        = 10;             // simulation steps per rendered frame
const TARGET_CELLS = 300_000;        // target cell count (scales to screen aspect)
const FRAME_MS     = 1000 / 60;      // ~16.67ms target frame interval

// ─── State ──────────────────────────────────────────────────────────────────

let canvas: OffscreenCanvas;
let ctx: OffscreenCanvasRenderingContext2D;

let U: Float32Array, V: Float32Array;   // current chemical buffers
let nU: Float32Array, nV: Float32Array; // next (ping-pong)

let nextCol: Int32Array, prevCol: Int32Array;

let img:  ImageData;
let px32: Uint32Array;
let lut:  Uint8Array;

let W = 0, H = 0;

// ─── Setup ───────────────────────────────────────────────────────────────────

function buildLut(): void {
  lut = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    const v = i / 255.0;
    // Tighter low threshold → more black space between spots
    let t = (v - 0.12) / 0.22;
    if (t < 0.0) t = 0.0; else if (t > 1.0) t = 1.0;
    lut[i] = (t * t * (3.0 - 2.0 * t) * 90.0 + 0.5) | 0;
  }
}

function rebuild(sw: number, sh: number): void {
  const asp = sw / sh;
  H = Math.max(50, Math.round(Math.sqrt(TARGET_CELLS / asp)));
  W = Math.max(50, Math.round(H * asp));
  canvas.width  = W;
  canvas.height = H;

  const n = W * H;
  U  = new Float32Array(n);
  V  = new Float32Array(n);
  nU = new Float32Array(n);
  nV = new Float32Array(n);

  nextCol = new Int32Array(W);
  prevCol = new Int32Array(W);
  for (let x = 0; x < W; x++) {
    nextCol[x] = (x + 1) % W;
    prevCol[x] = (x - 1 + W) % W;
  }

  img  = new ImageData(W, H);
  px32 = new Uint32Array(img.data.buffer);

  seed();
}

function seed(): void {
  U.fill(1.0);
  V.fill(0.0);
  for (let s = 0; s < 80; s++) {
    const cx = (Math.random() * W) | 0;
    const cy = (Math.random() * H) | 0;
    const r  = 4 + ((Math.random() * 10) | 0);
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r * r) continue;
        const x = ((cx + dx) % W + W) % W;
        const y = ((cy + dy) % H + H) % H;
        const i = y * W + x;
        U[i] = 0.5;
        V[i] = 0.25;
      }
    }
  }
}

// ─── Per-frame ───────────────────────────────────────────────────────────────

function borderCell(y: number, x: number): void {
  const rowN = (y + 1 < H ? y + 1 : 0) * W;
  const rowP = (y - 1 >= 0 ? y - 1 : H - 1) * W;
  const row  = y * W;
  const i    = row + x;
  const xN   = nextCol[x];
  const xP   = prevCol[x];

  const u   = U[i];
  const v   = V[i];
  const lu  = U[rowN + x] + U[rowP + x] + U[row + xN] + U[row + xP] - 4.0 * u;
  const lv  = V[rowN + x] + V[rowP + x] + V[row + xN] + V[row + xP] - 4.0 * v;
  const uvv = u * v * v;

  let nu = u + Du * lu - uvv + F  * (1.0 - u);
  let nv = v + Dv * lv + uvv - FK * v;
  if (nu < 0.0) nu = 0.0; else if (nu > 1.0) nu = 1.0;
  if (nv < 0.0) nv = 0.0; else if (nv > 1.0) nv = 1.0;
  nU[i] = nu;
  nV[i] = nv;
}

function step(): void {
  for (let y = 1; y < H - 1; y++) {
    const row = y * W;
    for (let x = 1; x < W - 1; x++) {
      const i   = row + x;
      const u   = U[i];
      const v   = V[i];
      const lu  = U[i - W] + U[i + W] + U[i - 1] + U[i + 1] - 4.0 * u;
      const lv  = V[i - W] + V[i + W] + V[i - 1] + V[i + 1] - 4.0 * v;
      const uvv = u * v * v;
      let nu = u + Du * lu - uvv + F  * (1.0 - u);
      let nv = v + Dv * lv + uvv - FK * v;
      if (nu < 0.0) nu = 0.0; else if (nu > 1.0) nu = 1.0;
      if (nv < 0.0) nv = 0.0; else if (nv > 1.0) nv = 1.0;
      nU[i] = nu;
      nV[i] = nv;
    }
  }

  for (let x = 0; x < W; x++) { borderCell(0, x); borderCell(H - 1, x); }
  for (let y = 1; y < H - 1; y++) { borderCell(y, 0); borderCell(y, W - 1); }

  const tU = U; U = nU; nU = tU;
  const tV = V; V = nV; nV = tV;
}

function render(): void {
  const n = W * H;
  for (let i = 0; i < n; i++) {
    const c = lut[(V[i] * 255.0) | 0];
    px32[i] = (0xFF000000 | (c << 16) | (c << 8) | c) >>> 0;
  }
  ctx.putImageData(img, 0, 0);
}

function frame(): void {
  const t0 = performance.now();
  for (let s = 0; s < STEPS; s++) step();
  render();
  setTimeout(frame, Math.max(0, FRAME_MS - (performance.now() - t0)));
}

// ─── Message handler ─────────────────────────────────────────────────────────

addEventListener('message', (e: MessageEvent) => {
  const { type } = e.data as { type: string };

  if (type === 'init') {
    const d = e.data as { canvas: OffscreenCanvas; sw: number; sh: number };
    canvas = d.canvas;
    ctx    = canvas.getContext('2d', { alpha: false }) as OffscreenCanvasRenderingContext2D;
    buildLut();
    rebuild(d.sw, d.sh);
    frame();
  } else if (type === 'resize') {
    const d = e.data as { sw: number; sh: number };
    rebuild(d.sw, d.sh);
  }
});
