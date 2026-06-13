import { BrowserWindow, Notification } from 'electron';
import type { NotificationResult } from '../shared/types';

export function showNotification(title: string, body: string): NotificationResult {
  if (!Notification.isSupported()) {
    return { supported: false, shown: false, reason: 'unsupported' };
  }

  try {
    const notification = new Notification({
      title,
      body,
      silent: false,
      timeoutType: 'default',
    });
    notification.on('click', () => {
      const window = BrowserWindow.getAllWindows()[0];
      if (!window) return;
      if (window.isMinimized()) window.restore();
      window.show();
      window.focus();
    });
    notification.show();
    return { supported: true, shown: true };
  } catch (error) {
    return {
      supported: true,
      shown: false,
      reason: 'failed',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
