import type { CursorState, TrailPeak } from './types';

const SPRING_K       = 140;
const SPRING_B       = 22;
const TRAIL_HALF_LIFE  = 380;
const TRAIL_VEL_THR    = 0.0028;
const TRAIL_COOLDOWN   = 90;
const MAX_TRAIL        = 6;

export class CursorManager {
  onActivity: () => void = () => {};

  private W = 1;
  private H = 1;

  private rawX = 0.5;
  private rawY = 0.5;
  private present = false;
  private amp = 0;

  private spX = 0.5;
  private spY = 0.5;
  private spVX = 0;
  private spVY = 0;

  private trail: TrailPeak[] = [];
  private prevMX = 0;
  private prevMY = 0;
  private prevMT = 0;
  private lastTrailT = 0;

  private onMouseMove: (e: MouseEvent) => void;
  private onMouseLeave: () => void;

  constructor() {
    this.onMouseMove = (e: MouseEvent) => {
      const nx  = e.clientX / this.W;
      const ny  = e.clientY / this.H;
      const now = performance.now();

      if (this.prevMT > 0) {
        const dt = now - this.prevMT;
        if (dt > 0) {
          const vx    = (nx - this.prevMX) / dt;
          const vy    = (ny - this.prevMY) / dt;
          const speed = Math.sqrt(vx * vx + vy * vy);
          if (
            speed > TRAIL_VEL_THR &&
            this.trail.length < MAX_TRAIL &&
            now - this.lastTrailT > TRAIL_COOLDOWN
          ) {
            this.trail.push({ x: this.prevMX, y: this.prevMY, amp: 1 });
            this.lastTrailT = now;
          }
        }
      }

      this.rawX = nx;
      this.rawY = ny;
      this.prevMX = nx;
      this.prevMY = ny;
      this.prevMT = now;
      this.present = true;
      this.onActivity();
    };

    this.onMouseLeave = () => {
      this.present = false;
      this.onActivity();
    };

    window.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseleave', this.onMouseLeave);
  }

  resize(W: number, H: number): void {
    this.W = W;
    this.H = H;
  }

  tick(dt: number): void {
    this.amp += ((this.present ? 1 : 0) - this.amp) * (1 - Math.exp(-dt * 7));

    this.spVX += ((this.rawX - this.spX) * SPRING_K - this.spVX * SPRING_B) * dt;
    this.spVY += ((this.rawY - this.spY) * SPRING_K - this.spVY * SPRING_B) * dt;
    this.spX  += this.spVX * dt;
    this.spY  += this.spVY * dt;

    const decayFactor = Math.pow(0.5, (dt * 1000) / TRAIL_HALF_LIFE);
    for (let i = this.trail.length - 1; i >= 0; i--) {
      this.trail[i].amp *= decayFactor;
      if (this.trail[i].amp < 0.015) this.trail.splice(i, 1);
    }
  }

  getState(): CursorState {
    return {
      rawX: this.rawX,
      rawY: this.rawY,
      spX: this.spX,
      spY: this.spY,
      spVX: this.spVX,
      spVY: this.spVY,
      amp: this.amp,
      present: this.present,
      trail: this.trail,
    };
  }

  isSettled(): boolean {
    const dx = this.spX - this.rawX;
    const dy = this.spY - this.rawY;
    return (
      dx * dx + dy * dy < 1e-8 &&
      this.spVX * this.spVX + this.spVY * this.spVY < 1e-8 &&
      this.trail.length === 0 &&
      Math.abs(this.amp - (this.present ? 1 : 0)) < 0.005
    );
  }

  dispose(): void {
    window.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseleave', this.onMouseLeave);
  }
}
