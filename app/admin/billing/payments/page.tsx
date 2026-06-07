"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { api, type AdminBillingPaymentRow } from "@/lib/api"
import { showToast } from "@/components/toast"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, ArrowLeft, ExternalLink, RefreshCcw, CreditCard, Activity, Clock, Terminal } from "lucide-react"
import { OpsFeedReturnBanner } from "@/app/admin/ops/_components/ops-feed-return-banner"

type PaymentFilter = "all" | "pending" | "captured" | "failed"

function statusBadge(status: string) {
  const s = status.toLowerCase()
  if (s === "pending") {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-red-500/10 border border-red-500/20 px-2 py-0.5 text-xs font-semibold text-red-400">
        Pending
      </span>
    )
  }
  if (s === "captured" || s === "paid") {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-400">
        Captured
      </span>
    )
  }
  if (s === "failed" || s === "cancelled") {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-white/5 border border-white/10 px-2 py-0.5 text-xs font-semibold text-slate-400">
        Failed/Cancelled
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded bg-white/5 border border-white/10 px-2 py-0.5 text-xs font-semibold text-slate-400">
      {status}
    </span>
  )
}

function ageMinutes(createdAt: string): number {
  const t = new Date(createdAt).getTime()
  if (Number.isNaN(t)) return 0
  return Math.max(0, Math.floor((Date.now() - t) / 60000))
}

