export type Vec2 = { x: number; y: number };
export const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export function pointToSegmentDistanceSquared(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay, lenSq = dx * dx + dy * dy;
  if (lenSq === 0) { const x = px - ax, y = py - ay; return x * x + y * y; }
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / lenSq, 0, 1);
  const qx = ax + t * dx, qy = ay + t * dy;
  const x = px - qx, y = py - qy;
  return x * x + y * y;
}
