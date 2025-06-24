import React from 'react';
import { BarChart3, Github } from 'lucide-react';

export function Header() {
  return (
    <header className="text-center">
      <div className="flex items-center justify-center gap-2 mb-1">
        <BarChart3 size={28} className="text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-800">
          大模型日志分析工具
        </h1>
      </div>
      <p className="text-sm text-gray-600 mb-2">
        分析和可视化大模型训练日志中的损失函数和梯度范数数据
      </p>
      <div className="flex items-center justify-center gap-3">
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          ✨ 在线使用
        </span>
        <a
          href="https://github.com/JavaZeroo/compare_tool"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
        >
          <Github size={12} />
          GitHub
        </a>
      </div>
    </header>
  );
}
