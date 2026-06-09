import { useCallback, useRef, useState } from 'react';
import type { CalibrationData, Landmark, PostureAngles } from '../../shared/types';
import { PostureScorer } from '../services/PostureScorer';

const SAMPLING_INTERVAL_MS = 1000;

export interface PostureScoreSnapshot {
  angles: PostureAngles;
  score: number;
}

export function usePostureScore() {
  const scorerRef = useRef(new PostureScorer());
  const lastSampleRef = useRef(0);
  const [score, setScore] = useState(0);
  const [angles, setAngles] = useState<PostureAngles | null>(null);

  const update = useCallback((landmarks: Landmark[], timestamp: number): PostureScoreSnapshot | null => {
    if (timestamp - lastSampleRef.current < SAMPLING_INTERVAL_MS) return null;
    lastSampleRef.current = timestamp;

    const nextAngles = scorerRef.current.extractAngles(landmarks);
    const nextScore = scorerRef.current.score(nextAngles);
    setAngles(nextAngles);
    setScore(nextScore);
    return { angles: nextAngles, score: nextScore };
  }, []);

  const setBaseline = useCallback((data: CalibrationData) => {
    scorerRef.current.setBaseline(data);
  }, []);

  const hasBaseline = useCallback(() => scorerRef.current.hasBaseline(), []);

  return { score, angles, update, setBaseline, hasBaseline, scorerRef };
}
