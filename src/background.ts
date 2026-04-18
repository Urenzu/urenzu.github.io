export class GrayScottScene {
  private worker: Worker;
  private resizeTimer = 0;

  constructor(private canvas: HTMLCanvasElement) {
    this.worker = new Worker(
      new URL('./background.worker.ts', import.meta.url),
      { type: 'module' },
    );
  }

  init(): void {
    const offscreen = this.canvas.transferControlToOffscreen();
    this.worker.postMessage(
      {
        type: 'init',
        canvas: offscreen,
        sw:  window.innerWidth,
        sh:  window.innerHeight,
        dpr: Math.min(window.devicePixelRatio || 1, 2),
      },
      [offscreen],
    );

    window.addEventListener('resize', this.onResize);
  }

  dispose(): void {
    window.removeEventListener('resize', this.onResize);
    this.worker.terminate();
  }

  private onResize = (): void => {
    clearTimeout(this.resizeTimer);
    this.resizeTimer = window.setTimeout(() => {
      this.worker.postMessage({
        type: 'resize',
        sw:  window.innerWidth,
        sh:  window.innerHeight,
        dpr: Math.min(window.devicePixelRatio || 1, 2),
      });
    }, 250);
  };
}
