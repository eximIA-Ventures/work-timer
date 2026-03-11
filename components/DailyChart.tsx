"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { TimerStats, DayBreakdown } from "@/lib/types";

function msToHours(ms: number): number {
  return Math.round((ms / 3600000) * 10) / 10;
}

function formatDay(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  return days[d.getDay()];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatTooltipMs(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

interface ChartEntry {
  date: string;
  label: string;
  dateLabel: string;
  hours: number;
  total_ms: number;
  sessions: number;
  isToday: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload as ChartEntry;
  return (
    <div className="bg-elevated border border-border rounded-lg px-3 py-2 shadow-lg">
      <p className="font-mono text-xs text-muted">{data.dateLabel}</p>
      <p className="font-mono text-sm text-accent">{formatTooltipMs(data.total_ms)}</p>
      <p className="font-mono text-xs text-muted">{data.sessions} sessions</p>
    </div>
  );
}

export default function DailyChart() {
  const [data, setData] = useState<ChartEntry[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/timer/stats", { cache: "no-store" });
        const stats: TimerStats = await res.json();
        const today = new Date();
        const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

        const last14 = stats.daily_breakdown.slice(-14);
        setData(
          last14.map((d: DayBreakdown) => ({
            date: d.date,
            label: formatDay(d.date),
            dateLabel: formatDate(d.date),
            hours: msToHours(d.total_ms),
            total_ms: d.total_ms,
            sessions: d.sessions,
            isToday: d.date === todayKey,
          }))
        );
      } catch {
        // retry
      }
    }
    load();
    const poll = setInterval(load, 60000);
    return () => clearInterval(poll);
  }, []);

  if (!data.length) {
    return (
      <div className="bg-surface border border-border rounded-xl p-4 sm:p-6 h-64 animate-pulse" />
    );
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-mono text-xs uppercase tracking-wider text-muted">
          Last 14 days
        </h3>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} barCategoryGap="20%">
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#666", fontSize: 11, fontFamily: "JetBrains Mono" }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#666", fontSize: 11, fontFamily: "JetBrains Mono" }}
            tickFormatter={(v) => `${v}h`}
            width={35}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
          <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.isToday ? "#C4A882" : entry.hours > 0 ? "#C4A882" : "#2A2A2A"}
                fillOpacity={entry.isToday ? 1 : 0.4}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
