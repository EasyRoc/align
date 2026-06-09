import {
  Activity,
  BarChart3,
  Pause,
  Play,
  RotateCcw,
  Settings as SettingsIcon,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AppSettings, PostureAngles } from '../../shared/types';
import { DEFAULT_SETTINGS } from '../../shared/types';
import CameraPreview from '../components/CameraPreview';
import ScoreRing from '../components/ScoreRing';
import { useCamera } from '../hooks/useCamera';
import { usePoseDetection } from '../hooks/usePoseDetection';
import { usePostureScore } from '../hooks/usePostureScore';
import { AlertManager } from '../services/AlertManager';
import { Storage } from '../services/Storage';

interface LatestSnapshot {
  score: number;
  angles: PostureAngles;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { videoRef, cameraReady, cameraError, startCamera } = useCamera();
  const [monitoring, setMonitoring] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [calibrationLoaded, setCalibrationLoaded] = useState(false);
  const { pose, modelLoading, modelError, initialize } = usePoseDetection(
    videoRef,
    cameraReady,
    monitoring,
  );
  const { score, angles, update, setBaseline, hasBaseline } = usePostureScore();
  const alertManagerRef = useRef(new AlertManager(DEFAULT_SETTINGS));
  const latestSnapshotRef = useRef<LatestSnapshot | null>(null);
  const [todayScoreAvg, setTodayScoreAvg] = useState(0);
  const [todaySlouchCount, setTodaySlouchCount] = useState(0);
  const [sedentaryMins, setSedentaryMins] = useState(0);

  const loadTodayStats = useCallback(async () => {
    const records = await Storage.getTodayScoreRecords();
    setTodayScoreAvg(
      records.length > 0
        ? Math.round(records.reduce((sum, record) => sum + record.totalScore, 0) / records.length)
        : 0,
    );

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const events = await Storage.getAlertEvents(start, Date.now());
    setTodaySlouchCount(events.filter((event) => event.type === 'slouch').length);
  }, []);

  const setMonitoringState = useCallback((next: boolean) => {
    setMonitoring(next);
    window.electronAPI?.setMonitoringState(next);
  }, []);

  const startMonitoring = useCallback(async () => {
    if (!calibrationLoaded) return;
    if (!hasBaseline()) {
      navigate('/onboarding');
      return;
    }

    await initialize();
    await startCamera();
    setMonitoringState(true);
  }, [calibrationLoaded, hasBaseline, initialize, navigate, setMonitoringState, startCamera]);

  const pauseMonitoring = useCallback(() => {
    setMonitoringState(false);
    alertManagerRef.current.reset();
  }, [setMonitoringState]);

  useEffect(() => {
    void Storage.getSettings().then((storedSettings) => {
      setSettings(storedSettings);
      alertManagerRef.current.updateSettings(storedSettings);
    });
    void Storage.getCalibration()
      .then((calibration) => {
        if (calibration) setBaseline(calibration);
      })
      .finally(() => setCalibrationLoaded(true));
    void loadTodayStats();
  }, [loadTodayStats, setBaseline]);

  useEffect(() => {
    alertManagerRef.current.updateSettings(settings);
    alertManagerRef.current.setOnAlert((type, alertScore) => {
      if (!settings.notificationsEnabled) return;
      if (type === 'slouch') {
        window.electronAPI?.showNotification(
          '检测到前倾',
          `当前姿势评分 ${alertScore ?? score}，请调整坐姿。`,
        );
        void loadTodayStats();
      } else {
        window.electronAPI?.showNotification('久坐提醒', '建议站起来活动一下。');
      }
    });
  }, [loadTodayStats, score, settings]);

  useEffect(() => {
    if (!pose || !monitoring) return;
    const snapshot = update(pose.landmarks, pose.timestamp);
    if (!snapshot) return;
    latestSnapshotRef.current = snapshot;
    alertManagerRef.current.update(snapshot.score, true);
  }, [monitoring, pose, update]);

  useEffect(() => {
    window.electronAPI?.updateTrayScore(score, monitoring);
  }, [monitoring, score]);

  useEffect(() => {
    const unsubscribe = window.electronAPI?.onTrayAction((action) => {
      if (action === 'pause') pauseMonitoring();
      if (action === 'resume') void startMonitoring();
    });
    return () => unsubscribe?.();
  }, [pauseMonitoring, startMonitoring]);

  useEffect(() => {
    if (!monitoring) {
      setSedentaryMins(0);
      return;
    }

    const interval = window.setInterval(() => {
      setSedentaryMins((minutes) => minutes + 1);
    }, 60_000);

    return () => window.clearInterval(interval);
  }, [monitoring]);

