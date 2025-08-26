export function movingAverage(data, windowSize = 5) {
  if (!Array.isArray(data) || windowSize <= 1) return data;
  const result = [];
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const subset = data.slice(start, i + 1);
    const sum = subset.reduce((acc, p) => acc + p.y, 0);
    const avg = sum / subset.length;
    result.push({ x: data[i].x, y: avg });
  }
  return result;
}

export function exponentialMovingAverage(data, alpha = 0.5) {
  if (!Array.isArray(data) || data.length === 0) return data;
  const result = [];
  let prev = data[0].y;
  result.push({ x: data[0].x, y: prev });
  for (let i = 1; i < data.length; i++) {
    const smoothed = alpha * data[i].y + (1 - alpha) * prev;
    result.push({ x: data[i].x, y: smoothed });
    prev = smoothed;
  }
  return result;
}

export function applySmoothing(data, config) {
  if (!config || !config.type) return data;
  switch (config.type) {
    case 'movingAverage':
      return movingAverage(data, config.windowSize || config.window || 5);
    case 'ema':
    case 'exponential':
      return exponentialMovingAverage(data, config.alpha || 0.5);
    default:
      return data;
  }
}
