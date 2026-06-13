export {};

import type { NotificationResult } from '../shared/types';

declare global {
  interface Window {
    electronAPI?: {
      showNotification: (title: string, body: string) => Promise<NotificationResult>;
      updateTrayScore: (score: number, monitoring: boolean) => void;
      setMonitoringState: (monitoring: boolean) => void;
      setAutoStart: (enabled: boolean) => Promise<boolean>;
      getSettings: () => Promise<unknown>;
      saveSettings: (settings: unknown) => Promise<boolean>;
      onTrayAction: (callback: (action: string) => void) => () => void;
      mediapipePath: string;
    };
  }
}
