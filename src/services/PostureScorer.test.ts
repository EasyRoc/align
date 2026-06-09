import { describe, expect, it } from 'vitest';
import { PostureScorer } from './PostureScorer';
import type { Landmark } from '../../shared/types';

function landmark(x: number, y: number, visibility = 1): Landmark {
  return { x, y, z: 0, visibility };
}

function baseLandmarks(): Landmark[] {
  const points = Array.from({ length: 33 }, () => landmark(0.5, 0.5));
  points[7] = landmark(0.46, 0.2);
  points[8] = landmark(0.54, 0.2);
  points[11] = landmark(0.4, 0.4);
  points[12] = landmark(0.6, 0.4);
  points[23] = landmark(0.43, 0.75);
  points[24] = landmark(0.57, 0.75);
  return points;
}

describe('PostureScorer', () => {
  it('extracts near-zero angles from vertically aligned seated landmarks', () => {
    const scorer = new PostureScorer();
    const angles = scorer.extractAngles(baseLandmarks());

    expect(angles.headAngle).toBeCloseTo(0, 1);
    expect(angles.spineAngle).toBeCloseTo(0, 1);
    expect(angles.shoulderAngle).toBeCloseTo(0, 1);
  });

  it('uses a calibration baseline so matching posture scores 100', () => {
    const scorer = new PostureScorer();
    scorer.setBaseline({
      headAngle: 8,
      spineAngle: 6,
      shoulderAngle: 2,
      recordedAt: 1,
    });

    expect(scorer.score({ headAngle: 8, spineAngle: 6, shoulderAngle: 2 })).toBe(100);
  });

  it('penalizes head, spine, and shoulder deviations with configured weights', () => {
    const scorer = new PostureScorer();
    scorer.setBaseline({
      headAngle: 0,
      spineAngle: 0,
      shoulderAngle: 0,
      recordedAt: 1,
    });

    const score = scorer.score({ headAngle: 10, spineAngle: 8, shoulderAngle: 3 });

    expect(score).toBe(29);
  });
});
