export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export interface PostureAngles {
  headAngle: number;
  spineAngle: number;
  shoulderAngle: number;
}

export interface ScoreRecord {
  id?: number;
  timestamp: number;
  headAngle: number;
  spineAngle: number;
  shoulderAngle: number;
  totalScore: number;
}

export interface AlertEvent {
  id?: number;
  type: 'slouch' | 'sedentary';
  timestamp: number;
  duration?: number;
}

export interface CalibrationData {
  headAngle: number;
  spineAngle: number;
  shoulderAngle: number;
  recordedAt: number;
}

export interface AppSettings {
  slouchThresholdSec: number;
  slouchCooldownMin: number;
  sedentaryIntervalMin: number;
  notificationsEnabled: boolean;
  autoStart: boolean;
  calibrated: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  slouchThresholdSec: 5,
  slouchCooldownMin: 5,
  sedentaryIntervalMin: 45,
  notificationsEnabled: true,
  autoStart: false,
  calibrated: false,
};

export const SCORE_WEIGHTS = {
  head: 0.35,
  spine: 0.45,
  shoulder: 0.2,
} as const;

export const PENALTY_COEFFICIENTS = {
  head: 12,
  spine: 18,
  shoulder: 30,
} as const;

export const ANGLE_THRESHOLDS = {
  head: 15,
  spine: 10,
  shoulder: 5,
} as const;