  useEffect(() => {
    if (!monitoring) return;

    const interval = window.setInterval(() => {
      const snapshot = latestSnapshotRef.current;
      if (!snapshot) return;
      void Storage.addScoreRecord({
        timestamp: Date.now(),
        headAngle: snapshot.angles.headAngle,
        spineAngle: snapshot.angles.spineAngle,
        shoulderAngle: snapshot.angles.shoulderAngle,
        totalScore: snapshot.score,
      }).then(loadTodayStats);
    }, 5000);

    return () => window.clearInterval(interval);
  }, [loadTodayStats, monitoring]);

  return (
    <div className="min-h-dvh bg-neutral-950 text-neutral-50">
      <main className="mx-auto grid min-h-dvh max-w-[1440px] grid-cols-1 gap-0 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="flex items-center justify-center p-4 sm:p-6">
          <div className="relative flex w-full justify-center">
            <CameraPreview videoRef={videoRef} landmarks={pose?.landmarks ?? null} />

            {(!monitoring || cameraError || modelError || modelLoading) && (
              <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-neutral-950/80 p-6 backdrop-blur-sm">
                <div className="max-w-sm text-center">
                  <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-lg bg-neutral-900 text-emerald-300">
                    <Activity size={28} />
                  </div>
                  {cameraError && <p className="mb-4 text-sm text-red-300">{cameraError}</p>}
                  {modelError && <p className="mb-4 text-sm text-red-300">{modelError}</p>}
                  {modelLoading && <p className="mb-4 text-sm text-neutral-300">正在加载本地姿态模型</p>}
                  {!cameraError && !modelError && !modelLoading && (
                    <p className="mb-5 text-sm leading-6 text-neutral-400">
                      准备好后开始实时坐姿评分。
                    </p>
                  )}
                  <button
                    onClick={() => void startMonitoring()}
                    disabled={modelLoading || !calibrationLoaded}
                    className="inline-flex items-center gap-2 rounded-md bg-emerald-400 px-5 py-2.5 text-sm font-semibold text-neutral-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500"
                  >
                    {cameraError || modelError ? <RotateCcw size={17} /> : <Play size={17} />}
                    {cameraError || modelError ? '重试' : '开始监控'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        <aside className="border-t border-neutral-800 p-5 lg:border-l lg:border-t-0">
          <div className="flex h-full flex-col gap-5">
            <div className="flex justify-center">
              <ScoreRing score={score} />
            </div>

            <div className="grid grid-cols-3 gap-3 lg:grid-cols-1">
              <Metric label="今日均分" value={`${todayScoreAvg}`} tone="text-emerald-300" />
              <Metric label="前倾提醒" value={`${todaySlouchCount} 次`} tone="text-red-300" />
              <Metric label="已坐时长" value={`${sedentaryMins} 分钟`} tone="text-amber-300" />
            </div>

            {angles && (
              <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
                <h2 className="mb-3 text-sm font-medium text-neutral-300">实时角度</h2>
                <AngleRow label="头前倾" value={angles.headAngle} healthy={angles.headAngle < 15} />
                <AngleRow label="脊柱前倾" value={angles.spineAngle} healthy={angles.spineAngle < 10} />
                <AngleRow label="肩膀水平" value={angles.shoulderAngle} healthy={angles.shoulderAngle < 5} />
              </div>
            )}

            <div className="mt-auto flex flex-wrap gap-2">
              {monitoring ? (
                <button
                  onClick={pauseMonitoring}
                  className="inline-flex items-center gap-2 rounded-md bg-neutral-800 px-3 py-2 text-sm text-neutral-100 transition hover:bg-neutral-700"
                >
                  <Pause size={16} />
                  暂停
                </button>
              ) : (
                <button
                  onClick={() => void startMonitoring()}
                  className="inline-flex items-center gap-2 rounded-md bg-emerald-400 px-3 py-2 text-sm font-medium text-neutral-950 transition hover:bg-emerald-300"
                >
                  <Play size={16} />
                  恢复
                </button>
              )}
              <button
                onClick={() => navigate('/stats')}
                className="inline-flex items-center gap-2 rounded-md bg-neutral-800 px-3 py-2 text-sm text-neutral-100 transition hover:bg-neutral-700"
              >
                <BarChart3 size={16} />
                统计
              </button>
              <button
                onClick={() => navigate('/settings')}
                className="inline-flex items-center gap-2 rounded-md bg-neutral-800 px-3 py-2 text-sm text-neutral-100 transition hover:bg-neutral-700"
              >
                <SettingsIcon size={16} />
                设置
              </button>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className={`mt-1 text-lg font-semibold tabular-nums ${tone}`}>{value}</div>
    </div>
  );
}

function AngleRow({ label, value, healthy }: { label: string; value: number; healthy: boolean }) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="text-neutral-500">{label}</span>
      <span className={`tabular-nums ${healthy ? 'text-emerald-300' : 'text-red-300'}`}>
        {value.toFixed(1)}°
      </span>
    </div>
  );
}
