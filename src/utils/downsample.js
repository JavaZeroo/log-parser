// Largest Triangle Three Buckets (LTTB) — visually faithful downsampling for time-series.
// Reference: Sveinn Steinarsson, "Downsampling Time Series for Visual Representation" (2013).
// Preserves shape (peaks, troughs) far better than uniform sampling.

export const DEFAULT_DOWNSAMPLE_THRESHOLD = 2000;

export function lttb(data, threshold) {
  if (!Array.isArray(data)) return data;
  const n = data.length;
  if (n === 0) return data;
  if (threshold >= n || threshold <= 2) return data;

  const sampled = new Array(threshold);
  const bucketSize = (n - 2) / (threshold - 2);

  sampled[0] = data[0];
  let a = 0;
  let sampledIdx = 1;

  for (let i = 0; i < threshold - 2; i++) {
    // average point of the next bucket (for triangle area computation)
    const avgRangeStart = Math.floor((i + 1) * bucketSize) + 1;
    const avgRangeEnd = Math.min(Math.floor((i + 2) * bucketSize) + 1, n);
    const avgRangeLength = avgRangeEnd - avgRangeStart;

    let avgX = 0;
    let avgY = 0;
    for (let j = avgRangeStart; j < avgRangeEnd; j++) {
      avgX += data[j].x;
      avgY += data[j].y;
    }
    if (avgRangeLength > 0) {
      avgX /= avgRangeLength;
      avgY /= avgRangeLength;
    }

    const rangeOffs = Math.floor(i * bucketSize) + 1;
    const rangeTo = Math.floor((i + 1) * bucketSize) + 1;

    const pointAX = data[a].x;
    const pointAY = data[a].y;

    let maxArea = -1;
    let nextA = rangeOffs;
    let chosen = data[rangeOffs];

    for (let j = rangeOffs; j < rangeTo; j++) {
      const area = Math.abs(
        (pointAX - avgX) * (data[j].y - pointAY) -
        (pointAX - data[j].x) * (avgY - pointAY)
      ) * 0.5;
      if (area > maxArea) {
        maxArea = area;
        chosen = data[j];
        nextA = j;
      }
    }

    sampled[sampledIdx++] = chosen;
    a = nextA;
  }

  sampled[sampledIdx] = data[n - 1];
  return sampled;
}

// Convenience: only downsample if data exceeds threshold; returns original otherwise.
export function maybeDownsample(data, threshold = DEFAULT_DOWNSAMPLE_THRESHOLD) {
  if (!Array.isArray(data)) return data;
  if (data.length <= threshold) return data;
  return lttb(data, threshold);
}
