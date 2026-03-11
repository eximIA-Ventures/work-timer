import fs from "fs";
import path from "path";
import { WorkTimerData, WorkSession } from "./types";
import { supabase, useSupabase } from "./supabase";

// ---------------------------------------------------------------------------
// Supabase store (production)
// ---------------------------------------------------------------------------

async function sbGetCurrentSession(): Promise<string | null> {
  const { data } = await supabase!
    .from("timer_state")
    .select("current_session")
    .eq("id", 1)
    .single();
  return data?.current_session ?? null;
}

async function sbGetAllSessions(): Promise<WorkSession[]> {
  const { data } = await supabase!
    .from("work_sessions")
    .select("*")
    .order("start_time", { ascending: true });
  return (data ?? []).map((r) => ({
    id: r.id,
    start: r.start_time,
    end: r.end_time,
    duration_ms: r.duration_ms,
    ...(r.label ? { label: r.label } : {}),
  }));
}

async function sbStartSession(label?: string): Promise<WorkSession> {
  const id = `ws-${Date.now()}`;
  const now = new Date().toISOString();
  await supabase!.from("work_sessions").insert({
    id,
    start_time: now,
    end_time: null,
    duration_ms: 0,
    label: label ?? null,
  });
  await supabase!
    .from("timer_state")
    .update({ current_session: id, updated_at: now })
    .eq("id", 1);
  return { id, start: now, end: null, duration_ms: 0, ...(label ? { label } : {}) };
}

async function sbEndCurrentSession(): Promise<void> {
  const currentId = await sbGetCurrentSession();
  if (!currentId) return;
  const now = new Date();
  const { data: session } = await supabase!
    .from("work_sessions")
    .select("start_time")
    .eq("id", currentId)
    .single();
  if (!session) return;
  const duration = now.getTime() - new Date(session.start_time).getTime();
  await supabase!
    .from("work_sessions")
    .update({ end_time: now.toISOString(), duration_ms: duration })
    .eq("id", currentId);
  await supabase!
    .from("timer_state")
    .update({ current_session: null, updated_at: now.toISOString() })
    .eq("id", 1);
}

async function sbResetCurrentSession(): Promise<void> {
  const currentId = await sbGetCurrentSession();
  if (!currentId) return;
  await supabase!.from("work_sessions").delete().eq("id", currentId);
  await supabase!
    .from("timer_state")
    .update({ current_session: null, updated_at: new Date().toISOString() })
    .eq("id", 1);
}

async function sbGetSessionById(id: string): Promise<WorkSession | null> {
  const { data } = await supabase!
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
    ...(data.label ? { label: data.label } : {}),
  };
}

// ---------------------------------------------------------------------------
// JSON file store (dev / fallback)
// ---------------------------------------------------------------------------

const DATA_PATH =
  process.env.WORK_TIMER_DATA_PATH ||
  path.join("/tmp", "work-timer-sessions.json");

const g = globalThis as unknown as {
  __wt?: WorkTimerData;
  __wtTimer?: ReturnType<typeof setTimeout>;
};

function loadFromDisk(): WorkTimerData {
  try {
    if (fs.existsSync(DATA_PATH)) {
      return JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
    }
  } catch {
    /* ignore */
  }
  return { version: "1.0", current_session: null, sessions: [] };
}

function getStore(): WorkTimerData {
  if (!g.__wt) {
    g.__wt = loadFromDisk();
  }
  return g.__wt;
}

function saveStore(data: WorkTimerData) {
  g.__wt = data;
  if (g.__wtTimer) clearTimeout(g.__wtTimer);
  g.__wtTimer = setTimeout(() => {
    const dir = path.dirname(DATA_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2), () => {});
  }, 10000);
}

function jsonGetCurrentSession(): string | null {
  return getStore().current_session;
}

function jsonGetAllSessions(): WorkSession[] {
  return getStore().sessions;
}

function jsonStartSession(label?: string): WorkSession {
  const store = getStore();
  const session: WorkSession = {
    id: `ws-${Date.now()}`,
    start: new Date().toISOString(),
    end: null,
    duration_ms: 0,
    ...(label ? { label } : {}),
  };
  saveStore({
    ...store,
    sessions: [...store.sessions, session],
    current_session: session.id,
  });
  return session;
}

function jsonEndCurrentSession(): void {
  const store = getStore();
  if (!store.current_session) return;
  const now = new Date();
  const sessions = store.sessions.map((s) =>
    s.id === store.current_session
      ? {
          ...s,
          end: now.toISOString(),
          duration_ms: now.getTime() - new Date(s.start).getTime(),
        }
      : s
  );
  saveStore({ ...store, sessions, current_session: null });
}

function jsonResetCurrentSession(): void {
  const store = getStore();
  if (!store.current_session) return;
  saveStore({
    ...store,
    sessions: store.sessions.filter((s) => s.id !== store.current_session),
    current_session: null,
  });
}

function jsonGetSessionById(id: string): WorkSession | null {
  return getStore().sessions.find((s) => s.id === id) ?? null;
}

// ---------------------------------------------------------------------------
// Public API — auto-selects backend
// ---------------------------------------------------------------------------

export async function getCurrentSession(): Promise<string | null> {
  return useSupabase ? sbGetCurrentSession() : jsonGetCurrentSession();
}

export async function getAllSessions(): Promise<WorkSession[]> {
  return useSupabase ? sbGetAllSessions() : jsonGetAllSessions();
}

export async function startSession(label?: string): Promise<WorkSession> {
  return useSupabase ? sbStartSession(label) : jsonStartSession(label);
}

export async function endCurrentSession(): Promise<void> {
  return useSupabase ? sbEndCurrentSession() : jsonEndCurrentSession();
}

export async function resetCurrentSession(): Promise<void> {
  return useSupabase ? sbResetCurrentSession() : jsonResetCurrentSession();
}

export async function getSessionById(
  id: string
): Promise<WorkSession | null> {
  return useSupabase ? sbGetSessionById(id) : jsonGetSessionById(id);
}
