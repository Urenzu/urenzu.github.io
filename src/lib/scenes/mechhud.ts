import type { IScene, CursorState } from '../engine/types';

// ── Japanese status strings ────────────────────────────────────────────────────
const JP_LINES = [
  '機体状態：正常',     'システム起動完了',   '目標捕捉：完了',
  '戦闘モード：待機',   'エネルギー充填中',   '兵装システム確認',
  'レーダー走査中',     '通信リンク：確立',   '装甲integrity：98%',
  'ニューラルリンク同期', '索敵範囲：拡大',    '火器管制：オンライン',
  '姿勢制御：安定',     '推進剤残量：82%',   'センサーアレイ起動',
  '電子戦装備：待機',   'IFF識別：味方',     '射撃統制：自動',
];

const HEX_CHARS = '0123456789ABCDEF';
const STATUS_CODES = [
  'SYS OK  0x00', 'LINK UP 0x01', 'TGT ACQ 0x02', 'SYNC 99.7%',
  'ARM RDY 0x04', 'NAV FIX 0x05', 'PWR NOM 0x06', 'SCAN ACT',
  'THERM OK 32C', 'BRG 247.3',    'ALT 1420m',    'VEL 0.0m/s',
];

const GAUGE_LABELS = ['PWR', 'SYN', 'THR', 'ARM', 'COM'];

// ── Helpers ────────────────────────────────────────────────────────────────────
function hexLine(): string {
  let s = '';
  for (let i = 0; i < 24; i++) s += HEX_CHARS[(Math.random() * 16) | 0];
  return s.replace(/(.{4})/g, '$1 ').trim();
}

function dist(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x1 - x2, dy = y1 - y2;
  return Math.sqrt(dx * dx + dy * dy);
}

// ── Panel data ─────────────────────────────────────────────────────────────────
interface Panel {
  x: number; y: number; w: number; h: number;
  lines: string[];
  scrollOffset: number;
}

interface Reticle {
  x: number; y: number; radius: number; rotation: number;
  label: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
export class MechHudScene implements IScene {
  readonly cellSize = 100; // not grid-based; value doesn't matter much

  private W = 0;
  private H = 0;
  private startTime = 0;

  // Panels
  private panels: Panel[] = [];

  // Reticles
  private reticles: Reticle[] = [];

  // Grid drift
  private gridOffsetX = 0;
  private gridOffsetY = 0;

  // Cursor-tracking reticle smooth position
  private trackX = 0;
  private trackY = 0;

  build(_cols: number, _rows: number): void {
    this.startTime = performance.now();
  }

  isSettled(): boolean { return false; }

  private initLayout(W: number, H: number): void {
    this.W = W;
    this.H = H;
    this.trackX = W / 2;
    this.trackY = H / 2;

    // Generate panel text pools
    const makeLines = (): string[] => {
      const out: string[] = [];
      for (let i = 0; i < 60; i++) {
        const r = Math.random();
        if (r < 0.35) out.push(JP_LINES[(Math.random() * JP_LINES.length) | 0]);
        else if (r < 0.65) out.push(hexLine());
        else out.push(STATUS_CODES[(Math.random() * STATUS_CODES.length) | 0]);
      }
      return out;
    };

    const pw = Math.min(260, W * 0.18);
    const ph = Math.min(160, H * 0.16);
    const margin = 30;

    this.panels = [
      { x: margin,          y: margin,           w: pw, h: ph, lines: makeLines(), scrollOffset: 0 },
      { x: W - margin - pw, y: margin,           w: pw, h: ph, lines: makeLines(), scrollOffset: 0 },
      { x: margin,          y: H - margin - ph,  w: pw, h: ph, lines: makeLines(), scrollOffset: 0 },
      { x: W - margin - pw, y: H - margin - ph,  w: pw, h: ph, lines: makeLines(), scrollOffset: 0 },
    ];

    this.reticles = [
      { x: W * 0.35, y: H * 0.4,  radius: 60, rotation: 0, label: 'TGT-A  BRG 247' },
      { x: W * 0.65, y: H * 0.55, radius: 50, rotation: 0, label: 'TGT-B  RNG 1.4k' },
      { x: W * 0.5,  y: H * 0.5,  radius: 45, rotation: 0, label: 'TRACK  LOCK' },
    ];
  }

