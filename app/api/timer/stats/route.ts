import { NextResponse } from "next/server";
import { getAllSessions } from "@/lib/store";
import { computeStats } from "@/lib/stats";

export async function GET() {
  const sessions = await getAllSessions();
  const stats = computeStats(sessions);
  return NextResponse.json(stats);
}
