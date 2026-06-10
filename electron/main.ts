import { app, BrowserWindow, ipcMain } from 'electron';
import { join } from 'path';
import { showNotification } from './notifications';
import { createTray, updateTrayMonitoring, updateTrayScore } from './tray';

let mainWindow: BrowserWindow | null = null;

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
    ...(isMac ? { titleBarStyle: 'hiddenInset' as const } : {}),
    backgroundColor: '#0a0a0a',
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  createTray(mainWindow);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
  else mainWindow?.show();
});

ipcMain.on('show-notification', (_event, payload: { title: string; body: string }) => {
  showNotification(payload.title, payload.body);
});

ipcMain.on('update-tray-score', (_event, payload: { score: number; monitoring: boolean }) => {
  updateTrayScore(payload.score, payload.monitoring);
});

ipcMain.on('set-monitoring-state', (_event, monitoring: boolean) => {
  updateTrayMonitoring(monitoring);
});

ipcMain.handle('set-auto-start', (_event, enabled: boolean) => {
  app.setLoginItemSettings({ openAtLogin: enabled });
  return app.getLoginItemSettings().openAtLogin;
});

ipcMain.handle('get-settings', async () => {
  return {};
});

ipcMain.handle('save-settings', async () => {
  return true;
});
