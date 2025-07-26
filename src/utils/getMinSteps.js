export function getMinSteps(parsedFiles = []) {
  const enabled = parsedFiles.filter(f => f.enabled !== false);
  if (enabled.length === 0) return 0;
  const lengths = enabled.map(file => {
    const datasets = Object.values(file.metricsData || {});
    if (datasets.length === 0) return 0;
    return datasets.reduce((m, d) => Math.max(m, d.length), 0);
  });
  return Math.min(...lengths);
}
