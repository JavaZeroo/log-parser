import React, { useMemo, useRef, useCallback, useEffect } from 'react';
import { Chart as ReactChart } from 'react-chartjs-2';
import { ResizablePanel } from './ResizablePanel';
import {
  Chart as ChartJS,
  Chart,
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  PointElement,
  LineElement,
  BarElement,
  BarController,
  LineController,
  ScatterController,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';
import annotationPlugin from 'chartjs-plugin-annotation';
import { ImageDown, Copy, FileDown } from 'lucide-react';
import { getMinSteps } from "../utils/getMinSteps.js";
import { getMetricTitle } from '../utils/metricHelpers';
import { maybeDownsample, DEFAULT_DOWNSAMPLE_THRESHOLD } from '../utils/downsample.js';
import { smooth } from '../utils/smoothing.js';
import { computeStats } from '../utils/stats.js';
import { useTranslation } from 'react-i18next';
import { useToast } from './ToastContext.jsx';

ChartJS.register(
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  PointElement,
  LineElement,
  BarElement,
  BarController,
  LineController,
  ScatterController,
  Title,
  Tooltip,
  Legend,
  zoomPlugin,
  annotationPlugin
);

const ChartWrapper = ({ data, options, chartId, onRegisterChart, onSyncHover, syncRef, chartType = 'line' }) => {
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
      <ReactChart type={chartType} ref={handleChartRef} data={data} options={enhancedOptions} />
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
  yRange = { min: undefined, max: undefined },
  onXRangeChange,
  onMaxStepChange,
  downsampleEnabled = true,
  downsampleThreshold = DEFAULT_DOWNSAMPLE_THRESHOLD,
  yAxisType = 'linear',
  smoothing = 'none',
  smoothingWindow = 10,
  showStats = false,
  chartType = 'line',
  combinedView = false,
  annotations = []
}) {
  const downsamplePoints = useCallback(
    (points) => (downsampleEnabled ? maybeDownsample(points, downsampleThreshold) : points),
    [downsampleEnabled, downsampleThreshold]
  );
  // Smoothing is applied on the full series (preserves accuracy / stats)
  // before downsampling reduces the point count for rendering.
  const smoothPoints = useCallback(
    (points) => (smoothing === 'none' ? points : smooth(points, smoothing, smoothingWindow)),
    [smoothing, smoothingWindow]
  );
  const chartRefs = useRef(new Map());
  const { t } = useTranslation();
  const toast = useToast();
  const syncLockRef = useRef(false);
  const registerChart = useCallback((id, inst) => {
    chartRefs.current.set(id, inst);
  }, []);

  const exportChartPNG = useCallback((id) => {
    const chart = chartRefs.current.get(id);
    if (!chart) return;
    const url = chart.toBase64Image();
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
      toast.success(t('toast.copyImageSuccess'));
    } catch (e) {
      console.error(t('copyImageError'), e);
      toast.error(t('toast.copyImageError'));
    }
  }, [t, toast]);

  const exportChartCSV = useCallback((id) => {
    const chart = chartRefs.current.get(id);
    if (!chart) return;
    const datasets = chart.data.datasets || [];
    const xValues = new Set();
    datasets.forEach(ds => {
      (ds.data || []).forEach(p => xValues.add(p.x));
    });
    const sortedX = Array.from(xValues).sort((a, b) => a - b);
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
  }, []);

  // Cache for x-value to index mapping (for fast sync lookup)
  const indexCacheRef = useRef(new WeakMap());

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
        const seen = new Set();
        chart.data.datasets.forEach((dataset, datasetIndex) => {
          if (!dataset || !dataset.data || !Array.isArray(dataset.data)) return;

          // Build or get cached index map for this dataset
          let indexMap = indexCacheRef.current.get(dataset.data);
          if (!indexMap) {
            indexMap = new Map();
            dataset.data.forEach((p, i) => {
              if (p && typeof p.x !== 'undefined') {
                indexMap.set(p.x, i);
              }
            });
            indexCacheRef.current.set(dataset.data, indexMap);
          }

          // O(1) lookup instead of O(n) findIndex
          const idx = indexMap.get(step);
          if (idx !== undefined && dataset.data[idx]) {
            const elementKey = `${datasetIndex}-${idx}`;
            if (!seen.has(elementKey)) {
              if (datasetIndex >= 0 && datasetIndex < chart.data.datasets.length &&
                idx >= 0 && idx < dataset.data.length) {
                activeElements.push({ datasetIndex, index: idx });
                seen.add(elementKey);
              }
            }
          }
        });

        if (activeElements.length > 0) {
          try {
            const pos = { x: chart.scales.x.getPixelForValue(step), y: 0 };
            chart.setActiveElements(activeElements);
            chart.tooltip.setActiveElements(activeElements, pos);
            chart.draw();
          } catch (error) {
            console.warn('Error setting active elements:', error);
            chart.setActiveElements([]);
            chart.tooltip.setActiveElements([], { x: 0, y: 0 });
            chart.draw();
          }
        } else {
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
      // Use pre-parsed data from worker
      let metricsData = file.metricsData || {};

      // Clone to avoid mutation during range application
      metricsData = { ...metricsData };

      const stepCfg = {
        enabled: file.config?.useStepKeyword,
        keyword: file.config?.stepKeyword || 'step:'
      };

      const range = file.config?.dataRange;
      if (range && (range.start > 0 || range.end !== undefined)) {
        const applyRange = data => {
          if (!data || data.length === 0) return data;
          const start = Math.max(0, parseInt(range.start) || 0);
          const end = range.end !== undefined ? parseInt(range.end) : data.length;
          const endIndex = Math.min(data.length, end);
          return data.slice(start, endIndex);
        };

        // If not using step keyword, reindex x to 0, 1, 2... after slicing
        // This matches original behavior where x-axis resets if we just treat lines as steps
        const reindex = data => stepCfg.enabled ? data : data.map((p, idx) => ({ x: idx, y: p.y }));

        Object.keys(metricsData).forEach(k => {
          if (metricsData[k]) {
            metricsData[k] = reindex(applyRange(metricsData[k]));
          }
        });
      }

      return { ...file, metricsData };
    });
  }, [files]);

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

  const colors = useMemo(() => ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#f97316'], []);

  const createChartData = useCallback((dataArray) => {
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
        const isScatter = chartType === 'scatter';
        const isBar = chartType === 'bar';
        return {
          type: chartType,
          label: item.name?.replace(/\.(log|txt)$/i, '') || `File ${index + 1}`,
          data: downsamplePoints(item.data),
          borderColor: color,
          backgroundColor: isBar ? `${color}99` : `${color}33`,
          borderWidth: isBar ? 1 : 2,
          fill: false,
          tension: 0,
          showLine: !isScatter,
          pointRadius: isScatter ? 3 : 0,
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
  }, [colors, downsamplePoints, chartType]);

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

  const getMaxDecimals = useCallback((dataArray) => {
    let maxDecimals = 0;
    dataArray.forEach(item => {
      item.data.forEach(point => {
        const valStr = point.y.toString();
        if (valStr.includes('.')) {
          const decimals = valStr.split('.')[1].length;
          if (decimals > maxDecimals) maxDecimals = decimals;
        }
      });
    });
    return Math.min(maxDecimals, 10); // Cap at 10 to avoid extreme cases
  }, []);

  const calculateNiceScale = useCallback((min, max) => {
    if (min === Infinity || max === -Infinity) return { min: 0, max: 1, step: 0.1 };
    if (min === max) return { min: min - 0.5, max: max + 0.5, step: 0.1 };

    // Calculate raw range
    let range = max - min;

    // Calculate "nice" interval
    const roughStep = range / 5; // Aim for approx 5-6 ticks
    const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
    const normalizedStep = roughStep / magnitude;

    let niceStep;
    if (normalizedStep < 1.5) niceStep = 1;
    else if (normalizedStep < 3) niceStep = 2;
    else if (normalizedStep < 7) niceStep = 5;
    else niceStep = 10;

    const step = niceStep * magnitude;

    // Calculate nice min and max
    const niceMin = Math.floor(min / step) * step;
    const niceMax = Math.ceil(max / step) * step;

    return { min: niceMin, max: niceMax, step };
  }, []);

  const getFinalYScale = useCallback((autoScale) => {
    const hasManualMin = Number.isFinite(yRange?.min);
    const hasManualMax = Number.isFinite(yRange?.max);

    const min = hasManualMin ? yRange.min : autoScale.min;
    const max = hasManualMax ? yRange.max : autoScale.max;

    if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) {
      return autoScale;
    }

    return {
      ...autoScale,
      min,
      max
    };
  }, [yRange]);

  const annotationConfig = useMemo(() => {
    if (!Array.isArray(annotations) || annotations.length === 0) return undefined;
    const out = {};
    annotations.forEach(a => {
      if (a && typeof a.x === 'number') {
        out[`ann-${a.id}`] = {
          type: 'line',
          xMin: a.x,
          xMax: a.x,
          borderColor: a.color || '#10b981',
          borderWidth: 1.5,
          borderDash: [4, 4],
          label: a.label ? {
            content: a.label,
            display: true,
            position: 'start',
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            color: '#f1f5f9',
            font: { size: 10 },
            padding: 4
          } : undefined
        };
      }
    });
    return Object.keys(out).length > 0 ? { annotations: out } : undefined;
  }, [annotations]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 0 },
    animations: { colors: false, x: false, y: false },
    hover: { animationDuration: 0 },
    responsiveAnimationDuration: 0,
    interaction: { mode: 'nearest', intersect: false, axis: 'x' },
    plugins: {
      annotation: annotationConfig,
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
            // Dynamic precision handled in render loop via options update, 
            // but here we need to access the chart options or dataset context
            // We'll use a default safe fallback or try to read from chart config if possible.
            // Actually, we can bind the precision in the render loop.
            // For now, let's use the raw value which is most accurate.
            const value = context.parsed.y;
            const label = context.dataset?.label || 'Dataset';
            // We will format this in the parent component's options generation
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
        type: yAxisType === 'log' ? 'logarithmic' : 'linear',
        display: true,
        title: { display: true, text: 'Value' },
        bounds: 'data',
        // Ticks callback will be overridden in the render loop
      }
    },
    elements: { point: { radius: 0 } }
  }), [xRange, onXRangeChange, yAxisType, annotationConfig]);

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
        data: downsamplePoints(smoothPoints(diffData)),
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

  const metricNames = metrics.map((m, idx) => getMetricTitle(m, idx));
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

  const buildYScale = (autoRange, decimals) => {
    if (yAxisType === 'log') {
      const hasMin = Number.isFinite(yRange?.min) && yRange.min > 0;
      const hasMax = Number.isFinite(yRange?.max) && yRange.max > 0;
      return {
        type: 'logarithmic',
        display: true,
        title: { display: true, text: 'Value' },
        min: hasMin ? yRange.min : undefined,
        max: hasMax ? yRange.max : undefined,
        ticks: {
          callback: (value) => Number(value.toFixed(decimals))
        }
      };
    }
    const finalRange = getFinalYScale(autoRange);
    return {
      type: 'linear',
      display: true,
      title: { display: true, text: 'Value' },
      min: finalRange.min,
      max: finalRange.max,
      bounds: 'data',
      ticks: {
        stepSize: finalRange.step,
        callback: (value) => Number(value.toFixed(decimals))
      }
    };
  };

  const metricElements = metrics.map((metric, idx) => {
    const key = metric.name || metric.keyword || `metric${idx + 1}`;
    const dataArray = metricDataArrays[key] || [];
    const showComparison = dataArray.length >= 2;

    const yDecimals = getMaxDecimals(dataArray);

    // Apply smoothing on full data for accurate stats and visuals before downsampling
    const processedArray = dataArray.map(item => ({
      ...item,
      data: smoothPoints(item.data)
    }));

    // Calculate min/max for scaling
    let min = Infinity;
    let max = -Infinity;
    processedArray.forEach(item => {
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

    const autoYRange = calculateNiceScale(min, max);

    const options = {
      ...chartOptions,
      plugins: {
        ...chartOptions.plugins,
        tooltip: {
          ...chartOptions.plugins.tooltip,
          callbacks: {
            ...chartOptions.plugins.tooltip.callbacks,
            label: function (context) {
              const value = Number(context.parsed.y).toFixed(yDecimals);
              const label = context.dataset?.label || 'Dataset';
              return ` ${label}: ${value}`;
            }
          }
        }
      },
      scales: {
        ...chartOptions.scales,
        y: buildYScale(autoYRange, yDecimals)
      }
    };

    const perFileStats = showStats
      ? processedArray.map(item => ({
          name: item.name,
          stats: computeStats(item.data)
        })).filter(entry => entry.stats)
      : [];

    let stats = null;
    let comparisonChart = null;
    if (showComparison) {
      const compResult = buildComparisonChartData(dataArray);
      stats = compResult.stats.length > 0 ? compResult.stats : null;

      // Calculate comparison range
      let cMin = Infinity;
      let cMax = -Infinity;
      compResult.datasets.forEach(ds => {
        ds.data.forEach(point => {
          const inRange =
            (xRange.min === undefined || point.x >= xRange.min) &&
            (xRange.max === undefined || point.x <= xRange.max);
          if (inRange) {
            if (point.y < cMin) cMin = point.y;
            if (point.y > cMax) cMax = point.y;
          }
        });
      });

      const autoCompRange = calculateNiceScale(cMin, cMax);
      const compDecimals = Math.max(4, getMaxDecimals(compResult.datasets)); // Ensure at least 4 for diffs

      const compOptions = {
        ...chartOptions,
        plugins: {
          ...chartOptions.plugins,
          tooltip: {
            ...chartOptions.plugins.tooltip,
            callbacks: {
              ...chartOptions.plugins.tooltip.callbacks,
              label: function (context) {
                const value = Number(context.parsed.y).toFixed(compDecimals);
                const label = context.dataset?.label || 'Dataset';
                return ` ${label}: ${value}`;
              }
            }
          }
        },
        scales: {
          ...chartOptions.scales,
          y: buildYScale(autoCompRange, compDecimals)
        }
      };
      const compActions = (
        <>
          <button
            type="button"
            className="p-1 rounded-md text-gray-600 hover:text-blue-600 hover:bg-gray-100"
            onClick={() => exportChartPNG(`metric-comp-${idx}`)}
            aria-label={t('exportPNG')}
            title={t('exportPNG')}
          >
            <ImageDown size={16} />
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
          <button
            type="button"
            className="p-1 rounded-md text-gray-600 hover:text-blue-600 hover:bg-gray-100"
            onClick={() => exportChartCSV(`metric-comp-${idx}`)}
            aria-label={t('exportCSV')}
            title={t('exportCSV')}
          >
            <FileDown size={16} />
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
            chartType={chartType}
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
                onClick={() => exportChartPNG(`metric-${idx}`)}
                aria-label={t('exportPNG')}
                title={t('exportPNG')}
              >
                <ImageDown size={16} />
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
              <button
                type="button"
                className="p-1 rounded-md text-gray-600 hover:text-blue-600 hover:bg-gray-100"
                onClick={() => exportChartCSV(`metric-${idx}`)}
                aria-label={t('exportCSV')}
                title={t('exportCSV')}
              >
                <FileDown size={16} />
              </button>
            </>
          )}
        >
          <ChartWrapper
            chartId={`metric-${idx}`}
            onRegisterChart={registerChart}
            onSyncHover={syncHoverToAllCharts}
            syncRef={syncLockRef}
            data={createChartData(processedArray)}
            options={options}
            chartType={chartType}
          />
        </ResizablePanel>
        {comparisonChart}
        {perFileStats.length > 0 && (
          <div className="card overflow-x-auto">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{key} {t('chart.summaryStats')}</h4>
            <table className="min-w-full text-xs">
              <thead>
                <tr className="text-left">
                  <th className="pr-2">{t('chart.stats.file')}</th>
                  <th className="text-right">{t('chart.stats.min')}</th>
                  <th className="text-right">{t('chart.stats.max')}</th>
                  <th className="text-right">{t('chart.stats.mean')}</th>
                  <th className="text-right">{t('chart.stats.std')}</th>
                  <th className="text-right">{t('chart.stats.last')}</th>
                  <th className="text-right">{t('chart.stats.count')}</th>
                </tr>
              </thead>
              <tbody>
                {perFileStats.map(({ name, stats: s }) => (
                  <tr key={name} className="border-t border-gray-200 dark:border-gray-700">
                    <td className="pr-2 py-1 truncate max-w-[200px]" title={name}>{name}</td>
                    <td className="text-right py-1 font-mono">{s.min.toFixed(Math.min(yDecimals, 6))}</td>
                    <td className="text-right py-1 font-mono">{s.max.toFixed(Math.min(yDecimals, 6))}</td>
                    <td className="text-right py-1 font-mono">{s.mean.toFixed(Math.min(yDecimals, 6))}</td>
                    <td className="text-right py-1 font-mono">{s.std.toFixed(Math.min(yDecimals, 6))}</td>
                    <td className="text-right py-1 font-mono">{s.last.toFixed(Math.min(yDecimals, 6))}</td>
                    <td className="text-right py-1 font-mono">{s.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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

  if (combinedView && metrics.length >= 1) {
    // Build a single chart with all metric×file datasets.
    // First metric anchors the left Y axis; remaining metrics share the right Y axis.
    const combinedDatasets = [];
    let combinedYDecimals = 0;
    let y1YDecimals = 0;
    metrics.forEach((metric, mIdx) => {
      const name = metricNames[mIdx];
      const files = (metricDataArrays[name] || []);
      files.forEach((file, fIdx) => {
        const color = colors[(mIdx * 3 + fIdx) % colors.length];
        const smoothed = smoothPoints(file.data);
        const decimals = getMaxDecimals([{ data: smoothed }]);
        if (mIdx === 0) combinedYDecimals = Math.max(combinedYDecimals, decimals);
        else y1YDecimals = Math.max(y1YDecimals, decimals);
        const isScatter = chartType === 'scatter';
        const isBar = chartType === 'bar';
        combinedDatasets.push({
          type: chartType,
          label: `${name} · ${file.name.replace(/\.(log|txt)$/i, '')}`,
          data: downsamplePoints(smoothed),
          borderColor: color,
          backgroundColor: isBar ? `${color}99` : `${color}33`,
          borderWidth: isBar ? 1 : 2,
          borderDash: mIdx === 0 ? undefined : [5, 3],
          fill: false,
          tension: 0,
          showLine: !isScatter,
          pointRadius: isScatter ? 3 : 0,
          pointHoverRadius: 4,
          pointBackgroundColor: color,
          yAxisID: mIdx === 0 ? 'y' : 'y1',
          animation: false,
          animations: { colors: false, x: false, y: false },
        });
      });
    });

    const hasSecondaryAxis = metrics.length >= 2 && combinedDatasets.some(d => d.yAxisID === 'y1');
    const yScaleBase = (decimals, position) => {
      if (yAxisType === 'log') {
        return {
          type: 'logarithmic',
          display: true,
          position,
          title: { display: true, text: 'Value' },
          ticks: { callback: (v) => Number(v.toFixed(Math.min(decimals, 6))) }
        };
      }
      return {
        type: 'linear',
        display: true,
        position,
        title: { display: true, text: 'Value' },
        bounds: 'data',
        ticks: { callback: (v) => Number(v.toFixed(Math.min(decimals, 6))) }
      };
    };

    const combinedOptions = {
      ...chartOptions,
      scales: {
        ...chartOptions.scales,
        y: yScaleBase(combinedYDecimals, 'left'),
        ...(hasSecondaryAxis ? {
          y1: { ...yScaleBase(y1YDecimals, 'right'), grid: { drawOnChartArea: false } }
        } : {})
      }
    };

    return (
      <div className="flex flex-col gap-3">
        <ResizablePanel
          title={t('chart.combinedTitle')}
          initialHeight={720}
          maxHeight={1200}
          actions={(
            <>
              <button
                type="button"
                className="p-1 rounded-md text-gray-600 hover:text-blue-600 hover:bg-gray-100"
                onClick={() => exportChartPNG('combined')}
                aria-label={t('exportPNG')}
                title={t('exportPNG')}
              >
                <ImageDown size={16} />
              </button>
              <button
                type="button"
                className="p-1 rounded-md text-gray-600 hover:text-blue-600 hover:bg-gray-100"
                onClick={() => copyChartImage('combined')}
                aria-label={t('copyImage')}
                title={t('copyImage')}
              >
                <Copy size={16} />
              </button>
              <button
                type="button"
                className="p-1 rounded-md text-gray-600 hover:text-blue-600 hover:bg-gray-100"
                onClick={() => exportChartCSV('combined')}
                aria-label={t('exportCSV')}
                title={t('exportCSV')}
              >
                <FileDown size={16} />
              </button>
            </>
          )}
        >
          <ChartWrapper
            chartId="combined"
            onRegisterChart={registerChart}
            onSyncHover={syncHoverToAllCharts}
            syncRef={syncLockRef}
            data={{ datasets: combinedDatasets }}
            options={combinedOptions}
            chartType={chartType}
          />
        </ResizablePanel>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {metricElements}
    </div>
  );
}
