"use client";

import { useEffect, useState } from "react";
import { Clock, Calendar, CalendarDays, Flame, TrendingUp } from "lucide-react";
import { TimerStats } from "@/lib/types";

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}

function StatCard({ icon, label, value, sub }: StatCardProps) {
  return (
    <div className="bg-surface border border-border rounded-xl p-4 sm:p-5 flex flex-col gap-2 min-w-0">
      <div className="flex items-center gap-2 text-muted">
        {icon}
        <span className="text-xs font-mono uppercase tracking-wider truncate">{label}</span>
      </div>
      <p className="font-mono text-2xl sm:text-3xl text-accent truncate">{value}</p>
      {sub && <p className="text-xs text-muted font-mono truncate">{sub}</p>}
    </div>
  );
}

export default function StatsCards() {
  const [stats, setStats] = useState<TimerStats | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/timer/stats", { cache: "no-store" });
        setStats(await res.json());
      } catch {
        // retry on next
      }
    }
    load();
    const poll = setInterval(load, 60000);
    return () => clearInterval(poll);
  }, []);

  if (!stats) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-surface border border-border rounded-xl p-4 sm:p-5 h-24 sm:h-28 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
      <StatCard
        icon={<Clock size={14} />}
        label="Today"
        value={stats.today.formatted}
        sub={`${stats.today.sessions} sessions`}
      />
      <StatCard
        icon={<Calendar size={14} />}
        label="This Week"
        value={stats.week.formatted}
        sub={`${stats.week.sessions} sessions`}
      />
      <StatCard
        icon={<CalendarDays size={14} />}
        label="This Month"
        value={stats.month.formatted}
        sub={`${stats.month.sessions} sessions`}
      />
      <StatCard
        icon={<Flame size={14} />}
        label="Streak"
        value={`${stats.streak.current_days}d`}
        sub={`best: ${stats.streak.longest_days}d`}
      />
      <StatCard
        icon={<TrendingUp size={14} />}
        label="Daily Avg"
        value={stats.avg_daily_formatted}
        sub="last 7 days"
      />
    </div>
  );
}
