import {
  FilesetResolver,
  PoseLandmarker,
  type NormalizedLandmark,
} from '@mediapipe/tasks-vision';
import type { Landmark } from '../../shared/types';

const KEYPOINTS = {
  NOSE: 0,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
} as const;

export type DetectedPose = {
  landmarks: Landmark[];
  timestamp: number;
};

function publicAssetUrl(path: string): string {
  const cleanPath = path.replace(/^\/+/, '');
  return new URL(`${import.meta.env.BASE_URL}${cleanPath}`, window.location.href).toString();
}

export class PoseDetector {
  private landmarker: PoseLandmarker | null = null;
  private loading = false;

  async initialize(): Promise<void> {
    if (this.landmarker || this.loading) return;
    this.loading = true;

    try {
      const vision = await FilesetResolver.forVisionTasks(publicAssetUrl('mediapipe/wasm'));
      this.landmarker = await this.createLandmarker(vision, 'GPU').catch(() =>
        this.createLandmarker(vision, 'CPU'),
      );
    } finally {
      this.loading = false;
    }
  }

  detect(timestamp: number, video: HTMLVideoElement): DetectedPose | null {
    if (!this.landmarker) return null;
    const results = this.landmarker.detectForVideo(video, timestamp);
    if (!results.landmarks || results.landmarks.length === 0) return null;

    const landmarks: Landmark[] = results.landmarks[0].map((landmark: NormalizedLandmark) => ({
      x: landmark.x,
      y: landmark.y,
      z: landmark.z,
      visibility: landmark.visibility ?? 0,
    }));

    return { landmarks, timestamp };
  }

  isReady(): boolean {
    return this.landmarker !== null;
  }

  close(): void {
    this.landmarker?.close();
    this.landmarker = null;
  }

  static getKeypoints() {
    return KEYPOINTS;
  }

  private createLandmarker(
    vision: Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>,
    delegate: 'GPU' | 'CPU',
  ) {
    return PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: publicAssetUrl('mediapipe/pose_landmarker_lite.task'),
        delegate,
      },
      runningMode: 'VIDEO',
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
  }
}
