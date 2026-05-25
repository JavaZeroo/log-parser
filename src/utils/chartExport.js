// Image export helpers for chart panels.
// - chartToSmallPNG: downscales a Chart.js canvas iteratively until the
//   PNG blob fits under a byte budget (default 50 KB).
// - buildCombinedReport: composites every registered chart into a single
//   PNG with a branded header band, card-style chart cells, per-chart stats
//   tables with zebra striping, and a footer. Designed for direct paste
//   into PRs / issues.

const DEFAULT_MAX_BYTES = 50 * 1024;
const MIN_DIM = { w: 240, h: 120 };
const FONT_STACK = 'Inter, "Inter Variable", ui-sans-serif, system-ui, sans-serif';
const MONO_STACK = '"JetBrains Mono", "JetBrains Mono Variable", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

// Brand palette — matches the Log Analyzer logo gradient + sidebar accents.
const BRAND = {
  gradStart: '#3b82f6', // blue-500
  gradMid:   '#8b5cf6', // violet-500
  gradEnd:   '#6366f1', // indigo-500
  accent:    '#6366f1', // indigo-500 (left card bar)
  bg:        '#f5f7fa', // canvas backdrop
  card:      '#ffffff',
  cardBorder:'#e5e7eb',
  zebra:     '#f9fafb',
  textPri:   '#0f172a',
  textSec:   '#4b5563',
  textMute:  '#9ca3af',
  emphasis:  '#111827'
};

function isCanvas(c) {
  return c && c.canvas && typeof c.canvas.toBlob === 'function';
}

function scaleCanvasToBlob(source, scale) {
  if (!source) return Promise.resolve(null);
  const w = Math.max(MIN_DIM.w, Math.floor(source.width * scale));
  const h = Math.max(MIN_DIM.h, Math.floor(source.height * scale));
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  const ctx = off.getContext('2d');
  if (!ctx) return Promise.resolve(null);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, w, h);
  return new Promise((resolve) => off.toBlob(resolve, 'image/png'));
}

export async function chartToSmallPNG(chart, maxBytes = DEFAULT_MAX_BYTES) {
  if (!isCanvas(chart)) return null;
  const source = chart.canvas;
  let scale = 1;
  let lastBlob = null;
  for (let i = 0; i < 10; i++) {
    const blob = await scaleCanvasToBlob(source, scale);
    if (!blob) return lastBlob;
    lastBlob = blob;
    if (blob.size <= maxBytes) return blob;
    scale *= 0.78;
  }
  return lastBlob;
}

// ----- shared canvas helpers -------------------------------------------

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function truncate(s, max) {
  if (!s) return '';
  return s.length > max ? s.slice(0, Math.max(0, max - 1)) + '…' : s;
}

