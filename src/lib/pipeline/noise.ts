function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerpN(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

function grad(hash: number, x: number, y: number): number {
  const h = hash & 7;
  const u = h < 4 ? x : y;
  const v = h < 4 ? y : x;
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}

export function buildPerm(seed: number): Uint8Array {
  let s = seed >>> 0;
  const rng = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  return perm;
}

export function makeNoise(perm: Uint8Array): (x: number, y: number) => number {
  return (x: number, y: number): number => {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = fade(xf);
    const v = fade(yf);
    const aa = perm[perm[X]     + Y];
    const ab = perm[perm[X]     + Y + 1];
    const ba = perm[perm[X + 1] + Y];
    const bb = perm[perm[X + 1] + Y + 1];
    return lerpN(
      lerpN(grad(aa, xf,     yf    ), grad(ba, xf - 1, yf    ), u),
      lerpN(grad(ab, xf,     yf - 1), grad(bb, xf - 1, yf - 1), u),
      v
    );
  };
}

export function makeFbm(
  noise: (x: number, y: number) => number,
  octaves = 5
): (x: number, y: number) => number {
  return (x: number, y: number): number => {
    let val = 0, amp = 0.5, freq = 1, maxVal = 0;
    for (let i = 0; i < octaves; i++) {
      val    += noise(x * freq, y * freq) * amp;
      maxVal += amp;
      amp    *= 0.5;
      freq   *= 2.0;
    }
    return val / maxVal;
  };
}
