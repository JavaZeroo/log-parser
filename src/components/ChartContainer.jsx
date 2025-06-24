import React, { useMemo } from 'react';
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

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// Chart wrapper component with error boundary
const ChartWrapper = ({ data, options, title }) => {
  try {
    return <Line data={data} options={options} />;
  } catch (error) {
    console.error('Chart rendering error:', error);
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 border-2 border-dashed border-gray-300 rounded">
        <div className="text-center text-gray-500">
          <p className="text-lg mb-2">⚠️ 图表渲染错误</p>
          <p className="text-sm">🔄 请检查数据格式或刷新页面重试</p>
        </div>
      </div>
    );
  }
};

export default function ChartContainer({ 
  files, 
  lossRegex, 
  gradNormRegex, 
  showDataPoints, 
  compareMode,
  relativeBaseline = 0.002,
  absoluteBaseline = 0.005,
  showLoss = true,
  showGradNorm = false
}) {
  const parsedData = useMemo(() => {
    return files.map(file => {
      if (!file.content) return { ...file, lossData: [], gradNormData: [] };

      const lines = file.content.split('\n');
      const lossData = [];
      const gradNormData = [];

      try {
        const lossRegexObj = new RegExp(lossRegex);
        const gradNormRegexObj = new RegExp(gradNormRegex);

        lines.forEach((line, index) => {
          // Reset regex lastIndex for global flag
          lossRegexObj.lastIndex = 0;
          gradNormRegexObj.lastIndex = 0;
          
          const lossMatch = lossRegexObj.exec(line);
          const gradNormMatch = gradNormRegexObj.exec(line);

          if (lossMatch && lossMatch[1]) {
            const value = parseFloat(lossMatch[1]);
            if (!isNaN(value)) {
              lossData.push({ x: lossData.length, y: value });
            }
          }

          if (gradNormMatch && gradNormMatch[1]) {
            const value = parseFloat(gradNormMatch[1]);
            if (!isNaN(value)) {
              gradNormData.push({ x: gradNormData.length, y: value });
            }
          }
        });
      } catch (error) {
        console.error('Regex error:', error);
      }

      return { ...file, lossData, gradNormData };
    });
  }, [files, lossRegex, gradNormRegex]);

  const movingAverage = (data, windowSize = 10) => {
    return data.map((point, index) => {
      const start = Math.max(0, index - windowSize + 1);
      const end = index + 1;
      const window = data.slice(start, end);
      const avg = window.reduce((sum, p) => sum + p.y, 0) / window.length;
      return { x: point.x, y: avg };
    });
  };

  const getComparisonData = (data1, data2, mode) => {
    const minLength = Math.min(data1.length, data2.length);
    const result = [];

    for (let i = 0; i < minLength; i++) {
      const val1 = data1[i].y;
      const val2 = data2[i].y;
      let diff;

      switch (mode) {
        case 'absolute':
          diff = Math.abs(val2 - val1);
          break;
        case 'relative':
          // 相对误差：先计算绝对差值，再计算相对误差（不使用百分号）
          const absoluteDiff = Math.abs(val2 - val1);
          diff = val1 !== 0 ? (absoluteDiff / Math.abs(val1)) : 0;
          break;
        default: // normal
          diff = val2 - val1;
      }

      result.push({ x: i, y: diff });
    }

    return result;
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          boxWidth: 40,
          boxHeight: 2,
          padding: 10,
          usePointStyle: false,
          generateLabels: function(chart) {
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
        },
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(15, 23, 42, 0.92)',
        titleColor: '#f1f5f9',
        bodyColor: '#cbd5e1',
        borderColor: 'rgba(71, 85, 105, 0.2)',
        borderWidth: 1,
        cornerRadius: 6,
        displayColors: true,
        usePointStyle: true,
        titleFont: {
          size: 11,
          weight: '600',
          family: 'Inter, system-ui, sans-serif'
        },
        bodyFont: {
          size: 10,
          weight: '400',
          family: 'Inter, system-ui, sans-serif'
        },
        footerFont: {
          size: 9,
          weight: '300'
        },
        padding: {
          top: 6,
          bottom: 6,
          left: 8,
          right: 8
        },
        caretPadding: 4,
        caretSize: 4,
        multiKeyBackground: 'transparent',
        callbacks: {
          title: function(context) {
            return `Step ${context[0].parsed.x}`;
          },
          label: function(context) {
            const value = Number(context.parsed.y.toPrecision(4));
            return ` ${value}`;
          },
          labelColor: function(context) {
            return {
              borderColor: context.dataset.borderColor,
              backgroundColor: context.dataset.borderColor,
              borderWidth: 1,
              borderRadius: 2
            };
          }
        }
      },
    },
    scales: {
      x: {
        type: 'linear',
        display: true,
        title: {
          display: true,
          text: 'Step',
        },
        min: 0,
        bounds: 'data',
      },
      y: {
        type: 'linear',
        display: true,
        title: {
          display: true,
          text: 'Value',
        },
        bounds: 'data',
        ticks: {
          callback: function(value) {
            return Number(value.toPrecision(2));
          },
        },
      },
    },
    elements: {
      point: {
        radius: showDataPoints ? 2 : 0,
      },
    },
  };

  const colors = [
    '#ef4444', // red
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // yellow
    '#8b5cf6', // purple
    '#f97316', // orange
  ];

  const createChartData = (dataArray, title, yAxisLabel) => {
    const datasets = [];

    dataArray.forEach((data, index) => {
      const color = colors[index % colors.length];
      
      // Chart data without smoothing
      datasets.push({
        label: `${parsedData[index]?.name?.replace(/\.(log|txt)$/i, '') || `File ${index + 1}`}`,
        data: data,
        borderColor: color,
        backgroundColor: `${color}33`, // Add transparency
        borderWidth: 2,
        fill: false,
        tension: 0.1,
        pointRadius: showDataPoints ? 2 : 0,
        pointHoverRadius: 4,
      });
    });

    return {
      datasets,
    };
  };

  const createComparisonChartData = (data1, data2, title) => {
    const comparisonData = getComparisonData(data1, data2, compareMode);
    const baseline = compareMode === 'relative' ? relativeBaseline : 
                    compareMode === 'absolute' ? absoluteBaseline : 0;
    
    const datasets = [
      {
        label: `${title} 差值`,
        data: comparisonData,
        borderColor: '#dc2626',
        backgroundColor: '#dc2626',
        borderWidth: 2,
        fill: false,
        tension: 0.1,
        pointRadius: showDataPoints ? 2 : 0,
      }
    ];

    // Add baseline if it's not zero and we're in relative or absolute mode
    if (baseline > 0 && (compareMode === 'relative' || compareMode === 'absolute')) {
      const baselineData = comparisonData.map(point => ({ x: point.x, y: baseline }));
      datasets.push({
        label: `Baseline`,
        data: baselineData,
        borderColor: '#10b981',
        backgroundColor: '#10b981',
        borderWidth: 2,
        borderDash: [5, 5],
        fill: false,
        tension: 0,
        pointRadius: 0,
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

  // 检查是否有任何图表可以显示
  if (!showLoss && !showGradNorm) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="text-center text-gray-500">
          <div className="mb-4">
            <svg className="mx-auto h-16 w-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-lg mb-2 font-medium">🎯 请选择要显示的图表</p>
          <p className="text-sm">👈 在左侧显示选项中勾选 "显示 Loss 函数" 或 "显示 Grad Norm"</p>
        </div>
      </div>
    );
  }

  const lossDataArray = parsedData.map(file => file.lossData).filter(data => data && data.length > 0);
  const gradNormDataArray = parsedData.map(file => file.gradNormData).filter(data => data && data.length > 0);

  // 计算显示的图表数量来决定布局
  const showingLossCharts = showLoss && lossDataArray.length > 0;
  const showingGradNormCharts = showGradNorm && gradNormDataArray.length > 0;
  const showingLossComparison = showLoss && lossDataArray.length === 2;
  const showingGradNormComparison = showGradNorm && gradNormDataArray.length === 2;
  
  // 计算实际显示的图表列数（不是图表总数）
  const showingLossColumn = showingLossCharts || showingLossComparison;
  const showingGradNormColumn = showingGradNormCharts || showingGradNormComparison;
  const columnsShowing = (showingLossColumn ? 1 : 0) + (showingGradNormColumn ? 1 : 0);
  
  // 动态决定布局：如果只显示一列，使用全宽；否则使用两列
  const useFullWidth = columnsShowing <= 1;
  const gridCols = useFullWidth ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2';

  return (
    <div className={`grid ${gridCols} gap-3`}>
      {/* Loss Charts Column */}
      {(showingLossCharts || showingLossComparison) && (
        <div className="space-y-3">
          {showingLossCharts && (
            <ResizablePanel title="📉 Loss Function" initialHeight={440}>
              <ChartWrapper
                data={createChartData(lossDataArray, 'Loss', 'Loss Value')}
                options={{
                  ...chartOptions,
                  scales: {
                    ...chartOptions.scales,
                    y: {
                      ...chartOptions.scales.y,
                      title: {
                        display: true,
                        text: 'Loss Value',
                      },
                    },
                  },
                }}
                title="Loss Function"
              />
            </ResizablePanel>
          )}

          {/* Loss Comparison Chart (for 2 files) */}
          {showingLossComparison && (
            <ResizablePanel title={`⚖️ Loss 对比分析 (${compareMode})`} initialHeight={440}>
              <ChartWrapper
                data={createComparisonChartData(lossDataArray[0], lossDataArray[1], 'Loss')}
                options={{
                  ...chartOptions,
                  scales: {
                    ...chartOptions.scales,
                    y: {
                      ...chartOptions.scales.y,
                      title: {
                        display: true,
                        text: compareMode === 'relative' ? 'Relative Error' : 'Loss Difference',
                      },
                    },
                  },
                }}
                title="Loss Comparison"
              />
            </ResizablePanel>
          )}
        </div>
      )}

      {/* Grad Norm Charts Column */}
      {(showingGradNormCharts || showingGradNormComparison) && (
        <div className="space-y-3">
          {showingGradNormCharts && (
            <ResizablePanel title="📈 Gradient Norm" initialHeight={440}>
              <ChartWrapper
                data={createChartData(gradNormDataArray, 'Grad Norm', 'Grad Norm Value')}
                options={{
                  ...chartOptions,
                  scales: {
                    ...chartOptions.scales,
                    y: {
                      ...chartOptions.scales.y,
                      title: {
                        display: true,
                        text: 'Grad Norm Value',
                      },
                    },
                  },
                }}
                title="Gradient Norm"
              />
            </ResizablePanel>
          )}

          {/* Grad Norm Comparison Chart (for 2 files) */}
          {showingGradNormComparison && (
            <ResizablePanel title={`⚖️ Grad Norm 对比分析 (${compareMode})`} initialHeight={440}>
              <ChartWrapper
                data={createComparisonChartData(gradNormDataArray[0], gradNormDataArray[1], 'Grad Norm')}
                options={{
                  ...chartOptions,
                  scales: {
                    ...chartOptions.scales,
                    y: {
                      ...chartOptions.scales.y,
                      title: {
                        display: true,
                        text: compareMode === 'relative' ? 'Relative Error' : 'Grad Norm Difference',
                      },
                    },
                  },
                }}
                title="Grad Norm Comparison"
              />
            </ResizablePanel>
          )}
        </div>
      )}

      {/* Statistics for comparison - spans all columns when showing both types */}
      {parsedData.length === 2 && (showingLossComparison || showingGradNormComparison) && (
        <div className={`${useFullWidth ? '' : 'lg:col-span-2'} bg-white rounded-lg shadow-md p-3`}>
          <h3 className="text-base font-semibold text-gray-800 mb-2">差值分析统计</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {showingLossComparison && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Loss 差值统计</h4>
                <div className="space-y-1 text-xs">
                  {(() => {
                    const normalDiff = getComparisonData(lossDataArray[0], lossDataArray[1], 'normal');
                    const absoluteDiff = getComparisonData(lossDataArray[0], lossDataArray[1], 'absolute');
                    const relativeDiff = getComparisonData(lossDataArray[0], lossDataArray[1], 'relative');
                    
                    const meanNormal = normalDiff.reduce((sum, p) => sum + p.y, 0) / normalDiff.length;
                    const meanAbsolute = absoluteDiff.reduce((sum, p) => sum + p.y, 0) / absoluteDiff.length;
                    const meanRelative = relativeDiff.reduce((sum, p) => sum + p.y, 0) / relativeDiff.length;
                    
                    return (
                      <>
                        <p>Mean Difference: {meanNormal.toFixed(6)}</p>
                        <p>Mean Absolute Error: {meanAbsolute.toFixed(6)}</p>
                        <p>Mean Relative Error: {meanRelative.toFixed(6)}</p>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
            {showingGradNormComparison && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Grad Norm 差值统计</h4>
                <div className="space-y-1 text-xs">
                  {(() => {
                    const normalDiff = getComparisonData(gradNormDataArray[0], gradNormDataArray[1], 'normal');
                    const absoluteDiff = getComparisonData(gradNormDataArray[0], gradNormDataArray[1], 'absolute');
                    const relativeDiff = getComparisonData(gradNormDataArray[0], gradNormDataArray[1], 'relative');
                    
                    const meanNormal = normalDiff.reduce((sum, p) => sum + p.y, 0) / normalDiff.length;
                    const meanAbsolute = absoluteDiff.reduce((sum, p) => sum + p.y, 0) / absoluteDiff.length;
                    const meanRelative = relativeDiff.reduce((sum, p) => sum + p.y, 0) / relativeDiff.length;
                    
                    return (
                      <>
                        <p>Mean Difference: {meanNormal.toFixed(6)}</p>
                        <p>Mean Absolute Error: {meanAbsolute.toFixed(6)}</p>
                        <p>Mean Relative Error: {meanRelative.toFixed(6)}</p>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
