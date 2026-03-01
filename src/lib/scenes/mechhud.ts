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

// ── Mech wireframe vertex data (relative coords, center = 0,0, unit scale) ──
// Each segment is [x1, y1, x2, y2] — will be scaled + translated to center
const MECH_LINES: number[][] = [
  // ── Head ──
  [-0.06, -0.42, 0.06, -0.42],   // top
  [-0.06, -0.42, -0.08, -0.36],  // left slope
  [0.06, -0.42, 0.08, -0.36],    // right slope
  [-0.08, -0.36, 0.08, -0.36],   // visor line
  [-0.08, -0.36, -0.06, -0.32],  // chin left
  [0.08, -0.36, 0.06, -0.32],    // chin right
  [-0.06, -0.32, 0.06, -0.32],   // chin bottom
  // visor detail
  [-0.05, -0.38, 0.05, -0.38],
  [-0.04, -0.40, 0.04, -0.40],

  // ── Neck ──
  [-0.03, -0.32, -0.03, -0.28],
  [0.03, -0.32, 0.03, -0.28],

  // ── Torso upper (chest) ──
  [-0.03, -0.28, -0.18, -0.24],  // left shoulder connect
  [0.03, -0.28, 0.18, -0.24],    // right shoulder connect
  [-0.18, -0.24, -0.16, -0.06],  // left chest wall
  [0.18, -0.24, 0.16, -0.06],    // right chest wall
  [-0.16, -0.06, -0.12, 0.0],    // left waist taper
  [0.16, -0.06, 0.12, 0.0],      // right waist taper
  // chest plate detail
  [-0.12, -0.22, 0.12, -0.22],
  [-0.14, -0.18, 0.14, -0.18],
  [-0.13, -0.14, 0.13, -0.14],
  [-0.10, -0.22, -0.10, -0.10],  // vert detail left
  [0.10, -0.22, 0.10, -0.10],    // vert detail right
  // reactor core circle represented as octagon
  [-0.04, -0.20, -0.06, -0.17],
  [-0.06, -0.17, -0.04, -0.14],
  [-0.04, -0.14, 0.04, -0.14],
  [0.04, -0.14, 0.06, -0.17],
  [0.06, -0.17, 0.04, -0.20],
  [0.04, -0.20, -0.04, -0.20],

  // ── Waist / hip ──
  [-0.12, 0.0, 0.12, 0.0],       // belt line
  [-0.12, 0.0, -0.14, 0.04],     // left hip
  [0.12, 0.0, 0.14, 0.04],       // right hip
  [-0.14, 0.04, -0.10, 0.06],    // left hip bottom
  [0.14, 0.04, 0.10, 0.06],      // right hip bottom
  [-0.10, 0.06, 0.10, 0.06],     // crotch line
  // hip armor plates
  [-0.14, 0.01, -0.18, 0.06],
  [-0.18, 0.06, -0.14, 0.10],
  [0.14, 0.01, 0.18, 0.06],
  [0.18, 0.06, 0.14, 0.10],

  // ── Left shoulder pauldron ──
  [-0.18, -0.26, -0.28, -0.28],
  [-0.28, -0.28, -0.30, -0.22],
  [-0.30, -0.22, -0.26, -0.18],
  [-0.26, -0.18, -0.18, -0.20],
  // pauldron detail
  [-0.22, -0.27, -0.22, -0.19],

  // ── Right shoulder pauldron ──
  [0.18, -0.26, 0.28, -0.28],
  [0.28, -0.28, 0.30, -0.22],
  [0.30, -0.22, 0.26, -0.18],
  [0.26, -0.18, 0.18, -0.20],
  // pauldron detail
  [0.22, -0.27, 0.22, -0.19],

  // ── Left arm ──
  [-0.26, -0.18, -0.24, -0.08],  // upper arm outer
  [-0.20, -0.20, -0.20, -0.08],  // upper arm inner
  [-0.24, -0.08, -0.26, -0.06],  // elbow outer
  [-0.20, -0.08, -0.22, -0.06],  // elbow inner
  [-0.26, -0.06, -0.24, 0.08],   // forearm outer
  [-0.22, -0.06, -0.20, 0.08],   // forearm inner
  [-0.24, 0.08, -0.20, 0.08],    // wrist
  // hand / weapon mount
  [-0.25, 0.08, -0.26, 0.14],
  [-0.19, 0.08, -0.18, 0.14],
  [-0.26, 0.14, -0.18, 0.14],
  // weapon barrel
  [-0.23, 0.14, -0.23, 0.20],
  [-0.21, 0.14, -0.21, 0.20],
  [-0.25, 0.20, -0.19, 0.20],

  // ── Right arm ──
  [0.26, -0.18, 0.24, -0.08],
  [0.20, -0.20, 0.20, -0.08],
  [0.24, -0.08, 0.26, -0.06],
  [0.20, -0.08, 0.22, -0.06],
  [0.26, -0.06, 0.24, 0.08],
  [0.22, -0.06, 0.20, 0.08],
  [0.24, 0.08, 0.20, 0.08],
  // hand
  [0.25, 0.08, 0.26, 0.14],
  [0.19, 0.08, 0.18, 0.14],
  [0.26, 0.14, 0.18, 0.14],
  // shield mount
  [0.27, 0.04, 0.32, 0.00],
  [0.32, 0.00, 0.34, 0.08],
  [0.34, 0.08, 0.30, 0.14],
  [0.30, 0.14, 0.26, 0.12],

  // ── Left leg ──
  [-0.10, 0.06, -0.14, 0.20],    // upper leg outer
  [-0.06, 0.06, -0.08, 0.20],    // upper leg inner
  [-0.14, 0.20, -0.16, 0.22],    // knee outer
  [-0.08, 0.20, -0.10, 0.22],    // knee inner
  [-0.16, 0.22, -0.14, 0.38],    // lower leg outer
  [-0.10, 0.22, -0.10, 0.38],    // lower leg inner
  // knee armor
  [-0.16, 0.18, -0.19, 0.22],
  [-0.19, 0.22, -0.16, 0.26],
  // foot
  [-0.16, 0.38, -0.18, 0.40],
  [-0.18, 0.40, -0.18, 0.42],
  [-0.18, 0.42, -0.06, 0.42],
  [-0.06, 0.42, -0.06, 0.40],
  [-0.06, 0.40, -0.10, 0.38],
  // foot detail
  [-0.14, 0.40, -0.14, 0.42],

  // ── Right leg ──
  [0.10, 0.06, 0.14, 0.20],
  [0.06, 0.06, 0.08, 0.20],
  [0.14, 0.20, 0.16, 0.22],
  [0.08, 0.20, 0.10, 0.22],
  [0.16, 0.22, 0.14, 0.38],
  [0.10, 0.22, 0.10, 0.38],
  // knee armor
  [0.16, 0.18, 0.19, 0.22],
  [0.19, 0.22, 0.16, 0.26],
  // foot
  [0.16, 0.38, 0.18, 0.40],
  [0.18, 0.40, 0.18, 0.42],
  [0.18, 0.42, 0.06, 0.42],
  [0.06, 0.42, 0.06, 0.40],
  [0.06, 0.40, 0.10, 0.38],
  // foot detail
  [0.14, 0.40, 0.14, 0.42],

  // ── Backpack / thrusters ──
  [-0.14, -0.24, -0.16, -0.26],
  [-0.16, -0.26, -0.16, -0.10],
  [-0.16, -0.10, -0.14, -0.08],
  [0.14, -0.24, 0.16, -0.26],
  [0.16, -0.26, 0.16, -0.10],
  [0.16, -0.10, 0.14, -0.08],
  // thruster nozzles
  [-0.17, -0.12, -0.20, -0.10],
  [-0.20, -0.10, -0.20, -0.04],
  [-0.20, -0.04, -0.17, -0.02],
  [0.17, -0.12, 0.20, -0.10],
  [0.20, -0.10, 0.20, -0.04],
  [0.20, -0.04, 0.17, -0.02],
];

