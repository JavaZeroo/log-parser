import React, { useState, useCallback, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { RegexControls } from './components/RegexControls';
import { FileList } from './components/FileList';
import ChartContainer from './components/ChartContainer';
import { ComparisonControls } from './components/ComparisonControls';
import { Header } from './components/Header';
import { FileConfigModal } from './components/FileConfigModal';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';

function App() {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  
  // 全局解析配置状态
  const [globalParsingConfig, setGlobalParsingConfig] = useState({
    metrics: [
      {
        name: 'Loss',
        mode: 'keyword', // 'keyword' | 'regex'
        keyword: 'loss:',
        regex: 'loss:\\s*([\\d.eE+-]+)'
      },
      {
        name: 'Grad Norm',
        mode: 'keyword',
        keyword: 'norm:',
        regex: 'grad[\\s_]norm:\\s*([\\d.eE+-]+)'
      }
    ]
  });
  
  const [compareMode, setCompareMode] = useState('normal');
  const [relativeBaseline, setRelativeBaseline] = useState(0.002);
  const [absoluteBaseline, setAbsoluteBaseline] = useState(0.005);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [configFile, setConfigFile] = useState(null);
  const [globalDragOver, setGlobalDragOver] = useState(false);
  const [, setDragCounter] = useState(0);
  const [xRange, setXRange] = useState({ min: undefined, max: undefined });
  const [maxStep, setMaxStep] = useState(0);
  const [sidebarVisible, setSidebarVisible] = useState(true);

  const handleFilesUploaded = useCallback((files) => {
    const filesWithDefaults = files.map(file => ({
      ...file,
      enabled: true,
      config: {
        // 使用全局解析配置作为默认值
        metrics: globalParsingConfig.metrics.map(m => ({ ...m })),
        dataRange: {
          start: 0,        // 默认从第一个数据点开始
          end: undefined,  // 默认到最后一个数据点
          useRange: false  // 保留这个字段用于向后兼容，但默认不启用
        }
      }
    }));
    setUploadedFiles(prev => [...prev, ...filesWithDefaults]);
  }, [globalParsingConfig]);

  // 全局文件处理函数
  const processGlobalFiles = useCallback((files) => {
    const fileArray = Array.from(files);

    if (fileArray.length === 0) return;

    const processedFiles = fileArray.map(file => ({
      file,
      name: file.name,
      id: Math.random().toString(36).substr(2, 9),
      data: null,
      content: null
    }));

    // Read file contents
    Promise.all(
      processedFiles.map(fileObj => 
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            fileObj.content = e.target.result;
            resolve(fileObj);
          };
          reader.readAsText(fileObj.file);
        })
      )
    ).then(files => {
      handleFilesUploaded(files);
    });
  }, [handleFilesUploaded]);

  const handleFileRemove = useCallback((index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleFileToggle = useCallback((index, enabled) => {
    setUploadedFiles(prev => prev.map((file, i) => 
      i === index ? { ...file, enabled } : file
    ));
  }, []);

  const handleFileConfig = useCallback((file) => {
    setConfigFile(file);
    setConfigModalOpen(true);
  }, []);

  const handleConfigSave = useCallback((fileId, config) => {
    setUploadedFiles(prev => prev.map(file => 
      file.id === fileId ? { ...file, config } : file
    ));
  }, []);

  const handleConfigClose = useCallback(() => {
    setConfigModalOpen(false);
    setConfigFile(null);
  }, []);

  // 全局解析配置变更处理
  const handleGlobalParsingConfigChange = useCallback((newConfig) => {
    setGlobalParsingConfig(newConfig);

    // 同步所有文件的解析配置
    setUploadedFiles(prev => prev.map(file => ({
      ...file,
      config: {
        ...file.config,
        metrics: newConfig.metrics.map(m => ({ ...m }))
      }
    })));
  }, []);

  // 全局拖拽事件处理
  const handleGlobalDragEnter = useCallback((e) => {
    e.preventDefault();
    setDragCounter(prev => prev + 1);
    
    // 检查是否包含文件
    if (e.dataTransfer.types.includes('Files')) {
      setGlobalDragOver(true);
    }
  }, []);

  const handleGlobalDragOver = useCallback((e) => {
    e.preventDefault();
    // 设置拖拽效果
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleGlobalDragLeave = useCallback((e) => {
    e.preventDefault();
    setDragCounter(prev => {
      const newCount = prev - 1;
      if (newCount === 0) {
        setGlobalDragOver(false);
      }
      return newCount;
    });
  }, []);

  const handleGlobalDrop = useCallback((e) => {
    e.preventDefault();
    setGlobalDragOver(false);
    setDragCounter(0);
    
    if (e.dataTransfer.files.length > 0) {
      processGlobalFiles(e.dataTransfer.files);
    }
  }, [processGlobalFiles]);

  // 添加全局拖拽监听器
  useEffect(() => {
    const handleDragEnter = (e) => handleGlobalDragEnter(e);
    const handleDragOver = (e) => handleGlobalDragOver(e);
    const handleDragLeave = (e) => handleGlobalDragLeave(e);
    const handleDrop = (e) => handleGlobalDrop(e);

    document.addEventListener('dragenter', handleDragEnter);
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('dragleave', handleDragLeave);
    document.addEventListener('drop', handleDrop);

    return () => {
      document.removeEventListener('dragenter', handleDragEnter);
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('dragleave', handleDragLeave);
      document.removeEventListener('drop', handleDrop);
    };
  }, [handleGlobalDragEnter, handleGlobalDragOver, handleGlobalDragLeave, handleGlobalDrop]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 relative">
      {/* 全页面拖拽覆盖层 */}
      {globalDragOver && (
        <div
          className="fixed inset-0 bg-blue-600 bg-opacity-95 z-50 flex items-center justify-center backdrop-blur-sm drag-overlay-fade-in"
        >
          <div 
            className="bg-white rounded-xl shadow-2xl p-8 text-center max-w-md mx-4 border-4 border-dashed border-blue-300 drag-modal-scale-in"
          >
            <div className="mb-6">
              <div className="relative">
                <svg 
                  className="mx-auto h-20 w-20 text-blue-600 drag-icon-bounce" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={1.5} 
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
                  />
                </svg>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              🎯 释放文件以上传
            </h3>
            <p className="text-sm text-gray-600 mb-2">
              支持 <span className="font-semibold text-blue-600">所有文本格式</span> 文件
            </p>
            <p className="text-xs text-gray-500">
              拖拽到页面任意位置即可快速上传文件
            </p>
          </div>
        </div>
      )}

      {!sidebarVisible && (
        <button
          onClick={() => setSidebarVisible(true)}
          className="fixed top-3 left-3 z-40 p-2 bg-white rounded-full shadow-md text-gray-600 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="显示工具栏"
        >
          <PanelLeftOpen size={20} aria-hidden="true" />
        </button>
      )}

      <div className="w-full px-3 py-3">

        <main
          id="main-content"
          className="grid grid-cols-1 xl:grid-cols-5 gap-3"
          role="main"
        >
          {sidebarVisible && (
            <aside
              className="xl:col-span-1 space-y-3"
              role="complementary"
              aria-label="控制面板"
            >
              {/* 标题信息 */}
              <div className="bg-white rounded-lg shadow-md p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h1 className="text-lg font-bold text-gray-800">
                  Log Analyzer
                </h1>
                <button
                  onClick={() => setSidebarVisible(false)}
                  className="ml-auto p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                  aria-label="隐藏工具栏"
                >
                  <PanelLeftClose size={16} aria-hidden="true" />
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                📊 分析和可视化大模型训练日志中的损失函数和梯度范数数据
              </p>
              
              {/* 状态和链接按钮 */}
              <div className="flex items-center gap-2" role="group" aria-label="工具状态和链接">
                <span 
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                  aria-label="当前为在线版本"
                >
                  <span aria-hidden="true">🌐</span>
                  <span className="ml-1">在线使用</span>
                </span>
                <a
                  href="https://github.com/JavaZeroo/log-parser"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  aria-label="访问 GitHub 仓库（在新窗口中打开）"
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
                  </svg>
                  <span>GitHub</span>
                </a>
              </div>
            </div>
            
            <FileUpload onFilesUploaded={handleFilesUploaded} />
            
            <RegexControls
              globalParsingConfig={globalParsingConfig}
              onGlobalParsingConfigChange={handleGlobalParsingConfigChange}
              uploadedFiles={uploadedFiles}
              xRange={xRange}
              onXRangeChange={setXRange}
              maxStep={maxStep}
            />
            
            <FileList
              files={uploadedFiles}
              onFileRemove={handleFileRemove}
              onFileToggle={handleFileToggle}
              onFileConfig={handleFileConfig}
            />

            {uploadedFiles.filter(file => file.enabled).length === 2 && (
              <ComparisonControls
                compareMode={compareMode}
                onCompareModeChange={setCompareMode}
              />
            )}

            <section className="bg-white rounded-lg shadow-md p-3" aria-labelledby="display-options-heading">
              <h3 
                id="display-options-heading"
                className="text-base font-semibold text-gray-800 mb-2"
              >
                🎛️ 显示选项
              </h3>
              <div className="space-y-3">
                <div>
                  <h4 className="text-xs font-medium text-gray-700 mb-2">📊 图表显示</h4>
                  <p className="text-xs text-gray-500">上传文件后自动展示所有已配置的指标图表</p>
                </div>
                
                <div className="border-t pt-3">
                  <h4 className="text-xs font-medium text-gray-700 mb-2">基准线设置</h4>
                  <div className="space-y-3">
                    <div>
                      <label 
                        htmlFor="relative-baseline"
                        className="block text-xs font-medium text-gray-700 mb-1"
                      >
                        相对误差 Baseline
                      </label>
                      <input
                        id="relative-baseline"
                        type="number"
                        step="0.001"
                        value={relativeBaseline}
                        onChange={(e) => setRelativeBaseline(parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                        placeholder="0.002"
                        aria-describedby="relative-baseline-description"
                      />
                      <span 
                        id="relative-baseline-description"
                        className="sr-only"
                      >
                        设置相对误差对比的基准线数值
                      </span>
                    </div>
                    
                    <div>
                      <label 
                        htmlFor="absolute-baseline"
                        className="block text-xs font-medium text-gray-700 mb-1"
                      >
                        绝对误差 Baseline
                      </label>
                      <input
                        id="absolute-baseline"
                        type="number"
                        step="0.001"
                        value={absoluteBaseline}
                        onChange={(e) => setAbsoluteBaseline(parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                        placeholder="0.005"
                        aria-describedby="absolute-baseline-description"
                      />
                      <span 
                        id="absolute-baseline-description"
                        className="sr-only"
                      >
                        设置绝对误差对比的基准线数值
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              </section>
            </aside>
          )}

          <section
            className="xl:col-span-4"
            role="region"
            aria-label="图表显示区域"
          >
            <ChartContainer
              files={uploadedFiles}
              metrics={globalParsingConfig.metrics}
              compareMode={compareMode}
              relativeBaseline={relativeBaseline}
              absoluteBaseline={absoluteBaseline}
              xRange={xRange}
              onXRangeChange={setXRange}
              onMaxStepChange={setMaxStep}
            />
          </section>
        </main>
      </div>
      
      <FileConfigModal
        file={configFile}
        isOpen={configModalOpen}
        onClose={handleConfigClose}
        onSave={handleConfigSave}
        globalParsingConfig={globalParsingConfig}
      />
    </div>
  );
}

export default App;
