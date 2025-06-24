# 🚀 大模型日志分析工具

一个现代化的 React + Vite 应用，用于分析和可视化大模型训练日志中的损失函数（Loss）和梯度范数（Grad Norm）数据。

[![GitHub Pages](https://img.shields.io/badge/GitHub-Pages-green)](https://blog.javazero.top/compare_tool/)
[![License](https://img.shields.io/badge/License-MIT-blue)](#license)
[![React](https://img.shields.io/badge/React-19.1.0-blue)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.3.5-green)](https://vitejs.dev/)

## 🌟 在线使用

**直接访问**: [https://blog.javazero.top/compare_tool/](https://blog.javazero.top/compare_tool/)

## ✨ 功能特性

### 📁 **文件上传**
- **拖拽上传**：将日志文件直接拖拽到网页上即可上传
- **多文件支持**：同时上传和分析多个日志文件
- **格式支持**：支持 `.log` 和 `.txt` 格式的文本文件

### 🔍 **数据解析**
- **正则表达式匹配**：使用自定义正则表达式提取Loss和Grad Norm数据
- **默认模式**：提供默认的匹配规则 `loss:\\s*([\\d.]+)` 和 `grad norm:\\s*([\\d.]+)`
- **实时重解析**：修改正则表达式后可以重新解析所有文件

### 📊 **TensorBoard样式可视化**
- **原始数据**: 低透明度显示真实波动
- **平滑曲线**: 移动平均显示趋势（可选）
- **智能布局**: 响应式设计，适配不同屏幕尺寸
- **交互式图表**: 基于 Chart.js 的高性能图表渲染

### 🔬 **对比分析**
当选择2个文件时，提供专门的对比图表和统计指标：
- **Normal**: 原始差值 (File2 - File1)
- **Absolute**: 绝对差值 |File2 - File1|
- **Relative**: 相对差值百分比
- **统计指标**: Mean Error (ME) 和 Mean Square Error (MSE)

### 🎨 **现代化界面**
- **Tailwind CSS**: 现代化的响应式设计
- **直观操作**: 简洁清晰的用户界面
- **实时反馈**: 即时的数据更新和图表渲染

## 🛠️ 技术栈

- **前端框架**: React 19.1.0
- **构建工具**: Vite 6.3.5
- **样式框架**: Tailwind CSS 4.1.10
- **图表库**: Chart.js + react-chartjs-2
- **图标**: Lucide React
- **开发语言**: JavaScript (ES6+)

## 🚀 快速开始

### 方法1: 在线使用 (推荐)
直接访问 GitHub Pages 部署的版本，无需任何安装。

### 方法2: 本地开发

```bash
# 克隆仓库
git clone https://github.com/JavaZeroo/compare_tool.git
cd compare_tool

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

## 📝 使用方法

1. **上传文件**: 拖拽或选择 `.log`/`.txt` 文件
2. **配置正则**: 根据日志格式调整正则表达式（可选）
3. **查看图表**: 系统自动解析并生成可视化图表
4. **对比分析**: 上传两个文件时可进行详细对比
5. **调整显示**: 控制数据点和平滑曲线的显示

## 📊 支持的日志格式

工具支持包含以下格式的训练日志：

```
loss: 0.1234
grad norm: 1.5678
```

您可以通过修改正则表达式来适配其他格式。

## 🔧 自定义配置

### 正则表达式
- **Loss**: `loss:\\s*([\\d.]+)` 
- **Grad Norm**: `grad norm:\\s*([\\d.]+)`

### 显示选项
- 显示/隐藏原始数据点
- 启用/禁用平滑曲线
- 多种对比模式选择

## 📦 项目结构

```
src/
├── components/           # React 组件
│   ├── Header.jsx       # 页面头部
│   ├── FileUpload.jsx   # 文件上传
│   ├── FileList.jsx     # 文件列表
│   ├── RegexControls.jsx # 正则控制
│   ├── ComparisonControls.jsx # 对比控制
│   └── ChartContainer.jsx # 图表容器
├── App.jsx              # 主应用组件
├── main.jsx            # 应用入口
└── index.css           # 全局样式
```

## 🤝 贡献

欢迎贡献代码！请查看 [Contributing Guidelines](CONTRIBUTING.md) 了解详情。

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [Chart.js](https://www.chartjs.org/) - 强大的图表库
- [React](https://reactjs.org/) - 用户界面库
- [Vite](https://vitejs.dev/) - 快速的构建工具
- [Tailwind CSS](https://tailwindcss.com/) - 实用优先的CSS框架
- [Lucide](https://lucide.dev/) - 美观的图标库

---

如果这个工具对您有帮助，请给它一个 ⭐ ！
