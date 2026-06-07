"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { api, type WorkshopRow } from "@/lib/api"
import { showToast } from "@/components/toast"
import {
  paymentOpsDisplay,
  workshopLifecycleDisplay,
} from "@/lib/workshop-ops-display"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  ArrowRight,
  Loader2,
  Users,
  Search,
  X,
  Sparkles,
  Layers,
  Calendar,
  ShieldCheck,
  CreditCard,
  UserCheck,
  Terminal,
  Activity,
  CheckCircle2,
  AlertCircle
} from "lucide-react"
import { cn } from "@/lib/utils"

type Segment =
  | "all"
  | "demo"
  | "sponsored"
  | "organizer_led"
  | "draft"
  | "active"
  | "archived"

const SEGMENTS: { id: Segment; label: string }[] = [
  { id: "all", label: "All Cohorts" },
  { id: "demo", label: "Demo Access" },
  { id: "sponsored", label: "Sponsored" },
  { id: "organizer_led", label: "Organizer-led" },
  { id: "draft", label: "Draft" },
  { id: "active", label: "Live Active" },
  { id: "archived", label: "Archived" },
]

function formatWindow(start?: string | null, end?: string | null) {
  const fmt = (v?: string | null) => {
    if (!v) return "—"
    try {
      return new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    } catch {
      return v
    }
  }
  return `${fmt(start)} → ${fmt(end)}`
}

function cohortMatchesSegment(w: WorkshopRow, seg: Segment): boolean {
  if (seg === "all") return true
  if (seg === "demo") return w.access_policy === "demo"
  if (seg === "sponsored") return w.mode === "sponsored"
  if (seg === "organizer_led") return w.mode === "open_organizer"
  return w.status === seg
}

function cohortSearchHaystack(w: WorkshopRow): string {
  return [
    w.title,
    w.internal_code ?? "",
    w.content_title ?? "",
    w.content_id,
  ]
    .join(" ")
    .toLowerCase()
}

