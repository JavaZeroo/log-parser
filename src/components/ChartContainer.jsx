import React, { useMemo, useRef, useCallback, useEffect } from 'react';
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
import { getMinSteps } from "../utils/getMinSteps.js";

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

const ChartWrapper = ({ data, options, chartId, onRegisterChart, onSyncHover }) => {
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
      if (activeElements.length > 0) {
        const el = activeElements[0].element;
        const step = el?.$context?.parsed?.x ?? activeElements[0].index;
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
  relativeBaseline = 0.002,
  absoluteBaseline = 0.005,
  xRange = { min: undefined, max: undefined },
  onXRangeChange,
  onMaxStepChange,
  stepKeyword = 'step:',
  useStepKeyword = false
}) {
  const chartRefs = useRef(new Map());
  const registerChart = useCallback((id, inst) => {
    chartRefs.current.set(id, inst);
  }, []);

  const syncHoverToAllCharts = useCallback((step, sourceId) => {
    chartRefs.current.forEach((chart, id) => {
      if (!chart) return;
      if (step === null) {
        chart.setActiveElements([]);
        chart.tooltip.setActiveElements([]);
        chart.update('none');
      } else if (id !== sourceId) {
        const activeElements = [];
        chart.data.datasets.forEach((dataset, datasetIndex) => {
          const idx = dataset.data.findIndex(p => p.x === step);
          if (idx !== -1) {
            activeElements.push({ datasetIndex, index: idx });
          }
        });
        chart.setActiveElements(activeElements);
        chart.tooltip.setActiveElements(activeElements, { x: 0, y: 0 });
        chart.update('none');
      }
    });
  }, []);

  const parsedData = useMemo(() => {
    const enabled = files.filter(f => f.enabled !== false);
    return enabled.map(file => {
      if (!file.content) return { ...file, metricsData: {} };

      const lines = file.content.split('\n');
      const metricsData = {};
      metrics.forEach(metric => {
        metricsData[metric.name || metric.keyword] = [];
      });

      const escapeRegex = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const stepReg = useStepKeyword && stepKeyword
        ? new RegExp(`${escapeRegex(stepKeyword)}\\s*\\[?\\s*(\\d+)`, 'i')
        : null;
      const numberRegex = /[+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/;

      lines.forEach(line => {
        const stepMatch = stepReg ? stepReg.exec(line) : null;
        const stepVal = stepMatch ? parseInt(stepMatch[1]) : null;

        metrics.forEach(metric => {
          let value;
          if (metric.mode === 'keyword' && metric.keyword) {
            const idx = line.toLowerCase().indexOf(metric.keyword.toLowerCase());
            if (idx !== -1) {
              const after = line.substring(idx + metric.keyword.length);
              const match = after.match(numberRegex);
              if (match) {
                const v = parseFloat(match[0]);
                if (!isNaN(v)) value = v;
              }
            }
          } else if (metric.regex) {
            const reg = new RegExp(metric.regex);
            const m = reg.exec(line);
            if (m && m[1]) {
              const v = parseFloat(m[1]);
              if (!isNaN(v)) value = v;
            }
          }

          if (value !== undefined) {
            const arr = metricsData[metric.name || metric.keyword];
            if (useStepKeyword) {
              if (stepVal !== null) arr.push({ x: stepVal, y: value });
            } else {
              arr.push({ x: arr.length, y: value });
            }
          }
        });
      });

      const range = file.config?.dataRange;
      if (range && (range.start > 0 || range.end !== undefined)) {
        Object.keys(metricsData).forEach(k => {
          const data = metricsData[k];
          if (data.length === 0) return;
          const start = Math.max(0, parseInt(range.start) || 0);
          const end = range.end !== undefined ? parseInt(range.end) : data.length;
          const endIndex = Math.min(data.length, end);
          const sliced = data.slice(start, endIndex);
          metricsData[k] = useStepKeyword
            ? sliced
            : sliced.map((p, idx) => ({ x: idx, y: p.y }));
        });
      }

      return { ...file, metricsData };
    });
  }, [files, metrics, stepKeyword, useStepKeyword]);

  useEffect(() => {
    const maxStep = parsedData.reduce((m, f) => {
      const localMax = Object.values(f.metricsData).reduce((mm, d) => Math.max(mm, d.length > 0 ? d[d.length - 1].x : 0), 0);
      return Math.max(m, localMax);
    }, 0);
    onMaxStepChange(maxStep);
  }, [parsedData, onMaxStepChange]);

  useEffect(() => {
    if (useStepKeyword) {
      const ranges = [];
      parsedData.forEach(f => {
        Object.values(f.metricsData).forEach(d => {
          if (d.length > 0) ranges.push({ min: d[0].x, max: d[d.length - 1].x });
        });
      });
      if (ranges.length > 0) {
        const globalMin = Math.min(...ranges.map(r => r.min));
        const globalMax = Math.max(...ranges.map(r => r.max));
        onXRangeChange(prev => {
          const next = { min: globalMin, max: globalMax };
          if (prev.min === next.min && prev.max === next.max) return prev;
          return next;
        });
      }
    } else {
      const minSteps = getMinSteps(parsedData);
      if (minSteps > 0) {
        onXRangeChange(prev => {
          const next = { min: 0, max: minSteps - 1 };
          if (prev.min === next.min && prev.max === next.max) return prev;
          return next;
        });
      }
    }
  }, [parsedData, onXRangeChange, useStepKeyword]);

  const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#f97316'];
  const createChartData = dataArray => ({
    datasets: dataArray.map((item, index) => {
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
  });

  const getComparisonData = (data1, data2, mode) => {
    const minLength = Math.min(data1.length, data2.length);
    const result = [];
    for (let i = 0; i < minLength; i++) {
      const v1 = data1[i].y;
      const v2 = data2[i].y;
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
      result.push({ x: i, y: diff });
    }
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
      return { min: 0, max: 1 };
    }
    if (min === max) {
      return { min: min - 1, max: max + 1 };
    }
    const pad = (max - min) * 0.05;
    return { min: min - pad, max: max + pad };
  }, [xRange]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 0 },
    animations: { colors: false, x: false, y: false },
    hover: { animationDuration: 0 },
    responsiveAnimationDuration: 0,
    interaction: { mode: 'index', intersect: false },
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
        mode: 'index',
        intersect: false,
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
            return ` ${value}`;
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

  const createComparisonChartData = (item1, item2, title) => {
    const comparisonData = getComparisonData(item1.data, item2.data, compareMode);
    const baseline =
      compareMode === 'relative' || compareMode === 'relative-normal'
        ? relativeBaseline
        : compareMode === 'absolute'
          ? absoluteBaseline
          : 0;
    const datasets = [
      {
        label: `${title} 差值`,
        data: comparisonData,
        borderColor: '#dc2626',
        backgroundColor: '#dc2626',
        borderWidth: 2,
        fill: false,
        tension: 0,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointBackgroundColor: '#dc2626',
        pointBorderColor: '#dc2626',
        pointBorderWidth: 1,
        pointHoverBackgroundColor: '#dc2626',
        pointHoverBorderColor: '#dc2626',
        pointHoverBorderWidth: 1,
        animation: false,
        animations: { colors: false, x: false, y: false },
      },
    ];
    if (baseline > 0 && (compareMode === 'relative' || compareMode === 'relative-normal' || compareMode === 'absolute')) {
      const baselineData = comparisonData.map(p => ({ x: p.x, y: baseline }));
      datasets.push({
        label: 'Baseline',
        data: baselineData,
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
    return { datasets };
  };

  if (parsedData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="text-center text-gray-500">
          <p className="text-lg mb-2">📊 暂无数据</p>
          <p>📁 请上传日志文件开始分析</p>
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
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="text-center text-gray-500">
          <p className="text-lg mb-2 font-medium">🎯 请选择要显示的图表</p>
        </div>
      </div>
    );
  }

  const metricElements = metrics.map((metric, idx) => {
    const key = metric.name || metric.keyword || `metric${idx + 1}`;
    const dataArray = metricDataArrays[key] || [];
    const showComparison = dataArray.length === 2;

    const yRange = calculateYRange(dataArray);
    const options = {
      ...chartOptions,
      scales: {
        ...chartOptions.scales,
        y: { ...chartOptions.scales.y, min: yRange.min, max: yRange.max }
      }
    };

    let stats = null;
    if (showComparison) {
      const normalDiff = getComparisonData(dataArray[0].data, dataArray[1].data, 'normal');
      const absDiff = getComparisonData(dataArray[0].data, dataArray[1].data, 'absolute');
      const relNormalDiff = getComparisonData(
        dataArray[0].data,
        dataArray[1].data,
        'relative-normal'
      );
      const relDiff = getComparisonData(dataArray[0].data, dataArray[1].data, 'relative');
      const mean = arr => (arr.reduce((s, p) => s + p.y, 0) / arr.length) || 0;
      stats = {
        meanNormal: mean(normalDiff),
        meanAbsolute: mean(absDiff),
        relativeError: mean(relNormalDiff),
        meanRelative: mean(relDiff)
      };
    }

    let comparisonChart = null;
    if (showComparison) {
      const compData = createComparisonChartData(dataArray[0], dataArray[1], key);
      const compRange = calculateYRange(compData.datasets);
      const compOptions = {
        ...chartOptions,
        scales: {
          ...chartOptions.scales,
          y: { ...chartOptions.scales.y, min: compRange.min, max: compRange.max }
        }
      };
      comparisonChart = (
        <ResizablePanel title={`⚖️ ${key} 对比分析 (${compareMode})`} initialHeight={440}>
          <ChartWrapper
            chartId={`metric-comp-${idx}`}
            onRegisterChart={registerChart}
            onSyncHover={syncHoverToAllCharts}
            data={compData}
            options={compOptions}
          />
        </ResizablePanel>
      );
    }

    return (
      <div key={key} className="flex flex-col gap-3">
        <ResizablePanel title={key} initialHeight={440}>
          <ChartWrapper
            chartId={`metric-${idx}`}
            onRegisterChart={registerChart}
            onSyncHover={syncHoverToAllCharts}
            data={createChartData(dataArray)}
            options={options}
          />
        </ResizablePanel>
        {comparisonChart}
        {stats && (
          <div className="bg-white rounded-lg shadow-md p-3">
            <h4 className="text-sm font-medium text-gray-700 mb-1">{key} 差值统计</h4>
            <div className="space-y-1 text-xs">
              <p>平均误差 (normal): {stats.meanNormal.toFixed(6)}</p>
              <p>平均误差 (absolute): {stats.meanAbsolute.toFixed(6)}</p>
              <p>相对误差 (normal): {stats.relativeError.toFixed(6)}</p>
              <p>平均相对误差 (absolute): {stats.meanRelative.toFixed(6)}</p>
            </div>
          </div>
        )}
      </div>
    );
  });

  return (
    <div className="grid grid-cols-2 gap-3">
      {metricElements}
    </div>
  );
}
