"use client";

import { useMemo, useState } from "react";
import EngagementChart from "@/components/analytics/engagement-chart";
import { Button } from "@/components/ui/button";
import type { TimelinePoint } from "@/lib/analytics/metrics";

const SERIES_OPTIONS = [
  { key: "sent", label: "Sent", color: "var(--chart-1)" },
  { key: "opened", label: "Opened", color: "var(--chart-2)" },
  { key: "clicked", label: "Clicked", color: "var(--chart-3)" },
  { key: "failed", label: "Failed", color: "#f87171" },
] as const;

export type EngagementTrendProps = {
  data: TimelinePoint[];
};

export default function EngagementTrend({ data }: EngagementTrendProps) {
  const [activeKeys, setActiveKeys] = useState<string[]>([
    "sent",
    "opened",
    "clicked",
  ]);

  const visibleKeys = useMemo(() => {
    if (activeKeys.length === 0) return ["sent"];
    return activeKeys;
  }, [activeKeys]);

  const toggleKey = (key: string) => {
    setActiveKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] uppercase tracking-widest" style={{ color: "var(--rk-text-sub)" }}>
          Metrics
        </span>
        {SERIES_OPTIONS.map((option) => (
          <Button
            key={option.key}
            size="xs"
            variant={visibleKeys.includes(option.key) ? "secondary" : "ghost"}
            onClick={() => toggleKey(option.key)}
            className="flex items-center gap-2"
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: option.color, opacity: visibleKeys.includes(option.key) ? 1 : 0.4 }}
            />
            {option.label}
          </Button>
        ))}
      </div>
      <EngagementChart data={data} visibleKeys={visibleKeys as Array<keyof Omit<TimelinePoint, "date">>} />
    </div>
  );
}
