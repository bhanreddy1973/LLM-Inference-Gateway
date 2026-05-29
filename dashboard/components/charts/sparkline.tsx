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
      <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Tooltip content={() => null} />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.8}
          fill={`url(#${gradientId})`}
          dot={false}
          activeDot={{
            r: 3.5,
            fill: color,
            stroke: `${color}40`,
            strokeWidth: 4,
          }}
          style={{
            filter: `drop-shadow(0 0 4px ${color}40)`,
          }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