export default function CourseAdminCohortHomePage() {
  const [cohorts, setCohorts] = useState<WorkshopRow[]>([])
  const [loading, setLoading] = useState(true)
  const [segment, setSegment] = useState<Segment>("all")
  const [query, setQuery] = useState("")

  useEffect(() => {
    ;(async () => {
      try {
        const res = await api.myOperatorCohorts()
        setCohorts(res.cohorts)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load cohorts"
        showToast("error", msg)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return cohorts.filter((w) => {
      if (!cohortMatchesSegment(w, segment)) return false
      if (!q) return true
      return cohortSearchHaystack(w).includes(q)
    })
  }, [cohorts, segment, query])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#0A0A0B]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-16 w-16">
            <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 animate-pulse" />
            <Loader2 className="h-16 w-16 animate-spin text-emerald-500" />
          </div>
          <p className="text-sm font-medium text-slate-400 animate-pulse">Loading Course Administrator console...</p>
        </div>
      </div>
    )
  }

  const totalSeats = cohorts.reduce((acc, c) => acc + (c.seat_cap || 0), 0)
  const usedSeats = cohorts.reduce((acc, c) => acc + (c.used_seats || 0), 0)
  const activeCohortsCount = cohorts.filter(c => c.status === "active").length

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-slate-100 flex flex-col selection:bg-emerald-500/30 space-y-8 pb-16">
      {/* Top Glassmorphic Hero Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-white/[0.05] via-white/[0.02] to-white/[0.05] p-8 backdrop-blur-xl shadow-2xl m-6 mb-0">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-[100px] pointer-events-none animate-pulse" />
        
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 font-mono text-xs text-emerald-400 font-bold shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)]">
                <Users className="w-3.5 h-3.5" /> Operator Portal
              </span>
              <Badge className="bg-white/5 border border-white/10 text-slate-400 text-xs px-2.5 py-0.5">Assigned Cohorts</Badge>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">Course Administrator Console</h1>
            <p className="text-slate-400 text-sm leading-relaxed font-light">
              Manage your assigned student cohorts, monitor active student seat allocations, track billable payment states, and orchestrate live interactive cyber range lab delivery.
            </p>
          </div>

          {/* Stat Badges */}
          <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-3 backdrop-blur-md shadow-lg w-full lg:w-auto justify-around lg:justify-start shrink-0">
            <div className="px-4 py-2 text-center border-r border-white/10 last:border-0">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">Total Cohorts</p>
              <p className="text-2xl font-extrabold text-white flex items-center justify-center gap-1.5">
                <Layers className="w-5 h-5 text-emerald-400" /> {cohorts.length}
              </p>
            </div>
            <div className="px-4 py-2 text-center border-r border-white/10 last:border-0">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">Live Active</p>
              <p className="text-2xl font-extrabold text-emerald-400 flex items-center justify-center gap-1.5">
                <Activity className="w-5 h-5 text-emerald-500" /> {activeCohortsCount}
              </p>
            </div>
            <div className="px-4 py-2 text-center">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">Seat Allocation</p>
              <p className="text-2xl font-extrabold text-blue-400 flex items-center justify-center gap-1.5">
                <Users className="w-5 h-5 text-blue-500" /> {usedSeats}/{totalSeats}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Workspace */}
      <div className="px-6 max-w-[1600px] mx-auto w-full space-y-6">
        
        {/* Search & Filter Toolbar */}
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between rounded-3xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-xl shadow-xl">
          <div className="relative w-full lg:w-96 shrink-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search cohorts by title, code, or lab key..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.02] pl-11 pr-4 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 backdrop-blur-xl shadow-lg transition-all font-medium"
            />
            {query && (
              <X className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 cursor-pointer hover:text-white transition-colors" onClick={() => setQuery("")} />
            )}
          </div>

          {/* Segment Pills */}
          <div className="flex flex-wrap gap-1.5 bg-white/5 p-1.5 rounded-2xl border border-white/10 w-full lg:w-auto">
            {SEGMENTS.map((s) => (
              <Button
                key={s.id}
                type="button"
                size="sm"
                variant="ghost"
                className={cn(
                  "h-9 px-4 rounded-xl text-xs font-semibold transition-all duration-300",
                  segment === s.id
                    ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-[0_0_20px_-5px_rgba(16,185,129,0.4)]"
                    : "text-slate-400 hover:bg-white/10 hover:text-white"
                )}
                onClick={() => setSegment(s.id)}
              >
                {s.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Cohort Grid */}
        {filtered.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.01] p-16 text-center backdrop-blur-sm">
            <Users className="mx-auto h-12 w-12 text-slate-500 mb-4 animate-pulse" />
            <h3 className="text-lg font-semibold text-white mb-2">No Cohorts Found</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto mb-6 leading-relaxed font-light">
              {cohorts.length === 0
                ? "No student cohorts have been assigned to your operator account yet. System administrators add dedicated operators during workshop creation."
                : "No cohorts match your active search criteria or segment filter. Try selecting 'All Cohorts' or clearing your search query."}
            </p>
            {(query || segment !== "all") && (
              <Button size="sm" variant="outline" onClick={() => { setQuery(""); setSegment("all"); }} className="border-white/10 bg-white/5 text-white hover:bg-white/10 font-semibold px-6 py-5 rounded-xl">
                Reset All Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((w) => {
              const life = workshopLifecycleDisplay(w.status)
              const pay = paymentOpsDisplay(w.payment_status)
              const typeBits: string[] = []
              if (w.access_policy === "demo") typeBits.push("Demo Access")
              else typeBits.push("Billable Policy")
              if (w.mode === "sponsored") typeBits.push("Sponsored")
              else typeBits.push("Organizer-led")

              const percentUsed = w.seat_cap ? Math.min(Math.round((w.used_seats / w.seat_cap) * 100), 100) : 0

              return (
                <div
                  key={w.id}
                  className="group relative rounded-3xl border border-white/10 bg-white/[0.02] p-7 hover:border-emerald-500/40 hover:bg-white/[0.04] transition-all duration-300 backdrop-blur-xl shadow-xl flex flex-col justify-between overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/10 transition-colors" />

                  <div>
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-4 mb-4 relative z-10">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider shadow-sm ${life.pillClass}`}>
                          {life.label}
                        </span>
                        {w.internal_code && (
                          <Badge className="bg-white/5 border border-white/10 text-slate-300 font-mono text-[10px] px-2 py-0.5">
                            {w.internal_code}
                          </Badge>
                        )}
                      </div>

                      <Badge variant="outline" className="text-[10px] font-semibold text-slate-300 bg-white/5 border-white/10 shrink-0">
                        {w.operator_is_lead ? "👑 Lead Operator" : "👤 Operator"}
                      </Badge>
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-bold text-white tracking-tight mb-2 group-hover:text-emerald-400 transition-colors relative z-10">
                      {w.title}
                    </h3>

                    {/* Lab Title */}
                    <div className="flex items-center gap-2 text-xs text-slate-400 font-medium mb-6 relative z-10 bg-white/5 border border-white/10 p-2.5 rounded-xl">
                      <Terminal className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="truncate">{w.content_title ?? w.content_id}</span>
                    </div>

                    {/* Specs Grid */}
                    <div className="grid grid-cols-2 gap-4 mb-6 relative z-10 text-xs">
                      <div className="bg-white/5 border border-white/5 p-3 rounded-2xl space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" /> Schedule Window
                        </span>
                        <p className="font-medium text-slate-200 truncate">{formatWindow(w.start_at, w.end_at)}</p>
                      </div>

                      <div className="bg-white/5 border border-white/5 p-3 rounded-2xl space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5 text-slate-400" /> Payment State
                        </span>
                        <p className="font-medium text-slate-200 flex items-center gap-1.5 truncate">
                          <span className={`h-2 w-2 rounded-full shrink-0 ${pay.dot}`} />
                          {pay.label}
                        </p>
                      </div>
                    </div>

                    {/* Seat Progress Bar */}
                    <div className="space-y-2 mb-8 relative z-10 bg-white/[0.01] border border-white/5 p-3.5 rounded-2xl">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-emerald-400" /> Student Seat Allocation
                        </span>
                        <span className="text-white font-mono">{w.used_seats} / {w.seat_cap}</span>
                      </div>
                      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 rounded-full ${
                            percentUsed >= 100 ? "bg-red-500 shadow-lg shadow-red-500/30" : percentUsed > 80 ? "bg-amber-500 shadow-lg shadow-amber-500/30" : "bg-emerald-500 shadow-lg shadow-emerald-500/30"
                          }`}
                          style={{ width: `${percentUsed}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500 font-light pt-0.5">
                        <span>{typeBits.join(" · ")}</span>
                        <span>{percentUsed}% Allocated</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="pt-4 border-t border-white/10 relative z-10">
                    <Button
                      asChild
                      className="w-full group/btn bg-white/10 hover:bg-emerald-500 text-white hover:text-slate-950 font-bold py-6 rounded-2xl transition-all duration-300 shadow-lg"
                    >
                      <Link href={`/course-admin/cohorts/${encodeURIComponent(w.id)}`}>
                        <span className="flex items-center justify-center gap-2">
                          Manage Cohort & Labs
                          <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                        </span>
                      </Link>
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
