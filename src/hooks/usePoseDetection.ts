import { useCallback, useEffect, useRef, useState } from 'react';
import { PoseDetector, type DetectedPose } from '../services/PoseDetector';

export function usePoseDetection(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  cameraReady: boolean,
  enabled: boolean,
) {
  const detectorRef = useRef<PoseDetector | null>(null);
  const rafRef = useRef<number>(0);
  const [pose, setPose] = useState<DetectedPose | null>(null);
  const [detectorReady, setDetectorReady] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);

  const initialize = useCallback(async () => {
    if (detectorRef.current || modelLoading) return;
    setModelLoading(true);
    setModelError(null);
    try {
      const detector = new PoseDetector();
      await detector.initialize();
      detectorRef.current = detector;
      setDetectorReady(true);
    } catch {
      setModelError('MediaPipe 模型加载失败，请确认本地模型资产存在后重试。');
    } finally {
      setModelLoading(false);
    }
  }, [modelLoading]);

  const detectFrame = useCallback(
    (timestamp: number) => {
      const video = videoRef.current;
      const detector = detectorRef.current;

      if (video && detector && video.readyState >= 2) {
        const result = detector.detect(timestamp, video);
        if (result) {
          setPose(result);
        }
      }

      rafRef.current = requestAnimationFrame(detectFrame);
    },
    [videoRef],
  );

  useEffect(() => {
    if (cameraReady && enabled && detectorReady) {
      rafRef.current = requestAnimationFrame(detectFrame);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [cameraReady, detectFrame, detectorReady, enabled]);

  useEffect(() => {
    return () => {
      detectorRef.current?.close();
    };
  }, []);

  return { pose, modelLoading, modelError, detectorReady, initialize, detectorRef };
}
