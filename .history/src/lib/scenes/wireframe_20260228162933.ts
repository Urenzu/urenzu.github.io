import type { IScene, CursorState } from '../engine/types';
import { buildPerm, makeNoise, makeFbm } from '../pipeline/noise';

// Grid dimensions
const GRID_COLS = 90;
const GRID_ROWS = 70;

// Projection
const FOCAL_LEN = 600;
const CAM_HEIGHT = 3.5;
const VANISH_Y_RATIO = 0.35;
const NEAR_Z = 2;
const FAR_Z = 50; // 20

// Terrain
const NOISE_FREQ = 0.35;
const HEIGHT_SCALE = 2.2;
const SCROLL_SPEED = 0.3;

// Appearance
const LINE_WIDTH = 0.5;
const SCAN_LINE_INTERVAL = 5;
const BASE_ALPHA = 0.50;
const SCAN_LINE_ALPHA = 0.50;
const EDGE_FADE_FRAC = 0.15; // fraction of screen width for edge fade

// Cursor interaction
const CURSOR_STRENGTH = 3.0;
const CURSOR_SIG_X = 2.5;
const CURSOR_SIG_Z = 2.5;
const TRAIL_STRENGTH = 1.8;
const TRAIL_SIG_X = 2.0;
const TRAIL_SIG_Z = 2.0;

// Depth bands computed lazily (reference BASE_ALPHA at use-time)
function getBands() {
  return [
    { minD: 0.0, maxD: 0.25, alpha: BASE_ALPHA },
    { minD: 0.25, maxD: 0.5, alpha: BASE_ALPHA * 0.65 },
    { minD: 0.5, maxD: 0.75, alpha: BASE_ALPHA * 0.35 },
    { minD: 0.75, maxD: 1.0, alpha: BASE_ALPHA * 0.15 },
  ];
}

export class WireframeScene implements IScene {
  readonly cellSize = 100;

  private fbm: (x: number, y: number) => number;
  private startTime = 0;

  // Pre-allocated buffers
  private screenX = new Float32Array(0);
  private screenY = new Float32Array(0);
  private depth = new Float32Array(0);
  private heights = new Float32Array(0);

  constructor() {
    const perm = buildPerm(73);
    this.fbm = makeFbm(makeNoise(perm), 5);
  }

  build(): void {
    const n = GRID_COLS * GRID_ROWS;
    this.screenX = new Float32Array(n);
    this.screenY = new Float32Array(n);
    this.depth = new Float32Array(n);
    this.heights = new Float32Array(n);
    this.startTime = performance.now();
  }

  isSettled(): boolean {
    return false; // always animating
  }

  render(ctx: CanvasRenderingContext2D, cursor: CursorState, W: number, H: number): void {
    const t = (performance.now() - this.startTime) / 1000;
    const scrollOffset = t * SCROLL_SPEED;

    const vanishY = H * VANISH_Y_RATIO;
    const halfW = W / 2;

    // X span: enough to fill viewport at near plane
    const xSpan = (W / FOCAL_LEN) * FAR_Z * 0.6;

    // Compute cursor world position estimate
    const cursorScreenY = cursor.spY * H;
    const cursorWZ = CAM_HEIGHT * FOCAL_LEN / Math.max(cursorScreenY - vanishY, 1);
    const cursorWX = (cursor.spX - 0.5) * cursorWZ * (W / FOCAL_LEN);

    // Build vertex grid
    for (let r = 0; r < GRID_ROWS; r++) {
      const wz = NEAR_Z + (r / (GRID_ROWS - 1)) * (FAR_Z - NEAR_Z);
      const invZ = 1 / wz;

      for (let c = 0; c < GRID_COLS; c++) {
        const idx = r * GRID_COLS + c;
        const wx = (c / (GRID_COLS - 1) - 0.5) * xSpan;

        // Terrain height from FBM
        let wy = this.fbm(wx * NOISE_FREQ, (wz + scrollOffset) * NOISE_FREQ) * HEIGHT_SCALE;

        // Cursor displacement
        if (cursor.amp > 0.001) {
          const dx = (wx - cursorWX) / CURSOR_SIG_X;
          const dz = (wz - cursorWZ) / CURSOR_SIG_Z;
          wy += Math.exp(-0.5 * (dx * dx + dz * dz)) * CURSOR_STRENGTH * cursor.amp;
        }

        // Trail peaks displacement
        for (const peak of cursor.trail) {
          const peakScreenY = peak.y * H;
          const peakWZ = CAM_HEIGHT * FOCAL_LEN / Math.max(peakScreenY - vanishY, 1);
          const peakWX = (peak.x - 0.5) * peakWZ * (W / FOCAL_LEN);
          const dx = (wx - peakWX) / TRAIL_SIG_X;
          const dz = (wz - peakWZ) / TRAIL_SIG_Z;
          wy += Math.exp(-0.5 * (dx * dx + dz * dz)) * TRAIL_STRENGTH * peak.amp;
        }

        this.heights[idx] = wy;

        // Perspective projection
        this.screenX[idx] = wx * invZ * FOCAL_LEN + halfW;
        this.screenY[idx] = (CAM_HEIGHT - wy) * invZ * FOCAL_LEN + vanishY;
        this.depth[idx] = (wz - NEAR_Z) / (FAR_Z - NEAR_Z);
      }
    }

    // Draw lines batched by depth band
    ctx.lineCap = 'round';
    ctx.lineWidth = LINE_WIDTH;

    const edgeL = W * EDGE_FADE_FRAC;
    const edgeR = W * (1 - EDGE_FADE_FRAC);

    for (const band of getBands()) {
      // Horizontal lines (row-wise)
      this.drawHLines(ctx, band, false, W, edgeL, edgeR);
      // Scan lines (brighter row-wise)
      this.drawHLines(ctx, band, true, W, edgeL, edgeR);
      // Vertical lines (col-wise)
      this.drawVLines(ctx, band, W, edgeL, edgeR);
    }
  }

