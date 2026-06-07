"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { api, type WorkshopRow } from "@/lib/api"
import { paymentOpsDisplay, workshopLifecycleDisplay } from "@/lib/workshop-ops-display"
import { showToast } from "@/components/toast"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { LayoutGrid, Loader2, Plus, RefreshCw, Search, Users, Activity, CreditCard, Shield } from "lucide-react"
import { cn } from "@/lib/utils"

type Segment = "all" | "draft" | "live" | "closed" | "payment_pending"

function relativeUpdated(iso: string) {
  try {
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 60) return `${Math.max(m, 0)}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  } catch {
    return "—"
  }
}

function fmtDates(start?: string | null, end?: string | null) {
  if (!start && !end) return "—"
  try {
    const a = start ? new Date(start) : null
    const b = end ? new Date(end) : null
    const fmt = (d: Date) =>
      d.toLocaleDateString(undefined, { month: "short", day: "numeric" }).toUpperCase()
    if (a && b) return `${fmt(a)} – ${fmt(b)}`
    if (a) return fmt(a)
    return fmt(b!)
  } catch {
    return "—"
  }
}

export default function WorkshopOpsListPage() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [exportInfoOpen, setExportInfoOpen] = useState(false)
  const [rows, setRows] = useState<WorkshopRow[]>([])
  const [q, setQ] = useState("")
  const [segment, setSegment] = useState<Segment>("all")

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true)
    else setLoading(true)
    try {
      setLoadError(null)
      const res = await api.listWorkshops({
        q: q.trim() || undefined,
        segment: segment === "all" ? undefined : segment,
      })
      setRows(res.workshops)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load workshops"
      setLoadError(msg)
      showToast("error", msg)
      setRows([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [q, segment])

  useEffect(() => {
    const delay = q.trim() ? 320 : 0
    const id = setTimeout(() => load(false), delay)
    return () => clearTimeout(id)
  }, [load, q, segment])

  const metrics = useMemo(() => {
    const active = rows.filter((w) => w.status === "active")
    let util = 0
    let n = 0
    for (const w of active) {
      if (w.seat_cap > 0) {
        util += w.used_seats / w.seat_cap
        n += 1
      }
    }
    const healthPct = n ? Math.min(99.9, Math.round(util * 100 * 10) / 10) : 0
    const pendingAudits = rows.filter(
      (w) => w.status === "draft" || w.payment_status === "pending",
    ).length
    return { healthPct, pendingAudits }
  }, [rows])

  const segments: { id: Segment; label: string; hint: string }[] = [
    { id: "all", label: "ALL", hint: "Every manifest" },
    { id: "draft", label: "DRAFT", hint: "Lifecycle = draft" },
    { id: "live", label: "LIVE", hint: "Lifecycle = active (running cohort)" },
    { id: "closed", label: "ARCHIVED", hint: "Lifecycle = archived (ops closed the manifest)" },
    {
      id: "payment_pending",
      label: "UNPAID",
      hint: "Billing field payment_status = pending (any lifecycle)",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Top Glassmorphic Hero Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-white/[0.05] via-white/[0.02] to-white/[0.05] p-8 backdrop-blur-xl shadow-2xl">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-[100px] pointer-events-none animate-pulse" />
        
        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 font-mono text-xs text-emerald-400 font-bold shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)]">
              <Users className="w-3.5 h-3.5" /> Workshop Lane Console
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Workshop Operations</h1>
            <p className="text-slate-400 text-sm max-w-xl leading-relaxed font-light">
              Cohort and seat-based workshops. Lifecycle is draft → live → archived.
              Open a row to manage assignments, rosters, and live lab access.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search workshops..."
                className="h-10 w-[200px] pl-9 pr-4 md:w-[260px] border-white/10 bg-white/5 text-white placeholder-slate-500 rounded-xl focus:ring-emerald-500/20"
              />
            </div>
            <Button asChild size="sm" className="h-10 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-500/10 gap-1.5 px-4 text-xs">
              <Link href="/admin/ops/workshop/new">
                <Plus className="h-4 w-4" />
                Create Workshop
              </Link>
            </Button>
            <Button
              variant="outline"
              size="icon"
              disabled={loading || refreshing}
              onClick={() => load(true)}
              className="h-10 w-10 border-white/15 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white rounded-xl"
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </section>

      {/* Segment controls & counter */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex flex-wrap gap-1 rounded-xl border border-white/10 bg-white/[0.02] p-1 backdrop-blur-md">
          {segments.map((s) => (
            <button
              key={s.id}
              type="button"
              title={s.hint}
              onClick={() => setSegment(s.id)}
              className={cn(
                "rounded-lg px-4 py-2 text-[10px] font-bold uppercase tracking-wider transition-all",
                segment === s.id
                  ? "bg-emerald-500 text-slate-950 shadow-md"
                  : "text-slate-400 hover:text-white hover:bg-white/5",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
          Showing {String(rows.length).padStart(2, "0")} manifests
        </p>
      </div>

      {/* Main Table Container */}
      <Card className="border-white/10 bg-white/[0.02] backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
              <p className="text-xs text-slate-400">Loading manifests...</p>
            </div>
          ) : loadError ? (
            <div className="space-y-3 px-6 py-16 text-center">
              <p className="text-sm text-red-400 font-semibold">{loadError}</p>
              <p className="text-xs text-slate-400">
                Confirm backend is running, you are logged in as sys_admin, and migrations are fully applied.
              </p>
              <Button type="button" size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-5" onClick={() => load(true)}>
                Retry
              </Button>
            </div>
          ) : rows.length === 0 ? (
            <div className="px-6 py-16 text-center text-sm text-slate-400 font-light space-y-2">
              <p>No workshops match this filter.</p>
              <p className="text-xs text-slate-500">
                <Link href="/admin/ops/workshop/new" className="text-emerald-400 font-bold hover:underline">
                  Create one now
                </Link>{" "}
                to get started.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-white/[0.02] border-b border-white/10">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-slate-300 font-bold text-xs py-3.5">
                      Workshop details
                    </TableHead>
                    <TableHead className="text-slate-300 font-bold text-xs py-3.5">Scenario Lab</TableHead>
                    <TableHead className="text-slate-300 font-bold text-xs py-3.5">Active Dates</TableHead>
                    <TableHead className="text-slate-300 font-bold text-xs py-3.5">Mode</TableHead>
                    <TableHead className="text-slate-300 font-bold text-xs py-3.5">Seat Allocation</TableHead>
                    <TableHead className="text-slate-300 font-bold text-xs py-3.5">Lifecycle</TableHead>
                    <TableHead className="text-slate-300 font-bold text-xs py-3.5">Payment</TableHead>
                    <TableHead className="text-slate-300 font-bold text-xs py-3.5">Lead Admin</TableHead>
                    <TableHead className="text-slate-300 font-bold text-xs py-3.5">Updated</TableHead>
                    <TableHead className="text-right text-slate-300 font-bold text-xs py-3.5">
                      Action
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((w) => {
                    const ws = workshopLifecycleDisplay(w.status)
                    const ps = paymentOpsDisplay(w.payment_status)
                    const pct = w.seat_cap > 0 ? Math.round((w.used_seats / w.seat_cap) * 100) : 0
                    const adminShort = w.lead_admin_email
                      ? w.lead_admin_email.split("@")[0].replace(/\./g, " ").slice(0, 24)
                      : "—"
                      
                    // Custom Glowing Dot helpers
                    const lifecycleDotGlow = w.status === "active"
                      ? "bg-emerald-500 shadow-[0_0_8px_#10b981]"
                      : w.status === "archived"
                      ? "bg-red-500 shadow-[0_0_8px_#f43f5e]"
                      : "bg-slate-500"

                    const paymentDotGlow = w.payment_status === "paid"
                      ? "bg-emerald-500 shadow-[0_0_8px_#10b981]"
                      : w.payment_status === "pending"
                      ? "bg-amber-500 shadow-[0_0_8px_#f59e0b]"
                      : w.payment_status === "refunded"
                      ? "bg-orange-500 shadow-[0_0_8px_#f97316]"
                      : "bg-slate-400"

                    return (
                      <TableRow key={w.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group/row">
                        <TableCell className="max-w-[220px]">
                          <div className="font-bold text-slate-200 text-sm">{w.title}</div>
                          <div className="mt-1 font-mono text-[10px] text-slate-500">
                            ID: {w.internal_code || w.id.slice(0, 8).toUpperCase()}
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-300 text-sm">
                          {w.content_title || "—"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap font-mono text-xs text-slate-300">
                          {fmtDates(w.start_at, w.end_at)}
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "rounded-lg border px-2.5 py-0.5 text-[9px] font-bold tracking-wider",
                              w.mode === "sponsored"
                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                : "border-white/10 bg-white/5 text-slate-400",
                            )}
                          >
                            {w.mode === "sponsored" ? "SPONSORED" : "OPEN"}
                          </span>
                        </TableCell>
                        <TableCell className="min-w-[120px]">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-slate-300">
                              {w.used_seats} / {w.seat_cap}
                            </span>
                            <Progress value={pct} className="h-1.5 w-16 bg-white/5" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", lifecycleDotGlow)} />
                            <span className="text-[11px] font-semibold text-slate-300 capitalize">{w.status}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", paymentDotGlow)} />
                            <span className="text-[11px] font-semibold text-slate-300 capitalize">{w.payment_status}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-slate-400 capitalize">{adminShort}</TableCell>
                        <TableCell className="font-mono text-[10px] text-slate-500">
                          {relativeUpdated(w.updated_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="outline" size="sm" className="h-8 border-white/15 bg-transparent text-white hover:bg-emerald-500/10 hover:border-emerald-500/40 text-[11px] font-bold rounded-lg transition-all">
                            <Link href={`/admin/ops/workshop/${w.id}?tab=overview`}>Open</Link>
                          </Button>
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

      {/* Metrics Section */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-white/10 bg-white/[0.02] backdrop-blur-xl shadow-lg rounded-2xl p-5 hover:border-white/20 transition-all duration-300 flex flex-col justify-between">
          <CardHeader className="p-0 pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Operational health
            </CardTitle>
            <Activity className="w-4 h-4 text-emerald-400" />
          </CardHeader>
          <CardContent className="p-0 space-y-3">
            <div className="flex items-end gap-1.5">
              <span className="text-3xl font-black text-emerald-400 leading-none">
                {metrics.healthPct.toFixed(1)}%
              </span>
              <span className="text-[10px] text-slate-500 font-mono">seat utilization</span>
            </div>
            <Progress value={metrics.healthPct} className="h-1.5 bg-white/5" />
            <p className="text-[10px] leading-relaxed text-slate-500">
              Across active workshops with seat caps.
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-white/10 bg-white/[0.02] backdrop-blur-xl shadow-lg rounded-2xl p-5 hover:border-white/20 transition-all duration-300 flex flex-col justify-between">
          <CardHeader className="p-0 pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Pending audits
            </CardTitle>
            <Shield className="w-4 h-4 text-amber-400" />
          </CardHeader>
          <CardContent className="p-0 space-y-2">
            <div className="text-3xl font-black text-white">{metrics.pendingAudits}</div>
            <p className="text-[10px] leading-relaxed text-slate-500 mt-2">
              Draft workshops or payment-pending manifests currently requiring ops review.
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-emerald-500/20 bg-emerald-500/[0.02] backdrop-blur-xl shadow-lg rounded-2xl p-5 hover:border-emerald-500/35 transition-all duration-300 flex flex-col justify-between">
          <CardHeader className="p-0 pb-3 flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Terminal export
            </CardTitle>
            <LayoutGrid className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent className="p-0 space-y-3">
            <p className="text-[10px] leading-relaxed text-slate-400">
              Export CSV/JSON lists containing full seat manifests and billing details.
            </p>
            <Button
              size="sm"
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold uppercase text-[10px] h-9 rounded-xl shadow-lg shadow-emerald-500/10"
              type="button"
              onClick={() => setExportInfoOpen(true)}
            >
              Generate report
            </Button>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={exportInfoOpen} onOpenChange={setExportInfoOpen}>
        <AlertDialogContent className="bg-slate-950 border-white/10 text-white rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold">Terminal Export Manifest</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-slate-400 font-light leading-relaxed">
              Bulk CSV/JSON export for workshop manifests is planned to align with Billing exports (same{" "}
              <code className="rounded bg-white/5 border border-white/10 px-1 text-[11px] font-mono text-emerald-400">workshop_id</code> keys). Not connected yet.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-xl">Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
