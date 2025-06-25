import React, { useState, useCallback, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { RegexControls } from './components/RegexControls';
import { FileList } from './components/FileList';
import ChartContainer from './components/ChartContainer';
import { ComparisonControls } from './components/ComparisonControls';
import { Header } from './components/Header';
import { FileConfigModal } from './components/FileConfigModal';

function App() {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  
  // 全局解析配置状态
  const [globalParsingConfig, setGlobalParsingConfig] = useState({
    loss: {
      mode: 'keyword', // 'keyword' | 'regex'
      keyword: 'loss',
      regex: 'loss:\\s*([\\d.eE+-]+)'
    },
    gradNorm: {
      mode: 'keyword', // 'keyword' | 'regex'
      keyword: 'global_norm',
      regex: 'grad[\\s_]norm:\\s*([\\d.eE+-]+)'
    }
  });
  
  // 兼容旧版本的正则表达式状态（供ChartContainer使用）
  const [lossRegex, setLossRegex] = useState('loss:\\s*([\\d.eE+-]+)');
  const [gradNormRegex, setGradNormRegex] = useState('grad[\\s_]norm:\\s*([\\d.eE+-]+)');
  
  const [showDataPoints, setShowDataPoints] = useState(true);
  const [compareMode, setCompareMode] = useState('normal');
  const [relativeBaseline, setRelativeBaseline] = useState(0.002);
  const [absoluteBaseline, setAbsoluteBaseline] = useState(0.005);
  const [showLoss, setShowLoss] = useState(true);
  const [showGradNorm, setShowGradNorm] = useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [configFile, setConfigFile] = useState(null);
  const [globalDragOver, setGlobalDragOver] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);

  const handleFilesUploaded = useCallback((files) => {
    const filesWithDefaults = files.map(file => ({
      ...file,
      enabled: true,
      config: {
        // 使用全局解析配置作为默认值
        loss: { ...globalParsingConfig.loss },
        gradNorm: { ...globalParsingConfig.gradNorm },
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
    const fileArray = Array.from(files).filter(file => 
      file.type === 'text/plain' || file.name.endsWith('.log') || file.name.endsWith('.txt')
    );

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
    
    // 同步更新兼容的正则表达式状态
    setLossRegex(newConfig.loss.mode === 'regex' ? newConfig.loss.regex : 'loss:\\s*([\\d.eE+-]+)');
    setGradNormRegex(newConfig.gradNorm.mode === 'regex' ? newConfig.gradNorm.regex : 'grad[\\s_]norm:\\s*([\\d.eE+-]+)');
    
    // 同步所有文件的解析配置
    setUploadedFiles(prev => prev.map(file => ({
      ...file,
      config: {
        ...file.config,
        loss: { ...newConfig.loss },
        gradNorm: { ...newConfig.gradNorm }
      }
    })));
  }, []);

  const handleRegexChange = useCallback((type, value) => {
    if (type === 'loss') {
      setLossRegex(value);
    } else {
      setGradNormRegex(value);
    }
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
              支持 <span className="font-semibold text-blue-600">.log</span> 和 <span className="font-semibold text-blue-600">.txt</span> 格式
            </p>
            <p className="text-xs text-gray-500">
              拖拽到页面任意位置即可快速上传日志文件
            </p>
          </div>
        </div>
      )}

      <div className="w-full px-3 py-3">
        <Header />
        
        <main 
          id="main-content"
          className="grid grid-cols-1 xl:grid-cols-5 gap-3 mt-4" 
          role="main"
        >
          <aside 
            className="xl:col-span-1 space-y-3"
            role="complementary"
            aria-label="控制面板"
          >
            <FileUpload onFilesUploaded={handleFilesUploaded} />
            
            <RegexControls
              globalParsingConfig={globalParsingConfig}
              onGlobalParsingConfigChange={handleGlobalParsingConfigChange}
              lossRegex={lossRegex}
              gradNormRegex={gradNormRegex}
              onRegexChange={handleRegexChange}
              uploadedFiles={uploadedFiles}
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
                  <div className="space-y-2">
                    <label className="flex items-center cursor-pointer hover:bg-gray-50 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={showLoss}
                        onChange={(e) => setShowLoss(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        aria-describedby="show-loss-description"
                      />
                      <span className="ml-2 text-xs text-gray-700">📉 显示 Loss 函数</span>
                      <span 
                        id="show-loss-description" 
                        className="sr-only"
                      >
                        控制是否显示损失函数图表
                      </span>
                    </label>
                    
                    <label className="flex items-center cursor-pointer hover:bg-gray-50 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={showGradNorm}
                        onChange={(e) => setShowGradNorm(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        aria-describedby="show-gradnorm-description"
                      />
                      <span className="ml-2 text-xs text-gray-700">📈 显示 Grad Norm</span>
                      <span 
                        id="show-gradnorm-description" 
                        className="sr-only"
                      >
                        控制是否显示梯度范数图表
                      </span>
                    </label>
                  </div>
                </div>

                <div className="border-t pt-3">
                  <h4 className="text-xs font-medium text-gray-700 mb-2">⚙️ 图表选项</h4>
                  <label className="flex items-center cursor-pointer hover:bg-gray-50 p-1 rounded">
                    <input
                      type="checkbox"
                      checked={showDataPoints}
                      onChange={(e) => setShowDataPoints(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      aria-describedby="show-data-points-description"
                    />
                    <span className="ml-2 text-xs text-gray-700">🔵 显示数据点</span>
                    <span 
                      id="show-data-points-description" 
                      className="sr-only"
                    >
                      控制是否在图表上显示原始数据点
                    </span>
                  </label>
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

          <section 
            className="xl:col-span-4"
            role="region"
            aria-label="图表显示区域"
          >
            <ChartContainer
              files={uploadedFiles}
              lossRegex={lossRegex}
              gradNormRegex={gradNormRegex}
              showDataPoints={showDataPoints}
              compareMode={compareMode}
              relativeBaseline={relativeBaseline}
              absoluteBaseline={absoluteBaseline}
              showLoss={showLoss}
              showGradNorm={showGradNorm}
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