  private edgeAlpha(sx: number, W: number, edgeL: number, edgeR: number): number {
    if (sx < edgeL) return sx / edgeL;
    if (sx > edgeR) return (W - sx) / (W - edgeR);
    return 1;
  }

  private drawHLines(
    ctx: CanvasRenderingContext2D,
    band: { minD: number; maxD: number; alpha: number },
    scanOnly: boolean,
    W: number, edgeL: number, edgeR: number
  ): void {
    for (let r = 0; r < GRID_ROWS; r++) {
      const isScanLine = r % SCAN_LINE_INTERVAL === 0;
      if (scanOnly && !isScanLine) continue;
      if (!scanOnly && isScanLine) continue;

      for (let c = 0; c < GRID_COLS - 1; c++) {
        const i0 = r * GRID_COLS + c;
        const i1 = i0 + 1;
        const d = (this.depth[i0] + this.depth[i1]) * 0.5;
        if (d < band.minD || d >= band.maxD) continue;

        const alpha = (scanOnly ? SCAN_LINE_ALPHA : band.alpha)
          * (1 - d)
          * Math.min(
            this.edgeAlpha(this.screenX[i0], W, edgeL, edgeR),
            this.edgeAlpha(this.screenX[i1], W, edgeL, edgeR)
          );
        if (alpha < 0.005) continue;

        ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
        ctx.beginPath();
        ctx.moveTo(this.screenX[i0], this.screenY[i0]);
        ctx.lineTo(this.screenX[i1], this.screenY[i1]);
        ctx.stroke();
      }
    }
  }

  private drawVLines(
    ctx: CanvasRenderingContext2D,
    band: { minD: number; maxD: number; alpha: number },
    W: number, edgeL: number, edgeR: number
  ): void {
    for (let c = 0; c < GRID_COLS; c++) {
      for (let r = 0; r < GRID_ROWS - 1; r++) {
        const i0 = r * GRID_COLS + c;
        const i1 = i0 + GRID_COLS;
        const d = (this.depth[i0] + this.depth[i1]) * 0.5;
        if (d < band.minD || d >= band.maxD) continue;

        const alpha = band.alpha
          * (1 - d)
          * Math.min(
            this.edgeAlpha(this.screenX[i0], W, edgeL, edgeR),
            this.edgeAlpha(this.screenX[i1], W, edgeL, edgeR)
          );
        if (alpha < 0.005) continue;

        ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
        ctx.beginPath();
        ctx.moveTo(this.screenX[i0], this.screenY[i0]);
        ctx.lineTo(this.screenX[i1], this.screenY[i1]);
        ctx.stroke();
      }
    }
  }
}
