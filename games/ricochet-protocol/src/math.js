export function reflect(v, n) {
  const d = v.x * n.x + v.y * n.y;
  return { x: v.x - 2 * d * n.x, y: v.y - 2 * d * n.y };
}

export function finiteVec(v) {
  return Number.isFinite(v.x) && Number.isFinite(v.y);
}
