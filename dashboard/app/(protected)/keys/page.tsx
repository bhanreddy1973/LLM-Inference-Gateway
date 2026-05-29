"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { keysApi, ApiError } from "@/lib/api";
import { formatDateTime, formatRelative } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardAction, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Copy, Trash2, Key, CheckCircle, Loader2, X } from "lucide-react";
import type { ApiKey } from "@/types/api";

export default function KeysPage() {
  const { data: keys = [], isLoading } = useSWR<ApiKey[]>("keys", () => keysApi.list());

  const [creating, setCreating]         = useState(false);
  const [keyName, setKeyName]           = useState("");
  const [newKey, setNewKey]             = useState<string | null>(null);
  const [copied, setCopied]             = useState(false);
  const [revoking, setRevoking]         = useState<string | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);
  const [error, setError]               = useState("");

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
    <div className="space-y-6 max-w-4xl">
      {/* New key banner */}
      {newKey && (
        <Card className="border-emerald-500/25 bg-emerald-500/6 animate-in zoom-in-95 duration-300">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 mt-0.5 shrink-0 text-emerald-400" />
              <div className="flex-1">
                <p className="text-sm font-semibold mb-2 text-emerald-400">
                  Key created — copy it now, it won&apos;t be shown again
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 rounded-lg text-xs font-mono break-all bg-black/35 text-violet-300 border border-violet-500/20">
                    {newKey}
                  </code>
                  <Button
                    variant={copied ? "outline" : "secondary"}
                    size="sm"
                    onClick={copyKey}
                    className={copied ? "border-emerald-500/30 text-emerald-400" : ""}
                  >
                    {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                </div>
              </div>
              <Button variant="ghost" size="icon-xs" onClick={() => setNewKey(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Create New Key</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="flex gap-3">
            <div className="relative flex-1">
              <Key
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-muted-foreground"
              />
              <Input
                type="text"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                placeholder="Key name (e.g. production, staging)"
                className="pl-10 h-9"
              />
            </div>
            <Button type="submit" disabled={creating || !keyName.trim()}>
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Create
            </Button>
          </form>
          {error && (
            <p className="mt-2 text-xs text-destructive">{error}</p>
          )}
        </CardContent>
      </Card>

      {/* Keys table */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm">Your Keys</CardTitle>
          <CardAction>
            <Badge variant="secondary" className="text-violet-300 bg-violet-500/12 border-violet-500/22">
              {keys.length} {keys.length === 1 ? "key" : "keys"}
            </Badge>
          </CardAction>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-lg" />
              ))}
            </div>
          ) : keys.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-3">
              <Key className="w-8 h-8 opacity-20 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No keys yet. Create one above.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {["Name", "Prefix", "Status", "Created", "Last Used", ""].map((h) => (
                    <TableHead key={h} className="text-[11px] uppercase tracking-wider text-muted-foreground">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((k: ApiKey) => (
                  <TableRow key={k.id} className="hover:bg-primary/4">
                    <TableCell className="font-medium text-foreground">{k.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono text-xs bg-violet-500/12 text-violet-300">
                        {k.key_prefix}…
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="h-auto text-xs font-semibold"
                        style={
                          k.is_active
                            ? { background: "rgba(52,211,153,0.1)", color: "#34d399", borderColor: "rgba(52,211,153,0.2)" }
                            : { background: "rgba(251,113,133,0.1)", color: "#fb7185", borderColor: "rgba(251,113,133,0.2)" }
                        }
                      >
                        {k.is_active ? "Active" : "Revoked"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDateTime(k.created_at)}</TableCell>
                    <TableCell className="text-muted-foreground">{k.last_used_at ? formatRelative(k.last_used_at) : "Never"}</TableCell>
                    <TableCell>
                      {k.is_active && (
                        confirmRevoke === k.id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Sure?</span>
                            <Button
                              variant="destructive"
                              size="xs"
                              onClick={() => handleRevoke(k.id)}
                            >
                              {revoking === k.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Revoke"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="xs"
                              onClick={() => setConfirmRevoke(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => setConfirmRevoke(k.id)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
