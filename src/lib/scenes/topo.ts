import type { IScene, CursorState } from '../engine/types';
import { buildPerm, makeNoise, makeFbm } from '../pipeline/noise';
import { addGaussian, normalizeField } from '../pipeline/field';
import { drawAllContours } from '../pipeline/contours';

const NUM_LEVELS    = 50;
const BASE_ALPHA    = 0.09;
const INDEX_ALPHA   = 0.22;
const INDEX_INT     = 5;

const CURSOR_AMP = 0.42;
const CURSOR_SIG = 0.09;

const TRAIL_AMP = 0.26;
const TRAIL_SIG = 0.07;

const SCALE  = 2.8;
const WARP   = 0.45;

const DRIFT_SPEED = 0.015;
const WARP_DRIFT  = 0.008;

// Sample FBM noise every NOISE_STEP fine cells, then bilinearly interpolate.
// At cellSize=2 this means one noise sample per 16px instead of one per 2px —
// ~64x fewer FBM evaluations with no perceptible quality difference.
const NOISE_STEP = 8;

export class TopoScene implements IScene {
  readonly cellSize = 2;

  private fbm1: (x: number, y: number) => number;
  private fbm2: (x: number, y: number) => number;
  private cols = 0;
  private rows = 0;
  private nCols = 0;
  private nRows = 0;
  private startTime = 0;
  private field  = new Float32Array(0);  // fine grid — fed to marching squares
  private coarse = new Float32Array(0);  // coarse grid — sampled from FBM

  constructor() {
    this.fbm1 = makeFbm(makeNoise(buildPerm(42)),  4);
    this.fbm2 = makeFbm(makeNoise(buildPerm(137)), 2);
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
    const warpDrift = t * WARP_DRIFT;

    const { cols, rows, nCols, nRows, field, coarse } = this;

    // ── 1. Sample FBM on coarse grid ──────────────────────────────────────────
    for (let nj = 0; nj < nRows; nj++) {
      for (let ni = 0; ni < nCols; ni++) {
        const x = (ni * NOISE_STEP / cols) * SCALE;
        const y = (nj * NOISE_STEP / rows) * SCALE;
        const wx = this.fbm2(x + warpDrift,              y + warpDrift * 0.7) * WARP;
        const wy = this.fbm2(x + 3.7 - warpDrift * 0.5, y + 1.8 + warpDrift) * WARP;
        coarse[nj * nCols + ni] = this.fbm1(x + wx + drift, y + wy + drift * 0.6);
      }
    }

    // ── 2. Bilinear interpolation: coarse → fine ──────────────────────────────
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

    // ── 3. Cursor / trail displacement ────────────────────────────────────────
    const minDim = Math.min(W, H);

    if (cursor.amp > 0.001) {
      const s = (CURSOR_SIG * minDim) / this.cellSize;
      addGaussian(field, cols, rows, cursor.spX, cursor.spY, cursor.amp * CURSOR_AMP, s, s);
    }
    for (const p of cursor.trail) {
      const s = (TRAIL_SIG * minDim) / this.cellSize;
      addGaussian(field, cols, rows, p.x, p.y, p.amp * TRAIL_AMP, s, s);
    }

    // ── 4. Draw contours ───────────────────────────────────────────────────────
    drawAllContours(
      field, cols, rows, this.cellSize,
      NUM_LEVELS, BASE_ALPHA, INDEX_ALPHA, INDEX_INT,
      ctx
    );
  }
}
