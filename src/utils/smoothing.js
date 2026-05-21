// Curve smoothing for noisy training metrics.
// Two strategies:
//   - 'ma'  : centered* simple moving average over a window of N points.
//             (We use a trailing window here to stay causal — same as TensorBoard.)
//   - 'ema' : exponential moving average; alpha derived from window size as
//             2 / (N + 1), which makes the EMA's "effective window" ≈ N.
// Both preserve the x of each point and only smooth y.

export const SMOOTHING_METHODS = ['none', 'ma', 'ema'];

export function movingAverage(data, window) {
  if (!Array.isArray(data) || data.length === 0) return data;
  const w = Math.max(1, Math.floor(window));
  if (w <= 1) return data;
  const result = new Array(data.length);
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i].y;
    if (i >= w) sum -= data[i - w].y;
    const count = Math.min(i + 1, w);
    result[i] = { x: data[i].x, y: sum / count };
  }
  return result;
}

export function ema(data, window) {
  if (!Array.isArray(data) || data.length === 0) return data;
  const w = Math.max(1, Math.floor(window));
  const alpha = 2 / (w + 1);
  const result = new Array(data.length);
  result[0] = { x: data[0].x, y: data[0].y };
  for (let i = 1; i < data.length; i++) {
    const y = alpha * data[i].y + (1 - alpha) * result[i - 1].y;
    result[i] = { x: data[i].x, y };
  }
  return result;
}

export function smooth(data, method, window) {
  if (!method || method === 'none') return data;
  if (method === 'ma') return movingAverage(data, window);
  if (method === 'ema') return ema(data, window);
  return data;
}
