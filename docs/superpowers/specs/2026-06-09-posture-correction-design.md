# 坐姿纠正应用 — 需求规格说明书

> 基于 Supershrimp (supershrimp.io) 逆向分析，构建开源坐姿监控桌面应用。

## 1. 项目目标

利用摄像头 + 本地 AI 实时监控坐姿，检测前倾/驼背并弹出系统通知提醒用户调整姿势。**100% 本地推理，无需联网，保护隐私**。

## 2. 功能范围（V1）

| 功能 | 说明 | 优先级 |
|------|------|--------|
| 实时姿势检测 | 摄像头采集 + MediaPipe Pose 33 关键点提取 | P0 |
| 姿势评分 | 0-100 实时评分（头前倾角/脊柱前倾角/肩膀水平度） | P0 |
| 前倾提醒 | 连续前倾 N 秒触发系统通知，带冷却机制 | P0 |
| 久坐提醒 | 连续坐 N 分钟提醒站起来活动 | P0 |
| 个性化校准 | 首次录制"标准坐姿"作为评分基线 | P1 |
| 统计报表 | 日/周/月趋势热力图 + 事件时间线 | P1 |
| 菜单栏驻留 | 菜单栏图标显示实时分数颜色，展开快捷菜单 | P1 |
| 开机自启 | 系统登录时自动启动 | P2 |

## 3. 评分算法

### 关键点

MediaPipe Pose Landmarker 33 关键点中取：

| 关键点 | 索引 | 用途 |
|--------|------|------|
| 鼻子 | 0 | 头前倾检测 |
| 左耳 / 右耳 | 7 / 8 | 头部位置 |
| 左肩 / 右肩 | 11 / 12 | 肩膀倾斜 + 驼背 |
| 左髋 / 右髋 | 23 / 24 | 脊柱角度 |
| 左膝 / 右膝 | 25 / 26 | 久坐状态 |

### 三个评分维度

```
维度一：头前倾角 (Forward Head Posture)  — 权重 0.35
  耳朵→肩膀连线 与 垂直线夹角，正常 < 15°

维度二：脊柱前倾角 (Slouching)           — 权重 0.45
  肩膀→髋部连线 与 垂直线夹角，正常 < 10°

维度三：肩膀水平度 (Shoulder Alignment)   — 权重 0.20
  左肩↔右肩连线 与 水平线夹角，正常 < 5°
```

### 评分公式

```
score_i = max(0, 100 - |当前角度 - 基线角度| × 扣分系数)
total = headScore × 0.35 + spineScore × 0.45 + shoulderScore × 0.20
```

校准前使用固定经验阈值；校准后基于用户录制的基线偏移量计算。

### 提醒触发

- **前倾**：总分低于阈值且连续持续 5 秒以上（默认），两次提醒间隔 ≥ 5 分钟
- **久坐**：姿态正常但连续坐了 45 分钟以上（默认），间隔可自定义

## 4. 技术架构

### 4.1 技术栈

| 层 | 技术 | 版本 |
|----|------|------|
| 桌面框架 | Electron | 33+ |
| 前端 | React + TypeScript | 19 |
| 姿态检测 | @mediapipe/tasks-vision | latest |
| 图表 | Recharts | latest |
| 本地存储 | Dexie.js (IndexedDB) | latest |
| 样式 | Tailwind CSS | v4 |
| 构建 | electron-vite + Vite | latest |
| 打包 | electron-builder | latest |

### 4.2 项目结构

