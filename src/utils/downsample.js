/**
 * LTTB (Largest Triangle Three Buckets) downsampling algorithm
 * Reduces the number of data points while preserving the visual shape of the chart.
 *
 * This algorithm is more efficient than simple sampling because it:
 * 1. Preserves local maxima and minima (peaks and valleys)
 * 2. Maintains the overall trend of the data
 * 3. Keeps first and last points
 *
 * @param {Array<{x: number, y: number}>} data - Input data points
 * @param {number} threshold - Target number of points after downsampling
 * @returns {Array<{x: number, y: number}>} - Downsampled data points
 */
export function downsampleLTTB(data, threshold) {
  // Return original data if threshold is greater or no downsampling needed
  if (!data || data.length <= threshold || threshold < 3) {
    return data;
  }

  const dataLength = data.length;
  const sampled = [];

  // Bucket size (excluding first and last points which are always included)
  const bucketSize = (dataLength - 2) / (threshold - 2);

  // Always include the first point
  sampled.push(data[0]);

  let prevSelectedIndex = 0;

  for (let i = 0; i < threshold - 2; i++) {
    // Calculate bucket boundaries
    const bucketStart = Math.floor((i + 0) * bucketSize) + 1;
    const bucketEnd = Math.floor((i + 1) * bucketSize) + 1;

    // Calculate next bucket boundaries for average point
    const nextBucketStart = Math.floor((i + 1) * bucketSize) + 1;
    const nextBucketEnd = Math.min(Math.floor((i + 2) * bucketSize) + 1, dataLength);

    // Calculate the average point in the next bucket
    let avgX = 0;
    let avgY = 0;
    const nextBucketLength = nextBucketEnd - nextBucketStart;

    for (let j = nextBucketStart; j < nextBucketEnd; j++) {
      avgX += data[j].x;
      avgY += data[j].y;
    }
    avgX /= nextBucketLength;
    avgY /= nextBucketLength;

    // Get the previous selected point
    const prevPoint = data[prevSelectedIndex];

    // Find the point in current bucket with largest triangle area
    let maxArea = -1;
    let selectedIndex = bucketStart;

    for (let j = bucketStart; j < bucketEnd && j < dataLength - 1; j++) {
      const currentPoint = data[j];

      // Calculate triangle area (using cross product formula)
      const area = Math.abs(
        (prevPoint.x - avgX) * (currentPoint.y - prevPoint.y) -
        (prevPoint.x - currentPoint.x) * (avgY - prevPoint.y)
      );

      if (area > maxArea) {
        maxArea = area;
        selectedIndex = j;
      }
    }

    sampled.push(data[selectedIndex]);
    prevSelectedIndex = selectedIndex;
  }

  // Always include the last point
  sampled.push(data[dataLength - 1]);

  return sampled;
}

/**
 * Simple min-max downsampling that preserves peaks and valleys
 * For each bucket, keeps both the minimum and maximum values
 *
 * @param {Array<{x: number, y: number}>} data - Input data points
 * @param {number} numBuckets - Number of buckets to divide data into
 * @returns {Array<{x: number, y: number}>} - Downsampled data points
 */
export function downsampleMinMax(data, numBuckets) {
  if (!data || data.length <= numBuckets * 2) {
    return data;
  }

  const dataLength = data.length;
  const bucketSize = dataLength / numBuckets;
  const sampled = [];

  for (let i = 0; i < numBuckets; i++) {
    const bucketStart = Math.floor(i * bucketSize);
    const bucketEnd = Math.floor((i + 1) * bucketSize);

    let minPoint = data[bucketStart];
    let maxPoint = data[bucketStart];

    for (let j = bucketStart; j < bucketEnd && j < dataLength; j++) {
      if (data[j].y < minPoint.y) minPoint = data[j];
      if (data[j].y > maxPoint.y) maxPoint = data[j];
    }

    // Add points in x-order to maintain proper line drawing
    if (minPoint.x <= maxPoint.x) {
      sampled.push(minPoint);
      if (minPoint !== maxPoint) sampled.push(maxPoint);
    } else {
      sampled.push(maxPoint);
      if (minPoint !== maxPoint) sampled.push(minPoint);
    }
  }

  return sampled;
}

/**
 * Adaptive downsampling based on data size
 * Automatically chooses the best threshold based on screen/chart width
 *
 * @param {Array<{x: number, y: number}>} data - Input data points
 * @param {number} [maxPoints=2000] - Maximum points to display
 * @returns {Array<{x: number, y: number}>} - Downsampled data points
 */
export function adaptiveDownsample(data, maxPoints = 2000) {
  if (!data || data.length <= maxPoints) {
    return data;
  }

  // Use LTTB for best visual quality
  return downsampleLTTB(data, maxPoints);
}

/**
 * Get recommended max points based on data characteristics
 * @param {number} dataLength - Original data length
 * @param {number} chartWidth - Approximate chart width in pixels
 * @returns {number} - Recommended number of points
 */
export function getRecommendedMaxPoints(dataLength, chartWidth = 1200) {
  // Rule of thumb: no more than 2-3 points per pixel for smooth lines
  const maxByWidth = Math.ceil(chartWidth * 2);

  // But also consider absolute limits for memory
  const absoluteMax = 5000;

  return Math.min(maxByWidth, absoluteMax, dataLength);
}
