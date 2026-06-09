import { Check, CircleDot, Crosshair } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { PostureAngles } from '../../shared/types';

type Step = 1 | 2 | 3;

interface CalibrateGuideProps {
  currentAngles: PostureAngles | null;
  onComplete: (angles: PostureAngles) => void;
}

function averageAngles(samples: PostureAngles[]): PostureAngles {
  const total = samples.reduce(
    (sum, sample) => ({
      headAngle: sum.headAngle + sample.headAngle,
      spineAngle: sum.spineAngle + sample.spineAngle,
      shoulderAngle: sum.shoulderAngle + sample.shoulderAngle,
    }),
    { headAngle: 0, spineAngle: 0, shoulderAngle: 0 },
  );

  return {
    headAngle: total.headAngle / samples.length,
    spineAngle: total.spineAngle / samples.length,
    shoulderAngle: total.shoulderAngle / samples.length,
  };
}

export default function CalibrateGuide({ currentAngles, onComplete }: CalibrateGuideProps) {
  const [step, setStep] = useState<Step>(1);
  const [countdown, setCountdown] = useState(5);
  const [error, setError] = useState<string | null>(null);
  const samplesRef = useRef<PostureAngles[]>([]);

  useEffect(() => {
    if (step === 2 && currentAngles) {
      samplesRef.current.push(currentAngles);
    }
  }, [currentAngles, step]);

  useEffect(() => {
    if (step !== 2) return;

    samplesRef.current = [];
    setCountdown(5);
    setError(null);

    const interval = window.setInterval(() => {
      setCountdown((value) => Math.max(0, value - 1));
    }, 1000);

    const timeout = window.setTimeout(() => {
      window.clearInterval(interval);
      const samples = samplesRef.current;
      if (samples.length === 0) {
        setError('未检测到稳定姿态，请调整摄像头后重试。');
        setStep(1);
        return;
      }
      setStep(3);
      onComplete(averageAngles(samples));
    }, 5000);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [onComplete, step]);

  return (
    <div className="flex min-h-[360px] flex-col justify-between rounded-lg border border-neutral-800 bg-neutral-900 p-6">
      <div className="flex items-center gap-3">
        {([1, 2, 3] as Step[]).map((item) => (
          <div key={item} className="flex items-center gap-3">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold ${
                item < step
                  ? 'border-emerald-500 bg-emerald-500 text-neutral-950'
                  : item === step
                    ? 'border-cyan-400 text-cyan-300'
                    : 'border-neutral-700 text-neutral-500'
              }`}
            >
              {item < step ? <Check size={16} /> : item}
            </div>
            {item < 3 && <div className="h-px w-8 bg-neutral-800" />}
          </div>
        ))}
      </div>

      <div className="py-8">
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-neutral-800 text-cyan-300">
              <Crosshair size={24} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-50">对准摄像头</h2>
              <p className="mt-2 text-sm leading-6 text-neutral-400">
                让面部、双肩和上半身进入画面，保持自然坐姿。
              </p>
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              onClick={() => setStep(2)}
              disabled={!currentAngles}
              className="inline-flex items-center gap-2 rounded-md bg-cyan-400 px-4 py-2 text-sm font-medium text-neutral-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500"
            >
              <CircleDot size={16} />
              开始采集
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-neutral-50">保持端正坐姿</h2>
            <p className="text-sm text-neutral-400">目视前方，肩膀放松，系统正在记录基线。</p>
            <div className="text-6xl font-semibold tabular-nums text-cyan-300">{countdown}</div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500 text-neutral-950">
              <Check size={26} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-emerald-300">基线已记录</h2>
              <p className="mt-2 text-sm text-neutral-400">Align 将用这组角度作为你的标准坐姿参考。</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {([1, 2, 3] as Step[]).map((item) => (
          <div
            key={item}
            className={`h-1 rounded-full ${item <= step ? 'bg-cyan-300' : 'bg-neutral-800'}`}
          />
        ))}
      </div>
    </div>
  );
}
