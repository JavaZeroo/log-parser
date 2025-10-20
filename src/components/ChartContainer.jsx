import React, { useMemo, useRef, useCallback, useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { ResizablePanel } from './ResizablePanel';
import {
  Chart as ChartJS,
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';
import { Copy, FileDown } from 'lucide-react';
import jsPDF from 'jspdf';
import { getMinSteps } from "../utils/getMinSteps.js";
import { useTranslation } from 'react-i18next';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  zoomPlugin
);

const ChartWrapper = ({ data, options, chartId, onRegisterChart, onSyncHover, syncRef }) => {
  const chartRef = useRef(null);

  const handleChartRef = useCallback((ref) => {
    if (ref) {
      chartRef.current = ref;
      onRegisterChart(chartId, ref);
    }
  }, [chartId, onRegisterChart]);

  const enhancedOptions = {
    ...options,
    onHover: (event, activeElements) => {
      if (syncRef?.current) return;
      if (activeElements.length > 0 && chartRef.current) {
        // Find the data point closest to the cursor
        let closestElement = activeElements[0];
        let minDistance = Infinity;
        
        // Ensure canvas exists (may not in tests)
        if (chartRef.current.canvas && chartRef.current.canvas.getBoundingClientRect) {
          const canvasRect = chartRef.current.canvas.getBoundingClientRect();
          const mouseX = event.native ? event.native.clientX - canvasRect.left : event.x;
          
          activeElements.forEach(element => {
            const { datasetIndex, index } = element;
            const dataset = chartRef.current.data.datasets[datasetIndex];
            const point = dataset.data[index];
            const pixelX = chartRef.current.scales.x.getPixelForValue(point.x);
            const distance = Math.abs(mouseX - pixelX);
            
            if (distance < minDistance) {
              minDistance = distance;
              closestElement = element;
            }
          });
        }
        
        const { datasetIndex, index } = closestElement;
        const dataset = chartRef.current.data.datasets[datasetIndex];
        const point = dataset.data[index];
        const step = point.x;
        onSyncHover(step, chartId);
      } else {
        onSyncHover(null, chartId);
      }
    },
    events: ['mousemove', 'mouseout', 'click', 'touchstart', 'touchmove'],
  };

  const handleContainerMouseLeave = useCallback(() => {
    onSyncHover(null, chartId);
  }, [onSyncHover, chartId]);

  return (
    <div onMouseLeave={handleContainerMouseLeave} style={{ width: '100%', height: '100%' }}>
      <Line ref={handleChartRef} data={data} options={enhancedOptions} />
    </div>
  );
};

export default function ChartContainer({
  files,
  metrics = [],
  compareMode,
  multiFileMode = 'baseline',
  baselineFile,
  relativeBaseline = 0.002,
  absoluteBaseline = 0.005,
  xRange = { min: undefined, max: undefined },
  onXRangeChange,
  onMaxStepChange
}) {
  const chartRefs = useRef(new Map());
  const { t } = useTranslation();
  const syncLockRef = useRef(false);
  const [smoothing, setSmoothing] = useState({ method: 'none', window: 5 });
  const [exportFormat, setExportFormat] = useState('png');

  const registerChart = useCallback((id, inst) => {
    chartRefs.current.set(id, inst);
  }, []);

  const exportChart = useCallback((id, format) => {
    const chart = chartRefs.current.get(id);
    if (!chart) return;

    const datasets = chart.data.datasets || [];
    const xValues = new Set();
    datasets.forEach(ds => {
      (ds.data || []).forEach(p => xValues.add(p.x));
    });
    const sortedX = Array.from(xValues).sort((a, b) => a - b);

    if (format === 'csv') {
      const header = ['step', ...datasets.map(ds => ds.label || '')];
      const rows = sortedX.map(x => {
        const cols = [x];
        datasets.forEach(ds => {
          const pt = (ds.data || []).find(p => p.x === x);
          cols.push(pt ? pt.y : '');
        });
        return cols.join(',');
      });
      const csv = [header.join(','), ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${id}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      return;
    }

    if (format === 'json') {
      const jsonData = sortedX.map(x => {
        const entry = { step: x };
        datasets.forEach(ds => {
          const pt = (ds.data || []).find(p => p.x === x);
          entry[ds.label || ''] = pt ? pt.y : null;
        });
        return entry;
      });
      const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${id}.json`;
      link.click();
      URL.revokeObjectURL(url);
      return;
    }

    const url = chart.toBase64Image();

    if (format === 'pdf') {
      const pdf = new jsPDF();
      const width = pdf.internal.pageSize.getWidth();
      const height = (chart.height / chart.width) * width;
      pdf.addImage(url, 'PNG', 0, 0, width, height);
      pdf.save(`${id}.pdf`);
      return;
    }

    if (format === 'svg') {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${chart.width}" height="${chart.height}"><image href="${url}" width="100%" height="100%"/></svg>`;
      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${id}.svg`;
      link.click();
      return;
    }

    // default PNG export
    const link = document.createElement('a');
    link.href = url;
    link.download = `${id}.png`;
    link.click();
  }, []);

  const copyChartImage = useCallback(async (id) => {
    const chart = chartRefs.current.get(id);
    if (!chart || !navigator?.clipboard) return;
    const url = chart.toBase64Image();
    const res = await fetch(url);
    const blob = await res.blob();
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
    } catch (e) {
      console.error(t('copyImageError'), e);
    }
  }, [t]);

  const applyMovingAverage = (data, windowSize) => {
    if (windowSize <= 1) return data;
    const half = Math.floor(windowSize / 2);
    return data.map((point, idx) => {
      const start = Math.max(0, idx - half);
      const end = Math.min(data.length - 1, idx + half);
      let sum = 0;
      for (let i = start; i <= end; i++) {
        sum += data[i].y;
      }
      const avg = sum / (end - start + 1);
      return { x: point.x, y: avg };
    });
  };

  const syncHoverToAllCharts = useCallback((step, sourceId) => {
    if (syncLockRef.current) return;
    syncLockRef.current = true;
    chartRefs.current.forEach((chart, id) => {
      if (!chart || !chart.data || !chart.data.datasets) return;
      if (step === null) {
        chart.setActiveElements([]);
        chart.tooltip.setActiveElements([], { x: 0, y: 0 });
        chart.draw();
      } else if (id !== sourceId) {
        const activeElements = [];
        const seen = new Set(); // avoid adding duplicate points
        chart.data.datasets.forEach((dataset, datasetIndex) => {
          if (!dataset || !dataset.data || !Array.isArray(dataset.data)) return;
          const idx = dataset.data.findIndex(p => p && typeof p.x !== 'undefined' && p.x === step);
          if (idx !== -1 && dataset.data[idx]) {
            const elementKey = `${datasetIndex}-${idx}`;
            if (!seen.has(elementKey)) {
              // Validate element
              if (datasetIndex >= 0 && datasetIndex < chart.data.datasets.length && 
                  idx >= 0 && idx < dataset.data.length) {
                activeElements.push({ datasetIndex, index: idx });
                seen.add(elementKey);
              }
            }
          }
        });
        
        // Only set when activeElements are valid
        if (activeElements.length > 0) {
          try {
            const pos = { x: chart.scales.x.getPixelForValue(step), y: 0 };
            chart.setActiveElements(activeElements);
            chart.tooltip.setActiveElements(activeElements, pos);
            chart.draw();
          } catch (error) {
            console.warn('Error setting active elements:', error);
            // On error clear activeElements
            chart.setActiveElements([]);
            chart.tooltip.setActiveElements([], { x: 0, y: 0 });
            chart.draw();
          }
        } else {
          // Clear current if no valid activeElements
          chart.setActiveElements([]);
          chart.tooltip.setActiveElements([], { x: 0, y: 0 });
          chart.draw();
        }
      }
    });
    syncLockRef.current = false;
  }, []);

    const parsedData = useMemo(() => {
      const enabled = files.filter(f => f.enabled !== false);
      return enabled.map(file => {
        if (!file.content) return { ...file, metricsData: {} };
        const lines = file.content.split('\n');
        const metricsData = {};

        const stepCfg = {
          enabled: file.config?.useStepKeyword,
          keyword: file.config?.stepKeyword || 'step:'
        };

        const extractStep = (line) => {
          if (!stepCfg.enabled) return null;
          const idx = line.toLowerCase().indexOf(stepCfg.keyword.toLowerCase());
          if (idx !== -1) {
            const after = line.substring(idx + stepCfg.keyword.length);
            const match = after.match(/[+-]?\d+/);
            if (match) {
              const s = parseInt(match[0], 10);
              if (!isNaN(s)) return s;
            }
          }
          return null;
        };

        const extractByKeyword = (linesArr, keyword) => {
          const results = [];
          const numberRegex = /[+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/;
          linesArr.forEach(line => {
            const idx = line.toLowerCase().indexOf(keyword.toLowerCase());
            if (idx !== -1) {
              const after = line.substring(idx + keyword.length);
              const match = after.match(numberRegex);
              if (match) {
                const v = parseFloat(match[0]);
                if (!isNaN(v)) {
                  const step = extractStep(line);
                  results.push({ x: step !== null ? step : results.length, y: v });
                }
              }
            }
          });
          return results;
        };

        metrics.forEach((metric, idx) => {
          const fileMetric = file.config?.metrics?.[idx] || metric;
          let points = [];
          if (fileMetric.mode === 'keyword') {
            points = extractByKeyword(lines, fileMetric.keyword);
          } else if (fileMetric.regex) {
            const reg = new RegExp(fileMetric.regex);
            lines.forEach(line => {
              reg.lastIndex = 0;
              const m = reg.exec(line);
              if (m && m[1]) {
                const v = parseFloat(m[1]);
                if (!isNaN(v)) {
                  const step = extractStep(line);
                  points.push({ x: step !== null ? step : points.length, y: v });
                }
              }
            });
          }

          let key = '';
          if (metric.name && metric.name.trim()) {
            key = metric.name.trim();
          } else if (metric.keyword) {
            key = metric.keyword.replace(/[:：]/g, '').trim();
          } else if (metric.regex) {
            const sanitized = metric.regex.replace(/[^a-zA-Z0-9_]/g, '').trim();
            key = sanitized || `metric${idx + 1}`;
          } else {
            key = `metric${idx + 1}`;
          }

          metricsData[key] = points;
        });

      const range = file.config?.dataRange;
      if (range && (range.start > 0 || range.end !== undefined)) {
        const applyRange = data => {
          if (data.length === 0) return data;
          const start = Math.max(0, parseInt(range.start) || 0);
          const end = range.end !== undefined ? parseInt(range.end) : data.length;
          const endIndex = Math.min(data.length, end);
          return data.slice(start, endIndex);
        };
        const reindex = data => stepCfg.enabled ? data : data.map((p, idx) => ({ x: idx, y: p.y }));
        Object.keys(metricsData).forEach(k => {
          let processed = reindex(applyRange(metricsData[k]));
          if (smoothing.method === 'moving-average') {
            processed = applyMovingAverage(processed, smoothing.window);
          }
          metricsData[k] = processed;
        });
      }

      return { ...file, metricsData };
    });
  }, [files, metrics, smoothing]);

  useEffect(() => {
    const maxStep = parsedData.reduce((m, f) => {
      const localMax = Object.values(f.metricsData).reduce((mm, d) => Math.max(mm, d.length > 0 ? d[d.length - 1].x : 0), 0);
      return Math.max(m, localMax);
    }, 0);
    onMaxStepChange(maxStep);
  }, [parsedData, onMaxStepChange]);

  useEffect(() => {
    const minSteps = getMinSteps(parsedData);
    if (minSteps > 0) {
      onXRangeChange(prev => {
        const next = { min: 0, max: minSteps - 1 };
        if (prev.min === next.min && prev.max === next.max) return prev;
        return next;
      });
    }
  }, [parsedData, onXRangeChange]);

  const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#f97316'];
  const createChartData = dataArray => {
    // Ensure no duplicate datasets
    const uniqueItems = dataArray.reduce((acc, item) => {
      const exists = acc.find(existing => existing.name === item.name);
      if (!exists) {
        acc.push(item);
      }
      return acc;
    }, []);
    
    return {
      datasets: uniqueItems.map((item, index) => {
        const color = colors[index % colors.length];
        return {
          label: item.name?.replace(/\.(log|txt)$/i, '') || `File ${index + 1}`,
          data: item.data,
          borderColor: color,
          backgroundColor: `${color}33`,
          borderWidth: 2,
          fill: false,
          tension: 0,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointBackgroundColor: color,
          pointBorderColor: color,
          pointBorderWidth: 1,
          pointHoverBackgroundColor: color,
          pointHoverBorderColor: color,
          pointHoverBorderWidth: 1,
          animation: false,
          animations: { colors: false, x: false, y: false },
        };
      })
    };
  };

  const getComparisonData = (data1, data2, mode) => {
    const map2 = new Map(data2.map(p => [p.x, p.y]));
    const result = [];
    data1.forEach(p1 => {
      if (map2.has(p1.x)) {
        const v1 = p1.y;
        const v2 = map2.get(p1.x);
        let diff;
        switch (mode) {
          case 'absolute':
            diff = Math.abs(v2 - v1);
            break;
          case 'relative-normal':
            diff = v1 !== 0 ? (v2 - v1) / v1 : 0;
            break;
          case 'relative': {
            const ad = Math.abs(v2 - v1);
            diff = v1 !== 0 ? ad / Math.abs(v1) : 0;
            break;
          }
          default:
            diff = v2 - v1;
        }
        result.push({ x: p1.x, y: diff });
      }
    });
    return result;
  };

  const calculateYRange = useCallback((dataArray) => {
    let min = Infinity;
    let max = -Infinity;
    dataArray.forEach(item => {
      item.data.forEach(point => {
        const inRange =
          (xRange.min === undefined || point.x >= xRange.min) &&
          (xRange.max === undefined || point.x <= xRange.max);
        if (inRange) {
          if (point.y < min) min = point.y;
          if (point.y > max) max = point.y;
        }
      });
    });
    if (min === Infinity || max === -Infinity) {
      return { min: 0, max: 1, step: 1 };
    }
    if (min === max) {
      return { min: min - 1, max: max + 1, step: 1 };
    }
    const pad = (max - min) * 0.05;
    const paddedMin = min - pad;
    const paddedMax = max + pad;
    const range = paddedMax - paddedMin;
    let step = Math.pow(10, Math.floor(Math.log10(range)));
    if (range / step < 3) {
      step /= 10;
    }
    return { min: paddedMin, max: paddedMax, step };
  }, [xRange]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 0 },
    animations: { colors: false, x: false, y: false },
    hover: { animationDuration: 0 },
    responsiveAnimationDuration: 0,
    interaction: { mode: 'nearest', intersect: false, axis: 'x' },
    plugins: {
      zoom: {
        pan: {
          enabled: true,
          mode: 'x',
          onPanComplete: ({ chart }) => {
            const { min, max } = chart.scales.x;
            onXRangeChange({ min: Math.round(min), max: Math.round(max) });
          }
        },
        zoom: {
          drag: {
            enabled: true,
            borderColor: 'rgba(225,225,225,0.2)',
            borderWidth: 1,
            backgroundColor: 'rgba(225,225,225,0.2)',
            modifierKey: 'shift'
          },
          wheel: { enabled: true },
          pinch: { enabled: true },
          mode: 'x',
          onZoomComplete: ({ chart }) => {
            const { min, max } = chart.scales.x;
            onXRangeChange({ min: Math.round(min), max: Math.round(max) });
          }
        }
      },
      legend: {
        position: 'top',
        labels: {
          boxWidth: 40,
          boxHeight: 2,
          padding: 10,
          usePointStyle: false,
          generateLabels: function (chart) {
            const original = Chart.defaults.plugins.legend.labels.generateLabels;
            const labels = original.call(this, chart);
            labels.forEach((label, index) => {
              const dataset = chart.data.datasets[index];
              if (dataset && dataset.borderDash && dataset.borderDash.length > 0) {
                label.lineDash = dataset.borderDash;
              }
            });
            return labels;
          }
        }
      },
      tooltip: {
        mode: 'nearest',
        intersect: false,
        axis: 'x',
        animation: false,
        backgroundColor: 'rgba(15, 23, 42, 0.92)',
        titleColor: '#f1f5f9',
        bodyColor: '#cbd5e1',
        borderColor: 'rgba(71, 85, 105, 0.2)',
        borderWidth: 1,
        cornerRadius: 6,
        displayColors: true,
        usePointStyle: true,
        titleFont: { size: 11, weight: '600', family: 'Inter, system-ui, sans-serif' },
        bodyFont: { size: 10, weight: '400', family: 'Inter, system-ui, sans-serif' },
        footerFont: { size: 9, weight: '300' },
        padding: { top: 6, bottom: 6, left: 8, right: 8 },
        caretPadding: 4,
        caretSize: 4,
        multiKeyBackground: 'transparent',
        callbacks: {
          title: function (context) {
            return `Step ${context[0].parsed.x}`;
          },
          label: function (context) {
            const value = Number(context.parsed.y.toPrecision(4));
            const label = context.dataset?.label || 'Dataset';
            return ` ${label}: ${value}`;
          },
          labelColor: function (context) {
            return {
              borderColor: context.dataset.borderColor,
              backgroundColor: context.dataset.borderColor,
              borderWidth: 1,
              borderRadius: 2
            };
          }
        }
      }
    },
    scales: {
      x: {
        type: 'linear',
        display: true,
        title: { display: true, text: 'Step' },
        min: xRange.min,
        max: xRange.max,
        bounds: 'data',
        ticks: {
          callback: function (value) {
            return Math.round(value);
          }
        }
      },
      y: {
        type: 'linear',
        display: true,
        title: { display: true, text: 'Value' },
        bounds: 'data',
        ticks: {
          callback: function (value) {
            return Number(value.toPrecision(2));
          }
        }
      }
    },
    elements: { point: { radius: 0 } }
  }), [xRange, onXRangeChange]);

  const buildComparisonChartData = (dataArray) => {
    const baselineVal =
      compareMode === 'relative' || compareMode === 'relative-normal'
        ? relativeBaseline
        : compareMode === 'absolute'
          ? absoluteBaseline
          : 0;
    const datasets = [];
    const stats = [];
    const addPair = (base, target, colorIdx) => {
      const diffData = getComparisonData(base.data, target.data, compareMode);
      const color = colors[colorIdx % colors.length];
      datasets.push({
        label: `${target.name} vs ${base.name}`,
        data: diffData,
        borderColor: color,
        backgroundColor: color,
        borderWidth: 2,
        fill: false,
        tension: 0,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointBackgroundColor: color,
        pointBorderColor: color,
        pointBorderWidth: 1,
        pointHoverBackgroundColor: color,
        pointHoverBorderColor: color,
        pointHoverBorderWidth: 1,
        animation: false,
        animations: { colors: false, x: false, y: false },
      });
      const normalDiff = getComparisonData(base.data, target.data, 'normal');
      const absDiff = getComparisonData(base.data, target.data, 'absolute');
      const relNormalDiff = getComparisonData(base.data, target.data, 'relative-normal');
      const relDiff = getComparisonData(base.data, target.data, 'relative');
      const mean = arr => (arr.reduce((s, p) => s + p.y, 0) / arr.length) || 0;
      const max = arr => arr.reduce((m, p) => (p.y > m ? p.y : m), 0);
      stats.push({
        label: `${target.name} vs ${base.name}`,
        meanNormal: mean(normalDiff),
        meanAbsolute: mean(absDiff),
        relativeError: mean(relNormalDiff),
        meanRelative: mean(relDiff),
        maxAbsolute: max(absDiff),
        maxRelative: max(relDiff)
      });
    };

    let colorIdx = 0;
    if (multiFileMode === 'baseline') {
      const base = dataArray.find(d => d.name === baselineFile) || dataArray[0];
      dataArray.forEach(item => {
        if (item.name === base.name) return;
        addPair(base, item, colorIdx++);
      });
    } else {
      for (let i = 0; i < dataArray.length; i++) {
        for (let j = i + 1; j < dataArray.length; j++) {
          addPair(dataArray[i], dataArray[j], colorIdx++);
        }
      }
    }

    if (datasets.length > 0 && baselineVal > 0 && (compareMode === 'relative' || compareMode === 'relative-normal' || compareMode === 'absolute')) {
      const baseData = datasets[0].data.map(p => ({ x: p.x, y: baselineVal }));
      datasets.push({
        label: 'Baseline',
        data: baseData,
        borderColor: '#10b981',
        backgroundColor: '#10b981',
        borderWidth: 2,
        borderDash: [5, 5],
        fill: false,
        tension: 0,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#10b981',
        pointBorderWidth: 1,
        pointHoverBackgroundColor: '#10b981',
        pointHoverBorderColor: '#10b981',
        pointHoverBorderWidth: 1,
        animation: false,
        animations: { colors: false, x: false, y: false },
      });
    }

    return { datasets, stats };
  };

  if (parsedData.length === 0) {
    return (
      <div className="card p-8">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <p className="text-lg mb-2">{t('chart.noData')}</p>
          <p>{t('chart.uploadPrompt')}</p>
        </div>
      </div>
    );
  }

  const metricNames = metrics.map((m, idx) => {
    if (m.name && m.name.trim()) return m.name.trim();
    if (m.keyword) return m.keyword.replace(/[:：]/g, '').trim();
    if (m.regex) {
      const sanitized = m.regex.replace(/[^a-zA-Z0-9_]/g, '').trim();
      return sanitized || `metric${idx + 1}`;
    }
    return `metric${idx + 1}`;
  });
  const metricDataArrays = {};
  metricNames.forEach(name => {
    metricDataArrays[name] = parsedData
      .filter(file => file.metricsData[name] && file.metricsData[name].length > 0)
      .map(file => ({ name: file.name, data: file.metricsData[name] }));
  });

  if (metrics.length === 0) {
    return (
      <div className="card p-8">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <p className="text-lg mb-2 font-medium">{t('chart.selectPrompt')}</p>
        </div>
      </div>
    );
  }

  const metricElements = metrics.map((metric, idx) => {
    const key = metric.name || metric.keyword || `metric${idx + 1}`;
    const dataArray = metricDataArrays[key] || [];
    const showComparison = dataArray.length >= 2;

    const yRange = calculateYRange(dataArray);
    const yDecimals = Math.max(0, -Math.floor(Math.log10(yRange.step)));
    const options = {
      ...chartOptions,
      scales: {
        ...chartOptions.scales,
        y: {
          ...chartOptions.scales.y,
          min: yRange.min,
          max: yRange.max,
          ticks: {
            stepSize: yRange.step,
            callback: (value) => Number(value.toFixed(yDecimals))
          }
        }
      }
    };

    let stats = null;
    let comparisonChart = null;
    if (showComparison) {
      const compResult = buildComparisonChartData(dataArray);
      stats = compResult.stats.length > 0 ? compResult.stats : null;
     const compRange = calculateYRange(compResult.datasets);
      const compDecimals = Math.max(0, -Math.floor(Math.log10(compRange.step)));
      const compOptions = {
        ...chartOptions,
        scales: {
          ...chartOptions.scales,
          y: {
            ...chartOptions.scales.y,
            min: compRange.min,
            max: compRange.max,
            ticks: {
              stepSize: compRange.step,
              callback: (value) => Number(value.toFixed(compDecimals))
            }
          }
        }
      };
      const compActions = (
        <>
          <button
            type="button"
            className="p-1 rounded-md text-gray-600 hover:text-blue-600 hover:bg-gray-100"
            onClick={() => exportChart(`metric-comp-${idx}`, exportFormat)}
            aria-label="Export"
            title="Export"
          >
            <FileDown size={16} />
          </button>
          <button
            type="button"
            className="p-1 rounded-md text-gray-600 hover:text-blue-600 hover:bg-gray-100"
            onClick={() => copyChartImage(`metric-comp-${idx}`)}
            aria-label={t('copyImage')}
            title={t('copyImage')}
          >
            <Copy size={16} />
          </button>
        </>
      );
      comparisonChart = (
        <ResizablePanel title={t('comparison.panelTitle', { key, mode: compareMode })} initialHeight={440} actions={compActions}>
          <ChartWrapper
            chartId={`metric-comp-${idx}`}
            onRegisterChart={registerChart}
            onSyncHover={syncHoverToAllCharts}
            syncRef={syncLockRef}
            data={{ datasets: compResult.datasets }}
            options={compOptions}
          />
        </ResizablePanel>
      );
    }

    return (
      <div key={key} className="flex flex-col gap-3">
        <ResizablePanel
          title={key}
          initialHeight={440}
          actions={(
            <>
              <button
                type="button"
                className="p-1 rounded-md text-gray-600 hover:text-blue-600 hover:bg-gray-100"
                onClick={() => exportChart(`metric-${idx}`, exportFormat)}
                aria-label="Export"
                title="Export"
              >
                <FileDown size={16} />
              </button>
              <button
                type="button"
                className="p-1 rounded-md text-gray-600 hover:text-blue-600 hover:bg-gray-100"
                onClick={() => copyChartImage(`metric-${idx}`)}
                aria-label={t('copyImage')}
                title={t('copyImage')}
              >
                <Copy size={16} />
              </button>
            </>
          )}
        >
          <ChartWrapper
            chartId={`metric-${idx}`}
            onRegisterChart={registerChart}
            onSyncHover={syncHoverToAllCharts}
            syncRef={syncLockRef}
            data={createChartData(dataArray)}
            options={options}
          />
        </ResizablePanel>
        {comparisonChart}
        {stats && (
          <div className="card overflow-x-auto">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{key} {t('chart.diffStats')}</h4>
            <table className="min-w-full text-xs">
              <thead>
                <tr className="text-left">
                  <th className="pr-2">{t('comparison.pair')}</th>
                  <th className="text-right">{t('comparison.meanNormalLabel')}</th>
                  <th className="text-right">{t('comparison.meanAbsoluteLabel')}</th>
                  <th className="text-right">{t('comparison.maxAbsoluteLabel')}</th>
                  <th className="text-right">{t('comparison.meanRelativeLabel')}</th>
                  <th className="text-right">{t('comparison.maxRelativeLabel')}</th>
                </tr>
              </thead>
              <tbody>
                {stats.map(s => (
                  <tr key={s.label} className="border-t border-gray-200 dark:border-gray-700">
                    <td className="pr-2 py-1">{s.label}</td>
                    <td className="text-right py-1">{s.meanNormal.toFixed(6)}</td>
                    <td className="text-right py-1">{s.meanAbsolute.toFixed(6)}</td>
                    <td className="text-right py-1">{s.maxAbsolute.toFixed(6)}</td>
                    <td className="text-right py-1">{s.meanRelative.toFixed(6)}</td>
                    <td className="text-right py-1">{s.maxRelative.toFixed(6)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end gap-2 items-center">
        <label className="text-xs flex items-center gap-1">
          Smoothing:
          <select
            value={smoothing.method}
            onChange={(e) => setSmoothing({ ...smoothing, method: e.target.value })}
            className="border rounded p-0.5 text-xs"
          >
            <option value="none">None</option>
            <option value="moving-average">Moving Avg</option>
          </select>
        </label>
        {smoothing.method === 'moving-average' && (
          <input
            type="number"
            min="1"
            value={smoothing.window}
            onChange={(e) => setSmoothing({ ...smoothing, window: Math.max(1, parseInt(e.target.value) || 1) })}
            className="w-16 border rounded p-0.5 text-xs"
          />
        )}
        <label className="text-xs flex items-center gap-1">
          Export:
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value)}
            className="border rounded p-0.5 text-xs"
          >
            <option value="png">PNG</option>
            <option value="csv">CSV</option>
            <option value="pdf">PDF</option>
            <option value="svg">SVG</option>
            <option value="json">JSON</option>
          </select>
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {metricElements}
      </div>
    </div>
  );
}
