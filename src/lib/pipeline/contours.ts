// Corner bits: TL=1, TR=2, BR=4, BL=8   |   Edges: 0=top 1=right 2=bottom 3=left

export const LINE_TABLE: Array<Array<[number, number]>> = [
  [],                       // 0
  [[0, 3]],                 // 1  TL
  [[0, 1]],                 // 2  TR
  [[1, 3]],                 // 3  TL TR
  [[1, 2]],                 // 4  BR
  [[0, 1], [2, 3]],         // 5  TL BR (ambiguous)
  [[0, 2]],                 // 6  TR BR
  [[2, 3]],                 // 7  TL TR BR
  [[2, 3]],                 // 8  BL
  [[0, 2]],                 // 9  TL BL
  [[0, 3], [1, 2]],         // 10 TR BL (ambiguous)
  [[1, 2]],                 // 11 TL TR BL
  [[1, 3]],                 // 12 BR BL
  [[0, 1]],                 // 13 TL BR BL
  [[0, 3]],                 // 14 TR BR BL
  [],                       // 15
];

// Inline edge interpolation — avoids function call overhead in the hot path
function ex(edge: number, i: number, j: number, cs: number,
            vTL: number, vTR: number, vBL: number, vBR: number, lv: number): number {
  if (edge === 0) { const d = vTR - vTL; return (i + (Math.abs(d) < 1e-10 ? 0.5 : (lv - vTL) / d)) * cs; }
  if (edge === 1) { return (i + 1) * cs; }
  if (edge === 2) { const d = vBR - vBL; return (i + (Math.abs(d) < 1e-10 ? 0.5 : (lv - vBL) / d)) * cs; }
  /* 3 */           return i * cs;
}
function ey(edge: number, i: number, j: number, cs: number,
            vTL: number, vTR: number, vBL: number, vBR: number, lv: number): number {
  if (edge === 0) { return j * cs; }
  if (edge === 1) { const d = vBR - vTR; return (j + (Math.abs(d) < 1e-10 ? 0.5 : (lv - vTR) / d)) * cs; }
  if (edge === 2) { return (j + 1) * cs; }
  /* 3 */         { const d = vBL - vTL; return (j + (Math.abs(d) < 1e-10 ? 0.5 : (lv - vTL) / d)) * cs; }
}

// Cells-outer loop with range rejection:
// For each cell, compute [cellMin, cellMax] then only iterate levels that
// fall within that range. Reduces ~26M iterations → ~1–2M.
export function drawAllContours(
  field: Float32Array,
  cols: number, rows: number,
  cellSize: number,
  numLevels: number,
  baseAlpha: number,
  indexAlpha: number,
  indexInterval: number,
  ctx: CanvasRenderingContext2D
): void {
  ctx.lineCap  = 'round';
  ctx.lineJoin = 'round';

  const cs = cellSize;
  const inv = 1 / numLevels;

  const drawPass = (indexOnly: boolean) => {
    ctx.beginPath();
    for (let j = 0; j < rows - 1; j++) {
      const row0 = j * cols;
      const row1 = row0 + cols;
      for (let i = 0; i < cols - 1; i++) {
        const vTL = field[row0 + i];
        const vTR = field[row0 + i + 1];
        const vBL = field[row1 + i];
        const vBR = field[row1 + i + 1];

        // Cell value range — only levels inside this range can cross the cell
        const lo = vTL < vTR ? vTL : vTR;
        const hi = vTL > vTR ? vTL : vTR;
        const cellMin = lo < vBL ? (lo < vBR ? lo : vBR) : (vBL < vBR ? vBL : vBR);
        const cellMax = hi > vBL ? (hi > vBR ? hi : vBR) : (vBL > vBR ? vBL : vBR);

        // Level n maps to (n + 0.5) / numLevels; solve for n: n = val*numLevels - 0.5
        const nStart = Math.max(0,            Math.ceil (cellMin * numLevels - 0.5));
        const nEnd   = Math.min(numLevels - 1, Math.floor(cellMax * numLevels - 0.5));

        for (let n = nStart; n <= nEnd; n++) {
          if (indexOnly ? (n % indexInterval !== 0) : (n % indexInterval === 0)) continue;

          const lv = (n + 0.5) * inv;
          const caseId =
            (vTL >= lv ? 1 : 0) |
            (vTR >= lv ? 2 : 0) |
            (vBR >= lv ? 4 : 0) |
            (vBL >= lv ? 8 : 0);

          const segs = LINE_TABLE[caseId];
          for (let s = 0; s < segs.length; s++) {
            const [e0, e1] = segs[s];
            ctx.moveTo(ex(e0, i, j, cs, vTL, vTR, vBL, vBR, lv),
                       ey(e0, i, j, cs, vTL, vTR, vBL, vBR, lv));
            ctx.lineTo(ex(e1, i, j, cs, vTL, vTR, vBL, vBR, lv),
                       ey(e1, i, j, cs, vTL, vTR, vBL, vBR, lv));
          }
        }
      }
    }
    ctx.stroke();
  };

  ctx.strokeStyle = `rgba(255,255,255,${baseAlpha})`;
  ctx.lineWidth   = 0.5;
  drawPass(false);

  ctx.strokeStyle = `rgba(255,255,255,${indexAlpha})`;
  ctx.lineWidth   = 1.0;
  drawPass(true);
}
