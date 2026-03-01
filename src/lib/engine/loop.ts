export class RafLoop {
  private rafId: number | null = null;
  private lastTime = 0;

  constructor(
    private readonly onTick: (dt: number) => void,
    private readonly isSettled: () => boolean
  ) {}

  get running(): boolean {
    return this.rafId !== null;
  }

  start(): void {
    if (this.rafId !== null) return;
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private tick = (ts: number): void => {
    const dt = Math.min((ts - this.lastTime) / 1000, 0.05);
    this.lastTime = ts;

    this.onTick(dt);

    this.rafId = this.isSettled() ? null : requestAnimationFrame(this.tick);
  };
}
