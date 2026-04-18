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
      { type: 'init', canvas: offscreen, sw: window.innerWidth, sh: window.innerHeight },
      [offscreen],
    );

    window.addEventListener('mousemove', this.onMouse);
    window.addEventListener('touchmove', this.onTouch, { passive: true });
    window.addEventListener('mouseleave', this.onLeave);
    window.addEventListener('resize', this.onResize);
  }

  dispose(): void {
    window.removeEventListener('mousemove', this.onMouse);
    window.removeEventListener('touchmove', this.onTouch);
    window.removeEventListener('mouseleave', this.onLeave);
    window.removeEventListener('resize', this.onResize);
    this.worker.terminate();
  }

  private onMouse = (e: MouseEvent): void => {
    this.worker.postMessage({
      type: 'cursor',
      nx: e.clientX / window.innerWidth,
      ny: e.clientY / window.innerHeight,
      on: true,
    });
  };

  private onTouch = (e: TouchEvent): void => {
    const t = e.touches[0];
    if (!t) return;
    this.worker.postMessage({
      type: 'cursor',
      nx: t.clientX / window.innerWidth,
      ny: t.clientY / window.innerHeight,
      on: true,
    });
  };

  private onLeave = (): void => {
    this.worker.postMessage({ type: 'cursor', nx: 0, ny: 0, on: false });
  };

  private onResize = (): void => {
    clearTimeout(this.resizeTimer);
    this.resizeTimer = window.setTimeout(() => {
      this.worker.postMessage({
        type: 'resize',
        sw: window.innerWidth,
        sh: window.innerHeight,
      });
    }, 250);
  };
}
