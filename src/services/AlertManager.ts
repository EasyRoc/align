import { Storage } from './Storage';
import type { AlertEvent, AppSettings } from '../../shared/types';

export type AlertType = AlertEvent['type'];

type AlertCallback = (type: AlertType, score?: number) => void;
type AlertRecord = Omit<AlertEvent, 'id'>;

interface AlertManagerOptions {
  now?: () => number;
  recordAlert?: (event: AlertRecord) => void | Promise<unknown>;
  slouchScoreThreshold?: number;
}

const DEFAULT_SLOUCH_SCORE_THRESHOLD = 50;

export class AlertManager {
  private settings: AppSettings;
  private slouchStartTime: number | null = null;
  private slouchLastAlertTime = Number.NEGATIVE_INFINITY;
  private sedentaryStartTime: number | null = null;
  private onAlert: AlertCallback | null = null;
  private readonly now: () => number;
  private readonly recordAlert: (event: AlertRecord) => void | Promise<unknown>;
  private readonly slouchScoreThreshold: number;

  constructor(settings: AppSettings, options: AlertManagerOptions = {}) {
    this.settings = settings;
    this.now = options.now ?? Date.now;
    this.recordAlert = options.recordAlert ?? ((event) => Storage.addAlertEvent(event));
    this.slouchScoreThreshold = options.slouchScoreThreshold ?? DEFAULT_SLOUCH_SCORE_THRESHOLD;
  }

  setOnAlert(callback: AlertCallback): void {
    this.onAlert = callback;
  }

  updateSettings(settings: AppSettings): void {
    this.settings = settings;
  }

  update(score: number, isPersonDetected: boolean): void {
    const now = this.now();

    if (!isPersonDetected) {
      this.slouchStartTime = null;
      this.sedentaryStartTime = null;
      return;
    }

    const isSlouching = score < this.slouchScoreThreshold;
    this.updateSlouchState(score, now, isSlouching);
    this.updateSedentaryState(now, isSlouching);
  }

  reset(): void {
    this.slouchStartTime = null;
    this.sedentaryStartTime = null;
  }

  private updateSlouchState(score: number, now: number, isSlouching: boolean): void {
    if (!isSlouching) {
      this.slouchStartTime = null;
      return;
    }

    this.slouchStartTime ??= now;

    const slouchDuration = (now - this.slouchStartTime) / 1000;
    const cooldownPassed =
      (now - this.slouchLastAlertTime) / 60000 >= this.settings.slouchCooldownMin;

    if (slouchDuration >= this.settings.slouchThresholdSec && cooldownPassed) {
      this.slouchLastAlertTime = now;
      this.slouchStartTime = null;
      this.onAlert?.('slouch', score);
      void this.recordAlert({ type: 'slouch', timestamp: now, duration: slouchDuration });
    }
  }

  private updateSedentaryState(now: number, isSlouching: boolean): void {
    if (isSlouching) {
      this.sedentaryStartTime = null;
      return;
    }

    this.sedentaryStartTime ??= now;
    const sedentaryMinutes = (now - this.sedentaryStartTime) / 60000;

    if (sedentaryMinutes >= this.settings.sedentaryIntervalMin) {
      this.sedentaryStartTime = now;
      this.onAlert?.('sedentary');
      void this.recordAlert({ type: 'sedentary', timestamp: now });
    }
  }
}
