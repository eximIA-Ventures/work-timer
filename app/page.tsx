"use client";

import Timer from "@/components/Timer";
import StatsCards from "@/components/StatsCards";
import DailyChart from "@/components/DailyChart";

export default function Home() {
  return (
    <main className="min-h-dvh flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border">
        <div className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="eximIA" className="h-5 w-5 opacity-70" />
          <span className="font-mono text-xs sm:text-sm text-muted uppercase tracking-wider">
            Work Timer
          </span>
        </div>
        <span className="font-mono text-xs text-muted/40">
          eximIA
        </span>
      </header>

      {/* Timer — hero section */}
      <section className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <Timer />
      </section>

      {/* Dashboard — stats + chart */}
      <section className="px-4 sm:px-6 pb-6 sm:pb-8 space-y-4">
        <StatsCards />
        <DailyChart />
      </section>
    </main>
  );
}