  render(ctx: CanvasRenderingContext2D, cursor: CursorState, W: number, H: number): void {
    if (W !== this.W || H !== this.H) this.initLayout(W, H);

    const t = (performance.now() - this.startTime) / 1000;
    const font = '"Space Mono", monospace';

    // ── Smooth cursor-tracking reticle ───────────────────────────────────────
    if (cursor.present) {
      this.trackX += (cursor.spX * this.cellSize - this.trackX) * 0.05;
      this.trackY += (cursor.spY * this.cellSize - this.trackY) * 0.05;
    }
    // Cursor position in pixels
    const cxPx = cursor.present ? cursor.spX * this.cellSize : -1000;
    const cyPx = cursor.present ? cursor.spY * this.cellSize : -1000;

    // ═══ Layer 1: Scan lines ═════════════════════════════════════════════════
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let y = 0; y < H; y += 3) {
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
    }
    ctx.stroke();

    // ═══ Layer 2: Grid overlay ═══════════════════════════════════════════════
    const gridSpacing = 80;
    this.gridOffsetX = (t * 3) % gridSpacing;
    this.gridOffsetY = (t * 2) % gridSpacing;

    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let x = -gridSpacing + this.gridOffsetX; x < W + gridSpacing; x += gridSpacing) {
      // Cursor proximity brightening handled per-segment would be expensive;
      // just draw base grid, then overlay bright zone
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
    }
    for (let y = -gridSpacing + this.gridOffsetY; y < H + gridSpacing; y += gridSpacing) {
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.stroke();

    // Cursor-proximate grid brightening
    if (cursor.present) {
      const brightR = 150;
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      for (let x = -gridSpacing + this.gridOffsetX; x < W + gridSpacing; x += gridSpacing) {
        if (Math.abs(x - cxPx) < brightR) {
          const y0 = Math.max(0, cyPx - brightR);
          const y1 = Math.min(H, cyPx + brightR);
          ctx.moveTo(x, y0);
          ctx.lineTo(x, y1);
        }
      }
      for (let y = -gridSpacing + this.gridOffsetY; y < H + gridSpacing; y += gridSpacing) {
        if (Math.abs(y - cyPx) < brightR) {
          const x0 = Math.max(0, cxPx - brightR);
          const x1 = Math.min(W, cxPx + brightR);
          ctx.moveTo(x0, y);
          ctx.lineTo(x1, y);
        }
      }
      ctx.stroke();
    }

    // ═══ Layer 3: Edge markers ═══════════════════════════════════════════════
    const tickSpacing = 30;
    const tickShort = 6;
    const tickLong = 14;
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 0.5;
    ctx.font = `8px ${font}`;
    ctx.beginPath();

    // Top & bottom edges
    for (let x = 0; x < W; x += tickSpacing) {
      const idx = (x / tickSpacing) | 0;
      const long = idx % 5 === 0;
      const len = long ? tickLong : tickShort;
      ctx.moveTo(x, 0); ctx.lineTo(x, len);
      ctx.moveTo(x, H); ctx.lineTo(x, H - len);
    }
    // Left & right edges
    for (let y = 0; y < H; y += tickSpacing) {
      const idx = (y / tickSpacing) | 0;
      const long = idx % 5 === 0;
      const len = long ? tickLong : tickShort;
      ctx.moveTo(0, y); ctx.lineTo(len, y);
      ctx.moveTo(W, y); ctx.lineTo(W - len, y);
    }
    ctx.stroke();

    // Coordinate labels on long ticks
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    for (let x = 0; x < W; x += tickSpacing) {
      if (((x / tickSpacing) | 0) % 5 === 0) {
        ctx.fillText(String((x / tickSpacing) | 0), x + 2, tickLong + 10);
      }
    }
    for (let y = 0; y < H; y += tickSpacing) {
      if (((y / tickSpacing) | 0) % 5 === 0) {
        ctx.fillText(String((y / tickSpacing) | 0), tickLong + 2, y + 3);
      }
    }

    // ═══ Layer 4: Connection lines ═══════════════════════════════════════════
    ctx.setLineDash([4, 6]);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    // Connect reticles to nearest panels
    for (let i = 0; i < Math.min(this.reticles.length, this.panels.length); i++) {
      const r = this.reticles[i];
      const p = this.panels[i];
      ctx.moveTo(r.x, r.y);
      ctx.lineTo(p.x + p.w / 2, p.y + p.h / 2);
    }
    ctx.stroke();

    // Pulse dot along first connection
    if (this.reticles.length > 0 && this.panels.length > 0) {
      const r = this.reticles[0];
      const p = this.panels[0];
      const prog = (t * 0.3) % 1;
      const px = r.x + (p.x + p.w / 2 - r.x) * prog;
      const py = r.y + (p.y + p.h / 2 - r.y) * prog;
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Cursor connection line
    if (cursor.present) {
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.beginPath();
      ctx.moveTo(cxPx, cyPx);
      const nearestR = this.reticles[2];
      ctx.lineTo(nearestR.x, nearestR.y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // ═══ Layer 5: Targeting reticles ═════════════════════════════════════════
    // Update positions — first two drift, third tracks cursor
    this.reticles[0].x = W * 0.35 + Math.sin(t * 0.2) * 40;
    this.reticles[0].y = H * 0.4 + Math.cos(t * 0.15) * 30;
    this.reticles[1].x = W * 0.65 + Math.sin(t * 0.17 + 2) * 35;
    this.reticles[1].y = H * 0.55 + Math.cos(t * 0.22 + 1) * 25;
    this.reticles[2].x = this.trackX;
    this.reticles[2].y = this.trackY;

    for (const ret of this.reticles) {
      ret.rotation = t * 0.4;
      this.drawReticle(ctx, ret, t, font);
    }

    // ═══ Layer 6: Data panels ════════════════════════════════════════════════
    const lineH = 14;
    const scrollSpeed = 40; // px/s

    for (const panel of this.panels) {
      panel.scrollOffset = (t * scrollSpeed) % (panel.lines.length * lineH);
      const cursorNear = cursor.present && dist(cxPx, cyPx, panel.x + panel.w / 2, panel.y + panel.h / 2) < 200;
      const bracketAlpha = cursorNear ? 0.4 : 0.2;

      // Bracket corners
      const bLen = 12;
      ctx.strokeStyle = `rgba(255,255,255,${bracketAlpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      // Top-left
      ctx.moveTo(panel.x, panel.y + bLen); ctx.lineTo(panel.x, panel.y); ctx.lineTo(panel.x + bLen, panel.y);
      // Top-right
      ctx.moveTo(panel.x + panel.w - bLen, panel.y); ctx.lineTo(panel.x + panel.w, panel.y); ctx.lineTo(panel.x + panel.w, panel.y + bLen);
      // Bottom-left
      ctx.moveTo(panel.x, panel.y + panel.h - bLen); ctx.lineTo(panel.x, panel.y + panel.h); ctx.lineTo(panel.x + bLen, panel.y + panel.h);
      // Bottom-right
      ctx.moveTo(panel.x + panel.w - bLen, panel.y + panel.h); ctx.lineTo(panel.x + panel.w, panel.y + panel.h); ctx.lineTo(panel.x + panel.w, panel.y + panel.h - bLen);
      ctx.stroke();

      // Clipped scrolling text
      ctx.save();
      ctx.beginPath();
      ctx.rect(panel.x + 4, panel.y + 4, panel.w - 8, panel.h - 8);
      ctx.clip();

      ctx.font = `10px ${font}`;
      ctx.fillStyle = `rgba(255,255,255,${cursorNear ? 0.3 : 0.2})`;

      const visibleLines = Math.ceil(panel.h / lineH) + 2;
      const startIdx = Math.floor(panel.scrollOffset / lineH);

      for (let i = 0; i < visibleLines; i++) {
        const lineIdx = (startIdx + i) % panel.lines.length;
        const yPos = panel.y + 14 + i * lineH - (panel.scrollOffset % lineH);
        ctx.fillText(panel.lines[lineIdx], panel.x + 8, yPos);
      }

      // Blinking cursor caret
      if (Math.sin(t * 4) > 0) {
        const caretLine = (startIdx + visibleLines - 2) % panel.lines.length;
        const caretText = panel.lines[caretLine];
        const caretX = panel.x + 8 + ctx.measureText(caretText).width + 2;
        const caretY = panel.y + 14 + (visibleLines - 2) * lineH - (panel.scrollOffset % lineH);
        ctx.fillStyle = `rgba(255,255,255,${cursorNear ? 0.5 : 0.3})`;
        ctx.fillRect(caretX, caretY - 10, 6, 12);
      }

      ctx.restore();
    }

    // ═══ Layer 7: Gauge bars ═════════════════════════════════════════════════
    const gaugeW = 80;
    const gaugeH = 6;
    const gaugeX = W / 2 - (GAUGE_LABELS.length * (gaugeW + 20)) / 2;
    const gaugeY = H - 45;
    const cursorNearGauges = cursor.present && Math.abs(cyPx - gaugeY) < 60 && Math.abs(cxPx - W / 2) < 300;

    ctx.font = `9px ${font}`;
    for (let i = 0; i < GAUGE_LABELS.length; i++) {
      const x = gaugeX + i * (gaugeW + 20);
      const fill = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * 1.5 + i * 1.3));

      // Label
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillText(GAUGE_LABELS[i], x, gaugeY - 4);

      // Bar background
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x, gaugeY, gaugeW, gaugeH);

      // Bar fill
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(x, gaugeY, gaugeW * fill, gaugeH);

      // Numeric readout on cursor proximity
      if (cursorNearGauges) {
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillText(`${(fill * 100).toFixed(1)}%`, x + gaugeW + 4, gaugeY + 6);
      }
    }
  }

  // ── Reticle drawing helper ─────────────────────────────────────────────────
  private drawReticle(
    ctx: CanvasRenderingContext2D,
    ret: Reticle,
    _t: number,
    font: string
  ): void {
    const { x, y, radius, rotation } = ret;
    const alpha = 0.25;

    ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.lineWidth = 0.5;

    // Outer ring
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Inner ring
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.6, 0, Math.PI * 2);
    ctx.stroke();

    // Rotating tick marks on outer ring
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const cos = Math.cos(angle), sin = Math.sin(angle);
      ctx.moveTo(cos * (radius - 5), sin * (radius - 5));
      ctx.lineTo(cos * (radius + 5), sin * (radius + 5));
    }
    ctx.stroke();
    ctx.restore();

    // Counter-rotating inner ticks
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-rotation * 0.7);
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const cos = Math.cos(angle), sin = Math.sin(angle);
      const r0 = radius * 0.6;
      ctx.moveTo(cos * (r0 - 4), sin * (r0 - 4));
      ctx.lineTo(cos * (r0 + 4), sin * (r0 + 4));
    }
    ctx.stroke();
    ctx.restore();

    // Crosshairs
    const chLen = radius * 0.35;
    ctx.beginPath();
    ctx.moveTo(x - chLen, y); ctx.lineTo(x - 4, y);
    ctx.moveTo(x + 4, y);     ctx.lineTo(x + chLen, y);
    ctx.moveTo(x, y - chLen); ctx.lineTo(x, y - 4);
    ctx.moveTo(x, y + 4);     ctx.lineTo(x, y + chLen);
    ctx.stroke();

    // Center dot
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fill();

    // Label below
    ctx.font = `9px ${font}`;
    ctx.fillStyle = `rgba(255,255,255,0.2)`;
    ctx.fillText(ret.label, x - radius * 0.6, y + radius + 14);
  }

  dispose(): void { /* nothing to clean up */ }
}
