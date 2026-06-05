"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  Copy,
  Eye,
  EyeOff,
  Key,
  Loader2,
  Pencil,
  Plus,
  Settings2,
  ShieldCheck,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import {
  listApiKeys,
  createApiKey,
  updateApiKey,
  revokeApiKey,
  getMe,
  ApiError,
  type ApiKey,
  type ApiKeyCreated,
} from "@/lib/api";
import { useDemo } from "@/lib/demo-context";
import { DEMO_KEYS, DEMO_USER } from "@/lib/demo-data";

// ─── Tier limits (mirrors backend) ───────────────────────────────────────────────
const TIER_DEFAULTS: Record<string, { rpm: number; rpd: number; mtr: number }> = {
  free:       { rpm: 10,  rpd: 100,   mtr: 1024 },
  pro:        { rpm: 60,  rpd: 5000,  mtr: 4096 },
  enterprise: { rpm: 300, rpd: 50000, mtr: 8192 },
};

function getTierDefaults(tier: string) {
  return TIER_DEFAULTS[tier] ?? TIER_DEFAULTS.free;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Shared modal wrapper ─────────────────────────────────────────────────────

function ModalWrap({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {children}
    </div>
  );
}

// ─── Limits fields (reused in create + edit modals) ───────────────────────────

function LimitsSection({
  rpm, setRpm,
  rpd, setRpd,
  mtr, setMtr,
  tierRpm, tierRpd, tierMtr,
}: {
  rpm: string; setRpm: (v: string) => void;
  rpd: string; setRpd: (v: string) => void;
  mtr: string; setMtr: (v: string) => void;
  tierRpm: number; tierRpd: number; tierMtr: number;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="mb-3 flex items-center gap-2">
        <Settings2 className="size-3.5 text-zinc-600" />
        <p className="text-[12px] font-medium text-zinc-400">Custom Rate Limits</p>
        <span className="ml-auto text-[11px] text-zinc-700">Leave blank to use tier defaults</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Req / minute", val: rpm, set: setRpm, placeholder: `Default: ${tierRpm}` },
          { label: "Req / day",    val: rpd, set: setRpd, placeholder: `Default: ${tierRpd}` },
          { label: "Max tokens",   val: mtr, set: setMtr, placeholder: `Default: ${tierMtr}` },
        ].map((f) => (
          <div key={f.label} className="flex flex-col gap-1">
            <label className="text-[11px] text-zinc-600">{f.label}</label>
            <input
              type="number"
              min={1}
              value={f.val}
              onChange={(e) => f.set(e.target.value)}
              placeholder={f.placeholder}
              className="h-8 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 text-[12px] text-zinc-300 placeholder:text-zinc-700 focus:border-white/20 focus:outline-none"
            />
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-zinc-700">
        Set -1 to explicitly clear a limit and revert to tier default.
      </p>
    </div>
  );
}

// ─── Create Key Modal ─────────────────────────────────────────────────────────

function CreateKeyModal({ onClose, onCreate, tierRpm, tierRpd, tierMtr }: {
  onClose: () => void;
  onCreate: (key: ApiKeyCreated) => void;
  tierRpm: number; tierRpd: number; tierMtr: number;
}) {
  const [name, setName]   = useState("");
  const [rpm, setRpm]     = useState("");
  const [rpd, setRpd]     = useState("");
  const [mtr, setMtr]     = useState("");
  const [loading, setL]   = useState(false);
  const [error, setError] = useState("");
  const inputRef          = useRef<HTMLInputElement>(null);

  // Set page title
  useEffect(() => { document.title = "API Keys · Acheron"; }, []);

  useEffect(() => { inputRef.current?.focus(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setL(true);
    setError("");
    try {
      const limits = {
        requests_per_minute:    rpm ? Number(rpm) : undefined,
        requests_per_day:       rpd ? Number(rpd) : undefined,
        max_tokens_per_request: mtr ? Number(mtr) : undefined,
      };
      const created = await createApiKey(name.trim(), limits);
      onCreate(created);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to create key.");
    } finally {
      setL(false);
    }
  }

  return (
    <ModalWrap onClose={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#111113] p-6 shadow-[0_24px_64px_-12px_rgba(0,0,0,0.8)]">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-zinc-100">Create API Key</h2>
            <p className="mt-0.5 text-[12px] text-zinc-600">Set a name and optional per-key rate limits.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-600 hover:bg-white/[0.06] hover:text-zinc-400">
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-zinc-500">Key name</label>
            <input
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Frontend App, CI/CD Bot, Alice's Key"
              className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 text-[13px] text-zinc-200 placeholder:text-zinc-700 transition focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/10"
            />
          </div>

          <LimitsSection
            rpm={rpm} setRpm={setRpm}
            rpd={rpd} setRpd={setRpd}
            mtr={mtr} setMtr={setMtr}
            tierRpm={tierRpm} tierRpd={tierRpd} tierMtr={tierMtr}
          />

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-[12px] text-red-400">
              <AlertTriangle className="size-3.5 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-xl border border-white/10 py-2.5 text-[13px] text-zinc-500 transition hover:border-white/20 hover:text-zinc-300">
              Cancel
            </button>
            <button type="submit" disabled={loading || !name.trim()}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-[13px] font-medium text-zinc-900 transition hover:bg-zinc-100 disabled:opacity-40">
              {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Key className="size-3.5" />}
              Create Key
            </button>
          </div>
        </form>
      </div>
    </ModalWrap>
  );
}

// ─── Edit Limits Modal ────────────────────────────────────────────────────────

function EditLimitsModal({ apiKey, onClose, onSave, tierRpm, tierRpd, tierMtr }: {
  apiKey: ApiKey;
  onClose: () => void;
  onSave: (updated: ApiKey) => void;
  tierRpm: number; tierRpd: number; tierMtr: number;
}) {
  const [name, setName]   = useState(apiKey.name);
  const [rpm, setRpm]     = useState(apiKey.requests_per_minute != null ? String(apiKey.requests_per_minute) : "");
  const [rpd, setRpd]     = useState(apiKey.requests_per_day != null ? String(apiKey.requests_per_day) : "");
  const [mtr, setMtr]     = useState(apiKey.max_tokens_per_request != null ? String(apiKey.max_tokens_per_request) : "");
  const [loading, setL]   = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setL(true);
    setError("");
    try {
      const patch: Record<string, unknown> = { name };
      patch.requests_per_minute    = rpm === "" ? null : Number(rpm);
      patch.requests_per_day       = rpd === "" ? null : Number(rpd);
      patch.max_tokens_per_request = mtr === "" ? null : Number(mtr);
      const updated = await updateApiKey(apiKey.id, patch as Parameters<typeof updateApiKey>[1]);
      onSave(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to save.");
    } finally {
      setL(false);
    }
  }

  return (
    <ModalWrap onClose={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#111113] p-6 shadow-[0_24px_64px_-12px_rgba(0,0,0,0.8)]">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-zinc-100">Edit Key Limits</h2>
            <p className="mt-0.5 font-mono text-[11px] text-zinc-600">{apiKey.key_prefix}…</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-600 hover:bg-white/[0.06] hover:text-zinc-400">
            <X className="size-4" />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-zinc-500">Key name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 text-[13px] text-zinc-200 placeholder:text-zinc-700 transition focus:border-white/20 focus:outline-none"
            />
          </div>

          <LimitsSection
            rpm={rpm} setRpm={setRpm}
            rpd={rpd} setRpd={setRpd}
            mtr={mtr} setMtr={setMtr}
            tierRpm={tierRpm} tierRpd={tierRpd} tierMtr={tierMtr}
          />

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-[12px] text-red-400">
              <AlertTriangle className="size-3.5 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-xl border border-white/10 py-2.5 text-[13px] text-zinc-500 transition hover:border-white/20 hover:text-zinc-300">
              Cancel
            </button>
            <button onClick={handleSave} disabled={loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-[13px] font-medium text-zinc-900 transition hover:bg-zinc-100 disabled:opacity-40">
              {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </ModalWrap>
  );
}

// ─── Show Full Key Modal ──────────────────────────────────────────────────────

function RevealKeyModal({ apiKey, onClose }: { apiKey: ApiKeyCreated; onClose: () => void }) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied]   = useState(false);

  function copy() {
    navigator.clipboard.writeText(apiKey.key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <ModalWrap onClose={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#111113] p-6 shadow-[0_24px_64px_-12px_rgba(0,0,0,0.8)]">
        <div className="mb-5">
          <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-emerald-500/10">
            <ShieldCheck className="size-6 text-emerald-400" />
          </div>
          <h2 className="text-[15px] font-semibold text-zinc-100">Key Created</h2>
          <p className="mt-1 text-[12px] text-zinc-500">
            Copy this key now. It will not be shown again.
          </p>
        </div>

        <div className="mb-4 overflow-hidden rounded-xl border border-white/[0.06] bg-black/40">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2">
            <span className="text-[11px] text-zinc-600">API Key</span>
            <div className="flex gap-1">
              <button onClick={() => setVisible(!visible)}
                className="rounded-lg p-1.5 text-zinc-600 hover:bg-white/[0.06] hover:text-zinc-400">
                {visible ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
              <button onClick={copy}
                className="rounded-lg p-1.5 text-zinc-600 hover:bg-white/[0.06] hover:text-zinc-400">
                {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
              </button>
            </div>
          </div>
          <p className="break-all px-3 py-3 font-mono text-[12px] text-zinc-300">
            {visible ? apiKey.key : apiKey.key.slice(0, 12) + "•".repeat(Math.max(0, apiKey.key.length - 12))}
          </p>
        </div>

        {/* Show limits if set */}
        {(apiKey.requests_per_minute || apiKey.requests_per_day || apiKey.max_tokens_per_request) && (
          <div className="mb-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-zinc-600">Custom Limits</p>
            <div className="flex gap-4 text-[12px]">
              {apiKey.requests_per_minute && <span className="text-zinc-400">{apiKey.requests_per_minute} RPM</span>}
              {apiKey.requests_per_day && <span className="text-zinc-400">{apiKey.requests_per_day} RPD</span>}
              {apiKey.max_tokens_per_request && <span className="text-zinc-400">{apiKey.max_tokens_per_request} max tokens</span>}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.07] px-3.5 py-3 text-[12px] text-amber-400">
          <AlertTriangle className="mb-1 inline size-3.5 mr-1" />
          Store this key in a secret manager. It cannot be recovered.
        </div>

        <button onClick={onClose}
          className="mt-4 w-full rounded-xl bg-white py-2.5 text-[13px] font-medium text-zinc-900 transition hover:bg-zinc-100">
          Done — I've saved it
        </button>
      </div>
    </ModalWrap>
  );
}

// ─── Revoke confirm ───────────────────────────────────────────────────────────

function RevokeModal({ apiKey, onClose, onRevoke }: {
  apiKey: ApiKey; onClose: () => void; onRevoke: () => void;
}) {
  const [loading, setL] = useState(false);
  async function confirm() {
    setL(true);
    try { await revokeApiKey(apiKey.id); onRevoke(); }
    catch { setL(false); }
  }
  return (
    <ModalWrap onClose={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#111113] p-6 shadow-[0_24px_64px_-12px_rgba(0,0,0,0.8)]">
        <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-red-500/10">
          <Trash2 className="size-6 text-red-400" />
        </div>
        <h2 className="text-[15px] font-semibold text-zinc-100">Revoke "{apiKey.name}"?</h2>
        <p className="mt-2 text-[13px] text-zinc-500">
          This key will stop working immediately. Any app using it will start receiving 401 errors.
        </p>
        <div className="mt-5 flex gap-2">
          <button onClick={onClose}
            className="flex-1 rounded-xl border border-white/10 py-2.5 text-[13px] text-zinc-500 transition hover:border-white/20">
            Cancel
          </button>
          <button onClick={confirm} disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500/10 py-2.5 text-[13px] font-medium text-red-400 ring-1 ring-red-500/20 transition hover:bg-red-500/20 disabled:opacity-50">
            {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
            Revoke
          </button>
        </div>
      </div>
    </ModalWrap>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function KeysPage() {
  const [keys, setKeys]               = useState<ApiKey[]>([]);
  const [loading, setLoading]         = useState(true);
  const [tier, setTier]               = useState("free");
  const [showCreate, setShowCreate]   = useState(false);
  const [newKey, setNewKey]           = useState<ApiKeyCreated | null>(null);
  const [editKey, setEditKey]         = useState<ApiKey | null>(null);
  const [revokeKey, setRevokeKey]     = useState<ApiKey | null>(null);
  const isDemo = useDemo();

  // Resolve tier limits dynamically
  const td = getTierDefaults(tier);
  const tierRpm = td.rpm; const tierRpd = td.rpd; const tierMtr = td.mtr;

  useEffect(() => {
    if (isDemo) {
      setKeys(DEMO_KEYS);
      setTier(DEMO_USER.tier);
      setLoading(false);
      return;
    }
    Promise.all([listApiKeys(), getMe()])
      .then(([ks, u]) => { setKeys(ks); setTier(u.tier); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isDemo]);

  function handleCreated(key: ApiKeyCreated) {
    setKeys((prev) => [key, ...prev]);
    setShowCreate(false);
    setNewKey(key);
  }

  function handleSaved(updated: ApiKey) {
    setKeys((prev) => prev.map((k) => k.id === updated.id ? updated : k));
    setEditKey(null);
  }

  function handleRevoked() {
    if (revokeKey) {
      setKeys((prev) => prev.filter((k) => k.id !== revokeKey.id));
      setRevokeKey(null);
    }
  }

  const active   = keys.filter((k) => k.is_active);
  const inactive = keys.filter((k) => !k.is_active);

  function KeyRow({ k }: { k: ApiKey }) {
    const hasCustom = k.requests_per_minute != null || k.requests_per_day != null || k.max_tokens_per_request != null;
    return (
      <div className="group grid grid-cols-[1fr_auto] items-center gap-4 px-5 py-3.5 transition hover:bg-white/[0.02]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex size-8 items-center justify-center rounded-lg bg-white/[0.04]">
            <Key className="size-3.5 text-zinc-500" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[13px] font-medium text-zinc-200">{k.name}</p>
              {k.is_active ? (
                <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
                  <span className="size-1 rounded-full bg-emerald-400 animate-pulse" />Active
                </span>
              ) : (
                <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-600 ring-1 ring-inset ring-white/[0.06]">Revoked</span>
              )}
              {hasCustom && (
                <span className="flex items-center gap-1 rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] text-violet-400 ring-1 ring-inset ring-violet-500/20">
                  <Zap className="size-2.5" />Custom limits
                </span>
              )}
            </div>
            <div className="mt-0.5 flex items-center gap-3 text-[11px] text-zinc-600">
              <span className="font-mono">{k.key_prefix}…</span>
              <span>Created {formatDate(k.created_at)}</span>
              {k.last_used_at && <span>Last used {timeAgo(k.last_used_at)}</span>}
              {hasCustom && (
                <span className="text-zinc-700">
                  {k.requests_per_minute != null && `${k.requests_per_minute} RPM`}
                  {k.requests_per_day != null && ` · ${k.requests_per_day} RPD`}
                  {k.max_tokens_per_request != null && ` · ${k.max_tokens_per_request} max tok`}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
          {k.is_active && !isDemo && (
            <>
              <button
                onClick={() => setEditKey(k)}
                className="flex h-8 items-center gap-1.5 rounded-lg border border-white/[0.06] px-2.5 text-[12px] text-zinc-500 transition hover:border-white/10 hover:text-zinc-300"
                title="Edit limits"
              >
                <Pencil className="size-3.5" />
                Edit limits
              </button>
              <button
                onClick={() => setRevokeKey(k)}
                className="flex h-8 items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/[0.07] px-2.5 text-[12px] text-red-400 transition hover:bg-red-500/10"
                title="Revoke"
              >
                <Trash2 className="size-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-8 py-8">

      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-zinc-50">API Keys</h1>
          <p className="mt-0.5 text-[13px] text-zinc-600">
            Create keys with custom per-key rate limits. Each key can have independent RPM, RPD, and token limits.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          disabled={isDemo}
          title={isDemo ? "Sign in to create API keys" : undefined}
          className="flex h-9 items-center gap-2 rounded-xl bg-gradient-to-b from-white to-zinc-100 px-4 text-[13px] font-medium text-zinc-900 shadow-[0_1px_0_1px_rgba(0,0,0,0.1)] transition hover:-translate-y-0.5 hover:shadow-[0_4px_16px_-4px_rgba(255,255,255,0.2)] disabled:pointer-events-none disabled:opacity-40"
        >
          <Plus className="size-4" />
          New Key
        </button>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        {[
          { label: "Total Keys",   value: keys.length,    icon: Key,         color: "text-zinc-400   bg-zinc-500/10" },
          { label: "Active Keys",  value: active.length,  icon: ShieldCheck, color: "text-emerald-400 bg-emerald-500/10" },
          { label: "Custom Limits", value: keys.filter(k => k.requests_per_minute != null || k.requests_per_day != null || k.max_tokens_per_request != null).length, icon: Zap, color: "text-violet-400 bg-violet-500/10" },
        ].map((c) => (
          <div key={c.label} className="flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <div className={"flex size-10 items-center justify-center rounded-xl " + c.color}>
              <c.icon className="size-5" />
            </div>
            <div>
              <p className="text-[26px] font-semibold tracking-[-0.04em] text-zinc-50">{c.value}</p>
              <p className="text-[12px] text-zinc-600">{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Keys table */}
      <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0c0c0e]">
        <div className="border-b border-white/[0.06] px-5 py-4">
          <p className="text-[13px] font-semibold text-zinc-200">All Keys</p>
          <p className="mt-0.5 text-[12px] text-zinc-600">Hover a row to edit limits or revoke.</p>
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-3 py-16">
            <Loader2 className="size-5 animate-spin text-zinc-600" />
            <span className="text-[13px] text-zinc-600">Loading keys…</span>
          </div>
        )}

        {!loading && keys.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-16">
            <div className="flex size-14 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.02]">
              <Key className="size-7 text-zinc-700" />
            </div>
            <div className="text-center">
              <p className="text-[14px] font-medium text-zinc-400">No API keys yet</p>
              <p className="mt-1 text-[13px] text-zinc-600">Create your first key to start making requests.</p>
            </div>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 rounded-xl bg-white/[0.06] px-4 py-2 text-[13px] text-zinc-300 transition hover:bg-white/[0.1]">
              <Plus className="size-4" />
              Create Key
            </button>
          </div>
        )}

        {!loading && active.length > 0 && active.map((k) => <KeyRow key={k.id} k={k} />)}

        {!loading && inactive.length > 0 && (
          <>
            <div className="border-t border-white/[0.04] px-5 py-2">
              <p className="text-[11px] font-medium uppercase tracking-widest text-zinc-700">Revoked</p>
            </div>
            {inactive.map((k) => <KeyRow key={k.id} k={k} />)}
          </>
        )}
      </div>

      {/* Usage hint */}
      {active.length > 0 && (
        <div className="mt-6 rounded-2xl border border-white/[0.06] bg-[#0c0c0e] p-5">
          <p className="mb-3 text-[12px] font-medium text-zinc-500">Usage example</p>
          <pre className="overflow-x-auto rounded-xl bg-black/40 px-4 py-3 font-mono text-[11px] text-zinc-400">
{`curl -X POST http://localhost:8000/v1/chat \\
  -H "X-API-Key: ${active[0]?.key_prefix}..." \\
  -H "Content-Type: application/json" \\
  -d '{"model":"claude-sonnet-4-20250514","messages":[{"role":"user","content":"Hello"}]}'`}
          </pre>
        </div>
      )}

      {/* Modals */}
      {showCreate && (
        <CreateKeyModal
          onClose={() => setShowCreate(false)}
          onCreate={handleCreated}
          tierRpm={tierRpm} tierRpd={tierRpd} tierMtr={tierMtr}
        />
      )}
      {newKey && <RevealKeyModal apiKey={newKey} onClose={() => setNewKey(null)} />}
      {editKey && (
        <EditLimitsModal
          apiKey={editKey}
          onClose={() => setEditKey(null)}
          onSave={handleSaved}
          tierRpm={tierRpm} tierRpd={tierRpd} tierMtr={tierMtr}
        />
      )}
      {revokeKey && <RevokeModal apiKey={revokeKey} onClose={() => setRevokeKey(null)} onRevoke={handleRevoked} />}
    </div>
  );
}
