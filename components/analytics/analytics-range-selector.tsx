"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

export type AnalyticsRangeSelectorProps = {
  rangeDays: number;
  selectedCampaignId: string;
};

const PRESET_RANGES = [
  { label: "7D", value: 7 },
  { label: "30D", value: 30 },
  { label: "90D", value: 90 },
];

const clampRange = (value: number) => Math.max(1, Math.min(value, 365));

export default function AnalyticsRangeSelector({
  rangeDays,
  selectedCampaignId,
}: AnalyticsRangeSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [customRange, setCustomRange] = useState(String(rangeDays));

  const baseParams = useMemo(() => {
    const params = new URLSearchParams(searchParams?.toString());
    if (selectedCampaignId) {
      params.set("campaign", selectedCampaignId);
    }
    return params;
  }, [searchParams, selectedCampaignId]);

  const navigateWithRange = (nextRange: number) => {
    const params = new URLSearchParams(baseParams);
    params.set("range", String(clampRange(nextRange)));
    router.replace(`/dashboard/analytics?${params.toString()}`);
  };

  const handleCustomApply = () => {
    const parsed = Number(customRange);
    if (!Number.isFinite(parsed)) return;
    navigateWithRange(parsed);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESET_RANGES.map((option) => (
        <Button
          key={option.value}
          size="sm"
          variant={rangeDays === option.value ? "default" : "outline"}
          onClick={() => navigateWithRange(option.value)}
        >
          {option.label}
        </Button>
      ))}
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={1}
          max={365}
          value={customRange}
          onChange={(event) => setCustomRange(event.target.value)}
          className="h-9 w-20 rounded-md border border-white/10 bg-[var(--rk-surface-2)] px-2 text-xs text-[var(--rk-text)]"
        />
        <Button size="sm" variant="outline" onClick={handleCustomApply}>
          Custom
        </Button>
      </div>
    </div>
  );
}
