export function buildPaging({ page = 1, limit = 20 }) {
  const p = Math.max(parseInt(page), 1);
  const l = Math.max(parseInt(limit), 1);
  return { offset: (p - 1) * l, limit: l };
}
