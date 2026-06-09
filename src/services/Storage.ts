import Dexie, { type Table } from 'dexie';
import type { AlertEvent, AppSettings, CalibrationData, ScoreRecord } from '../../shared/types';
import { DEFAULT_SETTINGS } from '../../shared/types';

class AlignDB extends Dexie {
  scoreRecords!: Table<ScoreRecord, number>;
  alertEvents!: Table<AlertEvent, number>;
  settings!: Table<{ key: string; value: unknown }, string>;

  constructor() {
    super('AlignDB');
    this.version(1).stores({
      scoreRecords: '++id, timestamp',
      alertEvents: '++id, timestamp, type',
      settings: 'key',
    });
  }
}

const db = new AlignDB();

export const Storage = {
  async addScoreRecord(record: Omit<ScoreRecord, 'id'>): Promise<number> {
    return db.scoreRecords.add(record as ScoreRecord);
  },

  async getScoreRecords(from: number, to: number): Promise<ScoreRecord[]> {
    return db.scoreRecords.where('timestamp').between(from, to, true, true).toArray();
  },

  async getTodayScoreRecords(): Promise<ScoreRecord[]> {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return db.scoreRecords.where('timestamp').aboveOrEqual(start).toArray();
  },

  async addAlertEvent(event: Omit<AlertEvent, 'id'>): Promise<number> {
    return db.alertEvents.add(event as AlertEvent);
  },

  async getAlertEvents(from: number, to: number): Promise<AlertEvent[]> {
    return db.alertEvents.where('timestamp').between(from, to, true, true).reverse().toArray();
  },

  async getLastAlertOfType(type: AlertEvent['type']): Promise<AlertEvent | undefined> {
    const events = await db.alertEvents.where('type').equals(type).toArray();
    return events.sort((a, b) => b.timestamp - a.timestamp)[0];
  },

  async getSettings(): Promise<AppSettings> {
    const record = await db.settings.get('app');
    if (!record) {
      await db.settings.put({ key: 'app', value: DEFAULT_SETTINGS });
      return DEFAULT_SETTINGS;
    }
    return { ...DEFAULT_SETTINGS, ...(record.value as Partial<AppSettings>) };
  },

  async saveSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
    const current = await Storage.getSettings();
    const merged = { ...current, ...settings };
    await db.settings.put({ key: 'app', value: merged });
    return merged;
  },

  async getCalibration(): Promise<CalibrationData | null> {
    const record = await db.settings.get('calibration');
    return record ? (record.value as CalibrationData) : null;
  },

  async saveCalibration(data: CalibrationData): Promise<void> {
    await db.settings.put({ key: 'calibration', value: data });
  },

  async clearScoreHistory(): Promise<void> {
    await db.scoreRecords.clear();
  },
};
