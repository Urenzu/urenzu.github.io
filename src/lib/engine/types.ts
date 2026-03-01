export interface TrailPeak {
  x: number;
  y: number;
  amp: number;
}

export interface CursorState {
  rawX: number;
  rawY: number;
  spX: number;
  spY: number;
  spVX: number;
  spVY: number;
  amp: number;
  present: boolean;
  trail: readonly TrailPeak[];
}

export interface IScene {
  readonly cellSize: number;
  build(cols: number, rows: number): void;
  render(ctx: CanvasRenderingContext2D, cursor: CursorState, W: number, H: number): void;
  isSettled?(): boolean;
  dispose?(): void;
}
