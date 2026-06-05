"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowUp,
  Check,
  ChevronDown,
  Code2,
  Copy,
  Key,
  MessageSquare,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Settings2,
  Sparkles,
  Square,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import {
  listApiKeys,
  streamChat,
  type ApiKey,
  type ChatMessage,
  type ChatUsage,
} from "@/lib/api";
import { useDemo } from "@/lib/demo-context";
import { DEMO_KEYS } from "@/lib/demo-data";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  model: string;
  createdAt: number;
  updatedAt: number;
  systemPrompt: string;
}

// ─── Models ───────────────────────────────────────────────────────────────────

const MODELS = [
  { id: "claude-sonnet-4-20250514", label: "Claude Sonnet 4", provider: "Anthropic", gradient: "from-violet-500 to-purple-600" },
  { id: "claude-haiku-4-20250514", label: "Claude Haiku 4", provider: "Anthropic", gradient: "from-violet-400 to-fuchsia-500" },
  { id: "openai/gpt-4o", label: "GPT-4o", provider: "OpenAI", gradient: "from-emerald-400 to-teal-500" },
  { id: "openai/gpt-4.1-mini", label: "GPT-4.1 Mini", provider: "OpenAI", gradient: "from-green-400 to-emerald-500" },
  { id: "google/gemini-2.5-pro-preview", label: "Gemini 2.5 Pro", provider: "Google", gradient: "from-blue-400 to-cyan-500" },
  { id: "google/gemma-4-31b-it:free", label: "Gemma 4 31B", provider: "Google · Free", gradient: "from-sky-400 to-blue-500" },
  { id: "meta-llama/llama-4-maverick:free", label: "Llama 4 Maverick", provider: "Meta · Free", gradient: "from-orange-400 to-amber-500" },
  { id: "deepseek/deepseek-chat-v3-0324:free", label: "DeepSeek V3", provider: "DeepSeek · Free", gradient: "from-cyan-400 to-blue-500" },
  { id: "mistralai/mistral-large-latest", label: "Mistral Large", provider: "Mistral", gradient: "from-orange-500 to-red-500" },
];

const SYSTEM_PRESETS = [
  { label: "None", value: "", emoji: "✕" },
  { label: "Assistant", value: "You are a helpful, concise AI assistant.", emoji: "🤖" },
  { label: "Coder", value: "You are an expert software engineer. Write clean, production-quality code with clear explanations.", emoji: "💻" },
  { label: "Analyst", value: "You are a data analyst. Provide structured insights with tables and metrics.", emoji: "📊" },
  { label: "Writer", value: "You are a creative writer. Produce vivid, engaging prose.", emoji: "✍️" },
  { label: "Tutor", value: "You are a patient tutor. Break down complex topics step by step.", emoji: "📚" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const genId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

function useCopy() {
  const [copied, setCopied] = useState(false);
  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return { copied, copy };
}

// ─── Glass Card Component ─────────────────────────────────────────────────────

function GlassCard({
  children,
  className = "",
  glow,
  hover = false,
}: {
  children: React.ReactNode;
  className?: string;
  glow?: string;
  hover?: boolean;
}) {
  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl
        border border-white/[0.08]
        bg-gradient-to-br from-white/[0.04] to-white/[0.01]
        backdrop-blur-xl
        shadow-[0_8px_32px_-8px_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.05)]
        ${hover ? "transition-all duration-300 hover:border-white/[0.14] hover:shadow-[0_8px_40px_-8px_rgba(139,92,246,0.12),inset_0_1px_0_0_rgba(255,255,255,0.08)] hover:translate-y-[-1px]" : ""}
        ${className}
      `}
    >
      {/* Liquid glass refraction effect */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent" />
      {glow && (
        <div className={`pointer-events-none absolute -top-20 -right-20 size-40 rounded-full bg-gradient-to-br ${glow} opacity-[0.06] blur-3xl`} />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

// ─── Markdown Renderer ────────────────────────────────────────────────────────

function Prose({ content }: { content: string }) {
  const blocks = content.split(/(```[\s\S]*?```)/g);
  return (
    <div className="space-y-1">
      {blocks.map((block, i) => {
        if (block.startsWith("```")) {
          const lines = block.slice(3, -3).split("\n");
          const lang = lines[0]?.trim() || "";
          const code = (lang ? lines.slice(1) : lines).join("\n");
          return <CodeBlock key={i} code={code} lang={lang} />;
        }
        return <TextBlock key={i} text={block} />;
      })}
    </div>
  );
}

