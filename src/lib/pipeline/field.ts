export function addGaussian(
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

export function normalizeField(field: Float32Array): void {
  let min = Infinity, max = -Infinity;
  for (let k = 0; k < field.length; k++) {
    if (field[k] < min) min = field[k];
    if (field[k] > max) max = field[k];
  }
  const range = max - min || 1;
  for (let k = 0; k < field.length; k++) field[k] = (field[k] - min) / range;
}
