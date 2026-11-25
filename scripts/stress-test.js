// Exercise the same parsing, chart comparison and CSV code used by the app.
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { parseLog } from '../src/utils/parseLog.js';
import { compareSeries } from '../src/utils/compareSeries.js';
import { buildChartCSV } from '../src/utils/chartExport.js';

const config = {
  useStepKeyword: true,
  stepKeyword: 'step:',
  metrics: [
    { name: 'Loss', mode: 'keyword', keyword: 'loss:' },
    { name: 'Grad', mode: 'keyword', keyword: 'grad_norm:' },
    { name: 'LR', mode: 'regex', regex: 'lr=([\\d.eE+-]+)' }
  ]
};

function measure(label, run, verify, repetitions = 5) {
  if (repetitions > 1) verify(run()); // warm up the same workload
  const times = [];
  for (let i = 0; i < repetitions; i++) {
    globalThis.gc?.();
    const start = performance.now();
    const result = run();
    times.push(performance.now() - start);
    verify(result);
  }
  times.sort((a, b) => a - b);
  const median = times[Math.floor(times.length / 2)].toFixed(1);
  const sample = repetitions === 1 ? 'single run' : `median of ${repetitions}`;
  console.log(`${label} | ${median} ms (${sample})`);
}

function benchmarkParser(count, repetitions) {
  const content = Array.from({ length: count }, (_, i) =>
    `step: ${(i + 1) * 2} | loss: ${(i % 1000) / 1000} | grad_norm: ${(i % 100) / 100} | lr=${i % 97 + 1}e-5`
  ).join('\n');
  measure(`Parse ${count} lines × 3 metrics`, () => parseLog(content, config), data => {
    for (const points of Object.values(data)) assert.equal(points.length, count);
    const last = count - 1;
    assert.deepEqual(data.Loss[last], { x: count * 2, y: (last % 1000) / 1000 });
    assert.deepEqual(data.Grad[last], { x: count * 2, y: (last % 100) / 100 });
    assert.deepEqual(data.LR[last], { x: count * 2, y: Number(`${last % 97 + 1}e-5`) });
  }, repetitions);
}

for (const count of [10_000, 50_000, 100_000, 500_000, 1_000_000]) {
  benchmarkParser(count, count === 100_000 ? 5 : 1);
}

const pointCount = 100_000;
const base = Array.from({ length: pointCount }, (_, i) => ({ x: i * 2, y: i % 100 + 1 }));
const target = base.map(({ x, y }) => ({ x, y: y * 1.5 }));
measure(`Compare 2 series × ${pointCount} points`, () => compareSeries(base, target, 'relative'),
  ({ points, stats }) => {
    assert.equal(points.length, pointCount);
    assert.deepEqual(points[pointCount - 1], { x: (pointCount - 1) * 2, y: 0.5 });
    assert.equal(stats.meanAbsolute, 25.25);
    assert.equal(stats.meanRelative, 0.5);
  });

const csvCount = 20_000;
const datasets = [1, 2, 3].map(offset => ({
  label: `Run ${offset}`,
  data: Array.from({ length: csvCount }, (_, i) => ({ x: i, y: i + offset }))
}));
measure(`Export CSV for 3 series × ${csvCount} points`, () => buildChartCSV(datasets), csv => {
  const rows = csv.split('\n');
  assert.equal(rows.length, csvCount + 1);
  assert.equal(rows[0], 'step,Run 1,Run 2,Run 3');
  assert.equal(rows[csvCount], '19999,20000,20001,20002');
});
console.log(`Peak process RSS (including fixtures): ${(process.resourceUsage().maxRSS / 1024).toFixed(1)} MiB`);
