import type { IScene } from './types';
import { CursorManager } from './cursor';
import { RafLoop } from './loop';

export class BackgroundEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private cursor: CursorManager;
  private loop: RafLoop;
  private scene: IScene | null = null;
  private W = 0;
  private H = 0;
  private cols = 0;
  private rows = 0;
  private resizeTimer: ReturnType<typeof setTimeout> | undefined;
  private onResize: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.cursor = new CursorManager();

    this.loop = new RafLoop(
      (dt) => this.tick(dt),
      () => this.cursor.isSettled() && (this.scene?.isSettled?.() ?? true)
    );

    this.cursor.onActivity = () => this.loop.start();

    this.onResize = () => {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = setTimeout(() => {
        this.loop.stop();
        this.resize();
        if (this.scene) this.renderFrame();
      }, 200);
    };

    window.addEventListener('resize', this.onResize);
    this.resize();
  }

  load(scene: IScene): void {
    this.loop.stop();
    this.scene?.dispose?.();
    this.scene = scene;
    this.cols = Math.ceil(this.W / scene.cellSize) + 2;
    this.rows = Math.ceil(this.H / scene.cellSize) + 2;
    scene.build(this.cols, this.rows);
    this.renderFrame();
    if (!(scene.isSettled?.() ?? true)) {
      this.loop.start();
    }
  }

  destroy(): void {
    this.loop.stop();
    this.cursor.dispose();
    window.removeEventListener('resize', this.onResize);
    clearTimeout(this.resizeTimer);
    this.scene?.dispose?.();
    this.scene = null;
  }

  private resize(): void {
    this.W = window.innerWidth;
    this.H = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width  = Math.round(this.W * dpr);
    this.canvas.height = Math.round(this.H * dpr);
    this.canvas.style.width  = this.W + 'px';
    this.canvas.style.height = this.H + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.cursor.resize(this.W, this.H);

    if (this.scene) {
      this.cols = Math.ceil(this.W / this.scene.cellSize) + 2;
      this.rows = Math.ceil(this.H / this.scene.cellSize) + 2;
      this.scene.build(this.cols, this.rows);
    }
  }

  private tick(dt: number): void {
    this.cursor.tick(dt);
    this.renderFrame();
  }

  private renderFrame(): void {
    if (!this.scene) return;
    this.ctx.clearRect(0, 0, this.W, this.H);
    this.scene.render(this.ctx, this.cursor.getState(), this.W, this.H);
  }
}
