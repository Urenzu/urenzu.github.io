import type { IScene, CursorState } from '../engine/types';
import { buildPerm, makeNoise, makeFbm } from '../pipeline/noise';
import { addGaussian, normalizeField } from '../pipeline/field';

// ASCII density ramp — light to heavy
const RAMP = [' ', '.', ':', '+', '*', '#', '@'];
const RAMP_LEN = RAMP.length;

// Interference glyphs near cursor
const GLITCH_CHARS = ['|', '/', '\\', '-'];

// Alpha bands — one per ramp index (faint valleys, bright peaks)
const ALPHA_MIN = 0.08;
const ALPHA_MAX = 0.30;

// Noise / field
const SCALE       = 2.6;
const WARP        = 0.40;
const NOISE_STEP  = 6;

// Animation speeds
const DRIFT_SPEED      = 0.012;
const WARP_DRIFT_SPEED = 0.007;
const WIND_SPEED       = 0.035;
const BREATHE_SPEED    = 0.4;
const BREATHE_AMP      = 0.06;

// Wind streak layer
const WIND_SCALE = 3.2;
const WIND_STRENGTH = 1.2; // max ramp offset

// Cursor interaction
const CURSOR_AMP = 0.38;
const CURSOR_SIG = 0.08;
const TRAIL_AMP  = 0.22;
const TRAIL_SIG  = 0.06;

// Interference radius in cells
const INTERFERENCE_RADIUS = 15;
const INTERFERENCE_CHANCE = 0.08;

export class AsciiTerrainScene implements IScene {
  readonly cellSize = 10;

  private fbm1: (x: number, y: number) => number;
  private fbm2: (x: number, y: number) => number;
  private fbmWind: (x: number, y: number) => number;

  private cols = 0;
  private rows = 0;
  private nCols = 0;
  private nRows = 0;
  private startTime = 0;

  private field  = new Float32Array(0);
  private coarse = new Float32Array(0);

  // Pseudo-random table for interference (avoids Math.random in hot path)
  private randTable = new Float32Array(0);

  constructor() {
    this.fbm1    = makeFbm(makeNoise(buildPerm(73)),  4);
    this.fbm2    = makeFbm(makeNoise(buildPerm(211)), 2);
    this.fbmWind = makeFbm(makeNoise(buildPerm(317)), 3);

    // Pre-fill random table
    this.randTable = new Float32Array(1024);
    let s = 9973;
    for (let i = 0; i < 1024; i++) {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      this.randTable[i] = s / 4294967296;
    }
  }

  build(cols: number, rows: number): void {
    this.cols  = cols;
    this.rows  = rows;
    this.nCols = Math.ceil(cols / NOISE_STEP) + 2;
    this.nRows = Math.ceil(rows / NOISE_STEP) + 2;
    this.field  = new Float32Array(cols * rows);
    this.coarse = new Float32Array(this.nCols * this.nRows);
    this.startTime = performance.now();
  }

  isSettled(): boolean { return false; }

