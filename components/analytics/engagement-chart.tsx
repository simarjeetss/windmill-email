"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { TimelinePoint } from "@/lib/analytics/metrics";

const formatAxisLabel = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
};

const formatTooltipLabel = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
};

export type EngagementChartProps = {
  data: TimelinePoint[];
  visibleKeys: Array<keyof Omit<TimelinePoint, "date">>;
};

const SERIES = [
  { key: "sent", label: "Sent", stroke: "var(--chart-1)", fill: "url(#sent)" },
  { key: "opened", label: "Opened", stroke: "var(--chart-2)", fill: "url(#opened)" },
  { key: "clicked", label: "Clicked", stroke: "var(--chart-3)", fill: "url(#clicked)" },
  { key: "failed", label: "Failed", stroke: "#f87171", fill: "url(#failed)" },
] as const;

export default function EngagementChart({ data, visibleKeys }: EngagementChartProps) {
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="sent" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="opened" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="clicked" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--chart-3)" stopOpacity={0.28} />
              <stop offset="95%" stopColor="var(--chart-3)" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="failed" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f87171" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#f87171" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--rk-text-muted)", fontSize: 11 }}
            tickFormatter={formatAxisLabel}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            tick={{ fill: "var(--rk-text-muted)", fontSize: 11 }}
          />
          <Tooltip
            cursor={{ stroke: "var(--rk-border-md)", strokeDasharray: "4 4" }}
            contentStyle={{
              background: "var(--rk-surface)",
              border: "1px solid var(--rk-border)",
              borderRadius: 10,
              fontSize: 12,
              color: "var(--rk-text)",
            }}
            labelStyle={{ color: "var(--rk-text-muted)", marginBottom: 4 }}
            formatter={(value: number, name: string) => [value, name]}
            labelFormatter={formatTooltipLabel}
          />
          {SERIES.filter((series) => visibleKeys.includes(series.key)).map((series) => (
            <Area
              key={series.key}
              type="monotone"
              dataKey={series.key}
              name={series.label}
              stroke={series.stroke}
              strokeWidth={2}
              fill={series.fill}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
