import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentSession,
  getSessionById,
  getAllSessions,
  startSession,
  endCurrentSession,
  resetCurrentSession,
} from "@/lib/store";
import { formatMs } from "@/lib/stats";

async function buildStatus() {
  const now = Date.now();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const sessions = await getAllSessions();
  let todayMs = 0;
  for (const s of sessions) {
    const start = new Date(s.start);
    if (start >= todayStart) {
      todayMs += s.duration_ms > 0 ? s.duration_ms : now - start.getTime();
    }
  }

  const currentId = await getCurrentSession();
  const current = currentId ? await getSessionById(currentId) : null;

  return {
    status: currentId ? ("running" as const) : ("paused" as const),
    current_session: current
      ? {
          id: current.id,
          start: current.start,
          elapsed_ms: now - new Date(current.start).getTime(),
        }
      : null,
    today_total_ms: todayMs,
    today_formatted: formatMs(todayMs),
  };
}

export async function GET() {
  const status = await buildStatus();
  return NextResponse.json(status);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const action: string = body.action || "toggle";
  const label: string | undefined = body.label;

  const currentId = await getCurrentSession();

  switch (action) {
    case "start": {
      if (!currentId) {
        await startSession(label);
      }
      break;
    }

    case "pause": {
      if (currentId) {
        await endCurrentSession();
      }
      break;
    }

    case "toggle": {
      if (currentId) {
        await endCurrentSession();
      } else {
        await startSession(label);
      }
      break;
    }

    case "reset": {
      if (currentId) {
        await resetCurrentSession();
      }
      break;
    }

    default:
      return NextResponse.json(
        { error: "Invalid action. Use: start, pause, toggle, reset" },
        { status: 400 }
      );
  }

  const status = await buildStatus();
  return NextResponse.json(status);
}
