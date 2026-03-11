"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { TimerStatus } from "@/lib/types";

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function Timer() {
  const [status, setStatus] = useState<TimerStatus | null>(null);
  const [displayMs, setDisplayMs] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/timer", { cache: "no-store" });
      const data: TimerStatus = await res.json();
      setStatus(data);

      if (data.status === "running" && data.current_session) {
        startTimeRef.current = Date.now() - data.current_session.elapsed_ms;
        setDisplayMs(data.current_session.elapsed_ms);
      } else {
        startTimeRef.current = null;
        setDisplayMs(0);
      }
    } catch {
      // silently retry on next poll
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Tick every second when running
  useEffect(() => {
    if (status?.status === "running" && startTimeRef.current !== null) {
      intervalRef.current = setInterval(() => {
        if (startTimeRef.current !== null) {
          setDisplayMs(Date.now() - startTimeRef.current);
        }
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [status?.status]);

  // Poll every 30s for sync (in case API was called externally)
  useEffect(() => {
    const poll = setInterval(fetchStatus, 30000);
    return () => clearInterval(poll);
  }, [fetchStatus]);

  const toggle = useCallback(async () => {
    try {
      const res = await fetch("/api/timer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle" }),
      });
      const data: TimerStatus = await res.json();
      setStatus(data);

      if (data.status === "running" && data.current_session) {
        startTimeRef.current = Date.now() - data.current_session.elapsed_ms;
        setDisplayMs(data.current_session.elapsed_ms);
      } else {
        startTimeRef.current = null;
        setDisplayMs(0);
      }
    } catch {
      // retry
    }
  }, []);

  const reset = useCallback(async () => {
    try {
      const res = await fetch("/api/timer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });
      const data: TimerStatus = await res.json();
      setStatus(data);
      startTimeRef.current = null;
      setDisplayMs(0);
    } catch {
      // retry
    }
  }, []);

  // Spacebar handler (desktop only — ignores if in input/textarea)
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.code === "Space" && !["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        toggle();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [toggle]);

  const isRunning = status?.status === "running";

  return (
    <div className="flex flex-col items-center gap-6 sm:gap-8">
      {/* Timer display */}
      <div
        className={`
          relative flex items-center justify-center
          w-full max-w-md aspect-square rounded-full
          border-2 transition-all duration-500
          ${isRunning
            ? "border-green-500/40 shadow-[0_0_60px_rgba(34,197,94,0.15)]"
            : "border-border"
          }
        `}
      >
        {/* Pulse ring when running */}
        {isRunning && (
          <div className="absolute inset-0 rounded-full border-2 border-green-500/20 animate-ping" style={{ animationDuration: "2s" }} />
        )}

        <div className="text-center">
          <p className="font-mono text-5xl sm:text-7xl md:text-8xl tracking-tight text-primary">
            {formatElapsed(displayMs)}
          </p>
          <div className="flex items-center justify-center gap-2 mt-3">
            <span
              className={`w-2 h-2 rounded-full ${isRunning ? "bg-green-500 animate-pulse" : "bg-muted"}`}
            />
            <span className="font-mono text-xs sm:text-sm uppercase tracking-widest text-muted">
              {isRunning ? "running" : "paused"}
            </span>
          </div>
        </div>
      </div>

      {/* Control buttons — large, touch-friendly */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggle}
          className={`
            flex items-center justify-center gap-3
            px-8 py-4 sm:px-12 sm:py-5
            rounded-2xl font-mono text-sm sm:text-base uppercase tracking-wider
            transition-all duration-200 active:scale-95
            ${isRunning
              ? "bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20"
              : "bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/20"
            }
          `}
        >
          {isRunning ? <Pause size={22} /> : <Play size={22} />}
          {isRunning ? "Pause" : "Start"}
        </button>

        {isRunning && (
          <button
            onClick={reset}
            className="
              flex items-center justify-center
              p-4 sm:p-5 rounded-2xl
              bg-surface border border-border text-muted
              hover:text-primary hover:border-muted
              transition-all duration-200 active:scale-95
            "
            title="Discard current session"
          >
            <RotateCcw size={20} />
          </button>
        )}
      </div>

      {/* Keyboard hint — hidden on mobile */}
      <p className="hidden sm:block text-xs text-muted/50 font-mono">
        press SPACE to toggle
      </p>

      {/* Today total */}
      {status && (
        <p className="text-sm text-muted font-mono">
          today: {status.today_formatted}
        </p>
      )}
    </div>
  );
}
