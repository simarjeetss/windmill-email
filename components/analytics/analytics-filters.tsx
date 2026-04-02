"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type AnalyticsFiltersProps = {
  campaigns: { id: string; name: string }[];
  selectedCampaignId: string;
  rangeDays: number;
};

export default function AnalyticsFilters({
  campaigns,
  selectedCampaignId,
  rangeDays,
}: AnalyticsFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [campaign, setCampaign] = useState(selectedCampaignId || "all");

  const baseParams = useMemo(() => {
    const params = new URLSearchParams(searchParams?.toString());
    params.set("range", String(rangeDays));
    return params;
  }, [searchParams, rangeDays]);

  useEffect(() => {
    setCampaign(selectedCampaignId || "all");
  }, [selectedCampaignId]);

  const handleChange = (value: string) => {
    setCampaign(value);
    const params = new URLSearchParams(baseParams);
    if (value === "all") {
      params.delete("campaign");
    } else {
      params.set("campaign", value);
    }
    router.replace(`/dashboard/analytics?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={campaign} onValueChange={handleChange}>
        <SelectTrigger className="w-[220px] bg-[var(--rk-surface-2)] text-[var(--rk-text)]">
          <SelectValue placeholder="Select campaign" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All campaigns</SelectItem>
          {campaigns.map((item) => (
            <SelectItem key={item.id} value={item.id}>
              {item.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
