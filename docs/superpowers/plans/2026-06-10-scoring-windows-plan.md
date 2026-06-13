# V1.1 实现计划 — 评分严格化 & Windows 适配

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 收紧姿势评分算法使端正坐姿 90+ / 明显驼背 ≤ 50，并适配 Electron 主进程在 Windows 平台正常运行。

**Architecture:** 本次改动集中在算法层（PostureScorer / 类型常量）和 Electron 主进程层（main / tray / build config），不涉及 React 页面和 hooks。

**Tech Stack:** TypeScript, Electron, Vitest

---

### Task 1: 更新评分常量 + 默认基线

**Files:**
- Modify: `shared/types.ts:61-71`
- Modify: `src/services/PostureScorer.ts:68-74`

- [ ] **Step 1: 收紧 PENALTY_COEFFICIENTS**

编辑 `shared/types.ts`，找到 `PENALTY_COEFFICIENTS`：

```typescript
// 改前
export const PENALTY_COEFFICIENTS = {
  head: 6.67,
  spine: 10,
  shoulder: 20,
} as const;

// 改后
export const PENALTY_COEFFICIENTS = {
  head: 12,
  spine: 18,
  shoulder: 30,
} as const;
```

- [ ] **Step 2: 收紧默认基线值**

编辑 `src/services/PostureScorer.ts`，找到 `score()` 方法中的 fallback baseline（第 69-74 行）：

```typescript
// 改前
const baseline = this.baseline ?? {
  headAngle: ANGLE_THRESHOLDS.head * 0.33,
  spineAngle: ANGLE_THRESHOLDS.spine * 0.4,
  shoulderAngle: ANGLE_THRESHOLDS.shoulder * 0.4,
  recordedAt: 0,
};

// 改后
const baseline = this.baseline ?? {
  headAngle: ANGLE_THRESHOLDS.head * 0.1,
  spineAngle: ANGLE_THRESHOLDS.spine * 0.1,
  shoulderAngle: ANGLE_THRESHOLDS.shoulder * 0.1,
  recordedAt: 0,
};
```

参数变化对照：

| 参数 | 改前 | 改后 |
|------|------|------|
| headAngle 基线 | 15 × 0.33 = 4.95° | 15 × 0.1 = 1.5° |
| spineAngle 基线 | 10 × 0.4 = 4° | 10 × 0.1 = 1.0° |
| shoulderAngle 基线 | 5 × 0.4 = 2° | 5 × 0.1 = 0.5° |

- [ ] **Step 3: 类型检查**

Run: `cd /Users/zhouqiantalaogong/PycharmProjects/align && npx tsc -p tsconfig.web.json --noEmit`

Expected: 无类型错误。

- [ ] **Step 4: Commit**

```bash
cd /Users/zhouqiantalaogong/PycharmProjects/align && git add shared/types.ts src/services/PostureScorer.ts && git commit -m "fix: tighten posture scoring with steeper penalties and stricter default baseline"
```

---

### Task 2: 更新测试用例

**Files:**
- Modify: `src/services/PostureScorer.test.ts`
- Modify: `src/services/AlertManager.test.ts`

- [ ] **Step 1: 更新 PostureScorer 测试预期值**

编辑 `src/services/PostureScorer.test.ts`，第一个测试 `extracts near-zero angles from vertically aligned seated landmarks` 仍然应该通过（垂直坐姿的角度接近 0，不受基线改动影响）。

第二个测试 `uses a calibration baseline so matching posture scores 100` —— 这个校准后匹配基线仍然 100 分，不受影响。

第三个测试 `penalizes head, spine, and shoulder deviations with configured weights`：

