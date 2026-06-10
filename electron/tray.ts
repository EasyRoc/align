import { BrowserWindow, Menu, nativeImage, Tray } from 'electron';

let tray: Tray | null = null;
let mainWindow: BrowserWindow | null = null;
let currentScore = 0;
let monitoring = false;

function createTrayIcon(score: number): Electron.NativeImage {
  const size = 22;
  const bitmap = Buffer.alloc(size * size * 4);
  const color = score >= 80 ? [34, 197, 94] : score >= 60 ? [234, 179, 8] : [239, 68, 68];

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const center = size / 2;
      const radius = size / 2 - 2;
      const distance = Math.sqrt((x - center) ** 2 + (y - center) ** 2);
      const index = (y * size + x) * 4;
      if (distance <= radius) {
        bitmap[index] = color[2];
        bitmap[index + 1] = color[1];
        bitmap[index + 2] = color[0];
        bitmap[index + 3] = 255;
      }
    }
  }

  return nativeImage.createFromBitmap(bitmap, { width: size, height: size });
}

function showMainWindow(): void {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function rebuildMenu(): void {
  if (!tray || !mainWindow) return;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: monitoring ? '暂停监控' : '恢复监控',
      click: () => {
        mainWindow?.webContents.send('tray-action', monitoring ? 'pause' : 'resume');
      },
    },
    { type: 'separator' },
    {
      label: '打开 Dashboard',
      click: showMainWindow,
    },
    { type: 'separator' },
    { label: '退出 Align', role: 'quit' },
  ]);

  tray.setContextMenu(contextMenu);
}

export function createTray(window: BrowserWindow): Tray {
  mainWindow = window;
  const isWindows = process.platform === 'win32';
  tray = new Tray(createTrayIcon(currentScore));
  tray.setToolTip('Align - 坐姿助手');
  if (isWindows) {
    // Windows: left-click shows Dashboard, right-click shows context menu
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

export function updateTrayScore(score: number, isMonitoring = monitoring): void {
  currentScore = Math.max(0, Math.min(100, Math.round(score)));
  monitoring = isMonitoring;

  if (!tray) return;
  tray.setImage(createTrayIcon(currentScore));
  tray.setToolTip(
    monitoring ? `Align - 坐姿助手 · ${currentScore} 分` : 'Align - 坐姿助手 (已暂停)',
  );
  rebuildMenu();
}

export function updateTrayMonitoring(isMonitoring: boolean): void {
  monitoring = isMonitoring;
  updateTrayScore(currentScore, monitoring);
}
