import { BrowserWindow, Notification } from 'electron';

export function showNotification(title: string, body: string): void {
  if (!Notification.isSupported()) return;

  const notification = new Notification({ title, body, silent: false });
  notification.on('click', () => {
    const window = BrowserWindow.getAllWindows()[0];
    if (!window) return;
    if (window.isMinimized()) window.restore();
    window.show();
    window.focus();
  });
  notification.show();
}
