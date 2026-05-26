"use client";

import { ResponsiveContainer, AreaChart, Area, Tooltip } from "recharts";

interface SparklineProps {
  data: { value: number }[];
  color?: string;
  gradientId?: string;
}

export function Sparkline({ data, color = "#8b5cf6", gradientId = "spark" }: SparklineProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Tooltip
          content={() => null}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#${gradientId})`}
          dot={false}
          activeDot={{ r: 3, fill: color }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