```typescript
// 改前
it('penalizes head, spine, and shoulder deviations with configured weights', () => {
  const scorer = new PostureScorer();
  scorer.setBaseline({
    headAngle: 0,
    spineAngle: 0,
    shoulderAngle: 0,
    recordedAt: 1,
  });

  const score = scorer.score({ headAngle: 10, spineAngle: 8, shoulderAngle: 3 });

  expect(score).toBe(29);
});

// 改后
it('penalizes head, spine, and shoulder deviations with configured weights', () => {
  const scorer = new PostureScorer();
  scorer.setBaseline({
    headAngle: 0,
    spineAngle: 0,
    shoulderAngle: 0,
    recordedAt: 1,
  });

  const score = scorer.score({ headAngle: 10, spineAngle: 8, shoulderAngle: 3 });

  // headScore = max(0, 100 - 10 * 12) = 0 (capped), effective contribution 0
  // spineScore = max(0, 100 - 8 * 18) = 0 (capped), effective contribution 0
  // shoulderScore = max(0, 100 - 3 * 30) = 10
  // total = 0 * 0.35 + 0 * 0.45 + 10 * 0.20 = 2
  expect(score).toBe(2);
});
```

- [ ] **Step 2: 添加新测试 —— 未校准场景严格评分**

在 `PostureScorer.test.ts` 的 `describe` 块末尾加：

```typescript
it('scores a perfect upright posture >= 90 without calibration', () => {
  const scorer = new PostureScorer();
  const score = scorer.score({ headAngle: 1.5, spineAngle: 1, shoulderAngle: 0.5 });
  expect(score).toBeGreaterThanOrEqual(90);
});

it('scores noticeable slouch <= 50 without calibration', () => {
  const scorer = new PostureScorer();
  const score = scorer.score({ headAngle: 10, spineAngle: 8, shoulderAngle: 3 });
  expect(score).toBeLessThanOrEqual(50);
});

it('scores severe slouch <= 20 without calibration', () => {
  const scorer = new PostureScorer();
  const score = scorer.score({ headAngle: 15, spineAngle: 12, shoulderAngle: 5 });
  expect(score).toBeLessThanOrEqual(20);
});
```

- [ ] **Step 3: 更新 AlertManager 测试**

检查 `src/services/AlertManager.test.ts`。如果测试中构造了 `AlertManager` 实例并使用了 `slouchScoreThreshold`，验证阈值为 50 时新评分能正确触发：

Run: `cd /Users/zhouqiantalaogong/PycharmProjects/align && cat src/services/AlertManager.test.ts`

根据实际测试内容判断是否需要修改。如果现有测试中的 `score` 入参已使用硬编码值（如 `score: 40` 触发 slouch），则不需要改动——因为 `score` 是外部传入的，AlertManager 不关心评分怎么算出来的。

- [ ] **Step 4: 运行全部测试**

Run: `cd /Users/zhouqiantalaogong/PycharmProjects/align && npx vitest run`

Expected: 所有测试 PASS。

- [ ] **Step 5: Commit**

```bash
cd /Users/zhouqiantalaogong/PycharmProjects/align && git add -A && git commit -m "test: update PostureScorer tests for stricter scoring"
```

---

### Task 3: Windows — 窗口 & 托盘适配

**Files:**
- Modify: `electron/main.ts:8-23`
- Modify: `electron/tray.ts:64-71`

- [ ] **Step 1: 条件化 titleBarStyle**

编辑 `electron/main.ts`，修改 `createWindow()` 中的 `BrowserWindow` 构造：

```typescript
function createWindow() {
  const isMac = process.platform === 'darwin';

  mainWindow = new BrowserWindow({
    width: 1040,
    height: 680,
    minWidth: 840,
    minHeight: 560,
    title: 'Align - 坐姿助手',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    ...(isMac ? { titleBarStyle: 'hiddenInset' } : {}),
    backgroundColor: '#0a0a0a',
    show: false,
  });

  // ... 其余不变
}
```

- [ ] **Step 2: Windows 托盘行为适配**

编辑 `electron/tray.ts`，修改 `createTray` 中的事件处理：