function fmtNumber(n) {
  if (n == null || !Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  if (abs !== 0 && (abs >= 1e6 || abs < 1e-3)) return n.toExponential(2);
  if (abs >= 100) return n.toFixed(2);
  if (abs >= 1)   return n.toFixed(4);
  return n.toFixed(5);
}

function statsFor(data) {
  if (!Array.isArray(data) || data.length === 0) return null;
  let min = Infinity, max = -Infinity, sum = 0, n = 0;
  for (const p of data) {
    const y = p?.y;
    if (Number.isFinite(y)) {
      if (y < min) min = y;
      if (y > max) max = y;
      sum += y;
      n++;
    }
  }
  if (n === 0) return null;
  let last = null;
  for (let i = data.length - 1; i >= 0; i--) {
    if (Number.isFinite(data[i]?.y)) { last = data[i].y; break; }
  }
  return { min, max, mean: sum / n, last, count: n };
}

// Stats table with zebra rows and emphasized 'last' column.
// Returns the y position immediately below the table.
function drawStatsTable(ctx, x, y, w, datasets) {
  if (!datasets || datasets.length === 0) return y;

  const headerH = 16;
  const rowH = 18;
  const valueCols = ['min', 'max', 'mean', 'last', 'n'];
  const numColW = 72;
  const nameColW = Math.max(80, w - valueCols.length * numColW);

  // Header row text
  ctx.font = `600 10px ${FONT_STACK}`;
  ctx.fillStyle = BRAND.textMute;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillText('FILE', x + 18, y);
  ctx.textAlign = 'right';
  valueCols.forEach((label, i) => {
    const cx = x + nameColW + (i + 1) * numColW - 8;
    ctx.fillText(label.toUpperCase(), cx, y);
  });

  // Underline
  ctx.strokeStyle = BRAND.cardBorder;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y + 6);
  ctx.lineTo(x + w, y + 6);
  ctx.stroke();

  // Data rows
  let curY = y + headerH + 4;
  for (let i = 0; i < datasets.length; i++) {
    const ds = datasets[i];
    const s = statsFor(ds.data);
    if (!s) continue;

    // Zebra background for every other row
    if (i % 2 === 1) {
      ctx.fillStyle = BRAND.zebra;
      roundRect(ctx, x, curY - 13, w, rowH, 4);
      ctx.fill();
    }

    // Color swatch (rounded square so it reads as a legend marker)
    ctx.fillStyle = ds.borderColor || ds.backgroundColor || '#3b82f6';
    roundRect(ctx, x + 4, curY - 9, 10, 10, 2);
    ctx.fill();

    // File name (sans serif)
    ctx.fillStyle = BRAND.textSec;
    ctx.textAlign = 'left';
    ctx.font = `500 11px ${FONT_STACK}`;
    ctx.fillText(truncate(ds.label || '', Math.floor(nameColW / 6.5)), x + 20, curY);

    // Numeric values (mono)
    ctx.textAlign = 'right';
    const values = [s.min, s.max, s.mean, s.last, s.count];
    values.forEach((v, j) => {
      const cx = x + nameColW + (j + 1) * numColW - 8;
      const text = j === values.length - 1 ? String(v) : fmtNumber(v);
      if (j === 3) {
        // Emphasize 'last' — usually the most-checked number.
        ctx.fillStyle = BRAND.emphasis;
        ctx.font = `600 11px ${MONO_STACK}`;
      } else {
        ctx.fillStyle = BRAND.textSec;
        ctx.font = `400 11px ${MONO_STACK}`;
      }
      ctx.fillText(text, cx, curY);
    });

    curY += rowH;
  }
  return curY;
}

// ----- combined report -----------------------------------------------

// Heuristic classification by chartId — matches the IDs ChartContainer uses
// when registering its charts.
function classifyChart(id) {
  if (id === 'combined') return 'combined';
  if (typeof id === 'string' && id.startsWith('metric-comp-')) return 'comparison';
  return 'main';
}

