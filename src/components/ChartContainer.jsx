import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
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
const ChartWrapper = ({ data, options, title, chartId, onRegisterChart, onSyncHover }) => {
  const chartRef = useRef(null);
  
  const handleChartRef = useCallback((ref) => {
    if (ref) {
      chartRef.current = ref;
      onRegisterChart(chartId, ref);
    }
  }, [chartId, onRegisterChart]);

  const enhancedOptions = {
    ...options,
    onHover: (event, activeElements, chart) => {
      if (activeElements.length > 0) {
        const step = activeElements[0].index;
        onSyncHover(step, chartId);
      } else {
        onSyncHover(null, chartId);
      }
    },
    // 添加额外的事件处理确保清除状态
    events: ['mousemove', 'mouseout', 'click', 'touchstart', 'touchmove'],
  };

  // 添加容器的鼠标离开事件
  const handleContainerMouseLeave = useCallback(() => {
    onSyncHover(null, chartId);
  }, [onSyncHover, chartId]);

  try {
    return (
      <div 
        onMouseLeave={handleContainerMouseLeave}
        style={{ width: '100%', height: '100%' }}
      >
        <Line ref={handleChartRef} data={data} options={enhancedOptions} />
      </div>
    );
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
  compareMode,
  relativeBaseline = 0.002,
  absoluteBaseline = 0.005,
  showLoss = true,
  showGradNorm = false,
  xRange = { min: undefined, max: undefined },
  onXRangeChange,
  onMaxStepChange
}) {
  // 同步hover状态管理
  const [syncHoverStep, setSyncHoverStep] = useState(null);
  const chartRefs = useRef(new Map()); // 存储所有图表实例的引用
  
  // 注册图表实例
  const registerChart = useCallback((chartId, chartInstance) => {
    chartRefs.current.set(chartId, chartInstance);
  }, []);
  
  // 同步所有图表的hover状态
  const syncHoverToAllCharts = useCallback((step, sourceChartId) => {
    if (step === null) {
      // 清除所有图表的hover状态（包括源图表）
      chartRefs.current.forEach((chart, chartId) => {
        if (chart) {
          chart.setActiveElements([]);
          chart.tooltip.setActiveElements([]);
          chart.update('none');
        }
      });
      setSyncHoverStep(null);
    } else {
      // 同步hover到所有图表（不包括源图表，避免重复操作）
      chartRefs.current.forEach((chart, chartId) => {
        if (chart && chartId !== sourceChartId) {
          const activeElements = [];
          
          // 为每个数据集找到对应step的数据点
          chart.data.datasets.forEach((dataset, datasetIndex) => {
            if (dataset.data && dataset.data.length > step) {
              activeElements.push({
                datasetIndex,
                index: step
              });
            }
          });
          
          chart.setActiveElements(activeElements);
          chart.tooltip.setActiveElements(activeElements, { x: 0, y: 0 });
          chart.update('none');
        }
      });
      setSyncHoverStep(step);
    }
  }, []);

  const parsedData = useMemo(() => {
    // 只处理已启用的文件
    const enabledFiles = files.filter(file => file.enabled !== false);
    
    return enabledFiles.map(file => {
      if (!file.content) return { ...file, lossData: [], gradNormData: [] };

      const lines = file.content.split('\n');
      const lossData = [];
      const gradNormData = [];

      try {
        // 使用新的配置格式，同时保持向后兼容
        let fileLossConfig, fileGradNormConfig;
        
        if (file.config?.loss && file.config?.gradNorm) {
          // 新配置格式
          fileLossConfig = file.config.loss;
          fileGradNormConfig = file.config.gradNorm;
        } else {
          // 旧配置格式，转换为新格式
          fileLossConfig = {
            mode: 'regex',
            regex: file.config?.lossRegex || lossRegex
          };
          fileGradNormConfig = {
            mode: 'regex',
            regex: file.config?.gradNormRegex || gradNormRegex
          };
        }

        // 处理Loss数据
        if (fileLossConfig.mode === 'keyword') {
          // 关键词匹配
          const extractByKeyword = (content, keyword) => {
            const results = [];
            const lines = content.split('\n');
            
            // 数值正则：支持各种数值格式，包括科学计数法
            const numberRegex = /[+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/;
            
            lines.forEach((line, lineIndex) => {
              // 查找关键词（忽略大小写）
              const keywordIndex = line.toLowerCase().indexOf(keyword.toLowerCase());
              if (keywordIndex !== -1) {
                // 从关键词后开始查找第一个数字
                const afterKeyword = line.substring(keywordIndex + keyword.length);
                const numberMatch = afterKeyword.match(numberRegex);
                
                if (numberMatch) {
                  const value = parseFloat(numberMatch[0]);
                  if (!isNaN(value)) {
                    results.push(value);
                  }
                }
              }
            });
            
            return results;
          };
          
          const lossValues = extractByKeyword(file.content, fileLossConfig.keyword);
          lossValues.forEach((value, index) => {
            if (!isNaN(value)) {
              lossData.push({ x: index, y: value });
            }
          });
        } else {
          // 正则表达式匹配
          const lossRegexObj = new RegExp(fileLossConfig.regex);
          lines.forEach((line, index) => {
            lossRegexObj.lastIndex = 0;
            const lossMatch = lossRegexObj.exec(line);
            if (lossMatch && lossMatch[1]) {
              const value = parseFloat(lossMatch[1]);
              if (!isNaN(value)) {
                lossData.push({ x: lossData.length, y: value });
              }
            }
          });
        }

        // 处理Grad Norm数据
        if (fileGradNormConfig.mode === 'keyword') {
          // 关键词匹配
          const extractByKeyword = (content, keyword) => {
            const results = [];
            const lines = content.split('\n');
            
            // 数值正则：支持各种数值格式，包括科学计数法
            const numberRegex = /[+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/;
            
            lines.forEach((line, lineIndex) => {
              // 查找关键词（忽略大小写）
              const keywordIndex = line.toLowerCase().indexOf(keyword.toLowerCase());
              if (keywordIndex !== -1) {
                // 从关键词后开始查找第一个数字
                const afterKeyword = line.substring(keywordIndex + keyword.length);
                const numberMatch = afterKeyword.match(numberRegex);
                
                if (numberMatch) {
                  const value = parseFloat(numberMatch[0]);
                  if (!isNaN(value)) {
                    results.push(value);
                  }
                }
              }
            });
            
            return results;
          };
          
          const gradNormValues = extractByKeyword(file.content, fileGradNormConfig.keyword);
          gradNormValues.forEach((value, index) => {
            if (!isNaN(value)) {
              gradNormData.push({ x: index, y: value });
            }
          });
        } else {
          // 正则表达式匹配
          const gradNormRegexObj = new RegExp(fileGradNormConfig.regex);
          lines.forEach((line, index) => {
            gradNormRegexObj.lastIndex = 0;
            const gradNormMatch = gradNormRegexObj.exec(line);
            if (gradNormMatch && gradNormMatch[1]) {
              const value = parseFloat(gradNormMatch[1]);
              if (!isNaN(value)) {
                gradNormData.push({ x: gradNormData.length, y: value });
              }
            }
          });
        }
      } catch (error) {
        console.error('Regex error:', error);
      }

      // 应用数据范围过滤
      const dataRange = file.config?.dataRange;
      if (dataRange && (dataRange.start > 0 || dataRange.end !== undefined)) {
        const applyRangeFilter = (data) => {
          if (data.length === 0) return data;
          
          const start = Math.max(0, parseInt(dataRange.start) || 0);
          const end = dataRange.end !== undefined ? parseInt(dataRange.end) : data.length;
          
          // 验证范围有效性
          if (start >= data.length || (end !== undefined && start >= end)) {
            console.warn(`Invalid range for file ${file.name}: start=${start}, end=${end}, length=${data.length}`);
            return data; // 返回原始数据
          }
          
          // 切片数据（start到end，不包含end）
          const endIndex = Math.min(data.length, end);
          const slicedData = data.slice(start, endIndex);
          
          return slicedData;
        };
        
        const filteredLossData = applyRangeFilter(lossData);
        const filteredGradNormData = applyRangeFilter(gradNormData);
        
        // 重新索引数据点
        const reindexData = (data) => data.map((point, index) => ({ x: index, y: point.y }));
        
        return { 
          ...file, 
          lossData: reindexData(filteredLossData), 
          gradNormData: reindexData(filteredGradNormData) 
        };
      }

      return { ...file, lossData, gradNormData };
    });
  }, [files, lossRegex, gradNormRegex]);

  useEffect(() => {
    const maxStep = parsedData.reduce((max, file) => {
        const maxLoss = file.lossData.length > 0 ? file.lossData[file.lossData.length - 1].x : 0;
        const maxGrad = file.gradNormData.length > 0 ? file.gradNormData[file.gradNormData.length - 1].x : 0;
        return Math.max(max, maxLoss, maxGrad);
    }, 0);
    onMaxStepChange(maxStep);
  }, [parsedData, onMaxStepChange]);

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
    animation: {
      duration: 0, // 禁用默认动画
    },
    animations: {
      // 禁用所有动画，包括hover动画
      colors: false,
      x: false,
      y: false,
    },
    hover: {
      animationDuration: 0, // 禁用hover动画
    },
    responsiveAnimationDuration: 0, // 禁用响应式动画
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      zoom: {
        pan: {
          enabled: true,
          mode: 'x',
          onPanComplete: ({chart}) => {
            const {min, max} = chart.scales.x;
            onXRangeChange({min: Math.round(min), max: Math.round(max)});
          }
        },
        zoom: {
          drag: {
            enabled: true,
            borderColor: 'rgba(225,225,225,0.2)',
            borderWidth: 1,
            backgroundColor: 'rgba(225,225,225,0.2)',
            modifierKey: 'shift',
          },
          wheel: {
            enabled: true,
          },
          pinch: {
            enabled: true
          },
          mode: 'x',
          onZoomComplete: ({chart}) => {
            const {min, max} = chart.scales.x;
            onXRangeChange({min: Math.round(min), max: Math.round(max)});
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
        animation: false, // 禁用tooltip动画
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
        min: xRange.min,
        max: xRange.max,
        bounds: 'data'
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
        radius: 0, // 默认不显示数据点
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
        tension: 0, // 设置 tension 为 0，绘制直线段
        pointRadius: 0, // 默认不显示数据点
        pointHoverRadius: 4, // hover时显示实心圆点，半径为4
        pointBackgroundColor: color, // 设置点的背景色
        pointBorderColor: color, // 设置点的边框色
        pointBorderWidth: 1, // 设置点的边框宽度
        pointHoverBackgroundColor: color, // hover时的背景色
        pointHoverBorderColor: color, // hover时的边框色
        pointHoverBorderWidth: 1, // hover时的边框宽度
        // 禁用所有动画，确保响应迅速
        animation: false,
        animations: {
          colors: false,
          x: false,
          y: false,
        },
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
        tension: 0, // 设置 tension 为 0，绘制直线段
        pointRadius: 0, // 默认不显示数据点
        pointHoverRadius: 4, // hover时显示实心圆点
        pointBackgroundColor: '#dc2626', // 设置点的背景色
        pointBorderColor: '#dc2626', // 设置点的边框色
        pointBorderWidth: 1, // 设置点的边框宽度
        pointHoverBackgroundColor: '#dc2626', // hover时的背景色
        pointHoverBorderColor: '#dc2626', // hover时的边框色
        pointHoverBorderWidth: 1, // hover时的边框宽度
        // 禁用所有动画，确保响应迅速
        animation: false,
        animations: {
          colors: false,
          x: false,
          y: false,
        },
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
          pointRadius: 0, // 默认不显示数据点
          pointHoverRadius: 4, // hover时显示实心圆点
          pointBackgroundColor: '#10b981', // 设置点的背景色
          pointBorderColor: '#10b981', // 设置点的边框色
          pointBorderWidth: 1, // 设置点的边框宽度
          pointHoverBackgroundColor: '#10b981', // hover时的背景色
          pointHoverBorderColor: '#10b981', // hover时的边框色
          pointHoverBorderWidth: 1, // hover时的边框宽度
          // 禁用所有动画，确保响应迅速
          animation: false,
          animations: {
            colors: false,
            x: false,
            y: false,
          },
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
  const enabledFiles = files.filter(file => file.enabled !== false);
  const showingLossCharts = showLoss && lossDataArray.length > 0;
  const showingGradNormCharts = showGradNorm && gradNormDataArray.length > 0;
  const showingLossComparison = showLoss && enabledFiles.length === 2 && lossDataArray.length === 2;
  const showingGradNormComparison = showGradNorm && enabledFiles.length === 2 && gradNormDataArray.length === 2;
  
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
                chartId="loss-main"
                onRegisterChart={registerChart}
                onSyncHover={syncHoverToAllCharts}
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
                chartId="loss-comparison"
                onRegisterChart={registerChart}
                onSyncHover={syncHoverToAllCharts}
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
                chartId="gradnorm-main"
                onRegisterChart={registerChart}
                onSyncHover={syncHoverToAllCharts}
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
                chartId="gradnorm-comparison"
                onRegisterChart={registerChart}
                onSyncHover={syncHoverToAllCharts}
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
      {enabledFiles.length === 2 && (showingLossComparison || showingGradNormComparison) && (
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
