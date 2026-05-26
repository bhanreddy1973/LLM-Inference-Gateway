"use client";

import { formatRelative, formatLatency, formatCost, statusColor } from "@/lib/utils";
import type { RecentRequest } from "@/types/api";

const COLS = ["Model", "Tokens", "Latency", "Cost", "Status", "Time"];

export function RecentRequestsTable({ requests }: { requests?: RecentRequest[] }) {
  return (
    <div className="glass-card p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold" style={{ color: "var(--color-foreground)" }}>
          Recent Requests
        </p>
        {requests && requests.length > 0 && (
          <span
            className="text-xs font-medium px-2.5 py-1 rounded-full"
            style={{
              background: "rgba(139,92,246,0.1)",
              color: "#a78bfa",
              border: "1px solid rgba(139,92,246,0.2)",
            }}
          >
            {Math.min(requests.length, 10)} shown
          </span>
        )}
      </div>

      {!requests?.length ? (
        <div
          className="flex flex-col items-center justify-center py-12 gap-3 rounded-xl"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.07)" }}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.04)" }}
          >
            <svg className="w-5 h-5 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M3 7h18M3 12h18M3 17h10" />
            </svg>
          </div>
          <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>
            No requests yet. Start using the API to see activity.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                {COLS.map((h) => (
                  <th
                    key={h}
                    className="text-left pb-2.5 pr-4 font-medium text-xs uppercase tracking-wider"
                    style={{ color: "rgba(255,255,255,0.25)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {requests.slice(0, 10).map((r, idx) => (
                <tr
                  key={r.request_id}
                  className="group transition-colors duration-150 animate-row-in"
                  style={{
                    borderBottom: "1px solid rgba(255,255,255,0.03)",
                    animationDelay: `${idx * 0.04}s`,
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "rgba(139,92,246,0.04)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  {/* Model */}
                  <td className="py-2.5 pr-4">
                    <span
                      className="font-mono font-medium text-xs px-2 py-0.5 rounded-md"
                      style={{ background: "rgba(139,92,246,0.1)", color: "#a78bfa" }}
                    >
                      {r.model.split("-").slice(-2).join("-")}
                    </span>
                  </td>

                  {/* Tokens */}
                  <td className="py-2.5 pr-4" style={{ color: "var(--color-card-foreground)" }}>
                    {r.total_tokens.toLocaleString()}
                  </td>

                  {/* Latency */}
                  <td className="py-2.5 pr-4" style={{ color: "var(--color-card-foreground)" }}>
                    {formatLatency(r.total_latency_ms)}
                  </td>

                  {/* Cost */}
                  <td className="py-2.5 pr-4" style={{ color: "#34d399" }}>
                    {formatCost(r.estimated_cost_usd)}
                  </td>

                  {/* Status */}
                  <td className="py-2.5 pr-4">
                    <span
                      className={`font-bold text-xs px-2 py-0.5 rounded-md ${statusColor(r.status_code)}`}
                      style={{
                        background:
                          r.status_code < 300
                            ? "rgba(52,211,153,0.1)"
                            : r.status_code < 500
                            ? "rgba(251,191,36,0.1)"
                            : "rgba(248,113,113,0.1)",
                      }}
                    >
                      {r.status_code}
                    </span>
                  </td>

                  {/* Time */}
                  <td
                    className="py-2.5"
                    style={{ color: "var(--color-muted-foreground)", opacity: 0.7 }}
                  >
                    {formatRelative(r.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