// Diagnostic callout definitions: [body x, body y, label x offset, label]
const MECH_CALLOUTS: [number, number, number, string][] = [
  [-0.04, -0.38, -0.52, 'HEAD SENSOR  正常'],
  [-0.18, -0.17, -0.55, 'R-ARM 兵装  ONLINE'],
  [0.18, -0.17,   0.22, 'L-ARM SHIELD 98%'],
  [0.00, -0.17,   0.22, 'REACTOR  出力安定'],
  [-0.12, 0.20,  -0.55, 'R-LEG 駆動系  OK'],
  [0.12, 0.20,    0.22, 'L-LEG 駆動系  OK'],
  [0.00, 0.02,    0.22, 'WAIST GYRO  安定'],
  [-0.19, -0.07, -0.55, 'THRUSTER  待機'],
];

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

    // ═══ Layer 5: Mech wireframe schematic (center) ══════════════════════════
    this.drawMechSchematic(ctx, t, W, H, font);

    // ═══ Layer 6: Targeting reticles ═════════════════════════════════════════
    // Update positions — first two drift around edges, third tracks cursor
    this.reticles[0].x = W * 0.18 + Math.sin(t * 0.2) * 30;
    this.reticles[0].y = H * 0.45 + Math.cos(t * 0.15) * 25;
    this.reticles[1].x = W * 0.82 + Math.sin(t * 0.17 + 2) * 30;
    this.reticles[1].y = H * 0.50 + Math.cos(t * 0.22 + 1) * 25;
    this.reticles[2].x = this.trackX;
    this.reticles[2].y = this.trackY;

    for (const ret of this.reticles) {
      ret.rotation = t * 0.4;
      this.drawReticle(ctx, ret, t, font);
    }

    // ═══ Layer 7: Data panels ════════════════════════════════════════════════
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

    // ═══ Layer 8: Gauge bars ═════════════════════════════════════════════════
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

  // ── Mech wireframe schematic ────────────────────────────────────────────────
  private drawMechSchematic(
    ctx: CanvasRenderingContext2D,
    t: number,
    W: number,
    H: number,
    font: string
  ): void {
    const cx = W / 2;
    const cy = H / 2;
    const scale = Math.min(W, H) * 0.55;

    // ── Wireframe body ──
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (const seg of MECH_LINES) {
      ctx.moveTo(cx + seg[0] * scale, cy + seg[1] * scale);
      ctx.lineTo(cx + seg[2] * scale, cy + seg[3] * scale);
    }
    ctx.stroke();

    // ── Scanning line (sweeps up and down over mech) ──
    const scanRange = 0.46 * scale;
    const scanY = cy + Math.sin(t * 0.8) * scanRange;
    const scanGrad = ctx.createLinearGradient(cx - 0.35 * scale, scanY, cx + 0.35 * scale, scanY);
    scanGrad.addColorStop(0, 'rgba(255,255,255,0)');
    scanGrad.addColorStop(0.3, 'rgba(255,255,255,0.15)');
    scanGrad.addColorStop(0.5, 'rgba(255,255,255,0.25)');
    scanGrad.addColorStop(0.7, 'rgba(255,255,255,0.15)');
    scanGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = scanGrad;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - 0.35 * scale, scanY);
    ctx.lineTo(cx + 0.35 * scale, scanY);
    ctx.stroke();

    // Scan line glow fade above/below
    for (let i = 1; i <= 4; i++) {
      const a = 0.04 * (1 - i / 5);
      ctx.strokeStyle = `rgba(255,255,255,${a})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(cx - 0.30 * scale, scanY + i * 3);
      ctx.lineTo(cx + 0.30 * scale, scanY + i * 3);
      ctx.moveTo(cx - 0.30 * scale, scanY - i * 3);
      ctx.lineTo(cx + 0.30 * scale, scanY - i * 3);
      ctx.stroke();
    }

    // ── Diagnostic callout lines ──
    ctx.setLineDash([3, 4]);
    ctx.font = `9px ${font}`;
    for (const [bx, by, lxOff, label] of MECH_CALLOUTS) {
      const bodyX = cx + bx * scale;
      const bodyY = cy + by * scale;
      const labelX = cx + lxOff * scale;
      const labelY = bodyY;
      const midX = bodyX + (labelX - bodyX) * 0.6;

      // Pulsing alpha per callout
      const a = 0.12 + 0.06 * Math.sin(t * 1.2 + bx * 10 + by * 7);

      ctx.strokeStyle = `rgba(255,255,255,${a})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      // Angled line from body point to label
      ctx.moveTo(bodyX, bodyY);
      ctx.lineTo(midX, labelY);
      ctx.lineTo(labelX, labelY);
      ctx.stroke();

      // Small dot at body anchor
      ctx.fillStyle = `rgba(255,255,255,${a + 0.08})`;
      ctx.beginPath();
      ctx.arc(bodyX, bodyY, 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Label text
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      if (lxOff < 0) {
        // Right-align: text ends at labelX
        const tw = ctx.measureText(label).width;
        ctx.fillText(label, labelX - tw, labelY - 4);
      } else {
        ctx.fillText(label, labelX, labelY - 4);
      }
    }
    ctx.setLineDash([]);

    // ── Status text below mech ──
    const statusY = cy + 0.48 * scale;
    ctx.font = `10px ${font}`;
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.textAlign = 'center';
    ctx.fillText('AC-07 ARMORED FRAME  —  COMBAT READY', cx, statusY);
    ctx.font = `8px ${font}`;
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.fillText(`全装甲展開  同期率 ${(97 + Math.sin(t * 0.7) * 2.5).toFixed(1)}%  NEURAL LINK ACTIVE`, cx, statusY + 14);
    ctx.textAlign = 'left';

    // ── Bounding frame around mech ──
    const frameW = 0.42 * scale;
    const frameH = 0.48 * scale;
    const cornerLen = 18;
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    // Top-left
    ctx.moveTo(cx - frameW, cy - frameH + cornerLen); ctx.lineTo(cx - frameW, cy - frameH); ctx.lineTo(cx - frameW + cornerLen, cy - frameH);
    // Top-right
    ctx.moveTo(cx + frameW - cornerLen, cy - frameH); ctx.lineTo(cx + frameW, cy - frameH); ctx.lineTo(cx + frameW, cy - frameH + cornerLen);
    // Bottom-left
    ctx.moveTo(cx - frameW, cy + frameH - cornerLen); ctx.lineTo(cx - frameW, cy + frameH); ctx.lineTo(cx - frameW + cornerLen, cy + frameH);
    // Bottom-right
    ctx.moveTo(cx + frameW - cornerLen, cy + frameH); ctx.lineTo(cx + frameW, cy + frameH); ctx.lineTo(cx + frameW, cy + frameH - cornerLen);
    ctx.stroke();
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