function TextBlock({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-3" />;
        if (line.startsWith("### ")) return <h4 key={i} className="mt-5 mb-2 text-[14px] font-semibold text-zinc-100">{inlineMd(line.slice(4))}</h4>;
        if (line.startsWith("## ")) return <h3 key={i} className="mt-6 mb-2 text-[15px] font-semibold text-zinc-50">{inlineMd(line.slice(3))}</h3>;
        if (line.startsWith("# ")) return <h2 key={i} className="mt-6 mb-3 text-[17px] font-bold text-white">{inlineMd(line.slice(2))}</h2>;
        if (line.match(/^\s*[-*]\s/)) return (
          <div key={i} className="flex gap-2.5 pl-1 py-0.5">
            <span className="mt-[9px] size-[5px] shrink-0 rounded-full bg-violet-400/60" />
            <span>{inlineMd(line.replace(/^\s*[-*]\s/, ""))}</span>
          </div>
        );
        if (line.match(/^\s*\d+\.\s/)) {
          const num = line.match(/^\s*(\d+)\./)?.[1];
          return (
            <div key={i} className="flex gap-2.5 pl-1 py-0.5">
              <span className="mt-px min-w-[18px] text-right font-mono text-[12px] text-violet-400/70">{num}.</span>
              <span>{inlineMd(line.replace(/^\s*\d+\.\s/, ""))}</span>
            </div>
          );
        }
        if (line.startsWith("> ")) return (
          <div key={i} className="my-2 border-l-[3px] border-violet-500/30 pl-4 italic text-zinc-400">
            {inlineMd(line.slice(2))}
          </div>
        );
        return <p key={i} className="py-0.5">{inlineMd(line)}</p>;
      })}
    </>
  );
}

function inlineMd(text: string): React.ReactNode {
  const segments: React.ReactNode[] = [];
  let rest = text;
  let k = 0;

  while (rest) {
    const m =
      rest.match(/^(.*?)`([^`]+)`/) ||
      rest.match(/^(.*?)\*\*(.+?)\*\*/) ||
      rest.match(/^(.*?)_(.+?)_/) ||
      rest.match(/^(.*?)\[([^\]]+)\]\(([^)]+)\)/);

    if (!m) { segments.push(rest); break; }

    if (m[0].includes("`")) {
      if (m[1]) segments.push(m[1]);
      segments.push(
        <code key={k++} className="rounded-md bg-white/[0.08] px-[6px] py-[2px] font-mono text-[12px] text-violet-300 border border-white/[0.06]">
          {m[2]}
        </code>
      );
    } else if (m[0].includes("**")) {
      if (m[1]) segments.push(m[1]);
      segments.push(<strong key={k++} className="font-semibold text-zinc-100">{m[2]}</strong>);
    } else if (m[0].includes("_")) {
      if (m[1]) segments.push(m[1]);
      segments.push(<em key={k++}>{m[2]}</em>);
    } else if (m[3]) {
      if (m[1]) segments.push(m[1]);
      segments.push(<a key={k++} href={m[3]} target="_blank" rel="noopener noreferrer" className="text-violet-400 underline decoration-violet-500/30 underline-offset-2 hover:decoration-violet-400 transition">{m[2]}</a>);
    }
    rest = rest.slice(m[0].length);
  }
  return <>{segments}</>;
}

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const { copied, copy } = useCopy();
  return (
    <GlassCard className="my-4" glow="from-violet-500 to-blue-500">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Code2 className="size-3.5 text-violet-400/70" />
          <span className="text-[11px] font-medium text-zinc-400">{lang || "code"}</span>
        </div>
        <button
          onClick={() => copy(code)}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] text-zinc-500 transition hover:bg-white/[0.08] hover:text-zinc-300"
        >
          {copied ? <><Check className="size-3 text-emerald-400" /> Copied</> : <><Copy className="size-3" /> Copy</>}
        </button>
      </div>
      <div className="overflow-x-auto">
        <pre className="p-4 text-[12.5px] leading-[1.75] text-zinc-300 font-mono"><code>{code}</code></pre>
      </div>
    </GlassCard>
  );
}

// ─── Message Row ──────────────────────────────────────────────────────────────

