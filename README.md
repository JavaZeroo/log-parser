# 🚀 ML Log Analyzer

一个现代化的在线工具，专门用于分析和可视化大模型训练日志中的损失函数（Loss）和梯度范数（Grad Norm）数据。支持多种日志格式，提供智能解析、多图表同步显示和高级对比分析功能。

[![GitHub Pages](https://img.shields.io/badge/GitHub-Pages-green)](https://log.javazero.top/)
[![License](https://img.shields.io/badge/License-MIT-blue)](#license)
[![React](https://img.shields.io/badge/React-19.1.0-blue)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.3.5-green)](https://vitejs.dev/)

## 🌟 在线使用

**直接访问**: [https://log.javazero.top/](https://log.javazero.top/)

无需安装，打开即用！支持所有现代浏览器。

## ✨ 核心功能

### 📁 **智能文件上传**
- **🎯 全页面拖拽**：将日志文件拖拽到页面任意位置即可上传
- **📊 多文件支持**：同时上传和分析多个训练日志文件
- **📝 格式兼容**：支持所有文本格式文件（`.log`、`.txt`、无后缀等）
- **⚡ 即时解析**：文件上传后立即开始解析和可视化

### 🔍 **强大的数据解析系统**
- **🎨 关键词匹配**（默认模式）：智能识别日志中的关键字，自动提取数值
  - Loss: `loss` → 自动查找后续数字
  - Grad Norm: `global_norm` → 自动提取梯度范数值
- **⚙️ 正则表达式模式**：支持复杂的自定义匹配规则
- **🤖 智能推荐**：系统自动分析日志格式并推荐最佳解析方式
- **🔬 多格式支持**：JSON、键值对、数组、科学计数法等多种日志格式
- **🎯 独立配置**：每个文件可单独配置解析规则

### 📊 **高级可视化图表**
- **🔄 多图表同步**：鼠标hover时，所有图表同步显示相同步骤的数据点
- **🎯 精确定位**：hover时显示实心圆点，精确指示当前训练步骤
- **⚡ 零延迟响应**：所有交互效果即时响应，无动画延迟
- **📏 可调整尺寸**：图表高度可以自由调整，适应不同分析需求
- **🎨 动态布局**：根据显示的图表数量自动调整布局（单列/双列）

### 🔬 **深度对比分析**
当选择2个文件时，系统提供专业的对比分析：
- **📈 Normal模式**: 原始差值分析 (File2 - File1)
- **📊 Absolute模式**: 绝对差值分析 |File2 - File1|
- **📉 Relative模式**: 相对差值百分比分析
- **📋 统计指标**: 详细的Mean Difference、Mean Absolute Error、Mean Relative Error
- **⚖️ 基准线设置**: 可配置相对误差和绝对误差的基准线

### �️ **灵活的显示控制**
- **👁️ 图表切换**：独立控制Loss函数和Grad Norm图表的显示
- **📁 文件管理**：支持文件启用/禁用，灵活控制参与分析的数据
- **📊 数据范围**：支持设置分析的起始和结束位置，专注特定训练阶段
- **🔄 实时更新**：所有配置修改后图表立即更新

### 🎨 **现代化用户界面**
- **📱 响应式设计**：完美适配桌面、平板和手机设备
- **🌈 直观交互**：清晰的视觉反馈和用户引导
- **♿ 无障碍支持**：完整的键盘导航和屏幕阅读器支持
- **🎯 用户友好**：简洁明了的操作流程，零学习成本

## 🛠️ 技术栈

- **前端框架**: React 19.1.0
- **构建工具**: Vite 6.3.5
- **样式框架**: Tailwind CSS 4.1.10
- **图表库**: Chart.js + react-chartjs-2
- **图标**: Lucide React
- **开发语言**: JavaScript (ES6+)
- **部署方式**: GitHub Actions + GitHub Pages

## 🚀 部署说明

本项目采用 GitHub Actions 自动化部署到 GitHub Pages，每次推送到主分支时自动构建和部署。

如需 fork 此项目进行自定义开发：

1. Fork 本仓库到你的 GitHub 账户
2. 在仓库设置中启用 GitHub Pages
3. 选择 GitHub Actions 作为部署源
4. 推送代码时将自动触发构建和部署
5. 每个 PR 会自动生成预览链接，合并前即可在线查看效果

## 📝 使用指南

### 🎯 快速上手
1. **📂 上传文件**: 拖拽训练日志文件到页面任意位置
2. **🔍 选择解析方式**: 
   - **关键词匹配**（推荐）：直接使用 `loss` 和 `global_norm` 关键字
   - **正则表达式**：自定义复杂的匹配规则
3. **📊 查看图表**: 系统自动解析并生成交互式图表
4. **⚖️ 对比分析**: 上传两个文件时自动启用高级对比功能
5. **🎛️ 调整显示**: 控制图表显示选项和数据范围

### 🔧 高级功能
- **📁 文件独立配置**: 每个文件可单独设置解析规则和数据范围
- **🔄 多图表同步**: hover任意图表时，所有相关图表同步显示
- **📏 图表调整**: 拖拽调整图表高度，适应不同分析需求
- **📋 统计分析**: 自动计算并显示详细的统计指标

## 📊 支持的日志格式

### 🎯 关键词匹配模式（推荐）
支持多种常见的训练日志格式：

```bash
# 标准格式
loss: 0.1234
global_norm: [1.5678]

# JSON 格式
{"loss": 0.1234, "global_norm": 1.5678}

# 数组格式
loss [0.1234]
global_norm: [1.5678]

# 科学计数法
loss: 1.234e-4
global_norm: 1.5678E+0

# MindFormers 格式
Step 100: loss=0.1234 global_norm=1.5678
```

### ⚙️ 正则表达式模式
对于特殊格式的日志，可以使用自定义正则表达式：

```bash
# 默认正则
Loss: loss:\\s*([\\d.eE+-]+)
Grad Norm: grad[\\s_]norm:\\s*([\\d.eE+-]+)

# 自定义示例
train_loss:\\s*([\\d.eE+-]+)
gradient_norm:\\s*([\\d.eE+-]+)
```

## 🔧 功能特色

### 🎯 智能解析系统
- **关键词匹配**: 默认模式，智能识别常见训练日志格式
- **智能推荐**: 自动分析日志结构，推荐最佳解析方式
- **多格式支持**: 兼容JSON、键值对、数组、科学计数法等格式
- **实时预览**: 解析结果实时预览，包含数值、行号、原文信息

### 📊 高级可视化
- **同步显示**: 多图表联动，hover时同步显示相同训练步骤
- **精确定位**: 实心圆点精确标识当前hover位置
- **即时响应**: 零延迟交互，所有动画已优化
- **响应式布局**: 根据图表数量自动调整单列/双列布局

### 🔬 专业对比分析
- **三种对比模式**: Normal、Absolute、Relative差值分析
- **统计指标**: Mean Difference、Mean Absolute Error、Mean Relative Error
- **基准线设置**: 可配置对比基准线，突出显示显著差异
- **差值可视化**: 专门的差值图表，清晰展示训练差异

### 🎛️ 灵活控制
- **文件管理**: 支持文件启用/禁用、删除、重命名
- **独立配置**: 每个文件可单独设置解析规则和数据范围
- **全局同步**: 全局解析配置可一键应用到所有文件
- **数据范围**: 支持设置分析的起始和结束步骤

## 📦 项目结构

```
src/
├── components/              # React 组件
│   ├── Header.jsx          # 页面头部（已清空）
│   ├── FileUpload.jsx      # 文件上传组件
│   ├── FileList.jsx        # 文件列表管理
│   ├── RegexControls.jsx   # 解析规则控制
│   ├── ComparisonControls.jsx # 对比模式控制
│   ├── ChartContainer.jsx  # 图表容器和同步控制
│   ├── ResizablePanel.jsx  # 可调整尺寸的图表面板
│   └── FileConfigModal.jsx # 文件配置弹窗
├── App.jsx                 # 主应用组件
├── main.jsx               # 应用入口
└── index.css              # 全局样式和无障碍支持
```

## 🤝 贡献

欢迎贡献代码和提出建议！

### 如何贡献
1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开一个 Pull Request

### 报告问题
如果您发现任何问题或有功能建议，请在 [Issues](https://github.com/JavaZeroo/log-parser/issues) 页面提交。

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

感谢以下开源项目的支持：

- [Chart.js](https://www.chartjs.org/) - 强大的图表库，提供高性能可视化
- [React](https://reactjs.org/) - 现代化的用户界面库
- [Vite](https://vitejs.dev/) - 快速的前端构建工具
- [Tailwind CSS](https://tailwindcss.com/) - 实用优先的CSS框架
- [Lucide](https://lucide.dev/) - 美观一致的图标库

---

## ⭐ 支持项目

如果这个工具对您的机器学习项目有帮助，请给它一个 ⭐ ！

您的支持是我们持续改进的动力。
