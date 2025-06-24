import React from 'react';
import { BarChart3, Github } from 'lucide-react';

export function Header() {
  return (
    <header className="text-center" role="banner">
      <div className="flex items-center justify-center gap-2 mb-1">
        <BarChart3 
          size={28} 
          className="text-blue-600" 
          aria-hidden="true"
          role="img"
        />
        <h1 className="text-2xl font-bold text-gray-800">
          🤖 ML Log Analyzer
        </h1>
      </div>
      <p className="text-sm text-gray-600 mb-2" role="doc-subtitle">
        📊 分析和可视化大模型训练日志中的损失函数和梯度范数数据
      </p>
      <div className="flex items-center justify-center gap-3" role="group" aria-label="工具状态和链接">
        <span 
          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
          aria-label="当前为在线版本"
        >
          <span aria-hidden="true">🌐</span>
          <span className="ml-1">在线使用</span>
        </span>
        <a
          href="https://github.com/JavaZeroo/compare_tool"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          aria-label="访问 GitHub 仓库（在新窗口中打开）"
        >
          <Github size={12} aria-hidden="true" />
          <span>GitHub</span>
        </a>
      </div>
    </header>
  );
}
