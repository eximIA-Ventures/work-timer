import { WorkSession, DayBreakdown, TimerStats } from "./types";

export function formatMs(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getSessionDuration(s: WorkSession): number {
  if (s.duration_ms > 0) return s.duration_ms;
  if (!s.end) return Date.now() - new Date(s.start).getTime();
  return new Date(s.end).getTime() - new Date(s.start).getTime();
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function computeStats(sessions: WorkSession[]): TimerStats {
  const now = new Date();
  const todayStart = startOfDay(now);

  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  let todayMs = 0, todaySessions = 0;
  let weekMs = 0, weekSessions = 0;
  let monthMs = 0, monthSessions = 0;

  const dailyMap = new Map<string, { total_ms: number; sessions: number }>();

  // Initialize last 30 days
  for (let i = 29; i >= 0; i--) {
    const d = new Date(todayStart);
    d.setDate(d.getDate() - i);
    dailyMap.set(dateKey(d), { total_ms: 0, sessions: 0 });
  }

  for (const s of sessions) {
    const start = new Date(s.start);
    const dur = getSessionDuration(s);
    const key = dateKey(start);

    if (dailyMap.has(key)) {
      const entry = dailyMap.get(key)!;
      entry.total_ms += dur;
      entry.sessions += 1;
    }

    if (start >= todayStart) {
      todayMs += dur;
      todaySessions++;
    }
    if (start >= weekStart) {
      weekMs += dur;
      weekSessions++;
    }
    if (start >= monthStart) {
      monthMs += dur;
      monthSessions++;
    }
  }

  // Streak calculation
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  const sortedDays = Array.from(dailyMap.entries()).sort((a, b) => b[0].localeCompare(a[0]));

  // Current streak (from today backwards)
  for (const [, data] of sortedDays) {
    if (data.total_ms > 0) {
      currentStreak++;
    } else {
      break;
    }
  }

  // Longest streak
  for (const [, data] of sortedDays.reverse()) {
    if (data.total_ms > 0) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 0;
    }
  }

  const daily_breakdown: DayBreakdown[] = Array.from(dailyMap.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Average daily (last 7 days)
  const last7 = daily_breakdown.slice(-7);
  const daysWithWork = last7.filter((d) => d.total_ms > 0).length || 1;
  const last7Total = last7.reduce((sum, d) => sum + d.total_ms, 0);
  const avgDailyMs = Math.round(last7Total / daysWithWork);

  return {
    today: { total_ms: todayMs, sessions: todaySessions, formatted: formatMs(todayMs) },
    week: { total_ms: weekMs, sessions: weekSessions, formatted: formatMs(weekMs) },
    month: { total_ms: monthMs, sessions: monthSessions, formatted: formatMs(monthMs) },
    streak: { current_days: currentStreak, longest_days: Math.max(longestStreak, currentStreak) },
    daily_breakdown,
    avg_daily_ms: avgDailyMs,
    avg_daily_formatted: formatMs(avgDailyMs),
  };
}
