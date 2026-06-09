import { AlertTriangle, Timer } from 'lucide-react';
import { useMemo } from 'react';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { AlertEvent, ScoreRecord } from '../../shared/types';

interface DayScore {
  date: string;
  label: string;
  score: number;
  count: number;
}

interface TrendChartProps {
  records: ScoreRecord[];
  events: AlertEvent[];
}

function dailyScoreData(records: ScoreRecord[], days: number): DayScore[] {
  const now = new Date();
  const result: DayScore[] = [];

  for (let index = days - 1; index >= 0; index -= 1) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - index);
    const start = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
    const end = start + 86_400_000;
    const dayRecords = records.filter((record) => record.timestamp >= start && record.timestamp < end);
    const score =
      dayRecords.length > 0
        ? Math.round(dayRecords.reduce((sum, record) => sum + record.totalScore, 0) / dayRecords.length)
        : 0;

    result.push({
      date: `${day.getMonth() + 1}/${day.getDate()}`,
      label: day.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
      score,
      count: dayRecords.length,
    });
  }

  return result;
}

function scoreColor(score: number, count: number): string {
  if (count === 0) return '#27272a';
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#eab308';
  return '#ef4444';
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function TrendChart({ records, events }: TrendChartProps) {
  const chartData = useMemo(() => dailyScoreData(records, 30), [records]);
  const todayEvents = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return events.filter((event) => event.timestamp >= start).slice(0, 20);
  }, [events]);

  return (
    <div className="space-y-6">
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium text-neutral-300">30 天热力图</h3>
          <span className="text-xs text-neutral-500">灰色表示暂无记录</span>
        </div>
        <div className="grid grid-cols-10 gap-2">
          {chartData.map((day) => (
            <div
              key={day.label}
              title={`${day.label}: ${day.count ? `${day.score} 分` : '暂无记录'}`}
              className="aspect-square rounded-[4px] border border-neutral-900"
              style={{ backgroundColor: scoreColor(day.score, day.count) }}
            />
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-medium text-neutral-300">日均分趋势</h3>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#737373' }} interval={4} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#737373' }} width={30} />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                contentStyle={{
                  background: '#18181b',
                  border: '1px solid #3f3f46',
                  borderRadius: 8,
                  color: '#fafafa',
                }}
              />
              <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell key={entry.label} fill={scoreColor(entry.score, entry.count)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-medium text-neutral-300">今日事件</h3>
        <div className="max-h-52 space-y-2 overflow-y-auto">
          {todayEvents.length === 0 && <p className="text-sm text-neutral-500">暂无事件</p>}
          {todayEvents.map((event) => {
            const isSlouch = event.type === 'slouch';
            const Icon = isSlouch ? AlertTriangle : Timer;
            return (
              <div
                key={event.id ?? event.timestamp}
                className="flex items-center gap-3 rounded-md border border-neutral-800 px-3 py-2 text-sm"
              >
                <Icon size={16} className={isSlouch ? 'text-red-400' : 'text-amber-400'} />
                <span className="flex-1 text-neutral-300">{isSlouch ? '前倾提醒' : '久坐提醒'}</span>
                {event.duration && (
                  <span className="text-neutral-500">持续 {Math.round(event.duration)} 秒</span>
                )}
                <span className="tabular-nums text-neutral-500">{formatTime(event.timestamp)}</span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
