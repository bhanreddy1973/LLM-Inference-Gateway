"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Copy,
  Key,
  RotateCcw,
  Send,
  Settings2,
  Sparkles,
  StopCircle,
  Zap,
} from "lucide-react";
import Link from "next/link";
import {
  listApiKeys,
  streamChat,
  type ApiKey,
  type ChatMessage,
  type ChatUsage,
} from "@/lib/api";

// ─── Constants ────────────────────────────────────────────────────────────────

const MODELS = [
  {
    id: "claude-sonnet-4-20250514",
    label: "Claude Sonnet 4",
    desc: "Most intelligent — highest capability",
    badge: "Recommended",
    badgeColor: "text-violet-400 bg-violet-500/10 ring-1 ring-inset ring-violet-500/20",
  },
  {
    id: "claude-haiku-4-20250514",
    label: "Claude Haiku 4",
    desc: "Fast and cost-effective",
    badge: "Fast",
    badgeColor: "text-emerald-400 bg-emerald-500/10 ring-1 ring-inset ring-emerald-500/20",
  },
];

const SYSTEM_PRESETS = [
  { label: "None",              value: "" },
  { label: "Helpful assistant", value: "You are a helpful, concise AI assistant." },
  { label: "Code expert",       value: "You are an expert software engineer. Provide clean, well-commented code and explain your reasoning." },
  { label: "Data analyst",      value: "You are a data analyst. Respond with structured insights, use tables or bullet points where useful." },
];

// ─── useCopy hook ─────────────────────────────────────────────────────────────