```
align/
├── electron/              # Electron 主进程
│   ├── main.ts            # 入口：窗口管理、Tray、通知
│   ├── tray.ts            # 菜单栏图标 + 菜单
│   ├── notifications.ts   # 系统通知封装
│   └── preload.ts         # IPC 桥接
├── src/                   # 渲染进程 (React)
│   ├── App.tsx
│   ├── pages/
│   │   ├── Dashboard.tsx       # 左预览右评分
│   │   ├── Settings.tsx        # 分组卡片设置
│   │   ├── Stats.tsx           # 热力图 + 事件时间线
│   │   └── Onboarding.tsx      # 三步校准向导
│   ├── services/
│   │   ├── PoseDetector.ts     # MediaPipe Pose 封装
│   │   ├── PostureScorer.ts    # 角度计算 + 评分引擎
│   │   ├── Calibration.ts      # 基线校准
│   │   ├── AlertManager.ts     # 提醒逻辑
│   │   └── Storage.ts          # IndexedDB 读写
│   ├── components/
│   │   ├── CameraPreview.tsx   # 摄像头 + 骨骼叠加
│   │   ├── ScoreRing.tsx       # 分数圆环
│   │   ├── TrendChart.tsx      # 统计图
│   │   ├── AlertPopover.tsx    # 提醒弹窗
│   │   └── CalibrateGuide.tsx  # 校准向导
│   └── hooks/
│       ├── useCamera.ts
│       ├── usePoseDetection.ts
│       └── usePostureScore.ts
├── shared/                # 共享类型
│   └── types.ts
├── electron-builder.yml
└── package.json
```

### 4.3 进程通信

```
Renderer (React)  ←──IPC──→  Main (Electron)
     │                           │
     ├─ PoseDetector             ├─ Tray 图标更新
     ├─ PostureScorer            ├─ 系统通知
     ├─ Storage (IndexedDB)      └─ 开机自启
     └─ UI 渲染
```

### 4.4 数据模型

```typescript
interface ScoreRecord {
  id: number;
  timestamp: number;
  headAngle: number;
  spineAngle: number;
  shoulderAngle: number;
  totalScore: number;
}

interface AlertEvent {
  id: number;
  type: 'slouch' | 'sedentary';
  timestamp: number;
  duration?: number;
}

interface CalibrationData {
  headAngle: number;
  spineAngle: number;
  shoulderAngle: number;
  recordedAt: number;
}

interface Settings {
  slouchThresholdSec: number;    // 默认 5
  slouchCooldownMin: number;     // 默认 5
  sedentaryIntervalMin: number;  // 默认 45
  notificationsEnabled: boolean; // 默认 true
  autoStart: boolean;            // 默认 false
  calibrated: boolean;           // 默认 false
}
```

## 5. UI 设计

### 5.1 主面板 (Dashboard)

左侧：摄像头预览（MediaPipe 骨骼叠加画在 Canvas 上）
右侧：实时分数圆环（0-100，绿/黄/红渐变）+ 今日汇总卡片

### 5.2 统计页 (Stats)

上部：GitHub 贡献图风格热力图，30 天每日好/坏姿势色块
下部：事件时间线，列出前倾提醒和久坐提醒

### 5.3 设置页 (Settings)

分组卡片式布局：
- 提醒设置：前倾延迟、冷却、久坐间隔
- 校准：基线数据展示 + 重新校准按钮
- 通用：开机自启、数据导出

### 5.4 校准向导 (Onboarding)

三步流程：
1. 对准摄像头 → 肩膀出现在检测框内
2. 保持端正坐姿 5 秒 → 自动采集关键点角度
3. 基线记录成功 → 进入 Dashboard

### 5.5 菜单栏

- 图标根据当前评分颜色（绿 ≥80 / 黄 60-79 / 红 <60）
- 菜单：暂停/恢复、打开 Dashboard、设置、退出

## 6. 非功能需求

- **隐私**：所有推理在本地 WASM 运行，无网络请求，不存储图像
- **性能**：姿态检测 ≥ 15fps，不拖慢系统
- **资源**：内存占用 < 200MB，CPU < 10%（M1 芯片基准）
- **包体积**：安装包 < 200MB
- **可维护性**：核心算法独立于 UI，方便未来迁移框架

## 7. 风险 & 已知限制

- MediaPipe WASM 首帧加载 ~2-3 秒延迟，需加载动画
- 固定经验模型可能不适合部分体型（校准功能可缓解）
- 暗光环境下关键点检测精度下降
- Electron 包体积较大（但跨平台优势抵消）
