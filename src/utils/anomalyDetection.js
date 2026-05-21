// Client-side anomaly detection for training metric curves.
//
// We surface four classes of events ML engineers actually scan for:
//
//   - 'nan'        : any non-finite value (NaN / Infinity) — almost always a bug
//   - 'explosion'  : sudden multiplicative jump (|y_i| > factor × |y_{i-1}|)
//                    typical of gradient blow-up
//   - 'spike'      : z-score outlier relative to rolling window
//                    typical of LR-too-high noise bursts
//   - 'plateau'    : long stretch with near-zero change
//                    typical of stuck training / dead activations
//
// Each detector is intentionally independent so callers can disable any of
// them and so we can unit-test each path in isolation.

const DEFAULTS = {
  explosionFactor: 5,        // y_i must be at least 5× |y_{i-1}|
  explosionMinAbs: 1e-6,     // ignore noise around zero
  spikeWindow: 30,           // rolling window for z-score
  spikeZThreshold: 4,        // 4σ — conservative to avoid false positives
  plateauWindow: 50,         // require N consecutive small deltas
  plateauEpsilon: 1e-7       // |Δy| below this counts as "no change"
};

export const ANOMALY_TYPES = ['nan', 'explosion', 'spike', 'plateau'];

// Quick non-finite check that also catches null/undefined safely.
function isBad(y) {
  return y === null || y === undefined || !Number.isFinite(y);
}

export function detectAnomalies(data, options = {}) {
  if (!Array.isArray(data) || data.length === 0) return [];
  const opts = { ...DEFAULTS, ...options };
  const events = [];
  const seen = new Set(); // dedupe (x, type) pairs

  // Pass 1: NaN / Inf — single sweep, severity = 'high'.
  for (let i = 0; i < data.length; i++) {
    const p = data[i];
    if (!p) continue;
    if (isBad(p.y)) {
      const key = `${p.x}:nan`;
      if (!seen.has(key)) {
        seen.add(key);
        events.push({
          x: p.x,
          y: NaN,
          type: 'nan',
          severity: 'high',
          message: 'Non-finite value (NaN or Infinity)'
        });
      }
    }
  }

  // Pass 2: explosion — adjacent multiplicative jump.
  for (let i = 1; i < data.length; i++) {
    const prev = data[i - 1];
    const cur = data[i];
    if (!prev || !cur) continue;
    if (isBad(prev.y) || isBad(cur.y)) continue;
    const prevAbs = Math.abs(prev.y);
    const curAbs = Math.abs(cur.y);
    if (prevAbs < opts.explosionMinAbs) continue;
    if (curAbs >= prevAbs * opts.explosionFactor) {
      const key = `${cur.x}:explosion`;
      if (!seen.has(key)) {
        seen.add(key);
        events.push({
          x: cur.x,
          y: cur.y,
          type: 'explosion',
          severity: 'high',
          message: `Value jumped ${(curAbs / prevAbs).toFixed(1)}× from previous step`
        });
      }
    }
  }

  // Pass 3: spike — rolling mean / std z-score outliers.
  // Use a trailing window so the spike is judged against context that
  // *preceded* it (not including the spike point itself).
  if (data.length >= opts.spikeWindow + 1) {
    const w = opts.spikeWindow;
    let sum = 0;
    let sumSq = 0;
    let validCount = 0;
    const ring = []; // values inside current window
    for (let i = 0; i < data.length; i++) {
      const y = data[i]?.y;
      const valid = !isBad(y);
      if (i >= w && validCount >= Math.floor(w / 2)) {
        const mean = sum / validCount;
        const variance = sumSq / validCount - mean * mean;
        const std = variance > 0 ? Math.sqrt(variance) : 0;
        if (valid && std > 0) {
          const z = Math.abs((y - mean) / std);
          if (z >= opts.spikeZThreshold) {
            const key = `${data[i].x}:spike`;
            if (!seen.has(key)) {
              seen.add(key);
              events.push({
                x: data[i].x,
                y,
                type: 'spike',
                severity: z >= opts.spikeZThreshold * 1.5 ? 'high' : 'medium',
                message: `${z.toFixed(1)}σ outlier vs prior ${w} points`
              });
            }
          }
        }
      }
      // Slide window — push current, evict oldest beyond w.
      ring.push({ y, valid });
      if (valid) {
        sum += y;
        sumSq += y * y;
        validCount++;
      }
      if (ring.length > w) {
        const drop = ring.shift();
        if (drop.valid) {
          sum -= drop.y;
          sumSq -= drop.y * drop.y;
          validCount--;
        }
      }
    }
  }

  // Pass 4: plateau — N consecutive small deltas. Report once per plateau
  // (at the *end* of the flat region) to avoid spamming.
  if (data.length >= opts.plateauWindow + 1) {
    let runLen = 0;
    for (let i = 1; i < data.length; i++) {
      const prev = data[i - 1];
      const cur = data[i];
      if (!prev || !cur || isBad(prev.y) || isBad(cur.y)) {
        runLen = 0;
        continue;
      }
      if (Math.abs(cur.y - prev.y) <= opts.plateauEpsilon) {
        runLen++;
        // Emit on the FIRST step at/just past the threshold, then keep counting
        // but don't re-emit until the plateau ends.
        if (runLen === opts.plateauWindow) {
          const startX = data[i - opts.plateauWindow + 1]?.x ?? cur.x;
          const key = `${cur.x}:plateau`;
          if (!seen.has(key)) {
            seen.add(key);
            events.push({
              x: cur.x,
              y: cur.y,
              type: 'plateau',
              severity: 'low',
              message: `No change for ${opts.plateauWindow}+ steps (since x=${startX})`
            });
          }
        }
      } else {
        runLen = 0;
      }
    }
  }

  // Stable ordering: by x, then by type priority (high-severity classes first).
  const typeOrder = { nan: 0, explosion: 1, spike: 2, plateau: 3 };
  events.sort((a, b) => {
    if (a.x !== b.x) return a.x - b.x;
    return (typeOrder[a.type] ?? 99) - (typeOrder[b.type] ?? 99);
  });
  return events;
}

// Convenience: aggregate counts by type for summary panels.
export function summarizeAnomalies(events) {
  const summary = { total: events.length, nan: 0, explosion: 0, spike: 0, plateau: 0 };
  for (const e of events) {
    if (summary[e.type] !== undefined) summary[e.type]++;
  }
  return summary;
}
