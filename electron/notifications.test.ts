import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  focus: vi.fn(),
  isMinimized: vi.fn(),
  restore: vi.fn(),
  show: vi.fn(),
  notificationOn: vi.fn(),
  notificationShow: vi.fn(),
  isSupported: vi.fn(),
}));

vi.mock('electron', () => ({
  BrowserWindow: {
    getAllWindows: () => [
      {
        focus: mocks.focus,
        isMinimized: mocks.isMinimized,
        restore: mocks.restore,
        show: mocks.show,
      },
    ],
  },
  Notification: Object.assign(
    vi.fn().mockImplementation(() => ({
      on: mocks.notificationOn,
      show: mocks.notificationShow,
    })),
    { isSupported: mocks.isSupported },
  ),
}));

import { showNotification } from './notifications';

describe('showNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isMinimized.mockReturnValue(false);
  });

  it('returns unsupported status when native notifications are unavailable', () => {
    mocks.isSupported.mockReturnValue(false);

    const result = showNotification('测试通知', '这是一条测试通知');

    expect(result).toEqual({ supported: false, shown: false, reason: 'unsupported' });
    expect(mocks.notificationShow).not.toHaveBeenCalled();
  });

  it('shows a native notification and reports success', () => {
    mocks.isSupported.mockReturnValue(true);

    const result = showNotification('测试通知', '这是一条测试通知');

    expect(result).toEqual({ supported: true, shown: true });
    expect(mocks.notificationOn).toHaveBeenCalledWith('click', expect.any(Function));
    expect(mocks.notificationShow).toHaveBeenCalledTimes(1);
  });
});
