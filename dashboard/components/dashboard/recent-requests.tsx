"use client";

import { Card, CardHeader, CardTitle, CardAction, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { formatRelative, formatLatency, formatCost } from "@/lib/utils";
import type { RecentRequest } from "@/types/api";

function StatusChip({ code }: { code: number }) {
  const ok = code < 300;
  const warn = code >= 300 && code < 500;
  const color = ok ? "#34d399" : warn ? "#fbbf24" : "#fb7185";
  const bg = ok ? "rgba(52,211,153,0.08)" : warn ? "rgba(251,191,36,0.08)" : "rgba(251,113,133,0.08)";
  const border = ok ? "rgba(52,211,153,0.15)" : warn ? "rgba(251,191,36,0.15)" : "rgba(251,113,133,0.15)";
  return (
    <Badge
      variant="outline"
      className="h-auto px-2 py-0.5 text-[11px] font-bold rounded-full"
      style={{ color, background: bg, borderColor: border }}
    >
      {code}
    </Badge>
  );
}

export function RecentRequestsTable({ requests }: { requests?: RecentRequest[] }) {
  return (
    <Card className="relative overflow-hidden">
      {/* Subtle top accent line */}
      <div
        className="absolute top-0 left-8 right-8 h-[1px]"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(139,92,246,0.2), rgba(6,182,212,0.2), transparent)",
        }}
      />

      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-semibold">Recent Requests</CardTitle>
        {!!requests?.length && (
          <CardAction>
            <Badge variant="secondary" className="text-violet-300 bg-violet-500/10 border-violet-500/15 rounded-full text-[11px] font-semibold">
              {Math.min(requests.length, 10)} shown
            </Badge>
          </CardAction>
        )}
      </CardHeader>

      <CardContent>
        {!requests?.length ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4 rounded-xl bg-white/[0.015] border border-dashed border-white/[0.06]">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, rgba(139,92,246,0.08), rgba(6,182,212,0.06))",
                border: "1px solid rgba(139,92,246,0.12)",
              }}
            >
              <svg className="w-5 h-5 text-violet-300/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7h18M3 12h18M3 17h10" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">
                No requests yet
              </p>
              <p className="text-xs text-muted-foreground/50 mt-1">
                Start using the API to see activity here.
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden border border-white/[0.04]">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-white/[0.04]">
                  <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold">Model</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold">Tokens</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold">Latency</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold">Cost</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold">Status</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.slice(0, 10).map((r, idx) => (
                  <TableRow
                    key={r.request_id}
                    className="hover:bg-violet-500/[0.03] border-white/[0.03] transition-colors"
                    style={{
                      animation: `row-enter 0.3s ease-out ${idx * 40}ms both`,
                    }}
                  >
                    <TableCell>
                      <Badge variant="secondary" className="font-mono text-[11px] bg-violet-500/8 text-violet-300 border-violet-500/12 rounded-md">
                        {r.model.split("/").pop()?.split("-").slice(-2).join("-") ?? r.model}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs tabular-nums">
                      {r.total_tokens.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs tabular-nums">
                      {formatLatency(r.total_latency_ms)}
                    </TableCell>
                    <TableCell className="text-emerald-400 font-semibold text-xs tabular-nums">
                      {formatCost(r.estimated_cost_usd)}
                    </TableCell>
                    <TableCell>
                      <StatusChip code={r.status_code} />
                    </TableCell>
                    <TableCell className="text-muted-foreground/50 text-xs">
                      {formatRelative(r.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