function useCopy() {
  const [copied, setCopied] = useState(false);
  function copy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return { copied, copy };
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg, streaming = false }: { msg: ChatMessage; streaming?: boolean }) {
  const { copied, copy } = useCopy();
  const isUser = msg.role === "user";

  return (
    <div className={"group flex gap-3 " + (isUser ? "flex-row-reverse" : "")}>
      {/* Avatar */}
      <div
        className={
          "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold " +
          (isUser
            ? "bg-zinc-700 text-zinc-300"
            : "bg-gradient-to-br from-violet-500/20 to-blue-500/20 text-violet-400 ring-1 ring-violet-500/20")
        }
      >
        {isUser ? "U" : <Sparkles className="size-3.5" />}
      </div>

      {/* Bubble */}
      <div
        className={
          "relative max-w-[76%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed " +
          (isUser
            ? "bg-zinc-800 text-zinc-100"
            : "bg-[#111115] text-zinc-200 ring-1 ring-white/[0.06]")
        }
      >
        <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>

        {/* Streaming cursor */}
        {streaming && (
          <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse rounded-full bg-violet-400 align-middle" />
        )}

        {/* Copy button — visible on hover */}
        {!streaming && msg.content && (
          <button
            onClick={() => copy(msg.content)}
            className="absolute right-2 top-2 hidden rounded-lg p-1.5 text-zinc-600 transition hover:bg-white/[0.06] hover:text-zinc-400 group-hover:flex"
            title="Copy"
          >
            {copied
              ? <Check className="size-3.5 text-emerald-400" />
              : <Copy className="size-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Token usage bar ──────────────────────────────────────────────────────────

function UsageBar({ usage }: { usage: ChatUsage }) {
  const total = usage.total_tokens;
  const inPct = total > 0 ? Math.round((usage.prompt_tokens / total) * 100) : 50;
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-2.5">
      <Zap className="size-3.5 shrink-0 text-zinc-600" />
      <div className="flex flex-1 items-center gap-2 text-[11px] text-zinc-600">
        <span className="text-zinc-500">{usage.prompt_tokens} in</span>
        <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-800">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-violet-500/60"
            style={{ width: inPct + "%" }}
          />
        </div>
        <span className="text-zinc-500">{usage.completion_tokens} out</span>
        <span className="ml-1 rounded-full bg-white/[0.04] px-2 py-0.5 text-zinc-500">
          {usage.total_tokens} total
        </span>
      </div>
    </div>
  );
}

// ─── Model selector dropdown ──────────────────────────────────────────────────

function ModelDropdown({
  value,
  onChange,
  open,
  setOpen,
}: {
  value: string;
  onChange: (id: string) => void;
  open: boolean;
  setOpen: (v: boolean) => void;
}) {
  const selected = MODELS.find((m) => m.id === value) ?? MODELS[0];
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-9 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-[13px] text-zinc-300 transition hover:border-white/20 hover:bg-white/[0.06]"
      >
        <Sparkles className="size-3.5 text-violet-400" />
        <span className="font-medium">{selected.label}</span>
        <span className={"rounded-full px-1.5 py-0.5 text-[10px] font-medium " + selected.badgeColor}>
          {selected.badge}
        </span>
        <ChevronDown className="size-3.5 text-zinc-600" />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-11 z-50 w-72 overflow-hidden rounded-xl border border-white/10 bg-[#111113] shadow-[0_16px_40px_-8px_rgba(0,0,0,0.7)]">
            {MODELS.map((m) => (
              <button
                key={m.id}
                onClick={() => { onChange(m.id); setOpen(false); }}
                className={
                  "flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-white/[0.04] " +
                  (value === m.id ? "bg-white/[0.04]" : "")
                }
              >
                <div className="mt-0.5 flex size-7 items-center justify-center rounded-lg bg-violet-500/10">
                  <Sparkles className="size-3.5 text-violet-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-zinc-200">{m.label}</span>
                    <span className={"rounded-full px-1.5 py-0.5 text-[10px] font-medium " + m.badgeColor}>
                      {m.badge}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-zinc-600">{m.desc}</p>
                </div>
                {value === m.id && <Check className="mt-1 size-3.5 shrink-0 text-violet-400" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Settings panel ───────────────────────────────────────────────────────────

function SettingsPanel({
  systemPrompt,
  setSP,
  maxTokens,
  setMaxTok,
  temperature,
  setTemp,
}: {
  systemPrompt: string;
  setSP: (v: string) => void;
  maxTokens: number;
  setMaxTok: (v: number) => void;
  temperature: number;
  setTemp: (v: number) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0c0c0e] p-5">
      <div className="mb-4 flex items-center gap-2">
        <Settings2 className="size-4 text-zinc-600" />
        <p className="text-[13px] font-semibold text-zinc-300">Parameters</p>
      </div>

      {/* System prompt */}
      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <label className="text-[12px] font-medium text-zinc-500">System prompt</label>
          <div className="flex gap-1">
            {SYSTEM_PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => setSP(p.value)}
                className={
                  "rounded-lg px-2 py-0.5 text-[11px] transition " +
                  (systemPrompt === p.value
                    ? "bg-white/[0.08] text-zinc-300"
                    : "text-zinc-600 hover:text-zinc-400")
                }
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <textarea
          value={systemPrompt}
          onChange={(e) => setSP(e.target.value)}
          rows={3}
          placeholder="Optional system instructions…"
          className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-[12px] text-zinc-300 placeholder:text-zinc-700 transition focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/10"
        />
      </div>

      {/* Max tokens */}
      <div className="mb-4">
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-[12px] font-medium text-zinc-500">Max tokens</label>
          <span className="rounded-lg bg-white/[0.04] px-2 py-0.5 text-[12px] font-mono text-zinc-400">
            {maxTokens}
          </span>
        </div>
        <input
          type="range"
          min={64}
          max={4096}
          step={64}
          value={maxTokens}
          onChange={(e) => setMaxTok(Number(e.target.value))}
          className="w-full accent-violet-500"
        />
        <div className="mt-1 flex justify-between text-[10px] text-zinc-700">
          <span>64</span><span>4096</span>
        </div>
      </div>

      {/* Temperature */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-[12px] font-medium text-zinc-500">Temperature</label>
          <span className="rounded-lg bg-white/[0.04] px-2 py-0.5 text-[12px] font-mono text-zinc-400">
            {temperature.toFixed(1)}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={2}
          step={0.1}
          value={temperature}
          onChange={(e) => setTemp(Number(e.target.value))}
          className="w-full accent-violet-500"
        />
        <div className="mt-1 flex justify-between text-[10px] text-zinc-700">
          <span>Precise (0)</span><span>Creative (2)</span>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PlaygroundPage() {
  // Keys
  const [keys, setKeys]           = useState<ApiKey[]>([]);
  const [keysLoading, setKL]      = useState(true);
  const [, setKey]                = useState("");

  // Model + params
  const [model, setModel]         = useState(MODELS[0].id);
  const [systemPrompt, setSP]     = useState("");
  const [maxTokens, setMaxTok]    = useState(1024);
  const [temperature, setTemp]    = useState(0.7);
  const [showSettings, setShowS]  = useState(false);
  const [showModelDrop, setShowM] = useState(false);

  // Conversation
  const [messages, setMessages]   = useState<ChatMessage[]>([]);
  const [input, setInput]         = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamBuf, setStreamBuf] = useState("");
  const [lastUsage, setUsage]     = useState<ChatUsage | null>(null);
  const [error, setError]         = useState("");

  const abortRef  = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const taRef     = useRef<HTMLTextAreaElement>(null);

  // Load active keys
  // Set page title
  useEffect(() => { document.title = "Playground · Acheron"; }, []);

  useEffect(() => {
    listApiKeys()
      .then((ks) => {
        const active = ks.filter((k) => k.is_active);
        setKeys(active);
        if (active.length > 0) setKey(active[0].id);
      })
      .catch(() => {})
      .finally(() => setKL(false));
  }, []);

  // Scroll to bottom on new messages / stream
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamBuf]);

  // Auto-grow textarea
  function growTA() {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }



  // raw key state — user can paste their actual sk-live-xxx key
  const [rawKey, setRawKey] = useState("");

  async function handleSend() {
    const text = input.trim();
    if (!text || streaming) return;

    const keyToUse = rawKey.trim();
    if (!keyToUse) {
      setError("Paste your API key below before sending.");
      return;
    }

    setError("");
    setInput("");
    if (taRef.current) taRef.current.style.height = "auto";

    // Build message list including optional system prompt
    const newUserMsg: ChatMessage = { role: "user", content: text };
    const history: ChatMessage[] = [...messages, newUserMsg];
    setMessages(history);

    const allMsgs: ChatMessage[] = systemPrompt.trim()
      ? [{ role: "system", content: systemPrompt.trim() }, ...history]
      : history;

    setStreaming(true);
    setStreamBuf("");
    abortRef.current = false;
    let finalUsage: ChatUsage | null = null;
    let fullText = "";

    await streamChat(
      keyToUse,
      model,
      allMsgs,
      maxTokens,
      temperature,
      (delta) => {
        if (abortRef.current) return;
        fullText += delta;
        setStreamBuf(fullText);
      },
      (usage) => {
        finalUsage = usage;
      },
      (msg) => {
        setError(msg);
      },
    );

    if (!abortRef.current && fullText) {
      setMessages((prev) => [...prev, { role: "assistant", content: fullText }]);
    }
    setStreamBuf("");
    setStreaming(false);
    if (finalUsage) setUsage(finalUsage);
  }

  function handleStop() {
    abortRef.current = true;
    setStreaming(false);
    if (streamBuf) {
      setMessages((prev) => [...prev, { role: "assistant", content: streamBuf + " [stopped]" }]);
    }
    setStreamBuf("");
  }

  function handleClear() {
    setMessages([]);
    setStreamBuf("");
    setUsage(null);
    setError("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const selectedModel = MODELS.find((m) => m.id === model) ?? MODELS[0];
  const hasMessages   = messages.length > 0 || !!streamBuf;

  return (
    <div className="flex min-h-screen flex-col px-8 py-8">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-zinc-50">Playground</h1>
          <p className="mt-0.5 text-[13px] text-zinc-600">
            Test models live using your API key.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Model selector */}
          <ModelDropdown
            value={model}
            onChange={setModel}
            open={showModelDrop}
            setOpen={setShowM}
          />
          {/* Settings toggle */}
          <button
            onClick={() => setShowS(!showSettings)}
            className={
              "flex h-9 items-center gap-2 rounded-xl border px-3 text-[13px] transition " +
              (showSettings
                ? "border-violet-500/30 bg-violet-500/10 text-violet-400"
                : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-zinc-200")
            }
          >
            <Settings2 className="size-3.5" />
            Parameters
          </button>
          {/* Clear */}
          {hasMessages && (
            <button
              onClick={handleClear}
              className="flex h-9 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-[13px] text-zinc-500 transition hover:border-white/20 hover:text-zinc-300"
            >
              <RotateCcw className="size-3.5" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Main layout ──────────────────────────────────────────────────── */}
      <div className={"grid flex-1 gap-4 " + (showSettings ? "grid-cols-[1fr_300px]" : "grid-cols-1")}>

        {/* ── Chat column ──────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">

          {/* No key warning */}
          {!keysLoading && keys.length === 0 && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.07] px-4 py-3.5">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-400" />
              <div className="text-[13px]">
                <span className="font-medium text-amber-300">No active API keys found.</span>
                <span className="ml-1 text-amber-400/70">
                  <Link href="/dashboard/keys" className="underline hover:text-amber-200">Create a key</Link>
                  {" "}then paste it in the field below.
                </span>
              </div>
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-[13px] text-red-400">
              <AlertTriangle className="size-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Chat window */}
          <div className="flex-1 overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0c0c0e]">

            {/* Messages area */}
            <div className="h-[calc(100vh-400px)] min-h-[300px] overflow-y-auto p-5">
              {!hasMessages ? (
                /* Welcome state */
                <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 ring-1 ring-violet-500/20">
                    <Sparkles className="size-7 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-[15px] font-medium text-zinc-300">
                      Chat with {selectedModel.label}
                    </p>
                    <p className="mt-1 text-[13px] text-zinc-600">
                      {selectedModel.desc}
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    {["Explain async/await in Python", "Write a SQL query", "Summarise this in 3 bullets"].map((s) => (
                      <button
                        key={s}
                        onClick={() => setInput(s)}
                        className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2 text-[12px] text-zinc-500 transition hover:border-white/10 hover:text-zinc-300"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  {messages.map((m, i) => (
                    <MessageBubble key={i} msg={m} />
                  ))}
                  {/* Streaming assistant bubble */}
                  {streaming && streamBuf && (
                    <MessageBubble
                      msg={{ role: "assistant", content: streamBuf }}
                      streaming
                    />
                  )}
                  {/* Streaming indicator (before first token) */}
                  {streaming && !streamBuf && (
                    <div className="flex gap-3">
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/20 to-blue-500/20 ring-1 ring-violet-500/20">
                        <Sparkles className="size-3.5 text-violet-400" />
                      </div>
                      <div className="flex items-center gap-1.5 rounded-2xl bg-[#111115] px-4 py-3 ring-1 ring-white/[0.06]">
                        <span className="size-1.5 animate-bounce rounded-full bg-zinc-600 [animation-delay:0ms]" />
                        <span className="size-1.5 animate-bounce rounded-full bg-zinc-600 [animation-delay:150ms]" />
                        <span className="size-1.5 animate-bounce rounded-full bg-zinc-600 [animation-delay:300ms]" />
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>
              )}
            </div>

            {/* Token usage bar */}
            {lastUsage && !streaming && (
              <div className="border-t border-white/[0.04] px-5 py-3">
                <UsageBar usage={lastUsage} />
              </div>
            )}

            {/* Input area */}
            <div className="border-t border-white/[0.06] p-4">
              {/* API key input */}
              <div className="mb-3 flex items-center gap-2 rounded-xl border border-white/[0.06] bg-black/20 px-3.5 py-2.5">
                <Key className="size-3.5 shrink-0 text-zinc-700" />
                <input
                  type="password"
                  value={rawKey}
                  onChange={(e) => setRawKey(e.target.value)}
                  placeholder="Paste your API key  (sk-live-…)"
                  className="flex-1 bg-transparent text-[12px] text-zinc-400 placeholder:text-zinc-700 focus:outline-none"
                />
                {rawKey && (
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
                    Key set
                  </span>
                )}
              </div>

              {/* Message input row */}
              <div className="flex items-end gap-2">
                <textarea
                  ref={taRef}
                  value={input}
                  onChange={(e) => { setInput(e.target.value); growTA(); }}
                  onKeyDown={handleKeyDown}
                  placeholder="Send a message…  (Enter to send, Shift+Enter for newline)"
                  rows={1}
                  disabled={streaming}
                  className="flex-1 resize-none rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[13px] text-zinc-200 placeholder:text-zinc-700 transition focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/10 disabled:opacity-40"
                />
                {streaming ? (
                  <button
                    onClick={handleStop}
                    className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-400 ring-1 ring-red-500/20 transition hover:bg-red-500/20"
                    title="Stop"
                  >
                    <StopCircle className="size-5" />
                  </button>
                ) : (
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || !rawKey.trim()}
                    className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-white to-zinc-100 text-zinc-900 shadow-[0_1px_0_1px_rgba(0,0,0,0.1)] transition hover:-translate-y-0.5 hover:shadow-[0_4px_16px_-4px_rgba(255,255,255,0.2)] disabled:pointer-events-none disabled:opacity-30"
                    title="Send (Enter)"
                  >
                    <Send className="size-4" />
                  </button>
                )}
              </div>
              <p className="mt-2 text-center text-[11px] text-zinc-700">
                Model: <span className="text-zinc-600">{selectedModel.label}</span>
                {" · "}Max tokens: <span className="text-zinc-600">{maxTokens}</span>
                {" · "}Temp: <span className="text-zinc-600">{temperature.toFixed(1)}</span>
              </p>
            </div>
          </div>
        </div>

        {/* ── Settings column ──────────────────────────────────────────── */}
        {showSettings && (
          <div className="flex flex-col gap-4">
            <SettingsPanel
              systemPrompt={systemPrompt}
              setSP={setSP}
              maxTokens={maxTokens}
              setMaxTok={setMaxTok}
              temperature={temperature}
              setTemp={setTemp}
            />

            {/* Active keys list (display only) */}
            {keys.length > 0 && (
              <div className="rounded-2xl border border-white/[0.06] bg-[#0c0c0e] p-5">
                <div className="mb-3 flex items-center gap-2">
                  <Key className="size-4 text-zinc-600" />
                  <p className="text-[13px] font-semibold text-zinc-300">Your keys</p>
                </div>
                <p className="mb-3 text-[12px] text-zinc-600">
                  Copy a key prefix and paste the full key above.
                </p>
                <div className="flex flex-col gap-1">
                  {keys.slice(0, 5).map((k) => (
                    <div key={k.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5">
                      <span className="size-1.5 rounded-full bg-emerald-400" />
                      <span className="flex-1 truncate font-mono text-[11px] text-zinc-500">
                        {k.name || k.key_prefix}
                      </span>
                    </div>
                  ))}
                </div>
                <Link
                  href="/dashboard/keys"
                  className="mt-3 flex items-center justify-center gap-1.5 rounded-xl border border-white/[0.06] py-2 text-[12px] text-zinc-600 transition hover:border-white/10 hover:text-zinc-400"
                >
                  <Key className="size-3.5" />
                  Manage keys
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
