// Align on the original steps. Keep every baseline point in input order and
// use the last target value when a training step occurs more than once.
export function compareSeries(base, target, mode) {
  const targetByStep = new Map();
  for (const { x, y } of target) targetByStep.set(x, y);

  const points = [];
  let sumNormal = 0;
  let sumAbsolute = 0;
  let sumSignedRelative = 0;
  let sumRelative = 0;
  let maxAbsolute = 0;
  let maxRelative = 0;
  for (const { x, y } of base) {
    if (!targetByStep.has(x)) continue;
    const normal = targetByStep.get(x) - y;
    const absolute = Math.abs(normal);
    const signedRelative = y !== 0 ? normal / y : 0;
    const relative = Math.abs(signedRelative);
    let difference = normal;
    switch (mode) {
      case 'absolute': difference = absolute; break;
      case 'relative-normal': difference = signedRelative; break;
      case 'relative': difference = relative; break;
    }
    points.push({ x, y: difference });
    sumNormal += normal;
    sumAbsolute += absolute;
    sumSignedRelative += signedRelative;
    sumRelative += relative;
    if (absolute > maxAbsolute) maxAbsolute = absolute;
    if (relative > maxRelative) maxRelative = relative;
  }
  const count = points.length;
  return {
    points,
    stats: {
      meanNormal: sumNormal / count || 0,
      meanAbsolute: sumAbsolute / count || 0,
      relativeError: sumSignedRelative / count || 0,
      meanRelative: sumRelative / count || 0,
      maxAbsolute,
      maxRelative
    }
  };
}
