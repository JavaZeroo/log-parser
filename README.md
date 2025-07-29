# ML Log Analyzer

[![GitHub Pages](https://img.shields.io/badge/GitHub-Pages-green)](https://log.javazero.top/)
[![License](https://img.shields.io/badge/License-MIT-blue)](LICENSE)
[![React](https://img.shields.io/badge/React-19.1.0-blue)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.3.5-green)](https://vitejs.dev/)

一个现代化的在线工具，帮助您分析和可视化机器学习训练日志中的损失函数和梯度范数。
支持多种日志格式，提供智能解析、同步图表和对比分析等高级功能。

## 在线体验

访问 [https://log.javazero.top/](https://log.javazero.top/) 即可使用，无需安装。

## 主要特性

- **多文件上传**：全页面拖拽即可上传多个日志文件并独立配置解析规则。
- **智能解析**：关键字匹配和正则表达式两种模式，自动识别常见日志格式。
- **自定义指标**：可自由添加关键字或正则，自定义需要解析的日志字段，并提供常用预设。
- **同步图表**：多个图表之间鼠标悬停同步显示相同训练步骤的数据。
- **对比分析**：提供 Normal、Absolute、Relative 等多种差值模式，并计算统计指标。
- **灵活展示**：可独立启用或禁用文件和图表，支持调整数据范围与图表尺寸，图表高度可拖拽调整。
- **易用特性**：支持匹配预览、智能推荐解析规则，图表 Shift+拖动可快速缩放。

## 快速上手

1. 将训练日志文件拖拽到页面任意位置。
2. 在弹出的配置面板中选择解析方式（关键字或正则），并可添加自定义指标。
3. 查看自动生成的图表，必要时可上传第二个文件进行对比分析。
4. 调整图表显示或数据范围以获得更精确的结果。

## 部署

### GitHub Pages

本仓库已配置 GitHub Actions，推送到主分支会自动构建并部署到 GitHub Pages。
Fork 仓库后开启 GitHub Pages 即可自动部署。

### Vercel

也可以一键部署到 Vercel：

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/JavaZeroo/log-parser)

## 项目结构

```
src/
├── components/         # 主要 React 组件
├── assets/             # 静态资源
├── utils/              # 工具函数
├── App.jsx             # 应用入口组件
└── main.jsx            # 渲染入口
```

## 贡献

欢迎通过 Pull Request 提交代码或提出建议。

## 许可证

项目基于 [MIT](LICENSE) 协议发布。

## 鸣谢

- [Chart.js](https://www.chartjs.org/)
- [React](https://reactjs.org/)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Lucide](https://lucide.dev/)
