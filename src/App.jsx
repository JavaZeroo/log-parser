import React, { useState, useCallback } from 'react';
import { FileUpload } from './components/FileUpload';
import { RegexControls } from './components/RegexControls';
import { FileList } from './components/FileList';
import ChartContainer from './components/ChartContainer';
import { ComparisonControls } from './components/ComparisonControls';
import { Header } from './components/Header';

function App() {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [lossRegex, setLossRegex] = useState('loss:\\s*([\\d.]+)');
  const [gradNormRegex, setGradNormRegex] = useState('grad norm:\\s*([\\d.]+)');
  const [showDataPoints, setShowDataPoints] = useState(true);
  const [compareMode, setCompareMode] = useState('normal');
  const [relativeBaseline, setRelativeBaseline] = useState(0.002);
  const [absoluteBaseline, setAbsoluteBaseline] = useState(0.005);

  const handleFilesUploaded = useCallback((files) => {
    setUploadedFiles(prev => [...prev, ...files]);
  }, []);

  const handleFileRemove = useCallback((index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
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
        
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-3 mt-4">
          <div className="xl:col-span-1 space-y-3">{/* ...existing code...*/}
            <FileUpload onFilesUploaded={handleFilesUploaded} />
            
            <RegexControls
              lossRegex={lossRegex}
              gradNormRegex={gradNormRegex}
              onRegexChange={handleRegexChange}
            />
            
            <FileList
              files={uploadedFiles}
              onFileRemove={handleFileRemove}
            />

            {uploadedFiles.length === 2 && (
              <ComparisonControls
                compareMode={compareMode}
                onCompareModeChange={setCompareMode}
              />
            )}

            <div className="bg-white rounded-lg shadow-md p-3">
              <h3 className="text-base font-semibold text-gray-800 mb-2">显示选项</h3>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={showDataPoints}
                    onChange={(e) => setShowDataPoints(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-xs text-gray-700">显示数据点</span>
                </label>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    相对误差 Baseline
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={relativeBaseline}
                    onChange={(e) => setRelativeBaseline(parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.002"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    绝对误差 Baseline
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={absoluteBaseline}
                    onChange={(e) => setAbsoluteBaseline(parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.005"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="xl:col-span-4">
            <ChartContainer
              files={uploadedFiles}
              lossRegex={lossRegex}
              gradNormRegex={gradNormRegex}
              showDataPoints={showDataPoints}
              compareMode={compareMode}
              relativeBaseline={relativeBaseline}
              absoluteBaseline={absoluteBaseline}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