function MessageRow({
  msg,
  idx,
  streaming,
  isLast,
  onEdit,
  onRegenerate,
  onDelete,
}: {
  msg: ChatMessage;
  idx: number;
  streaming?: boolean;
  isLast?: boolean;
  onEdit?: (idx: number, text: string) => void;
  onRegenerate?: () => void;
  onDelete?: (idx: number) => void;
}) {
  const [hover, setHover] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(msg.content);
  const { copied, copy } = useCopy();
  const isUser = msg.role === "user";

  if (msg.role === "system") return null;

  return (
    <div
      className="group relative"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className={`mx-auto max-w-[780px] px-6 py-5 ${!isLast ? "" : ""}`}>
        {/* Message card for user / plain for assistant */}
        {isUser ? (
          // User message — glass pill
          <div className="flex justify-end">
            <div className="max-w-[85%]">
              <GlassCard className="px-5 py-3.5" glow="from-blue-500 to-violet-500">
                {editing ? (
                  <div>
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      className="w-full min-w-[300px] resize-none bg-transparent text-[14px] leading-relaxed text-zinc-100 focus:outline-none"
                      rows={Math.min(draft.split("\n").length + 1, 10)}
                      autoFocus
                    />
                    <div className="mt-3 flex gap-2 border-t border-white/[0.06] pt-3">
                      <button
                        onClick={() => { onEdit?.(idx, draft); setEditing(false); }}
                        className="rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-1.5 text-[12px] font-medium text-white shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 transition"
                      >
                        Save & Resubmit
                      </button>
                      <button
                        onClick={() => { setEditing(false); setDraft(msg.content); }}
                        className="rounded-lg px-3 py-1.5 text-[12px] text-zinc-400 hover:text-zinc-200 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-zinc-100">{msg.content}</p>
                )}
              </GlassCard>

              {/* User actions */}
              {!editing && hover && !streaming && (
                <div className="mt-2 flex justify-end gap-1">
                  <ActionBtn icon={copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />} onClick={() => copy(msg.content)} />
                  {onEdit && <ActionBtn icon={<Pencil className="size-3.5" />} onClick={() => setEditing(true)} />}
                  {onDelete && <ActionBtn icon={<Trash2 className="size-3.5" />} onClick={() => onDelete(idx)} danger />}
                </div>
              )}
            </div>
          </div>
        ) : (
          // Assistant message — open layout
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="relative">
                <div className="size-7 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                  <Sparkles className="size-3.5 text-white" />
                </div>
                {streaming && (
                  <div className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-violet-400 animate-pulse ring-2 ring-[#0d0d0f]" />
                )}
              </div>
              <span className="text-[12px] font-semibold text-zinc-300">Acheron</span>
              {streaming && <span className="text-[11px] text-violet-400/80 animate-pulse">thinking...</span>}
            </div>

            <div className="ml-[38px] text-[14px] leading-[1.8] text-zinc-300">
              <Prose content={msg.content} />
              {streaming && !msg.content && (
                <span className="inline-block h-[18px] w-[2px] animate-pulse rounded-full bg-violet-400" />
              )}
            </div>

            {/* Assistant actions */}
            {!streaming && hover && (
              <div className="ml-[38px] mt-3 flex gap-1">
                <ActionBtn icon={copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />} label={copied ? "Copied" : "Copy"} onClick={() => copy(msg.content)} />
                {isLast && onRegenerate && <ActionBtn icon={<RefreshCw className="size-3.5" />} label="Regenerate" onClick={onRegenerate} />}
                {onDelete && <ActionBtn icon={<Trash2 className="size-3.5" />} onClick={() => onDelete(idx)} danger />}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ActionBtn({ icon, label, onClick, danger }: { icon: React.ReactNode; label?: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-medium backdrop-blur-sm border border-white/[0.06] bg-white/[0.03] transition-all hover:bg-white/[0.08] hover:border-white/[0.12] ${danger ? "text-zinc-500 hover:text-red-400" : "text-zinc-500 hover:text-zinc-200"}`}
    >
      {icon}
      {label && <span>{label}</span>}
    </button>
  );
}

// ─── Composer ─────────────────────────────────────────────────────────────────

function Composer({
  value,
  onChange,
  onSend,
  onStop,
  streaming,
  disabled,
  model,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onStop: () => void;
  streaming: boolean;
  disabled: boolean;
  model: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const ta = ref.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 180) + "px";
  }, [value]);

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); }
  }

  const modelInfo = MODELS.find((m) => m.id === model);

  return (
    <div className="mx-auto w-full max-w-[780px] px-6 pb-6 pt-3">
      {/* Outer glow container */}
      <div className="relative group/composer">
        {/* Ambient glow */}
        <div className="absolute -inset-1 rounded-[20px] bg-gradient-to-r from-violet-600/20 via-indigo-600/10 to-blue-600/20 opacity-0 blur-xl transition-opacity duration-500 group-focus-within/composer:opacity-100" />

        {/* Glass composer */}
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.1] bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-2xl shadow-[0_8px_40px_-12px_rgba(0,0,0,0.5),inset_0_1px_0_0_rgba(255,255,255,0.06)] transition-all duration-300 focus-within:border-white/[0.18] focus-within:shadow-[0_8px_48px_-8px_rgba(139,92,246,0.15),inset_0_1px_0_0_rgba(255,255,255,0.1)]">
          {/* Inner refraction */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.04] via-transparent to-transparent" />
          <div className="pointer-events-none absolute top-0 left-1/4 w-1/2 h-px bg-gradient-to-r from-transparent via-white/[0.15] to-transparent" />

          <div className="relative z-10">
            {/* Textarea */}
            <textarea
              ref={ref}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={onKey}
              disabled={streaming}
              placeholder="Ask anything..."
              rows={1}
              className="w-full resize-none bg-transparent px-5 pt-4 pb-2 text-[14px] leading-relaxed text-zinc-100 placeholder:text-zinc-600 focus:outline-none disabled:opacity-50"
            />

            {/* Bottom toolbar */}
            <div className="flex items-center justify-between px-4 pb-3 pt-1">
              <div className="flex items-center gap-2">
                {/* Model indicator */}
                <div className="flex items-center gap-1.5 rounded-full bg-white/[0.05] border border-white/[0.06] px-2.5 py-1 backdrop-blur-sm">
                  <div className={`size-2 rounded-full bg-gradient-to-r ${modelInfo?.gradient ?? "from-gray-400 to-gray-500"}`} />
                  <span className="text-[11px] font-medium text-zinc-400">{modelInfo?.label ?? model}</span>
                </div>
              </div>

              {/* Send button */}
              {streaming ? (
                <button
                  onClick={onStop}
                  className="flex size-9 items-center justify-center rounded-xl bg-white/[0.08] border border-white/[0.1] text-zinc-300 backdrop-blur-sm transition-all hover:bg-white/[0.12] hover:scale-105 active:scale-95"
                >
                  <Square className="size-3.5 fill-current" />
                </button>
              ) : (
                <button
                  onClick={onSend}
                  disabled={disabled || !value.trim()}
                  className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-violet-500/40 hover:scale-105 active:scale-95 disabled:opacity-20 disabled:shadow-none disabled:scale-100"
                >
                  <ArrowUp className="size-4" strokeWidth={2.5} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Hints */}
      <div className="mt-2.5 flex items-center justify-center gap-3 text-[11px] text-zinc-700">
        <span><kbd className="rounded-md bg-white/[0.04] border border-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-zinc-500">↵</kbd> send</span>
        <span className="text-zinc-800">·</span>
        <span><kbd className="rounded-md bg-white/[0.04] border border-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-zinc-500">⇧↵</kbd> newline</span>
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  onRename,
  collapsed,
}: {
  conversations: Conversation[];
  activeId: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, t: string) => void;
  collapsed: boolean;
}) {
  const [editId, setEditId] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");

  if (collapsed) return null;

  const today = new Date().toDateString();
  const todayConvs = conversations.filter((c) => new Date(c.updatedAt).toDateString() === today);
  const olderConvs = conversations.filter((c) => new Date(c.updatedAt).toDateString() !== today);

  function renderGroup(label: string, items: Conversation[]) {
    if (!items.length) return null;
    return (
      <div className="mb-4">
        <p className="mb-2 px-4 text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-600">{label}</p>
        <div className="space-y-0.5 px-2">
          {items.map((c) => (
            <div
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={`group/c relative flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 transition-all duration-200 ${
                c.id === activeId
                  ? "bg-white/[0.08] text-zinc-100 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
                  : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300"
              }`}
            >
              {c.id === activeId && (
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-violet-500/[0.05] to-transparent pointer-events-none" />
              )}
              <MessageSquare className="size-3.5 shrink-0 relative z-10" />
              {editId === c.id ? (
                <input
                  value={editVal}
                  onChange={(e) => setEditVal(e.target.value)}
                  onBlur={() => { onRename(c.id, editVal); setEditId(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { onRename(c.id, editVal); setEditId(null); } }}
                  className="relative z-10 flex-1 bg-transparent text-[12px] text-zinc-200 focus:outline-none"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="relative z-10 flex-1 truncate text-[12px]">{c.title}</span>
              )}
              <div className="hidden items-center gap-0.5 group-hover/c:flex relative z-10">
                <button
                  onClick={(e) => { e.stopPropagation(); setEditId(c.id); setEditVal(c.title); }}
                  className="rounded-md p-1 hover:bg-white/[0.1] transition"
                ><Pencil className="size-3 text-zinc-500" /></button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(c.id); }}
                  className="rounded-md p-1 hover:bg-white/[0.1] transition"
                ><Trash2 className="size-3 text-zinc-500 hover:text-red-400" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-[260px] shrink-0 flex-col border-r border-white/[0.06] bg-[#08080a]/80 backdrop-blur-xl">
      {/* New chat */}
      <div className="p-3">
        <button
          onClick={onNew}
          className="group flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-gradient-to-r from-white/[0.04] to-white/[0.02] text-[12px] font-medium text-zinc-300 backdrop-blur-sm transition-all hover:border-white/[0.15] hover:from-white/[0.07] hover:to-white/[0.04] hover:text-white hover:shadow-[0_4px_20px_-4px_rgba(139,92,246,0.15)]"
        >
          <Plus className="size-4 transition-transform group-hover:rotate-90" /> New chat
        </button>
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto py-2">
        {renderGroup("Today", todayConvs)}
        {renderGroup("Earlier", olderConvs)}
        {conversations.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <div className="size-10 rounded-xl bg-white/[0.04] flex items-center justify-center">
              <MessageSquare className="size-5 text-zinc-700" />
            </div>
            <p className="text-[12px] text-zinc-700">No conversations yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Config Panel ─────────────────────────────────────────────────────────────

function ConfigPanel({
  open,
  systemPrompt,
  setSP,
  maxTokens,
  setMaxTok,
  temperature,
  setTemp,
}: {
  open: boolean;
  systemPrompt: string;
  setSP: (v: string) => void;
  maxTokens: number;
  setMaxTok: (v: number) => void;
  temperature: number;
  setTemp: (v: number) => void;
}) {
  if (!open) return null;

  return (
    <div className="w-[280px] shrink-0 border-l border-white/[0.06] bg-[#08080a]/80 backdrop-blur-xl overflow-y-auto">
      <div className="p-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <div className="size-7 rounded-lg bg-gradient-to-br from-violet-500/20 to-indigo-500/20 flex items-center justify-center border border-violet-500/20">
            <Settings2 className="size-3.5 text-violet-400" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-zinc-200">Configuration</p>
            <p className="text-[10px] text-zinc-600">Model parameters</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* System prompt */}
        <div>
          <label className="mb-2.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-zinc-500">System Prompt</label>
          <div className="mb-2.5 flex flex-wrap gap-1.5">
            {SYSTEM_PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => setSP(p.value)}
                className={`rounded-lg px-2.5 py-1.5 text-[11px] font-medium border backdrop-blur-sm transition-all ${
                  systemPrompt === p.value
                    ? "bg-violet-500/15 border-violet-500/30 text-violet-300 shadow-[0_0_12px_-4px_rgba(139,92,246,0.3)]"
                    : "bg-white/[0.03] border-white/[0.06] text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-300"
                }`}
              >
                {p.emoji} {p.label}
              </button>
            ))}
          </div>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSP(e.target.value)}
            rows={3}
            placeholder="Custom instructions..."
            className="w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-3 text-[12px] text-zinc-300 placeholder:text-zinc-700 backdrop-blur-sm transition focus:border-violet-500/30 focus:outline-none focus:shadow-[0_0_16px_-4px_rgba(139,92,246,0.15)]"
          />
        </div>

        {/* Max tokens */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <label className="text-[11px] font-bold uppercase tracking-[0.08em] text-zinc-500">Max Tokens</label>
            <GlassCard className="px-2.5 py-1">
              <span className="text-[12px] font-mono text-zinc-300">{maxTokens.toLocaleString()}</span>
            </GlassCard>
          </div>
          <input
            type="range" min={64} max={8192} step={64} value={maxTokens}
            onChange={(e) => setMaxTok(Number(e.target.value))}
            className="w-full accent-violet-500"
          />
          <div className="flex justify-between text-[10px] text-zinc-700 mt-1.5">
            <span>64</span><span>8,192</span>
          </div>
        </div>

        {/* Temperature */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <label className="text-[11px] font-bold uppercase tracking-[0.08em] text-zinc-500">Temperature</label>
            <GlassCard className="px-2.5 py-1">
              <span className="text-[12px] font-mono text-zinc-300">{temperature.toFixed(2)}</span>
            </GlassCard>
          </div>
          <input
            type="range" min={0} max={2} step={0.05} value={temperature}
            onChange={(e) => setTemp(Number(e.target.value))}
            className="w-full accent-violet-500"
          />
          <div className="flex justify-between text-[10px] text-zinc-700 mt-1.5">
            <span>🎯 Precise</span><span>🎨 Creative</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Model Picker ─────────────────────────────────────────────────────────────

function ModelPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");
  const [search, setSearch] = useState("");
  const current = MODELS.find((m) => m.id === value);

  const filtered = MODELS.filter(
    (m) => m.label.toLowerCase().includes(search.toLowerCase()) || m.provider.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-8 items-center gap-2.5 rounded-xl px-3 text-[13px] text-zinc-300 border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm transition-all hover:bg-white/[0.06] hover:border-white/[0.12]"
      >
        <div className={`size-2.5 rounded-full bg-gradient-to-r ${current?.gradient ?? "from-gray-400 to-gray-500"} shadow-sm`} />
        <span className="font-medium">{current?.label ?? value}</span>
        <ChevronDown className="size-3 text-zinc-500" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-11 z-50 w-[340px] overflow-hidden rounded-2xl border border-white/[0.1] bg-[#111114]/95 backdrop-blur-2xl shadow-[0_24px_64px_-12px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.04)]">
            {/* Refraction line */}
            <div className="absolute top-0 left-1/4 w-1/2 h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent" />

            {/* Search */}
            <div className="p-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2 rounded-xl bg-white/[0.04] border border-white/[0.06] px-3 py-2 backdrop-blur-sm">
                <Search className="size-3.5 text-zinc-600" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search models..."
                  className="flex-1 bg-transparent text-[12px] text-zinc-300 placeholder:text-zinc-600 focus:outline-none"
                  autoFocus
                />
              </div>
            </div>

            {/* Custom */}
            <div className="p-3 border-b border-white/[0.06]">
              <div className="flex gap-2">
                <input
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && custom.trim()) { onChange(custom.trim()); setCustom(""); setOpen(false); } }}
                  placeholder="Custom: provider/model"
                  className="flex-1 rounded-lg bg-white/[0.04] border border-white/[0.06] px-3 py-1.5 text-[12px] text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/30"
                />
                <button
                  onClick={() => { if (custom.trim()) { onChange(custom.trim()); setCustom(""); setOpen(false); } }}
                  disabled={!custom.trim()}
                  className="rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-1.5 text-[11px] font-medium text-white shadow-md shadow-violet-500/20 disabled:opacity-30 disabled:shadow-none transition"
                >
                  Use
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-[320px] overflow-y-auto py-1">
              {filtered.map((m) => (
                <button
                  key={m.id}
                  onClick={() => { onChange(m.id); setOpen(false); setSearch(""); }}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-all hover:bg-white/[0.04] ${value === m.id ? "bg-white/[0.05]" : ""}`}
                >
                  <div className={`size-4 rounded-full bg-gradient-to-br ${m.gradient} shadow-sm`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-zinc-200">{m.label}</p>
                    <p className="text-[11px] text-zinc-600">{m.provider}</p>
                  </div>
                  {value === m.id && (
                    <div className="size-5 rounded-full bg-violet-500/20 flex items-center justify-center">
                      <Check className="size-3 text-violet-400" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PlaygroundPage() {
  const [, setKeys] = useState<ApiKey[]>([]);
  const [, setKL] = useState(true);
  const [rawKey, setRawKey] = useState("");
  const isDemo = useDemo();

  const [model, setModel] = useState(MODELS[0].id);
  const [systemPrompt, setSP] = useState("");
  const [maxTokens, setMaxTok] = useState(2048);
  const [temperature, setTemp] = useState(0.7);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState("");
  const [showSidebar, setShowSidebar] = useState(true);
  const [showConfig, setShowConfig] = useState(false);

  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamBuf, setStreamBuf] = useState("");
  const [error, setError] = useState("");
  const [lastUsage, setLastUsage] = useState<ChatUsage | null>(null);

  const abortRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const activeConv = conversations.find((c) => c.id === activeConvId);
  const messages = activeConv?.messages ?? [];

  useEffect(() => {
    document.title = "Playground · Acheron";
    try {
      const saved = localStorage.getItem("pg_convos_v2");
      if (saved) {
        const parsed = JSON.parse(saved) as Conversation[];
        setConversations(parsed);
        if (parsed.length > 0) setActiveConvId(parsed[0].id);
      }
    } catch {}
    const savedKey = localStorage.getItem("pg_key");
    if (savedKey) setRawKey(savedKey);
    if (isDemo) {
      setKeys(DEMO_KEYS.filter((k) => k.is_active));
      setKL(false);
    } else {
      listApiKeys()
        .then((ks) => setKeys(ks.filter((k) => k.is_active)))
        .catch(() => {})
        .finally(() => setKL(false));
    }
  }, []);

  useEffect(() => {
    if (conversations.length) localStorage.setItem("pg_convos_v2", JSON.stringify(conversations));
  }, [conversations]);
  useEffect(() => { if (rawKey) localStorage.setItem("pg_key", rawKey); }, [rawKey]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, streamBuf]);

  function newConv() {
    const c: Conversation = { id: genId(), title: "New chat", messages: [], model, createdAt: Date.now(), updatedAt: Date.now(), systemPrompt };
    setConversations((p) => [c, ...p]);
    setActiveConvId(c.id);
    setError(""); setLastUsage(null);
  }
  function deleteConv(id: string) {
    setConversations((p) => { const n = p.filter((c) => c.id !== id); if (id === activeConvId) setActiveConvId(n[0]?.id ?? ""); return n; });
  }
  function renameConv(id: string, t: string) {
    setConversations((p) => p.map((c) => c.id === id ? { ...c, title: t || c.title } : c));
  }
  function updateMessages(convId: string, msgs: ChatMessage[]) {
    setConversations((p) => p.map((c) => c.id === convId ? { ...c, messages: msgs, updatedAt: Date.now() } : c));
  }

  async function handleSend() {
    if (isDemo) { setError("Please sign in to send messages. This is a view-only demo."); return; }
    const text = input.trim();
    if (!text || streaming) return;
    if (!rawKey.trim()) { setError("Enter your API key to start."); return; }
    setError(""); setInput("");

    let convId = activeConvId;
    if (!convId) {
      const c: Conversation = { id: genId(), title: text.slice(0, 40), messages: [], model, createdAt: Date.now(), updatedAt: Date.now(), systemPrompt };
      setConversations((p) => [c, ...p]);
      setActiveConvId(c.id); convId = c.id;
    }

    const currentMsgs = conversations.find((c) => c.id === convId)?.messages ?? [];
    const history: ChatMessage[] = [...currentMsgs, { role: "user", content: text }];
    updateMessages(convId, history);
    if (currentMsgs.length === 0) {
      setConversations((p) => p.map((c) => c.id === convId ? { ...c, title: text.slice(0, 40) + (text.length > 40 ? "…" : "") } : c));
    }

    const allMsgs: ChatMessage[] = systemPrompt.trim() ? [{ role: "system", content: systemPrompt }, ...history] : history;
    setStreaming(true); setStreamBuf(""); abortRef.current = false;
    let usage: ChatUsage | null = null; let full = "";

    await streamChat(rawKey.trim(), model, allMsgs, maxTokens, temperature,
      (d) => { if (!abortRef.current) { full += d; setStreamBuf(full); } },
      (u) => { usage = u; },
      (e) => { setError(e); },
    );

    if (!abortRef.current && full) updateMessages(convId, [...history, { role: "assistant", content: full }]);
    setStreamBuf(""); setStreaming(false);
    if (usage) setLastUsage(usage);
  }

  function handleStop() {
    abortRef.current = true; setStreaming(false);
    if (streamBuf && activeConvId) {
      const msgs = conversations.find((c) => c.id === activeConvId)?.messages ?? [];
      updateMessages(activeConvId, [...msgs, { role: "assistant", content: streamBuf }]);
    }
    setStreamBuf("");
  }

  function handleEdit(idx: number, text: string) {
    if (!activeConvId) return;
    const trimmed = messages.slice(0, idx);
    trimmed.push({ role: "user", content: text });
    updateMessages(activeConvId, trimmed);
    setTimeout(() => resend(trimmed), 50);
  }

  function handleRegenerate() {
    if (!activeConvId) return;
    const trimmed = messages.slice(0, -1);
    updateMessages(activeConvId, trimmed);
    setTimeout(() => resend(trimmed), 50);
  }

  async function resend(msgs: ChatMessage[]) {
    if (!rawKey.trim()) return;
    const allMsgs: ChatMessage[] = systemPrompt.trim() ? [{ role: "system", content: systemPrompt }, ...msgs] : msgs;
    setStreaming(true); setStreamBuf(""); abortRef.current = false;
    let usage: ChatUsage | null = null; let full = "";
    await streamChat(rawKey.trim(), model, allMsgs, maxTokens, temperature,
      (d) => { if (!abortRef.current) { full += d; setStreamBuf(full); } },
      (u) => { usage = u; },
      (e) => { setError(e); },
    );
    if (!abortRef.current && full && activeConvId) updateMessages(activeConvId, [...msgs, { role: "assistant", content: full }]);
    setStreamBuf(""); setStreaming(false);
    if (usage) setLastUsage(usage);
  }

  function handleDeleteMsg(idx: number) {
    if (!activeConvId) return;
    const u = [...messages]; u.splice(idx, 1);
    updateMessages(activeConvId, u);
  }

  function handleClear() {
    if (activeConvId) updateMessages(activeConvId, []);
    setStreamBuf(""); setError(""); setLastUsage(null);
  }

  const hasContent = messages.length > 0 || !!streamBuf;

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a0c]">
      {/* Background ambient effects */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-violet-600/[0.03] blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-indigo-600/[0.03] blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-blue-600/[0.02] blur-[150px]" />
      </div>

      {/* Sidebar */}
      <div className="relative z-10">
        <Sidebar
          conversations={conversations}
          activeId={activeConvId}
          onSelect={(id) => { setActiveConvId(id); setError(""); setLastUsage(null); }}
          onNew={newConv}
          onDelete={deleteConv}
          onRename={renameConv}
          collapsed={!showSidebar}
        />
      </div>

      {/* Main area */}
      <div className="relative z-10 flex flex-1 flex-col min-w-0">
        {/* Header bar */}
        <header className="flex h-13 items-center justify-between border-b border-white/[0.06] px-4 shrink-0 backdrop-blur-xl bg-[#0a0a0c]/60">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="flex size-8 items-center justify-center rounded-xl text-zinc-500 transition-all hover:bg-white/[0.06] hover:text-zinc-300 active:scale-95"
            >
              <MessageSquare className="size-4" />
            </button>
            <div className="h-5 w-px bg-white/[0.08]" />
            <ModelPicker value={model} onChange={setModel} />
          </div>

          <div className="flex items-center gap-1.5">
            {hasContent && (
              <button onClick={handleClear} className="flex size-8 items-center justify-center rounded-xl text-zinc-600 transition-all hover:bg-white/[0.06] hover:text-zinc-300 active:scale-95" title="Clear">
                <RotateCcw className="size-3.5" />
              </button>
            )}
            <button
              onClick={() => setShowConfig(!showConfig)}
              className={`flex size-8 items-center justify-center rounded-xl transition-all active:scale-95 ${showConfig ? "bg-violet-500/10 text-violet-400 shadow-[0_0_12px_-2px_rgba(139,92,246,0.2)]" : "text-zinc-600 hover:bg-white/[0.06] hover:text-zinc-300"}`}
              title="Config"
            >
              <Settings2 className="size-4" />
            </button>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex flex-1 flex-col min-w-0">
            {/* Error */}
            {error && (
              <div className="mx-auto max-w-[780px] w-full px-6 pt-4">
                <GlassCard className="flex items-center gap-3 px-4 py-3" glow="from-red-500 to-orange-500">
                  <AlertTriangle className="size-4 shrink-0 text-red-400" />
                  <span className="flex-1 text-[13px] text-red-300">{error}</span>
                  <button onClick={() => setError("")} className="text-red-400/60 hover:text-red-300 transition"><X className="size-4" /></button>
                </GlassCard>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto">
              {!hasContent ? (
                <div className="flex h-full flex-col items-center justify-center gap-6 px-6">
                  {/* Hero icon */}
                  <div className="relative">
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-violet-500 to-indigo-600 opacity-20 blur-2xl" />
                    <div className="relative size-16 rounded-3xl bg-gradient-to-br from-violet-500/20 to-indigo-600/20 flex items-center justify-center border border-violet-500/20 shadow-[0_8px_32px_-8px_rgba(139,92,246,0.3)]">
                      <Sparkles className="size-7 text-violet-300" />
                    </div>
                  </div>

                  <div className="text-center max-w-md">
                    <h2 className="text-[20px] font-semibold text-zinc-100 tracking-tight">
                      What can I help with?
                    </h2>
                    <p className="mt-2 text-[14px] text-zinc-500 leading-relaxed">
                      Start a conversation with any model through the Acheron gateway.
                    </p>
                  </div>

                  {/* Suggestion cards */}
                  <div className="grid grid-cols-2 gap-3 max-w-lg w-full mt-2">
                    {[
                      { text: "Write a Python script", icon: "🐍" },
                      { text: "Explain a concept", icon: "💡" },
                      { text: "Debug this error", icon: "🔧" },
                      { text: "Review my code", icon: "👁️" },
                    ].map((s) => (
                      <button
                        key={s.text}
                        onClick={() => setInput(s.text + " ")}
                        className="group/card relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.04] to-white/[0.01] px-4 py-4 text-left backdrop-blur-sm transition-all duration-300 hover:border-white/[0.14] hover:shadow-[0_8px_32px_-8px_rgba(139,92,246,0.1)] hover:translate-y-[-2px]"
                      >
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity" />
                        <span className="text-[18px]">{s.icon}</span>
                        <p className="mt-2 text-[13px] text-zinc-400 group-hover/card:text-zinc-200 transition-colors">{s.text}</p>
                      </button>
                    ))}
                  </div>

                  {/* Key input (when no key) */}
                  {!rawKey && (
                    <div className="w-full max-w-lg mt-4">
                      <GlassCard className="flex items-center gap-3 px-4 py-3" glow="from-amber-500 to-orange-500">
                        <Key className="size-4 text-amber-400" />
                        <input
                          type="password"
                          value={rawKey}
                          onChange={(e) => setRawKey(e.target.value)}
                          placeholder="Paste your API key to start (sk-live-…)"
                          className="flex-1 bg-transparent text-[13px] text-zinc-300 placeholder:text-amber-400/50 focus:outline-none"
                        />
                      </GlassCard>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-4">
                  {messages.map((m, i) => (
                    <MessageRow
                      key={i}
                      msg={m}
                      idx={i}
                      isLast={i === messages.length - 1 && !streaming}
                      onEdit={handleEdit}
                      onRegenerate={handleRegenerate}
                      onDelete={handleDeleteMsg}
                    />
                  ))}
                  {streaming && streamBuf && (
                    <MessageRow msg={{ role: "assistant", content: streamBuf }} idx={-1} streaming />
                  )}
                  {streaming && !streamBuf && (
                    <div className="mx-auto max-w-[780px] px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="size-7 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                            <Sparkles className="size-3.5 text-white" />
                          </div>
                          <div className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-violet-400 animate-pulse ring-2 ring-[#0a0a0c]" />
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            <span className="size-2 rounded-full bg-violet-400/80 animate-bounce [animation-delay:0ms]" />
                            <span className="size-2 rounded-full bg-violet-400/60 animate-bounce [animation-delay:150ms]" />
                            <span className="size-2 rounded-full bg-violet-400/40 animate-bounce [animation-delay:300ms]" />
                          </div>
                          <span className="text-[12px] text-zinc-600">Thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} className="h-4" />
                </div>
              )}
            </div>

            {/* Usage bar */}
            {lastUsage && !streaming && (
              <div className="mx-auto max-w-[780px] w-full px-6 pb-2">
                <GlassCard className="flex items-center gap-4 px-4 py-2.5">
                  <Zap className="size-3.5 text-violet-400/60" />
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="text-zinc-500">{lastUsage.prompt_tokens} <span className="text-zinc-700">in</span></span>
                    <div className="h-3 w-px bg-white/[0.06]" />
                    <span className="text-zinc-500">{lastUsage.completion_tokens} <span className="text-zinc-700">out</span></span>
                    <div className="h-3 w-px bg-white/[0.06]" />
                    <span className="text-zinc-400 font-medium">{lastUsage.total_tokens} total</span>
                  </div>
                </GlassCard>
              </div>
            )}

            {/* Key indicator (when set, during conversation) */}
            {rawKey && hasContent && (
              <div className="mx-auto max-w-[780px] w-full px-6 pb-1">
                <div className="flex items-center gap-2 px-2">
                  <div className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.4)]" />
                  <input
                    type="password"
                    value={rawKey}
                    onChange={(e) => setRawKey(e.target.value)}
                    className="flex-1 bg-transparent text-[11px] text-zinc-700 focus:outline-none focus:text-zinc-500"
                  />
                </div>
              </div>
            )}

            {/* Composer */}
            <Composer
              value={input}
              onChange={setInput}
              onSend={handleSend}
              onStop={handleStop}
              streaming={streaming}
              disabled={!rawKey.trim()}
              model={model}
            />
          </div>

          {/* Config panel */}
          <ConfigPanel
            open={showConfig}
            systemPrompt={systemPrompt}
            setSP={setSP}
            maxTokens={maxTokens}
            setMaxTok={setMaxTok}
            temperature={temperature}
            setTemp={setTemp}
          />
        </div>
      </div>
    </div>
  );
}