export default function AdminBillingPaymentsPage() {
  const searchParams = useSearchParams()
  const [rows, setRows] = useState<AdminBillingPaymentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [userFilter, setUserFilter] = useState(searchParams.get("user_id") || "")
  const [statusFilter, setStatusFilter] = useState<PaymentFilter>(
    (searchParams.get("status") as PaymentFilter) || "all",
  )
  const [emailSearch, setEmailSearch] = useState("")

  const load = async (manual = false) => {
    if (manual) setRefreshing(true)
    try {
      const res = await api.adminBillingPayments({
        status: statusFilter === "all" ? undefined : statusFilter,
        user_id: userFilter || undefined,
        limit: 300,
      })
      setRows(res.rows)
      setLoadError(null)
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load billing payments"
      setLoadError(message)
      setRows([])
      if (manual) showToast("error", message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, userFilter])

  const filtered = useMemo(() => {
    const term = emailSearch.trim().toLowerCase()
    return rows.filter((r) => !term || (r.email || "").toLowerCase().includes(term))
  }, [rows, emailSearch])

  const stalePending = useMemo(
    () => filtered.filter((r) => r.status.toLowerCase() === "pending" && ageMinutes(r.created_at) > 30).length,
    [filtered],
  )

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#0A0A0B]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-16 w-16">
            <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 animate-pulse" />
            <Loader2 className="h-16 w-16 animate-spin text-emerald-500" />
          </div>
          <p className="text-sm font-medium text-slate-400 animate-pulse">Loading billing ledger payments...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-slate-100 flex flex-col selection:bg-emerald-500/30 space-y-8 pb-16">
      <OpsFeedReturnBanner />

      {/* Top Glassmorphic Hero Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-white/[0.05] via-white/[0.02] to-white/[0.05] p-8 backdrop-blur-xl shadow-2xl m-6 mb-0">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-[100px] pointer-events-none animate-pulse" />
        
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 font-mono text-xs text-emerald-400 font-bold shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)]">
                <CreditCard className="w-3.5 h-3.5" /> Billing Ledger
              </span>
              <Badge className="bg-white/5 border border-white/10 text-slate-400 text-xs px-2.5 py-0.5">Payments Admin</Badge>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">Billing Payments</h1>
            <p className="text-slate-400 text-sm max-w-2xl leading-relaxed font-light font-sans">
              Diagnose and audit individual gateway transactions. Troubleshoot pending, expired, or failed payments, and map entitlements to user accounts.
            </p>
          </div>
          <Button asChild variant="outline" className="h-11 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 font-semibold px-6 text-white text-xs shrink-0">
            <Link href="/admin/billing">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Snapshot
            </Link>
          </Button>
        </div>
      </section>

      {loadError && (
        <div className="px-6">
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
            Could not load payment rows: {loadError}. If this shows <code>Not Found</code>, restart backend so <code>/billing/admin/payments</code> is active.
          </div>
        </div>
      )}

      {/* Snapshot Cards */}
      <div className="grid gap-4 md:grid-cols-3 px-6">
        <div className="group relative rounded-2xl border border-white/10 bg-white/[0.02] p-5 hover:border-white/20 transition-all duration-300 backdrop-blur-md shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider mb-1">Rows Loaded</p>
            <p className="text-3xl font-black text-white">{filtered.length}</p>
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 group-hover:bg-emerald-500/10 group-hover:border-emerald-500/30 transition-all duration-300">
            <CreditCard className="h-6 w-6 text-slate-300 group-hover:text-emerald-400 transition-colors" />
          </div>
        </div>

        <div className="group relative rounded-2xl border border-white/10 bg-white/[0.02] p-5 hover:border-white/20 transition-all duration-300 backdrop-blur-md shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider mb-1">Pending Status</p>
            <p className="text-3xl font-black text-white">
              {filtered.filter((r) => r.status.toLowerCase() === "pending").length}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 group-hover:bg-red-500/10 group-hover:border-red-500/30 transition-all duration-300">
            <Activity className="h-6 w-6 text-slate-300 group-hover:text-red-400 transition-colors" />
          </div>
        </div>

        <div className="group relative rounded-2xl border border-white/10 bg-white/[0.02] p-5 hover:border-white/20 transition-all duration-300 backdrop-blur-md shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider mb-1">Stale Pending (&gt;30m)</p>
            <p className="text-3xl font-black text-white">{stalePending}</p>
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 group-hover:bg-amber-500/10 group-hover:border-amber-500/30 transition-all duration-300">
            <Clock className="h-6 w-6 text-slate-300 group-hover:text-amber-400 transition-colors" />
          </div>
        </div>
      </div>

      {/* Main Ledger Table Card */}
      <div className="px-6">
        <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-xl shadow-xl space-y-6">
          
          {/* Header & Filter Controls */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as PaymentFilter)}>
                <SelectTrigger className="h-11 w-52 rounded-xl border-white/10 bg-white/5 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-950 border-white/10 text-white rounded-xl">
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="pending">Pending only</SelectItem>
                  <SelectItem value="captured">Captured only</SelectItem>
                  <SelectItem value="failed">Failed/Cancelled</SelectItem>
                </SelectContent>
              </Select>
              
              <Input
                className="h-11 w-64 rounded-xl border-white/10 bg-white/5 text-sm text-white placeholder-slate-500"
                placeholder="Filter by user email"
                value={emailSearch}
                onChange={(e) => setEmailSearch(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void load(true)}
                disabled={refreshing}
                className="h-10 rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10 font-semibold px-4"
              >
                {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                Refresh
              </Button>
            </div>
          </div>

          {/* Table Content */}
          <div className="rounded-2xl border border-white/10 bg-black/40 overflow-hidden">
            <div className="max-h-[560px] overflow-auto">
              <Table>
                <TableHeader className="bg-white/[0.02] border-b border-white/10">
                  <TableRow>
                    <TableHead className="text-slate-300 font-bold text-xs py-4">User Email</TableHead>
                    <TableHead className="text-slate-300 font-bold text-xs py-4">Status</TableHead>
                    <TableHead className="text-slate-300 font-bold text-xs py-4">Amount</TableHead>
                    <TableHead className="text-slate-300 font-bold text-xs py-4">Created Time</TableHead>
                    <TableHead className="text-slate-300 font-bold text-xs py-4">Gateway Order ID</TableHead>
                    <TableHead className="text-slate-300 font-bold text-xs py-4">Gateway Payment ID</TableHead>
                    <TableHead className="text-slate-300 font-bold text-xs py-4 text-center">Webhook</TableHead>
                    <TableHead className="text-slate-300 font-bold text-xs py-4 text-center">Purchase</TableHead>
                    <TableHead className="text-slate-300 font-bold text-xs py-4 text-center">Entitlement</TableHead>
                    <TableHead className="text-slate-300 font-bold text-xs py-4 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.payment_id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group/row">
                      <TableCell className="font-medium text-xs text-slate-300 py-3.5">
                        {r.email}
                      </TableCell>
                      <TableCell className="py-3.5">{statusBadge(r.status)}</TableCell>
                      <TableCell className="font-bold text-slate-200 py-3.5">
                        {(r.amount / 100).toFixed(2)} <span className="text-[10px] text-slate-400 font-light">{r.currency}</span>
                      </TableCell>
                      <TableCell className="text-xs text-slate-400 font-light py-3.5">
                        <div>{new Date(r.created_at).toLocaleString()}</div>
                        <div className="text-[10px] text-emerald-400">{ageMinutes(r.created_at)}m ago</div>
                      </TableCell>
                      <TableCell className="font-mono text-[10px] text-slate-300 py-3.5">{r.gateway_order_id}</TableCell>
                      <TableCell className="font-mono text-[10px] text-slate-300 py-3.5">{r.gateway_payment_id || "—"}</TableCell>
                      <TableCell className="text-center py-3.5">
                        {r.webhook_seen ? (
                          <span className="inline-flex items-center rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                            Seen
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                            Missing
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center py-3.5">
                        {r.purchase_exists ? (
                          <span className="inline-flex items-center rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                            Created
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                            Not Created
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center py-3.5">
                        {r.entitlement_status ? (
                          <span className="inline-flex items-center rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                            {r.entitlement_status}
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                            None
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right py-3.5">
                        <Button asChild variant="ghost" size="sm" className="h-8 text-xs hover:bg-emerald-500/10 text-emerald-400 hover:text-emerald-300 rounded-lg">
                          <Link href={`/admin/users?focus_user=${encodeURIComponent(r.user_id)}`}>
                            Open Account <ExternalLink className="ml-1 h-3 w-3" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="py-16 text-center text-sm text-slate-500 font-light">
                        {loadError
                          ? "No payment details loaded due to endpoint failure."
                          : "No transactions match your filter criteria."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
