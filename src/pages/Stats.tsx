import { ArrowLeft, Bell, Gauge, Percent } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AlertEvent, ScoreRecord } from '../../shared/types';
import TrendChart from '../components/TrendChart';
import { Storage } from '../services/Storage';

export default function Stats() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<ScoreRecord[]>([]);
  const [events, setEvents] = useState<AlertEvent[]>([]);
  const [avgScore, setAvgScore] = useState(0);
  const [goodRate, setGoodRate] = useState(0);

  useEffect(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29).getTime();
    void Storage.getScoreRecords(thirtyDaysAgo, Date.now()).then(setRecords);
    void Storage.getAlertEvents(thirtyDaysAgo, Date.now()).then(setEvents);
  }, []);

  useEffect(() => {
    if (records.length === 0) {
      setAvgScore(0);
      setGoodRate(0);
      return;
    }

    const avg = Math.round(records.reduce((sum, record) => sum + record.totalScore, 0) / records.length);
    const good = records.filter((record) => record.totalScore >= 70).length;
    setAvgScore(avg);
    setGoodRate(Math.round((good / records.length) * 100));
  }, [records]);

  return (
    <div className="min-h-dvh bg-neutral-950 p-4 text-neutral-50 sm:p-6">
      <main className="mx-auto max-w-5xl">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold">统计报表</h1>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 rounded-md bg-neutral-800 px-3 py-2 text-sm transition hover:bg-neutral-700"
          >
            <ArrowLeft size={16} />
            返回
          </button>
        </header>

        <section className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard icon={<Gauge size={18} />} label="周期均分" value={`${avgScore}`} tone="text-emerald-300" />
          <StatCard icon={<Percent size={18} />} label="好姿势占比" value={`${goodRate}%`} tone="text-cyan-300" />
          <StatCard icon={<Bell size={18} />} label="提醒总次数" value={`${events.length}`} tone="text-amber-300" />
        </section>

        <section className="rounded-lg border border-neutral-800 bg-neutral-900 p-5">
          <TrendChart records={records} events={events} />
        </section>
      </main>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <div className="mb-3 flex items-center gap-2 text-neutral-500">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className={`text-2xl font-semibold tabular-nums ${tone}`}>{value}</div>
    </div>
  );
}
