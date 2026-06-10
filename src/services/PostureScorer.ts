import type { CalibrationData, Landmark, PostureAngles } from '../../shared/types';
import { ANGLE_THRESHOLDS, PENALTY_COEFFICIENTS, SCORE_WEIGHTS } from '../../shared/types';

const MIN_VECTOR_LENGTH = 1e-6;

function verticalAngle(a: Landmark, b: Landmark): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const distance = Math.sqrt(dx ** 2 + dy ** 2);
  if (distance < MIN_VECTOR_LENGTH) return 0;
  return Math.abs(Math.asin(Math.abs(dx) / distance) * (180 / Math.PI));
}

function horizontalAngle(a: Landmark, b: Landmark): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const distance = Math.sqrt(dx ** 2 + dy ** 2);
  if (distance < MIN_VECTOR_LENGTH) return 0;
  return Math.abs(Math.asin(Math.abs(dy) / distance) * (180 / Math.PI));
}

function midpoint(a: Landmark, b: Landmark): Landmark {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: (a.z + b.z) / 2,
    visibility: Math.min(a.visibility, b.visibility),
  };
}

function ensureLandmarks(landmarks: Landmark[], indexes: number[]): void {
  for (const index of indexes) {
    if (!landmarks[index]) {
      throw new Error(`Missing pose landmark at index ${index}`);
    }
  }
}

export class PostureScorer {
  private baseline: CalibrationData | null = null;

  setBaseline(data: CalibrationData): void {
    this.baseline = data;
  }

  getBaseline(): CalibrationData | null {
    return this.baseline;
  }

  hasBaseline(): boolean {
    return this.baseline !== null;
  }

  extractAngles(landmarks: Landmark[]): PostureAngles {
    ensureLandmarks(landmarks, [7, 8, 11, 12, 23, 24]);

    const midEar = midpoint(landmarks[7], landmarks[8]);
    const midShoulder = midpoint(landmarks[11], landmarks[12]);
    const midHip = midpoint(landmarks[23], landmarks[24]);

    return {
      headAngle: verticalAngle(midEar, midShoulder),
      spineAngle: verticalAngle(midShoulder, midHip),
      shoulderAngle: horizontalAngle(landmarks[11], landmarks[12]),
    };
  }

  score(angles: PostureAngles): number {
    const baseline = this.baseline ?? {
      headAngle: ANGLE_THRESHOLDS.head * 0.1,
      spineAngle: ANGLE_THRESHOLDS.spine * 0.1,
      shoulderAngle: ANGLE_THRESHOLDS.shoulder * 0.1,
      recordedAt: 0,
    };

    const headScore = this.dimensionScore(
      angles.headAngle,
      baseline.headAngle,
      PENALTY_COEFFICIENTS.head,
    );
    const spineScore = this.dimensionScore(
      angles.spineAngle,
      baseline.spineAngle,
      PENALTY_COEFFICIENTS.spine,
    );
    const shoulderScore = this.dimensionScore(
      angles.shoulderAngle,
      baseline.shoulderAngle,
      PENALTY_COEFFICIENTS.shoulder,
    );

    return Math.round(
      headScore * SCORE_WEIGHTS.head +
        spineScore * SCORE_WEIGHTS.spine +
        shoulderScore * SCORE_WEIGHTS.shoulder,
    );
  }

  private dimensionScore(current: number, baseline: number, penalty: number): number {
    return Math.max(0, 100 - Math.abs(current - baseline) * penalty);
  }
}
