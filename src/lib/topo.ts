// Topographic contour map — interactive animated background
//
// Static layer : Gaussian hills + low-amplitude fBm texture → circular contours
// Dynamic layer: spring-following cursor hill + ghost trail peaks on fast movement

// ─── Gradient noise (Perlin) ─────────────────────────────────────────────────

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerpN(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

function grad(hash: number, x: number, y: number): number {
  const h = hash & 7;
  const u = h < 4 ? x : y;
  const v = h < 4 ? y : x;
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}

function buildPerm(seed: number): Uint8Array {
  let s = seed >>> 0;
  const rng = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  return perm;
}

function makeNoise(perm: Uint8Array): (x: number, y: number) => number {
  return (x: number, y: number): number => {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = fade(xf);
    const v = fade(yf);
    const aa = perm[perm[X]     + Y];
    const ab = perm[perm[X]     + Y + 1];
    const ba = perm[perm[X + 1] + Y];
    const bb = perm[perm[X + 1] + Y + 1];
    return lerpN(
      lerpN(grad(aa, xf,     yf    ), grad(ba, xf - 1, yf    ), u),
      lerpN(grad(ab, xf,     yf - 1), grad(bb, xf - 1, yf - 1), u),
      v
    );
  };
}

function makeFbm(noise: (x: number, y: number) => number): (x: number, y: number) => number {
  return (x: number, y: number): number => {
    let val = 0, amp = 0.5, freq = 1, maxVal = 0;
    for (let i = 0; i < 4; i++) {
      val    += noise(x * freq, y * freq) * amp;
      maxVal += amp;
      amp    *= 0.5;
      freq   *= 2.1;
    }
    return val / maxVal;
  };
}

// ─── Marching squares ────────────────────────────────────────────────────────
//
// Corner bits: TL=1, TR=2, BR=4, BL=8   |   Edges: 0=top 1=right 2=bottom 3=left

const LINE_TABLE: Array<Array<[number, number]>> = [
  [],
  [[2, 3]], [[1, 2]], [[1, 3]], [[0, 1]],
  [[0, 1], [2, 3]],
  [[0, 2]], [[0, 3]], [[0, 3]], [[0, 2]],
  [[0, 3], [1, 2]],
  [[0, 1]], [[1, 3]], [[1, 2]], [[2, 3]],
  [],
];

function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

function edgePoint(
  edge: number, i: number, j: number, cs: number,
  vTL: number, vTR: number, vBL: number, vBR: number,
  level: number
): [number, number] {
  const t = (a: number, b: number) => {
    const d = b - a;
    return Math.abs(d) < 1e-10 ? 0.5 : clamp01((level - a) / d);
  };
  if (edge === 0) return [(i + t(vTL, vTR)) * cs, j * cs];
  if (edge === 1) return [(i + 1) * cs,            (j + t(vTR, vBR)) * cs];
  if (edge === 2) return [(i + t(vBL, vBR)) * cs,  (j + 1) * cs];
  /* 3 */         return [i * cs,                   (j + t(vTL, vBL)) * cs];
}

function drawAllContours(
  field: Float32Array,
  cols: number, rows: number,
  cellSize: number,
  numLevels: number,
  baseAlpha: number,
  indexAlpha: number,
  ctx: CanvasRenderingContext2D
): void {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.lineCap  = 'round';
  ctx.lineJoin = 'round';

  for (let n = 0; n < numLevels; n++) {
    const level   = (n + 0.5) / numLevels;
    const isIndex = n % 5 === 0;
    ctx.strokeStyle = `rgba(255,255,255,${isIndex ? indexAlpha : baseAlpha})`;
    ctx.lineWidth   = isIndex ? 0.8 : 0.45;
    ctx.beginPath();
    for (let j = 0; j < rows - 1; j++) {
      for (let i = 0; i < cols - 1; i++) {
        const vTL = field[j * cols + i];
        const vTR = field[j * cols + (i + 1)];
        const vBL = field[(j + 1) * cols + i];
        const vBR = field[(j + 1) * cols + (i + 1)];
        const caseId =
          (vTL >= level ? 1 : 0) |
          (vTR >= level ? 2 : 0) |
          (vBR >= level ? 4 : 0) |
          (vBL >= level ? 8 : 0);
        for (const [e0, e1] of LINE_TABLE[caseId]) {
          const [x0, y0] = edgePoint(e0, i, j, cellSize, vTL, vTR, vBL, vBR, level);
          const [x1, y1] = edgePoint(e1, i, j, cellSize, vTL, vTR, vBL, vBR, level);
          ctx.moveTo(x0, y0);
          ctx.lineTo(x1, y1);
        }
      }
    }
    ctx.stroke();
  }
}

// ─── Field helpers ───────────────────────────────────────────────────────────

function addGaussian(
  field: Float32Array,
  cols: number, rows: number,
  cx: number, cy: number,   // normalized [0, 1]
  amp: number,
  sigC: number, sigR: number // sigma in cell units
): void {
  const px = cx * cols;
  const py = cy * rows;
  const x0 = Math.max(0,    Math.floor(px - 3.5 * sigC));
  const x1 = Math.min(cols, Math.ceil (px + 3.5 * sigC));
  const y0 = Math.max(0,    Math.floor(py - 3.5 * sigR));
  const y1 = Math.min(rows, Math.ceil (py + 3.5 * sigR));
  for (let j = y0; j < y1; j++) {
    for (let i = x0; i < x1; i++) {
      const dx = (i - px) / sigC;
      const dy = (j - py) / sigR;
      field[j * cols + i] += amp * Math.exp(-0.5 * (dx * dx + dy * dy));
    }
  }
}

// ─── Static terrain ──────────────────────────────────────────────────────────

interface HillDef {
  cx: number; cy: number;
  amp: number;
  sig: number; // sigma as fraction of min(W, H)
}

// Arranged so hills feel distributed across a landscape, not symmetric
const HILLS: HillDef[] = [
  { cx: 0.12, cy: 0.16, amp: 0.85, sig: 0.17 },
  { cx: 0.52, cy: 0.08, amp: 0.70, sig: 0.14 },
  { cx: 0.84, cy: 0.24, amp: 0.90, sig: 0.20 },
  { cx: 0.20, cy: 0.54, amp: 0.65, sig: 0.12 },
  { cx: 0.60, cy: 0.48, amp: 1.00, sig: 0.23 }, // dominant peak
  { cx: 0.90, cy: 0.62, amp: 0.75, sig: 0.16 },
  { cx: 0.08, cy: 0.83, amp: 0.60, sig: 0.13 },
  { cx: 0.43, cy: 0.88, amp: 0.82, sig: 0.17 },
  { cx: 0.76, cy: 0.86, amp: 0.55, sig: 0.11 },
];

function buildStaticField(
  cols: number, rows: number,
  W: number, H: number,
  cellSize: number,
  fbm: (x: number, y: number) => number
): Float32Array {
  const field = new Float32Array(cols * rows);
  const minDim = Math.min(W, H);

  for (const h of HILLS) {
    const s = (h.sig * minDim) / cellSize;
    addGaussian(field, cols, rows, h.cx, h.cy, h.amp, s, s);
  }

  // Subtle fBm texture on top
  const NOISE_AMP = 0.16;
  const SCALE     = 3.8;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      field[j * cols + i] += NOISE_AMP * fbm((i / cols) * SCALE, (j / rows) * SCALE);
    }
  }

  // Normalize to [0, 1]
  let min = Infinity, max = -Infinity;
  for (let k = 0; k < field.length; k++) {
    if (field[k] < min) min = field[k];
    if (field[k] > max) max = field[k];
  }
  const range = max - min || 1;
  for (let k = 0; k < field.length; k++) field[k] = (field[k] - min) / range;

  return field;
}

