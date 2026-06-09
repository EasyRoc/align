# Align

Align 是一个基于 Electron + React + MediaPipe 的本地坐姿监控桌面应用。它使用摄像头实时提取人体关键点，在本机计算坐姿评分，并在检测到前倾或久坐时通过系统通知提醒用户调整姿势。

## 功能

- 实时摄像头预览和 MediaPipe Pose 骨骼叠加
- 基于头前倾角、脊柱前倾角、肩膀水平度的 0-100 坐姿评分
- 连续前倾提醒，支持触发延迟和冷却时间
- 久坐提醒，支持自定义提醒间隔
- 首次使用三步校准向导，记录个人标准坐姿基线
- IndexedDB 本地存储评分历史、提醒事件、设置和校准数据
- 30 天趋势、热力图和今日事件时间线
- macOS/Windows/Linux Electron 桌面壳、菜单栏 Tray、系统通知和开机自启开关

## 隐私

Align 的姿态识别在本机 WASM 环境中运行，不上传摄像头画面，也不保存图像。项目已将 MediaPipe WASM 和 lite pose landmarker 模型放在 `public/mediapipe/`，运行时从本地资源加载。

## 技术栈

- Electron 33
- React 19 + TypeScript
- electron-vite + Vite
- Tailwind CSS v4
- `@mediapipe/tasks-vision`
- Dexie.js / IndexedDB
- Recharts

## 开始开发

```bash
npm install
npm run dev
```

开发模式会启动 Electron 应用，并为渲染进程提供 Vite dev server。

## 常用命令

```bash
npm run typecheck
npm test -- --run
npm run build
npm run pack
npm run dist
```

## 项目结构

```text
align/
├── electron/              # Electron 主进程、preload、Tray、通知
├── public/mediapipe/      # 本地 MediaPipe WASM 和模型资产
├── shared/                # 主进程和渲染进程共享类型
├── src/
│   ├── components/        # UI 组件
│   ├── hooks/             # 摄像头、姿态检测、评分 hooks
│   ├── pages/             # Dashboard / Stats / Settings / Onboarding
│   └── services/          # 存储、检测、评分、提醒核心逻辑
└── docs/superpowers/      # 需求规格和实现计划
```

## 验证状态

当前实现已通过：

- `npm run typecheck`
- `npm test -- --run`
- `npx electron-vite build`

## 说明

首次 `npm install` 会执行 `scripts/prepare-mediapipe.mjs`，用于同步 `@mediapipe/tasks-vision` 的 WASM 文件，并在模型文件缺失时下载 lite pose landmarker 模型。仓库中已包含这些本地推理资产，应用运行时不需要从远程加载模型。