// One section heading: brand dot + label + count + horizontal rule.
function drawSectionHeader(ctx, x, y, w, label, count) {
  ctx.fillStyle = BRAND.accent;
  roundRect(ctx, x, y + 4, 6, 6, 1.5);
  ctx.fill();

  ctx.fillStyle = BRAND.textSec;
  ctx.font = `700 11px ${FONT_STACK}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const upper = (label || '').toUpperCase();
  ctx.fillText(upper, x + 14, y + 11);

  const labelW = ctx.measureText(upper).width;
  ctx.fillStyle = BRAND.textMute;
  ctx.font = `500 11px ${FONT_STACK}`;
  const countText = `· ${count}`;
  ctx.fillText(countText, x + 14 + labelW + 5, y + 11);
  const countW = ctx.measureText(countText).width;

  ctx.strokeStyle = BRAND.cardBorder;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 14 + labelW + 5 + countW + 10, y + 8);
  ctx.lineTo(x + w, y + 8);
  ctx.stroke();
}

export async function buildCombinedReport(chartEntries, opts = {}) {
  try {
    return await buildCombinedReportInner(chartEntries, opts);
  } catch (err) {
    // Centralized failure handler — the call site sees null and can show a
    // sensible toast, while devtools gets the actual stack for debugging.
    // eslint-disable-next-line no-console
    console.error('buildCombinedReport failed', err);
    return null;
  }
}

async function buildCombinedReportInner(chartEntries, opts = {}) {
  const all = (chartEntries || []).filter(([, e]) => e && isCanvas(e.chart));
  if (all.length === 0) return null;

  const {
    title = 'ML Log Analyzer Report',
    timestamp = new Date().toLocaleString(),
    files = [],
    meta = null,
    chartW = 760,
    chartH = 340,
    pad = 20,
    cellPad = 18,
    cellRadius = 12,
    footerNote = 'Generated by ML Log Analyzer · log.javazero.top',
    sectionLabels = {
      main: 'Charts',
      comparison: 'Comparisons',
      combined: 'Combined view'
    }
  } = opts;

  // Group entries by section. Order: main → comparison → combined.
  const groups = { main: [], comparison: [], combined: [] };
  for (const entry of all) {
    const [id] = entry;
    groups[classifyChart(id)].push(entry);
  }
  const sectionOrder = ['main', 'comparison', 'combined'].filter(
    s => groups[s].length > 0
  );

  // Compute per-cell heights. `tuple` is [id, { chart, title }] — destructure
  // out the entry payload before measuring the chart's dataset count.
  const cellHFor = (tuple) => {
    const entry = tuple && tuple[1];
    const ds = entry?.chart?.data?.datasets?.length || 0;
    const statsH = ds > 0 ? 16 + 4 + ds * 18 + 8 : 0;
    return 2 * cellPad + 24 + chartH + (statsH > 0 ? 12 + statsH : 0);
  };

  // Per-section layout metadata
  const cols = 2; // 2-col grid within each section (1 chart will still render at chartW)
  const sectionMeta = sectionOrder.map(name => {
    const entries = groups[name];
    const sCols = entries.length === 1 ? 1 : cols;
    const sRows = Math.ceil(entries.length / sCols);
    const rowHs = [];
    for (let r = 0; r < sRows; r++) {
      let m = 0;
      for (let c = 0; c < sCols; c++) {
        const i = r * sCols + c;
        if (i < entries.length) m = Math.max(m, cellHFor(entries[i]));
      }
      rowHs.push(m);
    }
    return { name, entries, sCols, sRows, rowHs };
  });

  // Outer dimensions
  const headerH = 96;
  const filesStripH = files.length > 0 ? 32 : 0;
  const footerH = 36;
  const sectionHeaderH = 20;
  const sectionGap = 16;
  const totalW = cols * chartW + (cols + 1) * pad;

  // Total height = header + files + (each section's header + rows + gap) + footer
  const sectionsContentH = sectionMeta.reduce((acc, sec) => {
    const rowsH = sec.rowHs.reduce((s, h) => s + h, 0)
      + Math.max(0, sec.rowHs.length) * pad; // gap between rows + below
    return acc + sectionHeaderH + 6 /* gap below header */ + rowsH + sectionGap;
  }, 0);

  const totalH = headerH + filesStripH + pad + sectionsContentH + footerH;

  const off = document.createElement('canvas');
  off.width = totalW;
  off.height = totalH;
  const ctx = off.getContext('2d');
  if (!ctx) return null;

  ctx.textBaseline = 'alphabetic';

  // --- canvas backdrop ---
  ctx.fillStyle = BRAND.bg;
  ctx.fillRect(0, 0, totalW, totalH);

  // --- HEADER: gradient band ---
  const grad = ctx.createLinearGradient(0, 0, totalW, headerH);
  grad.addColorStop(0,   BRAND.gradStart);
  grad.addColorStop(0.5, BRAND.gradMid);
  grad.addColorStop(1,   BRAND.gradEnd);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, totalW, headerH);

  // Subtle diagonal stripe overlay for that "official report" feel
  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = '#ffffff';
  for (let i = -headerH; i < totalW; i += 24) {
    ctx.beginPath();
    ctx.moveTo(i, headerH);
    ctx.lineTo(i + headerH, 0);
    ctx.lineTo(i + headerH + 12, 0);
    ctx.lineTo(i + 12, headerH);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Logo mark — three white bars rising left→right, evoking the in-app icon
  const logoX = pad + 4;
  const logoY = 28;
  ctx.fillStyle = '#ffffff';
  [10, 16, 22].forEach((h, i) => {
    roundRect(ctx, logoX + i * 9, logoY + (22 - h), 6, h, 1.5);
    ctx.fill();
  });

  // Title
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 22px ${FONT_STACK}`;
  ctx.textAlign = 'left';
  ctx.fillText(title, logoX + 42, 42);

  // Subtitle line: counts + config summary
  const summaryParts = [
    `${all.length} chart${all.length !== 1 ? 's' : ''}`,
    `${files.length} file${files.length !== 1 ? 's' : ''}`
  ];
  if (meta) {
    Object.entries(meta)
      .filter(([, v]) => v != null && v !== '')
      .forEach(([k, v]) => summaryParts.push(`${k}: ${v}`));
  }
  ctx.font = `500 12.5px ${FONT_STACK}`;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  const sub = summaryParts.join('  ·  ');
  ctx.fillText(truncate(sub, Math.floor((totalW - 240) / 6.5)), logoX + 42, 64);

  // Timestamp top-right (mono so it parses as data, not chrome)
  ctx.textAlign = 'right';
  ctx.font = `500 12px ${MONO_STACK}`;
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fillText(timestamp, totalW - pad - 4, 42);

  // --- FILES STRIP (only if files passed) ---
  if (filesStripH > 0) {
    const fy = headerH;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, fy, totalW, filesStripH);
    ctx.strokeStyle = BRAND.cardBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, fy + filesStripH - 0.5);
    ctx.lineTo(totalW, fy + filesStripH - 0.5);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = BRAND.textMute;
    ctx.font = `600 10px ${FONT_STACK}`;
    ctx.fillText('FILES', pad + 4, fy + 19);
    ctx.fillStyle = BRAND.textSec;
    ctx.font = `400 12px ${MONO_STACK}`;
    const filesText = files.join('  ·  ');
    ctx.fillText(truncate(filesText, Math.floor((totalW - 100) / 7)), pad + 50, fy + 19);
  }

  // --- SECTIONS WITH CHARTS ---
  let cursorY = headerH + filesStripH + pad;
  for (const sec of sectionMeta) {
    // Section header (label + count + rule)
    const sectionLabel = sectionLabels[sec.name] || sec.name;
    drawSectionHeader(ctx, pad, cursorY, totalW - 2 * pad, sectionLabel, sec.entries.length);
    cursorY += sectionHeaderH + 6;

    // Chart grid within the section
    for (let r = 0; r < sec.sRows; r++) {
      for (let c = 0; c < sec.sCols; c++) {
        const i = r * sec.sCols + c;
        if (i >= sec.entries.length) continue;
        const [, entry] = sec.entries[i];
        const { chart, title: chartTitle } = entry;
        const x = pad + c * (chartW + pad);
        const y = cursorY;
        const h = sec.rowHs[r];

        // Card drop shadow
        ctx.save();
        ctx.shadowColor = 'rgba(15, 23, 42, 0.08)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 2;
        ctx.fillStyle = BRAND.card;
        roundRect(ctx, x, y, chartW, h, cellRadius);
        ctx.fill();
        ctx.restore();

        // Card hairline border
        ctx.strokeStyle = BRAND.cardBorder;
        ctx.lineWidth = 1;
        roundRect(ctx, x + 0.5, y + 0.5, chartW - 1, h - 1, cellRadius);
        ctx.stroke();

        // Left brand accent bar — color shifts subtly by section to reinforce
        // grouping (blue for main, violet for comparison, indigo for combined).
        const accentColor = sec.name === 'comparison'
          ? BRAND.gradMid
          : sec.name === 'combined'
            ? BRAND.gradEnd
            : BRAND.gradStart;
        ctx.fillStyle = accentColor;
        roundRect(ctx, x, y + 8, 4, h - 16, 2);
        ctx.fill();

        // Title row
        const innerX = x + cellPad;
        const innerW = chartW - 2 * cellPad;
        const innerY = y + cellPad;

        ctx.fillStyle = BRAND.textPri;
        ctx.font = `600 15px ${FONT_STACK}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(truncate(chartTitle || '', Math.floor(innerW / 9)), innerX, innerY + 15);

        const totalPoints = (chart.data?.datasets || [])
          .reduce((s, ds) => s + (ds.data?.length || 0), 0);
        ctx.font = `400 11px ${MONO_STACK}`;
        ctx.fillStyle = BRAND.textMute;
        ctx.textAlign = 'right';
        ctx.fillText(`${totalPoints} pts`, x + chartW - cellPad, innerY + 15);

        ctx.drawImage(chart.canvas, innerX, innerY + 24, innerW, chartH);

        const datasets = chart.data?.datasets || [];
        if (datasets.length > 0) {
          drawStatsTable(ctx, innerX, innerY + 24 + chartH + 22, innerW, datasets);
        }
      }
      cursorY += sec.rowHs[r] + pad;
    }
    cursorY += sectionGap - pad; // pad already added by the last row; section gap on top
  }

  // --- FOOTER ---
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillStyle = BRAND.textMute;
  ctx.font = `400 11px ${FONT_STACK}`;
  ctx.fillText(footerNote, totalW / 2, totalH - footerH / 2);
  ctx.textBaseline = 'alphabetic';

  return new Promise((resolve) => {
    off.toBlob((blob) => {
      if (!blob) {
        // eslint-disable-next-line no-console
        console.error(
          `report toBlob returned null (canvas ${totalW}×${totalH}px) — ` +
          'usually means the canvas exceeded the browser limit or a source ' +
          'chart canvas was tainted (CORS).'
        );
      }
      resolve(blob);
    }, 'image/png');
  });
}