  render(ctx: CanvasRenderingContext2D, cursor: CursorState, W: number, H: number): void {
    const t         = (performance.now() - this.startTime) / 1000;
    const drift     = t * DRIFT_SPEED;
    const warpDrift = t * WARP_DRIFT_SPEED;
    const windDrift = t * WIND_SPEED;
    const breathe   = 1.0 + Math.sin(t * BREATHE_SPEED) * BREATHE_AMP;

    const { cols, rows, nCols, nRows, field, coarse } = this;

    // ── 1. Sample FBM on coarse grid ──────────────────────────────────────
    for (let nj = 0; nj < nRows; nj++) {
      for (let ni = 0; ni < nCols; ni++) {
        const x = (ni * NOISE_STEP / cols) * SCALE;
        const y = (nj * NOISE_STEP / rows) * SCALE;
        const wx = this.fbm2(x + warpDrift,              y + warpDrift * 0.7) * WARP;
        const wy = this.fbm2(x + 3.7 - warpDrift * 0.5, y + 1.8 + warpDrift) * WARP;
        coarse[nj * nCols + ni] = this.fbm1(x + wx + drift, y + wy + drift * 0.6);
      }
    }

    // ── 2. Bilinear interpolation: coarse → fine ──────────────────────────
    const stepInv = 1 / NOISE_STEP;
    for (let j = 0; j < rows; j++) {
      const cj  = j * stepInv;
      const cj0 = Math.floor(cj);
      const cj1 = Math.min(cj0 + 1, nRows - 1);
      const ty  = cj - cj0;
      const r0  = cj0 * nCols;
      const r1  = cj1 * nCols;
      for (let i = 0; i < cols; i++) {
        const ci  = i * stepInv;
        const ci0 = Math.floor(ci);
        const ci1 = Math.min(ci0 + 1, nCols - 1);
        const tx  = ci - ci0;
        field[j * cols + i] =
          (1 - ty) * ((1 - tx) * coarse[r0 + ci0] + tx * coarse[r0 + ci1]) +
               ty  * ((1 - tx) * coarse[r1 + ci0] + tx * coarse[r1 + ci1]);
      }
    }

    normalizeField(field);

    // ── 3. Cursor / trail displacement ────────────────────────────────────
    const minDim = Math.min(W, H);

    if (cursor.amp > 0.001) {
      const s = (CURSOR_SIG * minDim) / this.cellSize;
      addGaussian(field, cols, rows, cursor.spX, cursor.spY, cursor.amp * CURSOR_AMP, s, s);
    }
    for (const p of cursor.trail) {
      const s = (TRAIL_SIG * minDim) / this.cellSize;
      addGaussian(field, cols, rows, p.x, p.y, p.amp * TRAIL_AMP, s, s);
    }

    // Re-normalize after cursor bumps
    normalizeField(field);

    // ── 4. Compute ramp indices + wind offset ─────────────────────────────
    // We'll collect characters into alpha-band buckets for batched drawing.
    // Bands: one per ramp level (RAMP_LEN), using corresponding alpha.

    // Cursor position in cell space for interference
    const cursorCellX = cursor.spX * cols;
    const cursorCellY = cursor.spY * rows;
    const cursorActive = cursor.amp > 0.001;

    // Set up font
    ctx.font = `${this.cellSize}px "Space Mono", monospace`;
    ctx.textBaseline = 'top';

    // Build bands: array of {alpha, chars: string, positions: [x,y,...]}
    type Band = { alpha: number; chars: string[]; xs: number[]; ys: number[] };
    const bands: Band[] = [];
    for (let b = 0; b < RAMP_LEN; b++) {
      const alpha = ALPHA_MIN + (b / (RAMP_LEN - 1)) * (ALPHA_MAX - ALPHA_MIN);
      bands.push({ alpha: alpha * breathe, chars: [], xs: [], ys: [] });
    }

    let randIdx = 0;
    const randLen = this.randTable.length;

    for (let j = 0; j < rows; j++) {
      const py = j * this.cellSize;
      for (let i = 0; i < cols; i++) {
        const val = field[j * cols + i];

        // Base ramp index from field value
        let rampIdx = Math.floor(val * (RAMP_LEN - 0.001));
        if (rampIdx < 0) rampIdx = 0;
        if (rampIdx >= RAMP_LEN) rampIdx = RAMP_LEN - 1;

        // Wind streak offset — anisotropic FBM sampled directly (cheap at cell resolution)
        const wx = (i / cols) * WIND_SCALE;
        const wy = (j / rows) * WIND_SCALE * 0.3; // stretched horizontally
        const windVal = this.fbmWind(wx + windDrift, wy + windDrift * 0.2);
        const windOffset = Math.round(windVal * WIND_STRENGTH);
        rampIdx = Math.max(0, Math.min(RAMP_LEN - 1, rampIdx + windOffset));

        let ch = RAMP[rampIdx];

        // Interference near cursor
        if (cursorActive) {
          const dx = i - cursorCellX;
          const dy = j - cursorCellY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < INTERFERENCE_RADIUS) {
            const r = this.randTable[randIdx % randLen];
            randIdx++;
            if (r < INTERFERENCE_CHANCE * (1 - dist / INTERFERENCE_RADIUS)) {
              ch = GLITCH_CHARS[(randIdx) & 3];
            }
          }
        }

        // Skip spaces — nothing to draw
        if (ch === ' ') continue;

        // Find which band this character belongs to
        const bandIdx = rampIdx;
        bands[bandIdx].chars.push(ch);
        bands[bandIdx].xs.push(i * this.cellSize);
        bands[bandIdx].ys.push(py);
      }
    }

    // ── 5. Batch-draw by alpha band ───────────────────────────────────────
    ctx.fillStyle = '#fff';
    for (const band of bands) {
      if (band.chars.length === 0) continue;
      ctx.globalAlpha = band.alpha;
      for (let k = 0; k < band.chars.length; k++) {
        ctx.fillText(band.chars[k], band.xs[k], band.ys[k]);
      }
    }
    ctx.globalAlpha = 1.0;
  }
}
