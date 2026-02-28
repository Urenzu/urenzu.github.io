// Text scramble effect — characters cycle through random glyphs then lock in
// left-to-right over a fixed duration.

const GLYPHS = 'abcdefghijklmnopqrstuvwxyz0123456789';

// Characters that should pass through unscrambled
const PASSTHROUGH = new Set([' ', '←', '/', '·', '—', '.', ',']);

function scrambleEl(el: HTMLElement): () => void {
  const original = el.textContent ?? '';
  if (!original.trim()) return () => {};

  // Lock element width so random chars don't cause layout shift
  const w = el.getBoundingClientRect().width;
  if (w > 0) {
    el.style.display = 'inline-block';
    el.style.minWidth = `${w}px`;
  }

  const DURATION = 420; // ms for full left-to-right reveal
  const start    = performance.now();
  let frameCount = 0;
  let rafId      = 0;

  const randGlyph = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)];

  // Pre-generate scramble chars; refresh every 2 frames (~30fps flicker)
  let noise = original.split('').map(c => (PASSTHROUGH.has(c) ? c : randGlyph()));

  const tick = (now: number): void => {
    frameCount++;
    const t = Math.min((now - start) / DURATION, 1);

    if (frameCount % 2 === 0) {
      noise = original.split('').map(c => (PASSTHROUGH.has(c) ? c : randGlyph()));
    }

    const n    = original.length;
    const text = original
      .split('')
      .map((char, i) => {
        if (PASSTHROUGH.has(char)) return char;
        // Each char locks in at its proportional position in the duration
        const threshold = n <= 1 ? 1 : i / (n - 1);
        return t >= threshold ? char : (noise[i] ?? char);
      })
      .join('');

    el.textContent = text;

    if (t < 1) {
      rafId = requestAnimationFrame(tick);
    } else {
      el.textContent = original;
      el.style.minWidth = '';
    }
  };

  rafId = requestAnimationFrame(tick);

  return (): void => {
    cancelAnimationFrame(rafId);
    el.textContent = original;
    el.style.minWidth = '';
  };
}

/**
 * Attach scramble effect to elements matching `hoverSelector`.
 * If `textSelector` is provided, the scramble runs on the matched child
 * element while the hover is detected on the parent (e.g. post entries).
 */
export function initScramble(hoverSelector: string, textSelector?: string): void {
  document.querySelectorAll<HTMLElement>(hoverSelector).forEach(el => {
    const target = textSelector
      ? (el.querySelector<HTMLElement>(textSelector) ?? el)
      : el;

    let cancel: (() => void) | null = null;

    el.addEventListener('mouseenter', () => {
      cancel?.();
      cancel = scrambleEl(target);
    });

    el.addEventListener('mouseleave', () => {
      cancel?.();
      cancel = null;
    });
  });
}
