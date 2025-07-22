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
        const step = activeElements[0].index;
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
  onMaxStepChange
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
          if (dataset.data && dataset.data.length > step) {
            activeElements.push({ datasetIndex, index: step });
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

      const extractByKeyword = (content, keyword) => {
        const results = [];
        const numberRegex = /[+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/;
        content.split('\n').forEach(line => {
          const idx = line.toLowerCase().indexOf(keyword.toLowerCase());
          if (idx !== -1) {
            const after = line.substring(idx + keyword.length);
            const match = after.match(numberRegex);
            if (match) {
              const v = parseFloat(match[0]);
              if (!isNaN(v)) results.push(v);
            }
          }
        });
        return results;
      };

      metrics.forEach(metric => {
        let values = [];
        if (metric.mode === 'keyword') {
          values = extractByKeyword(file.content, metric.keyword);
        } else if (metric.regex) {
          const reg = new RegExp(metric.regex);
          lines.forEach(line => {
            reg.lastIndex = 0;
            const m = reg.exec(line);
            if (m && m[1]) {
              const v = parseFloat(m[1]);
              if (!isNaN(v)) values.push(v);
            }
          });
        }
        metricsData[metric.name || metric.keyword] = values.map((v, i) => ({ x: i, y: v }));
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
        const reindex = data => data.map((p, idx) => ({ x: idx, y: p.y }));
        Object.keys(metricsData).forEach(k => {
          metricsData[k] = reindex(applyRange(metricsData[k]));
        });
      }

      return { ...file, metricsData };
    });
  }, [files, metrics]);

  useEffect(() => {
    const maxStep = parsedData.reduce((m, f) => {
      const localMax = Object.values(f.metricsData).reduce((mm, d) => Math.max(mm, d.length > 0 ? d[d.length - 1].x : 0), 0);
      return Math.max(m, localMax);
    }, 0);
    onMaxStepChange(maxStep);
  }, [parsedData, onMaxStepChange]);

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
        grace: '20%',
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
    const baseline = compareMode === 'relative' ? relativeBaseline : compareMode === 'absolute' ? absoluteBaseline : 0;
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
    if (baseline > 0 && (compareMode === 'relative' || compareMode === 'absolute')) {
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

    let stats = null;
    if (showComparison) {
      const normalDiff = getComparisonData(dataArray[0].data, dataArray[1].data, 'normal');
      const absDiff = getComparisonData(dataArray[0].data, dataArray[1].data, 'absolute');
      const relDiff = getComparisonData(dataArray[0].data, dataArray[1].data, 'relative');
      const mean = arr => (arr.reduce((s, p) => s + p.y, 0) / arr.length) || 0;
      stats = {
        meanNormal: mean(normalDiff),
        meanAbsolute: mean(absDiff),
        meanRelative: mean(relDiff)
      };
    }

    return (
      <div key={key} className="flex flex-col gap-3">
        <ResizablePanel title={key} initialHeight={440}>
          <ChartWrapper
            chartId={`metric-${idx}`}
            onRegisterChart={registerChart}
            onSyncHover={syncHoverToAllCharts}
            data={createChartData(dataArray)}
            options={chartOptions}
          />
        </ResizablePanel>
        {showComparison && (
          <ResizablePanel title={`⚖️ ${key} 对比分析 (${compareMode})`} initialHeight={440}>
            <ChartWrapper
              chartId={`metric-comp-${idx}`}
              onRegisterChart={registerChart}
              onSyncHover={syncHoverToAllCharts}
              data={createComparisonChartData(dataArray[0], dataArray[1], key)}
              options={chartOptions}
            />
          </ResizablePanel>
        )}
        {stats && (
          <div className="bg-white rounded-lg shadow-md p-3">
            <h4 className="text-sm font-medium text-gray-700 mb-1">{key} 差值统计</h4>
            <div className="space-y-1 text-xs">
              <p>Mean Difference: {stats.meanNormal.toFixed(6)}</p>
              <p>Mean Absolute Error: {stats.meanAbsolute.toFixed(6)}</p>
              <p>Mean Relative Error: {stats.meanRelative.toFixed(6)}</p>
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
