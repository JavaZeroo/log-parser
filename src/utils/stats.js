// Compute summary statistics for a y-series of {x, y} points.
// Returns null when the input is empty / invalid so callers can early-return.

export function computeStats(data) {
  if (!Array.isArray(data) || data.length === 0) return null;
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  let valid = 0;
  for (let i = 0; i < data.length; i++) {
    const y = data[i]?.y;
    if (!Number.isFinite(y)) continue;
    if (y < min) min = y;
    if (y > max) max = y;
    sum += y;
    valid++;
  }
  if (valid === 0) return null;
  const mean = sum / valid;
  let variance = 0;
  for (let i = 0; i < data.length; i++) {
    const y = data[i]?.y;
    if (!Number.isFinite(y)) continue;
    const diff = y - mean;
    variance += diff * diff;
  }
  variance /= valid;
  const std = Math.sqrt(variance);
  // Find the last finite y (skip NaN tail)
  let last = null;
  for (let i = data.length - 1; i >= 0; i--) {
    if (Number.isFinite(data[i]?.y)) { last = data[i].y; break; }
  }
  return { min, max, mean, std, last, count: valid };
}
