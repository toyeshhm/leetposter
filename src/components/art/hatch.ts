/**
 * Procedural linework for the woodcut plates. Pure functions returning SVG path data,
 * so server and client render identical markup.
 */

const fmt = (v: number): string => (Math.round(v * 100) / 100).toString();

/** Tag for SVG path data and transforms: numbers are rounded to two decimals. */
export function d(strings: TemplateStringsArray, ...values: number[]): string {
  let out = strings[0] ?? "";
  values.forEach((v, i) => {
    out += fmt(v) + (strings[i + 1] ?? "");
  });
  return out;
}

/** Parallel strokes at `angle` degrees, `spacing` units apart, clipped to the rectangle. */
export function hatch(x: number, y: number, w: number, h: number, spacing: number, angle: number): string {
  const a = (angle * Math.PI) / 180;
  const dx = Math.cos(a);
  const dy = Math.sin(a);
  const nx = -dy;
  const ny = dx;
  const proj = [x * nx + y * ny, (x + w) * nx + y * ny, x * nx + (y + h) * ny, (x + w) * nx + (y + h) * ny];
  const lo = Math.min(...proj);
  const hi = Math.max(...proj);
  const parts: string[] = [];
  for (let t = lo + spacing / 2; t < hi; t += spacing) {
    const px = t * nx;
    const py = t * ny;
    let s0 = -Infinity;
    let s1 = Infinity;
    if (Math.abs(dx) < 1e-9) {
      if (px < x || px > x + w) continue;
    } else {
      const sa = (x - px) / dx;
      const sb = (x + w - px) / dx;
      s0 = Math.max(s0, Math.min(sa, sb));
      s1 = Math.min(s1, Math.max(sa, sb));
    }
    if (Math.abs(dy) < 1e-9) {
      if (py < y || py > y + h) continue;
    } else {
      const sa = (y - py) / dy;
      const sb = (y + h - py) / dy;
      s0 = Math.max(s0, Math.min(sa, sb));
      s1 = Math.min(s1, Math.max(sa, sb));
    }
    if (s1 <= s0) continue;
    parts.push(`M${fmt(px + s0 * dx)} ${fmt(py + s0 * dy)}L${fmt(px + s1 * dx)} ${fmt(py + s1 * dy)}`);
  }
  return parts.join("");
}

/** `n` radial strokes from radius `r0` to `r1` around (cx, cy), spread evenly over `sweep` degrees from `start`. */
export function ticks(cx: number, cy: number, r0: number, r1: number, n: number, start = 0, sweep = 360): string {
  const parts: string[] = [];
  const full = sweep >= 360;
  for (let i = 0; i < n; i += 1) {
    const deg = start + (sweep * i) / (full ? n : Math.max(1, n - 1));
    const a = (deg * Math.PI) / 180;
    const c = Math.cos(a);
    const s = Math.sin(a);
    parts.push(`M${fmt(cx + r0 * c)} ${fmt(cy + r0 * s)}L${fmt(cx + r1 * c)} ${fmt(cy + r1 * s)}`);
  }
  return parts.join("");
}
