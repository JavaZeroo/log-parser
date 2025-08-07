/**
 * Calculates the moving average of a series of data points.
 * @param {Array<{x: number, y: number}>} data The input data points.
 * @param {number} windowSize The size of the moving average window.
 * @returns {Array<{x: number, y: number}>} The smoothed data points.
 */
export function movingAverage(data, windowSize) {
  if (windowSize <= 1 || data.length < windowSize) {
    return data;
  }

  const smoothedData = [];
  let sum = 0;

  for (let i = 0; i < data.length; i++) {
    sum += data[i].y;

    if (i >= windowSize) {
      sum -= data[i - windowSize].y;
      smoothedData.push({ x: data[i].x, y: sum / windowSize });
    } else if (i === windowSize - 1) {
      // Handle the first full window
      for (let j = 0; j < windowSize; j++) {
        smoothedData.push({ x: data[j].x, y: sum / windowSize });
      }
    }
  }

  return smoothedData;
}
