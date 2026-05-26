"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { keysApi, ApiError } from "@/lib/api";
import { formatDateTime, formatRelative } from "@/lib/utils";
import { Plus, Copy, Trash2, Key, CheckCircle, Loader2, X } from "lucide-react";
import type { ApiKey } from "@/types/api";

export default function KeysPage() {
  const { data: keys = [], isLoading } = useSWR<ApiKey[]>("keys", () => keysApi.list());

  const [creating, setCreating] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!keyName.trim()) return;
    setCreating(true);
    setError("");
    try {
      const res = await keysApi.create(keyName.trim());
      setNewKey(res.key);
      setKeyName("");
      mutate("keys");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create key");
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id: string) {
    setRevoking(id);
    try {
      await keysApi.revoke(id);
      mutate("keys");
    } catch { /* ignore */ } finally {
      setRevoking(null);
      setConfirmRevoke(null);
    }
  }

  function copyKey() {
    if (!newKey) return;
    navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold gradient-text">API Keys</h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-muted-foreground)" }}>
          Manage your API keys for gateway access
        </p>
      </div>

      {/* New key display */}
      {newKey && (
        <div className="glass-card p-5 glow-emerald">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: "#34d399" }} />
            <div className="flex-1">
              <p className="text-sm font-semibold mb-2" style={{ color: "#34d399" }}>Key created — copy it now, it won&apos;t be shown again</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 rounded-lg text-xs font-mono break-all" style={{ background: "rgba(0,0,0,0.4)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.2)" }}>
                  {newKey}
                </code>
                <button onClick={copyKey} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all" style={{ background: copied ? "rgba(52,211,153,0.15)" : "rgba(255,255,255,0.08)", color: copied ? "#34d399" : "var(--color-foreground)", border: `1px solid ${copied ? "rgba(52,211,153,0.3)" : "rgba(255,255,255,0.1)"}` }}>
                  {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
            <button onClick={() => setNewKey(null)}>
              <X className="w-4 h-4" style={{ color: "var(--color-muted-foreground)" }} />
            </button>
          </div>
        </div>
      )}

      {/* Create form */}
      <div className="glass-card p-5">
        <p className="text-sm font-semibold mb-4" style={{ color: "var(--color-foreground)" }}>Create New Key</p>
        <form onSubmit={handleCreate} className="flex gap-3">
          <div className="relative flex-1">
            <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--color-muted-foreground)" }} />
            <input
              type="text"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              placeholder="Key name (e.g. production, staging)"
              className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm outline-none"
              style={{ background: "var(--color-input)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--color-foreground)" }}
            />
          </div>
          <button
            type="submit"
            disabled={creating || !keyName.trim()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #7c3aed, #0e7490)", color: "#fff", boxShadow: "0 0 16px rgba(139,92,246,0.25)" }}
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Create
          </button>
        </form>
        {error && <p className="mt-2 text-xs" style={{ color: "#fca5a5" }}>{error}</p>}
      </div>

      {/* Keys table */}
      <div className="glass-card p-5">
        <p className="text-sm font-semibold mb-4" style={{ color: "var(--color-foreground)" }}>
          Your Keys <span className="text-xs font-normal ml-1" style={{ color: "var(--color-muted-foreground)" }}>({keys.length})</span>
        </p>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-12 skeleton" />)}
          </div>
        ) : keys.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Key className="w-8 h-8" style={{ color: "var(--color-muted-foreground)", opacity: 0.4 }} />
            <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>No keys yet. Create one above.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                {["Name", "Prefix", "Status", "Created", "Last Used", ""].map((h) => (
                  <th key={h} className="text-left pb-3 pr-4 text-xs font-medium" style={{ color: "var(--color-muted-foreground)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <td className="py-3 pr-4 font-medium text-sm" style={{ color: "var(--color-foreground)" }}>{k.name}</td>
                  <td className="py-3 pr-4">
                    <code className="text-xs px-2 py-0.5 rounded" style={{ background: "rgba(139,92,246,0.12)", color: "#a78bfa" }}>{k.key_prefix}…</code>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={k.is_active ? { background: "rgba(52,211,153,0.12)", color: "#34d399" } : { background: "rgba(248,113,113,0.12)", color: "#f87171" }}>
                      {k.is_active ? "Active" : "Revoked"}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-xs" style={{ color: "var(--color-muted-foreground)" }}>{formatDateTime(k.created_at)}</td>
                  <td className="py-3 pr-4 text-xs" style={{ color: "var(--color-muted-foreground)" }}>{k.last_used_at ? formatRelative(k.last_used_at) : "Never"}</td>
                  <td className="py-3">
                    {k.is_active && (
                      confirmRevoke === k.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>Confirm?</span>
                          <button onClick={() => handleRevoke(k.id)} className="text-xs px-2 py-1 rounded" style={{ background: "rgba(239,68,68,0.15)", color: "#f87171" }}>
                            {revoking === k.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Revoke"}
                          </button>
                          <button onClick={() => setConfirmRevoke(null)} className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmRevoke(k.id)} className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10">
                          <Trash2 className="w-3.5 h-3.5" style={{ color: "var(--color-muted-foreground)" }} />
                        </button>
                      )
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
