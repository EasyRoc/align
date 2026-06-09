import { describe, expect, it, vi } from 'vitest';
import { AlertManager } from './AlertManager';
import { DEFAULT_SETTINGS } from '../../shared/types';
import type { AlertEvent } from '../../shared/types';

describe('AlertManager', () => {
  it('triggers a slouch alert only after the configured duration and cooldown', () => {
    let now = 1_000;
    const onAlert = vi.fn();
    const events: AlertEvent[] = [];
    const manager = new AlertManager(
      { ...DEFAULT_SETTINGS, slouchThresholdSec: 5, slouchCooldownMin: 5 },
      {
        now: () => now,
        recordAlert: (event) => {
          events.push(event);
        },
      },
    );
    manager.setOnAlert(onAlert);

    manager.update(40, true);
    now += 4_000;
    manager.update(40, true);
    expect(onAlert).not.toHaveBeenCalled();

    now += 1_000;
    manager.update(40, true);
    expect(onAlert).toHaveBeenCalledTimes(1);
    expect(onAlert).toHaveBeenCalledWith('slouch', 40);
    expect(events[0]).toMatchObject({ type: 'slouch', timestamp: now, duration: 5 });

    now += 10_000;
    manager.update(40, true);
    now += 5_000;
    manager.update(40, true);
    expect(onAlert).toHaveBeenCalledTimes(1);

    now += 5 * 60_000;
    manager.update(40, true);
    now += 5_000;
    manager.update(40, true);
    expect(onAlert).toHaveBeenCalledTimes(2);
  });

  it('counts sedentary time only while a person is detected and not slouching', () => {
    let now = 10_000;
    const onAlert = vi.fn();
    const events: AlertEvent[] = [];
    const manager = new AlertManager(
      { ...DEFAULT_SETTINGS, sedentaryIntervalMin: 1 },
      {
        now: () => now,
        recordAlert: (event) => {
          events.push(event);
        },
      },
    );
    manager.setOnAlert(onAlert);

    manager.update(92, true);
    now += 30_000;
    manager.update(40, true);
    now += 30_000;
    manager.update(92, true);
    expect(onAlert).not.toHaveBeenCalledWith('sedentary');

    now += 60_000;
    manager.update(92, true);
    expect(onAlert).toHaveBeenCalledWith('sedentary');
    expect(events.some((event) => event.type === 'sedentary')).toBe(true);

    now += 60_000;
    manager.update(92, false);
    now += 60_000;
    manager.update(92, true);
    expect(events.filter((event) => event.type === 'sedentary')).toHaveLength(1);
  });
});
