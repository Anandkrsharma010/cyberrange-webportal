"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { BellRing, CheckCheck, ExternalLink, Loader2, User, Shield, AlertTriangle, AlertCircle, Info } from "lucide-react"

import { api, type OpsFeedEscalation, type OpsFeedRow, type OpsFeedSeverity, type AdminUser } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { withFromFeedParam } from "@/lib/ops-feed-nav"
import { showToast } from "@/components/toast"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type ReadFilter = "all" | "unread" | "read"

function formatTs(value?: string | null) {
  if (!value) return "-"
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

export default function AdminOperationsFeedPage() {
  const { user } = useAuth()
  const [rows, setRows] = useState<OpsFeedRow[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)
  const [severity, setSeverity] = useState<OpsFeedSeverity | "all">("all")
  const [readFilter, setReadFilter] = useState<ReadFilter>("unread")
  const [query, setQuery] = useState("")

  const load = async () => {
    setLoading(true)
    try {
      const [feedOut, usersOut] = await Promise.all([
        api.listOpsFeed({
          severity: severity === "all" ? undefined : severity,
          is_read: readFilter === "all" ? undefined : readFilter === "read",
          q: query || undefined,
          limit: 200,
        }),
        api.listUsers().catch(() => ({ users: [] }))
      ])
      setRows(feedOut.rows)
      setUsers(usersOut.users)
    } catch (err: unknown) {
      showToast("error", err instanceof Error ? err.message : "Failed to load operations feed")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [severity, readFilter])

  const unreadCount = useMemo(() => rows.filter((r) => !r.is_read).length, [rows])

  const handleSearch = async () => {
    await load()
  }

  const handleMarkRead = async (id: string) => {
    try {
      await api.markOpsFeedRead(id)
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, is_read: true } : r)))
      showToast("success", "Marked as read")
    } catch (err: unknown) {
      showToast("error", err instanceof Error ? err.message : "Failed to mark as read")
    }
  }

  const handleMarkAll = async () => {
    setMarkingAll(true)
    try {
      const out = await api.markAllOpsFeedRead()
      showToast("success", `Marked ${out.updated} item(s) as read.`)
      setRows((prev) => prev.map((r) => ({ ...r, is_read: true })))
    } catch (err: unknown) {
      showToast("error", err instanceof Error ? err.message : "Failed to mark all read")
    } finally {
      setMarkingAll(false)
    }
  }

  const handleAcknowledge = async (id: string) => {
    try {
      await api.acknowledgeOpsFeedItem(id)
      const now = new Date().toISOString()
      const uid = user?.id
      setRows((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                acknowledged_at: now,
                acknowledged_by: uid ?? r.acknowledged_by,
              }
            : r,
        ),
      )
      showToast("success", "Acknowledged")
    } catch (err: unknown) {
      showToast("error", err instanceof Error ? err.message : "Failed to acknowledge")
    }
  }

  const handleEscalation = async (id: string, escalation: OpsFeedEscalation) => {
    try {
      await api.patchOpsFeedWorkflow(id, { escalation })
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, escalation } : r)))
      showToast("success", `Escalation set to ${escalation}`)
    } catch (err: unknown) {
      showToast("error", err instanceof Error ? err.message : "Failed to update escalation")
    }
  }

  const handleAssignSelect = async (id: string, assigneeId: string) => {
    const nextVal = assigneeId === "unassigned" ? null : assigneeId
    try {
      await api.patchOpsFeedWorkflow(id, {
        assigned_to_user_id: nextVal,
      })
      setRows((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, assigned_to_user_id: nextVal } : r
        )
      )
      showToast("success", nextVal ? "Assignee updated" : "Assignee cleared")
    } catch (err: unknown) {
      showToast("error", err instanceof Error ? err.message : "Failed to assign")
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Glassmorphic Hero Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-white/[0.05] via-white/[0.02] to-white/[0.05] p-8 backdrop-blur-xl shadow-2xl">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-[100px] pointer-events-none animate-pulse" />
        <div className="relative z-10 space-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 font-mono text-xs text-emerald-400 font-bold shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)]">
            <BellRing className="w-3.5 h-3.5" /> Operations Feed Console
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Security & Audit Log</h1>
          <p className="text-slate-400 text-sm max-w-3xl leading-relaxed font-light">
            Sys-admin inbox for deployments, cohort actions, billing events, and system signals. 
            Review, acknowledge, escalate, or assign issues to administrators.
          </p>
        </div>
      </section>

      {/* Main Inbox Container */}
      <Card className="border-white/10 bg-white/[0.02] backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden">
        <CardHeader className="space-y-5 border-b border-white/10 px-6 py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base flex items-center gap-2 text-white font-bold">
              <BellRing className="h-4 w-4 text-emerald-400" />
              Inbox Feed
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-white/10 text-slate-300">Total {rows.length}</Badge>
              <Badge className={unreadCount > 0 ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400" : "border-white/10 text-slate-300"}>
                Unread {unreadCount}
              </Badge>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-400 font-light">Filter and triage; deep links open the relevant billing or deployment pages.</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={markingAll || unreadCount === 0}
              onClick={() => void handleMarkAll()}
              className="border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
            >
              {markingAll ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCheck className="mr-2 h-4 w-4 text-emerald-400" />
              )}
              Mark all read
            </Button>
          </div>
          
          {/* Unified Filter Controls */}
          <div className="grid gap-4 rounded-2xl border border-white/10 bg-black/40 p-4 md:grid-cols-[180px_180px_minmax(0,1fr)_120px]">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Severity</Label>
              <Select value={severity} onValueChange={(v) => setSeverity(v as OpsFeedSeverity | "all")}>
                <SelectTrigger className="h-10 border-white/10 bg-white/5 text-slate-200 rounded-xl focus:ring-emerald-500/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10 text-slate-200">
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Read state</Label>
              <Select value={readFilter} onValueChange={(v) => setReadFilter(v as ReadFilter)}>
                <SelectTrigger className="h-10 border-white/10 bg-white/5 text-slate-200 rounded-xl focus:ring-emerald-500/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10 text-slate-200">
                  <SelectItem value="unread">Unread</SelectItem>
                  <SelectItem value="read">Read</SelectItem>
                  <SelectItem value="all">All Events</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Search</Label>
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleSearch()
                }}
                placeholder="Title, message, actor, subject..."
                className="h-10 border-white/10 bg-white/5 text-white placeholder-slate-500 rounded-xl focus:ring-emerald-500/20"
              />
            </div>
            
            <div className="flex items-end">
              <Button type="button" className="w-full h-10 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-500/10" onClick={() => void handleSearch()}>
                Apply
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
              <p className="text-xs text-slate-400">Loading operations feed...</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="px-6 py-16 text-center space-y-2">
              <p className="text-sm font-semibold text-white">No feed items for current filters.</p>
              <p className="text-xs text-slate-400">
                Try resetting severity, selecting `All Events` read state, or clearing your query.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-white/[0.02] border-b border-white/10">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-slate-300 font-bold text-xs py-3.5">When</TableHead>
                    <TableHead className="text-slate-300 font-bold text-xs py-3.5">Severity</TableHead>
                    <TableHead className="text-slate-300 font-bold text-xs py-3.5">Event</TableHead>
                    <TableHead className="text-slate-300 font-bold text-xs py-3.5">Actor</TableHead>
                    <TableHead className="text-slate-300 font-bold text-xs py-3.5">Details</TableHead>
                    <TableHead className="text-slate-300 font-bold text-xs py-3.5 min-w-[200px]">Workflow</TableHead>
                    <TableHead className="text-slate-300 font-bold text-xs py-3.5 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => {
                    const isUnread = !r.is_read
                    return (
                      <TableRow key={r.id} className={`border-b border-white/5 hover:bg-white/[0.02] transition-colors ${isUnread ? "bg-emerald-500/[0.02]" : ""}`}>
                        <TableCell className="whitespace-nowrap text-xs text-slate-400 font-mono">
                          {formatTs(r.created_at)}
                        </TableCell>
                        <TableCell>
                          {r.severity === "critical" ? (
                            <Badge variant="destructive" className="capitalize bg-red-500/10 border border-red-500/35 text-red-400 hover:bg-red-500/20">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              {r.severity}
                            </Badge>
                          ) : r.severity === "warning" ? (
                            <Badge variant="secondary" className="capitalize bg-amber-500/10 border border-amber-500/35 text-amber-400 hover:bg-amber-500/20">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              {r.severity}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="capitalize border-white/10 text-slate-400 bg-white/5 hover:bg-white/10">
                              <Info className="w-3 h-3 mr-1" />
                              {r.severity}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-bold text-slate-200 text-sm leading-snug">{r.title}</div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">{r.event_type}</div>
                        </TableCell>
                        <TableCell className="text-xs text-slate-400">
                          {r.actor_email || r.actor_user_id || "-"}
                        </TableCell>
                        <TableCell className="max-w-[360px]">
                          <p className="line-clamp-2 text-sm text-slate-300 leading-relaxed">{r.message}</p>
                          {(r.subject_type || r.subject_id) && (
                            <p className="mt-1 text-[10px] text-slate-500 font-mono">
                              {r.subject_type || "subject"}: {r.subject_id || "-"}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="align-middle text-xs">
                          <div className="flex flex-col gap-2.5 py-1">
                            <div className="flex flex-wrap items-center gap-2">
                              {r.acknowledged_at ? (
                                <Badge className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[10px]">
                                  ACKNOWLEDGED
                                </Badge>
                              ) : (
                                <Button
                                  type="button"
                                  size="sm"
                                  className="h-7 text-[10px] bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-2.5 rounded-lg shadow-sm"
                                  onClick={() => void handleAcknowledge(r.id)}
                                >
                                  Acknowledge
                                </Button>
                              )}
                              <Select
                                value={(r.escalation as OpsFeedEscalation) || "none"}
                                onValueChange={(v) => void handleEscalation(r.id, v as OpsFeedEscalation)}
                              >
                                <SelectTrigger className="h-7 w-[100px] text-[10px] border-white/10 bg-white/5 text-slate-300 rounded-lg">
                                  <SelectValue placeholder="Escalation" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-white/10 text-slate-200">
                                  <SelectItem value="none">Normal Priority</SelectItem>
                                  <SelectItem value="watch">Watch</SelectItem>
                                  <SelectItem value="urgent">Urgent</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            {/* Dynamically Populated Assignee Select */}
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-slate-500 font-mono">Assignee:</span>
                              <Select
                                value={r.assigned_to_user_id || "unassigned"}
                                onValueChange={(v) => void handleAssignSelect(r.id, v)}
                              >
                                <SelectTrigger className="h-7 w-[160px] text-[10px] border-white/10 bg-white/5 text-slate-300 rounded-lg">
                                  <SelectValue placeholder="Assignee" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-white/10 text-slate-200">
                                  <SelectItem value="unassigned">Unassigned</SelectItem>
                                  {users.map((u) => (
                                    <SelectItem key={u.user_id} value={u.user_id}>
                                      {u.email} ({u.role === "sys_admin" ? "Admin" : "Operator"})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1.5">
                            {isUnread && (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => void handleMarkRead(r.id)}
                                className="h-8 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 text-xs px-2.5 rounded-lg"
                              >
                                Mark read
                              </Button>
                            )}
                            {r.deep_link ? (
                              <Button asChild size="sm" variant="ghost" className="h-8 text-slate-300 hover:text-white hover:bg-white/5 text-xs px-2.5 rounded-lg border border-white/10">
                                <Link href={withFromFeedParam(r.deep_link)}>
                                  Open
                                  <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                                </Link>
                              </Button>
                            ) : (
                              <span className="text-xs text-slate-500 font-mono">—</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
