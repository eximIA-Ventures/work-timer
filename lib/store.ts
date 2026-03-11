import { createClient } from "./supabase/server";
import { WorkSession } from "./types";

const supabase = createClient();

export async function getCurrentSession(): Promise<string | null> {
  const { data } = await supabase
    .from("timer_state")
    .select("current_session")
    .eq("id", 1)
    .single();
  return data?.current_session ?? null;
}

async function setCurrentSession(sessionId: string | null) {
  await supabase
    .from("timer_state")
    .update({ current_session: sessionId, updated_at: new Date().toISOString() })
    .eq("id", 1);
}

export async function getAllSessions(): Promise<WorkSession[]> {
  const { data } = await supabase
    .from("work_sessions")
    .select("*")
    .order("start_time", { ascending: true });

  return (data ?? []).map((row) => ({
    id: row.id,
    start: row.start_time,
    end: row.end_time,
    duration_ms: row.duration_ms,
    label: row.label,
  }));
}

export async function startSession(label?: string): Promise<WorkSession> {
  const session: WorkSession = {
    id: `ws-${Date.now()}`,
    start: new Date().toISOString(),
    end: null,
    duration_ms: 0,
    ...(label ? { label } : {}),
  };

  await supabase.from("work_sessions").insert({
    id: session.id,
    start_time: session.start,
    end_time: null,
    duration_ms: 0,
    label: label ?? null,
  });

  await setCurrentSession(session.id);
  return session;
}

export async function endCurrentSession(): Promise<void> {
  const currentId = await getCurrentSession();
  if (!currentId) return;

  const { data: row } = await supabase
    .from("work_sessions")
    .select("start_time")
    .eq("id", currentId)
    .single();

  if (row) {
    const now = new Date();
    const durationMs = now.getTime() - new Date(row.start_time).getTime();

    await supabase
      .from("work_sessions")
      .update({
        end_time: now.toISOString(),
        duration_ms: durationMs,
      })
      .eq("id", currentId);
  }

  await setCurrentSession(null);
}

export async function resetCurrentSession(): Promise<void> {
  const currentId = await getCurrentSession();
  if (!currentId) return;

  await supabase.from("work_sessions").delete().eq("id", currentId);
  await setCurrentSession(null);
}

export async function getSessionById(id: string): Promise<WorkSession | null> {
  const { data } = await supabase
    .from("work_sessions")
    .select("*")
    .eq("id", id)
    .single();

  if (!data) return null;

  return {
    id: data.id,
    start: data.start_time,
    end: data.end_time,
    duration_ms: data.duration_ms,
    label: data.label,
  };
}