// ─── Interactive trail ───────────────────────────────────────────────────────

interface TrailPeak { x: number; y: number; amp: number; }

// ─── Public API ──────────────────────────────────────────────────────────────

export function initTopoBackground(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d')!;
  const fbm = makeFbm(makeNoise(buildPerm(42)));

  // Render constants
  const CELL_SIZE   = 7;
  const NUM_LEVELS  = 22;
  const BASE_ALPHA  = 0.07;
  const INDEX_ALPHA = 0.14;

  // Cursor hill
  const CURSOR_AMP = 0.45;   // height added to normalized [0,1] field
  const CURSOR_SIG = 0.10;   // sigma as fraction of min(W, H)

  // Trail
  const TRAIL_AMP        = 0.28;
  const TRAIL_SIG        = 0.075;
  const TRAIL_HALF_LIFE  = 380;  // ms — exponential decay
  const TRAIL_VEL_THR    = 0.0028; // normalized units/ms to trigger spawn
  const TRAIL_COOLDOWN   = 90;   // ms between spawns
  const MAX_TRAIL        = 6;

  // Spring (slightly underdamped → subtle physical overshoot)
  const SPRING_K = 140;
  const SPRING_B = 22;

  // Per-render state
  let staticField = new Float32Array(0);
  let cols = 0, rows = 0;
  let W = 0, H = 0;

  // Mouse / spring
  let mouseX = 0.5, mouseY = 0.5;
  let mousePresent = false;
  let cursorAmp = 0;
  let spX = 0.5, spY = 0.5, spVX = 0, spVY = 0;

  // Trail
  const trail: TrailPeak[] = [];
  let prevMX = 0, prevMY = 0, prevMT = 0;
  let lastTrailT = 0;

  // RAF
  let rafId: number | null = null;
  let lastTime = 0;

  // ── Setup (called on init and resize) ────────────────────────────────────

  function setup(): void {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width  = W;
    canvas.height = H;
    cols = Math.ceil(W / CELL_SIZE) + 2;
    rows = Math.ceil(H / CELL_SIZE) + 2;
    staticField = buildStaticField(cols, rows, W, H, CELL_SIZE, fbm);
    renderFrame();
  }

  // ── Render ───────────────────────────────────────────────────────────────

  function renderFrame(): void {
    // Build dynamic field: copy static + add hills
    const field = staticField.slice();
    const minDim = Math.min(W, H);

    if (cursorAmp > 0.001) {
      const s = (CURSOR_SIG * minDim) / CELL_SIZE;
      addGaussian(field, cols, rows, spX, spY, cursorAmp * CURSOR_AMP, s, s);
    }

    for (const p of trail) {
      const s = (TRAIL_SIG * minDim) / CELL_SIZE;
      addGaussian(field, cols, rows, p.x, p.y, p.amp * TRAIL_AMP, s, s);
    }

    drawAllContours(field, cols, rows, CELL_SIZE, NUM_LEVELS, BASE_ALPHA, INDEX_ALPHA, ctx);
  }

  // ── Animation loop ───────────────────────────────────────────────────────

  function settled(): boolean {
    const dx = spX - mouseX, dy = spY - mouseY;
    return (
      dx * dx + dy * dy < 1e-8 &&
      spVX * spVX + spVY * spVY < 1e-8 &&
      trail.length === 0 &&
      Math.abs(cursorAmp - (mousePresent ? 1 : 0)) < 0.005
    );
  }

  function tick(ts: number): void {
    const dt = Math.min((ts - lastTime) / 1000, 0.05);
    lastTime = ts;

    // Fade cursor in / out
    const targetAmp = mousePresent ? 1 : 0;
    cursorAmp += (targetAmp - cursorAmp) * (1 - Math.exp(-dt * 7));

    // Spring physics
    spVX += ((mouseX - spX) * SPRING_K - spVX * SPRING_B) * dt;
    spVY += ((mouseY - spY) * SPRING_K - spVY * SPRING_B) * dt;
    spX  += spVX * dt;
    spY  += spVY * dt;

    // Decay trail
    const decayFactor = Math.pow(0.5, (dt * 1000) / TRAIL_HALF_LIFE);
    for (let i = trail.length - 1; i >= 0; i--) {
      trail[i].amp *= decayFactor;
      if (trail[i].amp < 0.015) trail.splice(i, 1);
    }

    renderFrame();

    rafId = settled() ? null : requestAnimationFrame(tick);
  }

  function startLoop(): void {
    if (rafId !== null) return;
    lastTime = performance.now();
    rafId = requestAnimationFrame(tick);
  }

  // ── Mouse events ─────────────────────────────────────────────────────────

  window.addEventListener('mousemove', (e: MouseEvent) => {
    const nx  = e.clientX / W;
    const ny  = e.clientY / H;
    const now = performance.now();

    if (prevMT > 0) {
      const dt = now - prevMT;
      if (dt > 0) {
        const vx    = (nx - prevMX) / dt;
        const vy    = (ny - prevMY) / dt;
        const speed = Math.sqrt(vx * vx + vy * vy);

        if (
          speed > TRAIL_VEL_THR &&
          trail.length < MAX_TRAIL &&
          now - lastTrailT > TRAIL_COOLDOWN
        ) {
          trail.push({ x: prevMX, y: prevMY, amp: 1 });
          lastTrailT = now;
        }
      }
    }

    mouseX = nx; mouseY = ny;
    prevMX = nx; prevMY = ny; prevMT = now;
    mousePresent = true;
    startLoop();
  });

  document.addEventListener('mouseleave', () => {
    mousePresent = false;
    startLoop();
  });

  // ── Resize ───────────────────────────────────────────────────────────────

  let resizeTimer: ReturnType<typeof setTimeout>;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
      trail.length = 0;
      setup();
    }, 200);
  });

  setup();
}
