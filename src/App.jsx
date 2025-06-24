import React, { useState, useCallback } from 'react';
import { FileUpload } from './components/FileUpload';
import { RegexControls } from './components/RegexControls';
import { FileList } from './components/FileList';
import ChartContainer from './components/ChartContainer';
import { ComparisonControls } from './components/ComparisonControls';
import { Header } from './components/Header';
import { FileConfigModal } from './components/FileConfigModal';

function App() {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [lossRegex, setLossRegex] = useState('loss:\\s*([\\d.]+)');
  const [gradNormRegex, setGradNormRegex] = useState('grad norm:\\s*([\\d.]+)');
  const [showDataPoints, setShowDataPoints] = useState(true);
  const [compareMode, setCompareMode] = useState('normal');
  const [relativeBaseline, setRelativeBaseline] = useState(0.002);
  const [absoluteBaseline, setAbsoluteBaseline] = useState(0.005);
  const [showLoss, setShowLoss] = useState(true);
  const [showGradNorm, setShowGradNorm] = useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [configFile, setConfigFile] = useState(null);

  const handleFilesUploaded = useCallback((files) => {
    const filesWithDefaults = files.map(file => ({
      ...file,
      enabled: true,
      config: {
        lossRegex: 'loss:\\s*([\\d.]+)',
        gradNormRegex: 'grad norm:\\s*([\\d.]+)',
        dataRange: {
          start: '',
          end: '',
          useRange: false
        }
      }
    }));
    setUploadedFiles(prev => [...prev, ...filesWithDefaults]);
  }, []);

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

  const handleRegexChange = useCallback((type, value) => {
    if (type === 'loss') {
      setLossRegex(value);
    } else {
      setGradNormRegex(value);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
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
              lossRegex={lossRegex}
              gradNormRegex={gradNormRegex}
              onRegexChange={handleRegexChange}
            />
            
            <FileList
              files={uploadedFiles}
              onFileRemove={handleFileRemove}
              onFileToggle={handleFileToggle}
              onFileConfig={handleFileConfig}
            />

            {uploadedFiles.length === 2 && (
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
      />
    </div>
  );
}

export default App;
