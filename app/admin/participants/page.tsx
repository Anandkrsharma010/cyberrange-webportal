"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  api,
  type AdminDeploymentCoverageRow,
  type DeploymentCoverageState,
} from "@/lib/api"
import { showToast } from "@/components/toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, RefreshCcw, ArrowRight, AlertTriangle, ExternalLink, Users, AlertCircle, CheckCircle2, Search, Activity } from "lucide-react"

type CoverageFilter = "issues" | "complete" | "all"

const FILTER_LABELS: Record<CoverageFilter, string> = {
  issues: "Show issues only",
  complete: "Show complete only",
  all: "Show all",
}

function relativeTime(iso?: string): string {
  if (!iso) return "-"
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return "-"
  const diffMs = Date.now() - then
  if (diffMs < 60_000) return "just now"
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}y ago`
}

function isActionableCoverageState(state: DeploymentCoverageState): boolean {
  return state === "no_users_added" || state === "users_missing"
}

function coverageBadge(row: AdminDeploymentCoverageRow) {
  const { coverage_state: state } = row

  if (state === "no_users_added") {
    return (
      <Badge variant="destructive" className="gap-1 bg-red-500/10 border border-red-500/35 text-red-400 hover:bg-red-500/20">
        <AlertCircle className="h-3 w-3" />
        No users added
      </Badge>
    )
  }

  if (state === "users_missing") {
    return (
      <Badge variant="outline" className="gap-1 bg-amber-500/10 border border-amber-500/35 text-amber-400 hover:bg-amber-500/20">
        <AlertTriangle className="h-3 w-3" />
        Users missing ({row.gap_count} left)
      </Badge>
    )
  }

  if (state === "all_users_added") {
    return (
      <Badge variant="secondary" className="gap-1 bg-emerald-500/10 border border-emerald-500/35 text-emerald-400 hover:bg-emerald-500/20">
        <CheckCircle2 className="h-3 w-3" />
        All users added
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className="border-white/10 text-slate-400 bg-white/5">
      Not running
    </Badge>
  )
}

export default function AdminParticipantsPage() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [rows, setRows] = useState<AdminDeploymentCoverageRow[]>([])
  const [filter, setFilter] = useState<CoverageFilter>("all")
  const [search, setSearch] = useState("")
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null)

  const load = async (manual = false) => {
    if (manual) setRefreshing(true)
    try {
      const res = await api.adminDeploymentCoverage()
      setRows(res.rows)
      setLastRefreshedAt(new Date())
      if (manual) showToast("success", "Coverage monitor refreshed")
    } catch {
      showToast("error", "Failed to load coverage monitor")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const runningRows = useMemo(
    () => rows.filter((r) => r.status.toLowerCase() === "running"),
    [rows],
  )
  const nonRunningCount = rows.length - runningRows.length

  const actionableRows = useMemo(
    () => runningRows.filter((r) => isActionableCoverageState(r.coverage_state)),
    [runningRows],
  )

  const noUsersAddedRows = useMemo(
    () => runningRows.filter((r) => r.coverage_state === "no_users_added"),
    [runningRows],
  )

  const completeRows = useMemo(
    () => runningRows.filter((r) => r.coverage_state === "all_users_added"),
    [runningRows],
  )

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase()
    return runningRows.filter((r) => {
      if (filter === "issues" && !isActionableCoverageState(r.coverage_state)) return false
      if (filter === "complete" && r.coverage_state !== "all_users_added") return false

      if (!term) return true
      return (
        (r.lab_title || "").toLowerCase().includes(term) ||
        (r.owner_email || "").toLowerCase().includes(term)
      )
    })
  }, [runningRows, filter, search])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        <p className="text-xs text-slate-400">Loading coverage monitor...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Glassmorphic Hero Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-white/[0.05] via-white/[0.02] to-white/[0.05] p-8 backdrop-blur-xl shadow-2xl">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-[100px] pointer-events-none animate-pulse" />
        <div className="relative z-10 space-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 font-mono text-xs text-emerald-400 font-bold shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)]">
            <Users className="w-3.5 h-3.5" /> Participant Triage Hub
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Course Deployment Coverage</h1>
          <p className="text-slate-400 text-sm max-w-3xl leading-relaxed font-light">
            Monitor and verify if all enrolled course participants are properly added to live lab deployments.
            Focuses exclusively on course-admin operations and live cohorts.
          </p>
        </div>
      </section>

      {/* Metric Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-white/10 bg-white/[0.02] backdrop-blur-xl shadow-lg rounded-2xl p-5 hover:border-white/20 transition-all duration-300">
          <CardHeader className="p-0 pb-2">
            <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Running Deployments</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <p className="text-3xl font-black text-white">{runningRows.length}</p>
          </CardContent>
        </Card>
        
        <Card className={`backdrop-blur-xl shadow-lg rounded-2xl p-5 transition-all duration-300 ${actionableRows.length > 0 ? "border-red-500/20 bg-red-500/[0.02] hover:border-red-500/35" : "border-white/10 bg-white/[0.02] hover:border-white/20"}`}>
          <CardHeader className="p-0 pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Deployments with Issues</CardTitle>
            {actionableRows.length > 0 && <AlertCircle className="w-4 h-4 text-red-400 animate-pulse" />}
          </CardHeader>
          <CardContent className="p-0">
            <p className={`text-3xl font-black ${actionableRows.length > 0 ? "text-red-400" : "text-white"}`}>
              {actionableRows.length}
            </p>
            <p className="text-[10px] text-slate-500 font-mono mt-1">Users not fully added yet</p>
          </CardContent>
        </Card>
        
        <Card className="border-white/10 bg-white/[0.02] backdrop-blur-xl shadow-lg rounded-2xl p-5 hover:border-white/20 transition-all duration-300">
          <CardHeader className="p-0 pb-2">
            <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-slate-400">No Users Added</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <p className="text-3xl font-black text-white">{noUsersAddedRows.length}</p>
          </CardContent>
        </Card>
        
        <Card className="border-white/10 bg-white/[0.02] backdrop-blur-xl shadow-lg rounded-2xl p-5 hover:border-white/20 transition-all duration-300">
          <CardHeader className="p-0 pb-2">
            <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-slate-400">All Users Added</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <p className="text-3xl font-black text-emerald-400">{completeRows.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Table Container */}
      <Card className="border-white/10 bg-white/[0.02] backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden">
        <CardHeader className="space-y-4 border-b border-white/10 px-6 py-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle className="text-base flex items-center gap-2 text-white font-bold">
              <Activity className="h-4 w-4 text-emerald-400" />
              Triage Deployment Mappings
            </CardTitle>
            <div className="flex items-center gap-3">
              {lastRefreshedAt && (
                <span className="text-[10px] text-slate-500 font-mono">
                  Last updated: {lastRefreshedAt.toLocaleTimeString()}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => void load(true)}
                disabled={refreshing}
                className="h-9 border-white/15 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white rounded-xl text-xs gap-1.5"
              >
                {refreshing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                ) : (
                  <RefreshCcw className="h-3.5 w-3.5" />
                )}
                Refresh Monitor
              </Button>
            </div>
          </div>
          
          <div className="grid gap-4 rounded-2xl border border-white/10 bg-black/40 p-4 md:grid-cols-[minmax(0,1fr)_240px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                placeholder="Search by lab title or owner email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 pl-9 border-white/10 bg-white/5 text-white placeholder-slate-500 rounded-xl focus:ring-emerald-500/20"
              />
            </div>
            <Select value={filter} onValueChange={(v) => setFilter(v as CoverageFilter)}>
              <SelectTrigger className="h-10 border-white/10 bg-white/5 text-slate-200 rounded-xl focus:ring-emerald-500/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10 text-slate-200">
                {(Object.keys(FILTER_LABELS) as CoverageFilter[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {FILTER_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-white/[0.02] border-b border-white/10">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-slate-300 font-bold text-xs py-3.5">Lab / Course</TableHead>
                  <TableHead className="text-slate-300 font-bold text-xs py-3.5">Owner</TableHead>
                  <TableHead className="text-slate-300 font-bold text-xs py-3.5">Status</TableHead>
                  <TableHead className="text-slate-300 font-bold text-xs py-3.5 text-right">Enrolled</TableHead>
                  <TableHead className="text-slate-300 font-bold text-xs py-3.5 text-right">Added</TableHead>
                  <TableHead className="text-slate-300 font-bold text-xs py-3.5">Coverage Result</TableHead>
                  <TableHead className="text-slate-300 font-bold text-xs py-3.5">Deployed Time</TableHead>
                  <TableHead className="text-slate-300 font-bold text-xs py-3.5 text-right">Fix path</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-12 text-center text-sm text-slate-400 font-light">
                      {rows.length === 0
                        ? "No deployments returned yet. Refresh after at least one deployment exists."
                        : runningRows.length === 0
                          ? `No live course deployments right now (${nonRunningCount} not running).`
                          : "No rows match this filter. Try selecting 'Show all'."}
                    </TableCell>
                  </TableRow>
                )}
                {filteredRows.map((row) => (
                  <TableRow key={row.deployment_id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <TableCell>
                      <div className="text-sm font-bold text-slate-200">{row.lab_title || "Untitled lab"}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        ID: {row.deployment_id.slice(0, 8)}...
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-300">{row.owner_email || "-"}</TableCell>
                    <TableCell className="capitalize text-sm text-slate-300">{row.status}</TableCell>
                    <TableCell className="text-right font-mono text-sm text-slate-300">{row.enrolled_count}</TableCell>
                    <TableCell className="text-right font-mono text-sm text-slate-300">{row.attached_count}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {coverageBadge(row)}
                      </div>
                    </TableCell>
                    <TableCell
                      className="text-xs text-slate-400 font-mono"
                      title={row.created_at ? new Date(row.created_at).toLocaleString() : ""}
                    >
                      {relativeTime(row.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button asChild variant="ghost" size="sm" className="h-8 border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white rounded-lg text-xs px-2.5">
                          <Link href="/admin/deployments">
                            Deployments
                            <ExternalLink className="ml-1.5 h-3.5 w-3.5 text-emerald-400" />
                          </Link>
                        </Button>
                        <Button asChild variant="ghost" size="sm" className="h-8 border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white rounded-lg text-xs px-2.5">
                          <Link href={`/admin/course-admins?course_id=${encodeURIComponent(row.content_id)}`}>
                            Admins
                            <ExternalLink className="ml-1.5 h-3.5 w-3.5 text-emerald-400" />
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Footer Info Card */}
      <Card className="border-emerald-500/20 bg-emerald-500/[0.01] backdrop-blur-xl shadow-lg rounded-2xl p-5 hover:border-emerald-500/35 transition-all">
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-0">
          <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
            This enrollment monitor is read-only. Use the provided deep links under the 'Fix path' column to navigate
            to administrative sections, allocate seats, manage course admins, and resolve coverage disparities.
          </p>
          <Button asChild variant="outline" size="sm" className="h-10 border-white/15 bg-transparent text-white hover:bg-emerald-500/10 hover:border-emerald-500/40 text-xs px-4 rounded-xl font-bold gap-1.5 shrink-0 self-start sm:self-center">
            <Link href="/admin/deployments">
              Open Lab Deployments
              <ArrowRight className="ml-1 h-4 w-4 text-emerald-400" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
