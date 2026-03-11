export interface WorkSession {
  id: string;
  start: string;
  end: string | null;
  duration_ms: number;
  label?: string;
}

export interface WorkTimerData {
  version: "1.0";
  current_session: string | null;
  sessions: WorkSession[];
}

export interface DayBreakdown {
  date: string;
  total_ms: number;
  sessions: number;
}

export interface TimerStats {
  today: { total_ms: number; sessions: number; formatted: string };
  week: { total_ms: number; sessions: number; formatted: string };
  month: { total_ms: number; sessions: number; formatted: string };
  streak: { current_days: number; longest_days: number };
  daily_breakdown: DayBreakdown[];
  avg_daily_ms: number;
  avg_daily_formatted: string;
}

export interface TimerStatus {
  status: "running" | "paused";
  current_session: { id: string; start: string; elapsed_ms: number } | null;
  today_total_ms: number;
  today_formatted: string;
}
