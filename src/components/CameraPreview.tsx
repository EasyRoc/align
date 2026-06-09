import { useEffect, useRef } from 'react';
import type { Landmark } from '../../shared/types';

const SKELETON_CONNECTIONS: [number, number][] = [
  [11, 12],
  [11, 23],
  [12, 24],
  [23, 24],
  [0, 7],
  [0, 8],
  [7, 11],
  [8, 12],
];

const KEYPOINT_COLOR = '#22c55e';
const SKELETON_COLOR = 'rgba(34, 197, 94, 0.7)';

interface CameraPreviewProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  landmarks: Landmark[] | null;
  width?: number;
  height?: number;
}

export default function CameraPreview({
  videoRef,
  landmarks,
  width = 640,
  height = 480,
}: CameraPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    let animationId = 0;

    const draw = () => {
      const video = videoRef.current;
      context.clearRect(0, 0, width, height);

      if (video && video.readyState >= 2) {
        context.drawImage(video, 0, 0, width, height);
      } else {
        context.fillStyle = '#18181b';
        context.fillRect(0, 0, width, height);
      }

      if (landmarks) {
        context.strokeStyle = SKELETON_COLOR;
        context.lineWidth = 3;
        context.lineCap = 'round';

        for (const [start, end] of SKELETON_CONNECTIONS) {
          const a = landmarks[start];
          const b = landmarks[end];
          if (a?.visibility > 0.45 && b?.visibility > 0.45) {
            context.beginPath();
            context.moveTo(a.x * width, a.y * height);
            context.lineTo(b.x * width, b.y * height);
            context.stroke();
          }
        }

        for (const landmark of landmarks) {
          if (landmark.visibility <= 0.45) continue;
          context.beginPath();
          context.arc(landmark.x * width, landmark.y * height, 4, 0, 2 * Math.PI);
          context.fillStyle = KEYPOINT_COLOR;
          context.fill();
        }
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animationId);
  }, [height, landmarks, videoRef, width]);

  return (
    <div
      className="relative w-full overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900"
      style={{ maxWidth: width, aspectRatio: `${width}/${height}` }}
    >
      <video ref={videoRef} className="hidden" width={width} height={height} playsInline muted />
      <canvas ref={canvasRef} width={width} height={height} className="h-full w-full" />
    </div>
  );
}