```typescript
export function createTray(window: BrowserWindow): Tray {
  mainWindow = window;
  const isWindows = process.platform === 'win32';
  tray = new Tray(createTrayIcon(currentScore));
  tray.setToolTip('Align - 坐姿助手');

  if (isWindows) {
    // Windows: left-click always opens Dashboard, context menu on right-click
    tray.on('click', showMainWindow);
  } else {
    // macOS: left-click toggles window visibility
    tray.on('click', () => {
      if (!mainWindow) return;
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        showMainWindow();
      }
    });
  }

  rebuildMenu();
  return tray;
}
```

- [ ] **Step 3: 类型检查**

Run: `cd /Users/zhouqiantalaogong/PycharmProjects/align && npx tsc -p tsconfig.node.json --noEmit`

Expected: 无类型错误。

- [ ] **Step 4: Commit**

```bash
cd /Users/zhouqiantalaogong/PycharmProjects/align && git add electron/main.ts electron/tray.ts && git commit -m "feat: add Windows platform support for window frame and tray behavior"
```

---

### Task 4: Windows — 打包 & 图标

**Files:**
- Modify: `electron-builder.yml`
- Create: `scripts/generate-icons.sh`
- Create: `assets/` 目录下的图标文件（或脚本生成）

- [ ] **Step 1: 更新 electron-builder.yml**

编辑 `electron-builder.yml`：

```yaml
appId: com.align.posture
productName: Align
directories:
  output: dist
  buildResources: assets
files:
  - out/**/*
  - public/mediapipe/**/*
mac:
  category: public.app-category.healthcare-fitness
  icon: assets/icon.icns
  target:
    - dmg
win:
  icon: assets/icon.ico
  target:
    - nsis
nsis:
  oneClick: true
  perMachine: false
linux:
  icon: assets/icon.png
  target:
    - AppImage
```

已包含 `win.icon` 配置行，无需改动。验证文件内容一致。

- [ ] **Step 2: 创建图标生成脚本**

创建 `scripts/generate-icons.sh`:

```bash
#!/bin/bash
# Generate a simple SVG-based circle icon for Align.
# Requires: rsvg-convert (brew install librsvg) on macOS
# On Windows/Linux: use any SVG→PNG tool or skip this script and create icons manually.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ASSETS_DIR="$SCRIPT_DIR/../assets"
mkdir -p "$ASSETS_DIR"

SVG="$ASSETS_DIR/icon.svg"
cat > "$SVG" << 'SVGEOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="g" cx="50%" cy="40%">
      <stop offset="0%" stop-color="#34d399"/>
      <stop offset="100%" stop-color="#059669"/>
    </radialGradient>
  </defs>
  <rect width="512" height="512" rx="100" fill="#0a0a0a"/>
  <circle cx="256" cy="220" r="120" fill="url(#g)"/>
  <circle cx="176" cy="180" r="18" fill="#0a0a0a" opacity="0.15"/>
  <rect x="200" y="350" width="112" height="24" rx="12" fill="#065f46"/>
  <rect x="220" y="390" width="72" height="16" rx="8" fill="#064e3b"/>
</svg>
SVGEOF

if command -v rsvg-convert &>/dev/null; then
  rsvg-convert -w 1024 -h 1024 "$SVG" -o "$ASSETS_DIR/icon.png"
  rsvg-convert -w 256 -h 256 "$SVG" -o "$ASSETS_DIR/icon-256.png"
  echo "Generated icon.png and icon-256.png from SVG."
else
  echo "rsvg-convert not found. Install librsvg (brew install librsvg) or create icons manually."
fi

# macOS .icns requires iconutil or png2icns
# Windows .ico can be created from .png with ImageMagick: convert icon-256.png icon.ico
echo "To create .icns: use 'iconutil' on macOS with an iconset folder."
echo "To create .ico:  convert assets/icon-256.png assets/icon.ico (requires ImageMagick)."
```

Run: `chmod +x /Users/zhouqiantalaogong/PycharmProjects/align/scripts/generate-icons.sh`

- [ ] **Step 3: 创建默认占位图标（如果当前无图标可用）**

