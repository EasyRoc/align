import { ArrowLeft, Bell, Crosshair, Download, Power, RotateCcw, Settings2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AppSettings, CalibrationData } from '../../shared/types';
import { DEFAULT_SETTINGS } from '../../shared/types';
import ThemeToggle from '../components/ThemeToggle';
import { Storage } from '../services/Storage';

export default function Settings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [calibration, setCalibration] = useState<CalibrationData | null>(null);
  const [saved, setSaved] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<string | null>(null);

  useEffect(() => {
    void Storage.getSettings().then(setSettings);
    void Storage.getCalibration().then(setCalibration);
  }, []);

  const update = async (patch: Partial<AppSettings>) => {
    const next = await Storage.saveSettings(patch);
    setSettings(next);
    if (typeof patch.autoStart === 'boolean') {
      void window.electronAPI?.setAutoStart(patch.autoStart);
    }
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  };

  const handleRecalibrate = async () => {
    await Storage.saveSettings({ calibrated: false });
    navigate('/onboarding');
  };

  const handleExport = async () => {
    const records = await Storage.getScoreRecords(0, Date.now());
    const csv = ['timestamp,headAngle,spineAngle,shoulderAngle,totalScore']
      .concat(
        records.map((record) =>
          [
            record.timestamp,
            record.headAngle,
            record.spineAngle,
            record.shoulderAngle,
            record.totalScore,
          ].join(','),
        ),
      )
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `align-data-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleTestNotification = async () => {
    if (!window.electronAPI?.showNotification) {
      setNotificationStatus('当前环境不是 Electron，无法发送系统通知。');
      return;
    }

    const result = await window.electronAPI.showNotification(
      'Align 测试通知',
      '如果你看到这条通知，桌面通知链路已经可用。',
    );

    if (result.shown) {
      setNotificationStatus('测试通知已发送。若桌面未显示，请检查系统通知权限或勿扰模式。');
    } else if (result.reason === 'unsupported') {
      setNotificationStatus('当前系统或运行环境不支持 Electron 原生通知。');
    } else {
      setNotificationStatus(`通知发送失败${result.error ? `：${result.error}` : '。'}`);
    }
  };

  return (
    <div className="min-h-dvh bg-[var(--color-bg)] p-4 text-[var(--color-text)] sm:p-6">
      <main className="mx-auto max-w-3xl">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold">设置</h1>
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

        {saved && (
          <div className="mb-4 rounded-lg border border-emerald-700 bg-emerald-950/60 px-4 py-2 text-sm text-emerald-300">
            设置已保存
          </div>
        )}

        <div className="space-y-4">
          <Section icon={<Bell size={18} />} title="提醒设置">
            <NumberSetting
              label="前倾触发延迟"
              hint="连续低分达到该时长后提醒"
              suffix="秒"
              min={1}
              max={30}
              value={settings.slouchThresholdSec}
              onChange={(value) => void update({ slouchThresholdSec: value })}
            />
            <NumberSetting
              label="提醒冷却"
              hint="两次前倾提醒之间的最小间隔"
              suffix="分钟"
              min={1}
              max={60}
              value={settings.slouchCooldownMin}
              onChange={(value) => void update({ slouchCooldownMin: value })}
            />
            <NumberSetting
              label="久坐提醒间隔"
              hint="姿势正常但持续坐着的提醒间隔"
              suffix="分钟"
              min={15}
              max={120}
              value={settings.sedentaryIntervalMin}
              onChange={(value) => void update({ sedentaryIntervalMin: value })}
            />
            <ToggleSetting
              label="系统通知"
              hint="关闭后仅记录事件"
              checked={settings.notificationsEnabled}
              onChange={() => void update({ notificationsEnabled: !settings.notificationsEnabled })}
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm text-[var(--color-text-secondary)]">测试通知</div>
                <div className="mt-1 text-xs text-[var(--color-text-dim)]">
                  立即发送一条系统通知，用于检查桌面通知权限。
                </div>
                {notificationStatus && (
                  <div className="mt-2 text-xs leading-5 text-[var(--color-text-muted)]">
                    {notificationStatus}
                  </div>
                )}
              </div>
              <button
                onClick={() => void handleTestNotification()}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-cyan-400 px-3 py-2 text-sm font-medium text-neutral-950 transition hover:bg-cyan-300"
              >
                <Bell size={16} />
                发送测试通知
              </button>
            </div>
          </Section>

          <Section icon={<Crosshair size={18} />} title="校准">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm text-[var(--color-text-secondary)]">基线数据</div>
                <div className="mt-1 text-xs leading-5 text-[var(--color-text-dim)]">
                  {calibration
                    ? `${new Date(calibration.recordedAt).toLocaleDateString('zh-CN')} · 头 ${calibration.headAngle.toFixed(1)}° · 脊柱 ${calibration.spineAngle.toFixed(1)}° · 肩 ${calibration.shoulderAngle.toFixed(1)}°`
                    : '尚未校准'}
                </div>
              </div>
              <button
                onClick={() => void handleRecalibrate()}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-[var(--color-border)] px-3 py-2 text-sm transition hover:bg-[var(--color-hover)]"
              >
                <RotateCcw size={16} />
                重新校准
              </button>
            </div>
          </Section>

          <Section icon={<Settings2 size={18} />} title="通用">
            <ToggleSetting
              label="开机自启"
              hint="系统登录时自动启动 Align"
              checked={settings.autoStart}
              onChange={() => void update({ autoStart: !settings.autoStart })}
              icon={<Power size={16} />}
            />
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm text-[var(--color-text-secondary)]">导出数据</div>
                <div className="mt-1 text-xs text-[var(--color-text-dim)]">下载 CSV 格式的历史评分</div>
              </div>
              <button
                onClick={() => void handleExport()}
                className="inline-flex items-center gap-2 rounded-md bg-[var(--color-border)] px-3 py-2 text-sm transition hover:bg-[var(--color-hover)]"
              >
                <Download size={16} />
                导出 CSV
              </button>
            </div>
          </Section>
        </div>
      </main>
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-medium text-[var(--color-text-secondary)]">
        {icon}
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function NumberSetting({
  label,
  hint,
  suffix,
  min,
  max,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  suffix: string;
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4">
      <span>
        <span className="block text-sm text-[var(--color-text-secondary)]">{label}</span>
        <span className="mt-1 block text-xs text-[var(--color-text-dim)]">{hint}</span>
      </span>
      <span className="flex items-center gap-2">
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="w-20 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-center text-sm text-[var(--color-text)] outline-none focus:border-cyan-400"
        />
        <span className="w-10 text-xs text-[var(--color-text-dim)]">{suffix}</span>
      </span>
    </label>
  );
}

function ToggleSetting({
  label,
  hint,
  checked,
  onChange,
  icon,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: () => void;
  icon?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
          {icon}
          {label}
        </div>
        <div className="mt-1 text-xs text-[var(--color-text-dim)]">{hint}</div>
      </div>
      <button
        type="button"
        aria-pressed={checked}
        onClick={onChange}
        className={`relative h-6 w-11 rounded-full transition ${
          checked ? 'bg-emerald-400' : 'bg-[var(--color-border)]'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}
