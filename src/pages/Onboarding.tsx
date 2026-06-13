import { ArrowLeft, Camera, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CalibrationData, PostureAngles } from '../../shared/types';
import CalibrateGuide from '../components/CalibrateGuide';
import CameraPreview from '../components/CameraPreview';
import ThemeToggle from '../components/ThemeToggle';
import { useCamera } from '../hooks/useCamera';
import { usePoseDetection } from '../hooks/usePoseDetection';
import { PostureScorer } from '../services/PostureScorer';
import { Storage } from '../services/Storage';

export default function Onboarding() {
  const navigate = useNavigate();
  const scorerRef = useRef(new PostureScorer());
  const { videoRef, cameraReady, cameraError, startCamera } = useCamera();
  const [sessionStarted, setSessionStarted] = useState(false);
  const [currentAngles, setCurrentAngles] = useState<PostureAngles | null>(null);
  const { pose, modelLoading, modelError, initialize } = usePoseDetection(
    videoRef,
    cameraReady,
    sessionStarted,
  );

  const startSession = useCallback(async () => {
    await initialize();
    await startCamera();
    setSessionStarted(true);
  }, [initialize, startCamera]);

  const handleComplete = useCallback(
    async (angles: PostureAngles) => {
      const data: CalibrationData = {
        ...angles,
        recordedAt: Date.now(),
      };
      await Storage.saveCalibration(data);
      await Storage.saveSettings({ calibrated: true });
      window.setTimeout(() => navigate('/'), 1200);
    },
    [navigate],
  );

  useEffect(() => {
    if (!pose) return;
    setCurrentAngles(scorerRef.current.extractAngles(pose.landmarks));
  }, [pose]);

  return (
    <div className="min-h-dvh bg-[var(--color-bg)] p-4 text-[var(--color-text)] sm:p-6">
      <main className="mx-auto grid min-h-[calc(100dvh-48px)] max-w-6xl grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
        <section className="flex flex-col justify-center gap-5">
          <header className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">坐姿校准</h1>
              <p className="mt-2 text-sm text-[var(--color-text-dim)]">记录一组标准坐姿角度作为评分基线。</p>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <button
                onClick={() => navigate('/')}
                className="inline-flex items-center gap-2 rounded-md bg-[var(--color-border)] px-3 py-2 text-sm transition hover:bg-[var(--color-hover)]"
              >
                <ArrowLeft size={16} />
                返回
              </button>
            </div>
          </header>

          <div className="relative flex justify-center">
            <CameraPreview videoRef={videoRef} landmarks={pose?.landmarks ?? null} />
            {(!sessionStarted || cameraError || modelError || modelLoading) && (
              <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-[var(--color-bg)]/80 p-6 backdrop-blur-sm">
                <div className="max-w-sm text-center">
                  <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-lg bg-[var(--color-surface)] text-cyan-300">
                    <Camera size={28} />
                  </div>
                  {cameraError && <p className="mb-4 text-sm text-red-300">{cameraError}</p>}
                  {modelError && <p className="mb-4 text-sm text-red-300">{modelError}</p>}
                  {modelLoading && <p className="mb-4 text-sm text-[var(--color-text-secondary)]">正在加载本地姿态模型</p>}
                  {!cameraError && !modelError && !modelLoading && (
                    <p className="mb-5 text-sm leading-6 text-[var(--color-text-muted)]">打开摄像头后开始校准。</p>
                  )}
                  <button
                    onClick={() => void startSession()}
                    disabled={modelLoading}
                    className="inline-flex items-center gap-2 rounded-md bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-neutral-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-[var(--color-border)] disabled:text-[var(--color-text-dim)]"
                  >
                    {cameraError || modelError ? <RotateCcw size={17} /> : <Camera size={17} />}
                    {cameraError || modelError ? '重试' : '打开摄像头'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        <aside className="flex items-center">
          <CalibrateGuide currentAngles={currentAngles} onComplete={handleComplete} />
        </aside>
      </main>
    </div>
  );
}