如果 `assets/` 目录没有图标文件，Electron 会使用默认图标。对于 Windows 构建，我们可以创建一个最小 PNG 作为占位：

```bash
cd /Users/zhouqiantalaogong/PycharmProjects/align && bash scripts/generate-icons.sh
```

如果 `rsvg-convert` 不可用，检查是否可用 `sips`（macOS 内置）或其他工具。最终确保 `assets/icon.png` 存在以便 electron-builder 打包 Windows 版本时至少有一个图标。

- [ ] **Step 4: 验证 electron-builder 配置**

Run: `cd /Users/zhouqiantalaogong/PycharmProjects/align && npx electron-builder --help`

Expected: 无配置错误。

- [ ] **Step 5: Commit**

```bash
cd /Users/zhouqiantalaogong/PycharmProjects/align && git add electron-builder.yml scripts/generate-icons.sh assets/ && git commit -m "feat: add Windows build icon generation and packaging config"
```

---

### Task 5: 全量验证

- [ ] **Step 1: 类型检查**

Run: `cd /Users/zhouqiantalaogong/PycharmProjects/align && npm run typecheck`

Expected: 零错误。

- [ ] **Step 2: 单元测试**

Run: `cd /Users/zhouqiantalaogong/PycharmProjects/align && npx vitest run`

Expected: 全部 PASS。

- [ ] **Step 3: 构建**

Run: `cd /Users/zhouqiantalaogong/PycharmProjects/align && npm run build`

Expected: 构建成功，`out/` 生成 main/preload/renderer。

- [ ] **Step 4: 评分模拟验证（手动）**

Run: `cd /Users/zhouqiantalaogong/PycharmProjects/align && npx vitest run src/services/PostureScorer.test.ts`

验证测试输出中的评分梯度：

```
端正坐姿 (1.5/1/0.5°) → ≥ 90  ✓
明显驼背 (10/8/3°)    → ≤ 50  ✓
严重驼背 (15/12/5°)   → ≤ 20  ✓
```

- [ ] **Step 5: macOS 功能回归（手动）**

Run: `cd /Users/zhouqiantalaogong/PycharmProjects/align && npm run dev`

验证：
1. 启动 → Dashboard 页面正常
2. 点击开始 → 摄像头预览 + MediaPipe 加载
3. 托盘图标显示并随分数变色
4. 评分不再"随便坐就高分"
5. 前倾提醒正常触发

- [ ] **Step 6: Commit**

```bash
cd /Users/zhouqiantalaogong/PycharmProjects/align && git add -A && git commit -m "chore: verify scoring strictness and Windows build config"
```

---

## Plan Self-Review

### 1. Spec Coverage

| 需求 | Task | 状态 |
|------|------|------|
| S1 提升惩罚系数 | Task 1 Step 1 | ✅ |
| S2 收紧默认基线 | Task 1 Step 2 | ✅ |
| S3 校准后仍严格 | Task 1 (数学保证，校准 = 偏移基线) | ✅ |
| S4 测试覆盖 | Task 2 | ✅ |
| W1 窗口样式平台适配 | Task 3 Step 1 | ✅ |
| W2 托盘行为平台适配 | Task 3 Step 2 | ✅ |
| W3 通知平台适配 | 无需改动（Electron 已抽象） | ✅ |
| W4 打包配置 | Task 4 Step 1 | ✅ |
| W5 应用图标 | Task 4 Steps 2-3 | ✅ |

### 2. Placeholder Scan

No TBD, TODO, or vague references. All code is explicit.

### 3. Type Consistency

- `PENALTY_COEFFICIENTS` → used in `PostureScorer.dimensionScore()` → type matches (`number`)
- `ANGLE_THRESHOLDS` → used in `PostureScorer.score()` fallback baseline → type matches (`number`)
- `titleBarStyle: 'hiddenInset'` spread with `...(isMac ? {} : {})` avoids passing invalid value to Windows
- `process.platform === 'win32'` check in tray → returns `boolean`, used correctly in condition
