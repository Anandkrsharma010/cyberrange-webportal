"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { api, type AdminUserOverviewRow } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Loader2, CreditCard, Receipt, BadgeCheck, ExternalLink, ShieldCheck, Activity, Terminal } from "lucide-react"

type Snapshot = {
  usersWithPurchases: number
  totalPurchases: number
  pendingPayments: number
  activeEntitlements: number
}

type BillingFilter = "all" | "attention" | "clear" | "no_activity"

export default function AdminBillingPage() {
  const [rows, setRows] = useState<AdminUserOverviewRow[]>([])
  const [emailByUser, setEmailByUser] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<BillingFilter>("all")

  useEffect(() => {
    const load = async () => {
      try {
        const [res, users] = await Promise.all([
          api.adminUsersOverview(),
          api.listUsers(),
        ])
        setRows(res.rows)
        setEmailByUser(
          users.users.reduce<Record<string, string>>((acc, u) => {
            acc[u.user_id] = u.email
            return acc
          }, {}),
        )
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const snapshot: Snapshot = rows.reduce(
    (acc, r) => {
      if (r.purchase_count > 0) acc.usersWithPurchases += 1
      acc.totalPurchases += r.purchase_count
      acc.pendingPayments += r.pending_payment_count
      acc.activeEntitlements += r.entitlement_active
      return acc
    },
    {
      usersWithPurchases: 0,
      totalPurchases: 0,
      pendingPayments: 0,
      activeEntitlements: 0,
    },
  )

  const paymentStateBadge = (r: AdminUserOverviewRow) => {
    if (r.pending_payment_count > 0) {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-red-500/10 border border-red-500/20 px-2 py-0.5 text-xs font-semibold text-red-400">
          Attention
        </span>
      )
    }
    if (r.purchase_count > 0 || r.entitlement_active > 0) {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-400">
          Clear
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 rounded bg-white/5 border border-white/10 px-2 py-0.5 text-xs font-semibold text-slate-400">
        No Activity
      </span>
    )
  }

  const paymentState = (r: AdminUserOverviewRow): BillingFilter => {
    if (r.pending_payment_count > 0) return "attention"
    if (r.purchase_count > 0 || r.entitlement_active > 0) return "clear"
    return "no_activity"
  }

  const paymentStateReason = (r: AdminUserOverviewRow) => {
    if (r.pending_payment_count > 0) {
      return `${r.pending_payment_count} pending attempt${r.pending_payment_count > 1 ? "s" : ""} need review`
    }
    if (r.purchase_count > 0 || r.entitlement_active > 0) {
      return "No pending attempts for this user"
    }
    return "No billing activity yet"
  }

  const filteredRows = useMemo(() => {
    if (filter === "all") return rows
    return rows.filter((r) => paymentState(r) === filter)
  }, [rows, filter])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#0A0A0B]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-16 w-16">
            <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 animate-pulse" />
            <Loader2 className="h-16 w-16 animate-spin text-emerald-500" />
          </div>
          <p className="text-sm font-medium text-slate-400 animate-pulse">Loading billing ledger snapshot...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-slate-100 flex flex-col selection:bg-emerald-500/30 space-y-8 pb-16">
      {/* Top Glassmorphic Hero Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-white/[0.05] via-white/[0.02] to-white/[0.05] p-8 backdrop-blur-xl shadow-2xl m-6 mb-0">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-[100px] pointer-events-none animate-pulse" />
        
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 font-mono text-xs text-emerald-400 font-bold shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)]">
                <Receipt className="w-3.5 h-3.5" /> Commerce Hub
              </span>
              <Badge className="bg-white/5 border border-white/10 text-slate-400 text-xs px-2.5 py-0.5">Billing Admin</Badge>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">Billing Snapshot</h1>
            <p className="text-slate-400 text-sm max-w-2xl leading-relaxed font-light font-sans">
              Operational visibility into the platform's purchase and payment lifecycle. Data is synced in real-time with payment gateways and localized database aggregates.
            </p>
          </div>
        </div>
      </section>

      {/* Snapshot Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 px-6">
        <div className="group relative rounded-2xl border border-white/10 bg-white/[0.02] p-5 hover:border-white/20 transition-all duration-300 backdrop-blur-md shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider mb-1">Purchased Users</p>
            <p className="text-3xl font-black text-white">{snapshot.usersWithPurchases}</p>
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 group-hover:bg-emerald-500/10 group-hover:border-emerald-500/30 transition-all duration-300">
            <CreditCard className="h-6 w-6 text-slate-300 group-hover:text-emerald-400 transition-colors" />
          </div>
        </div>

        <div className="group relative rounded-2xl border border-white/10 bg-white/[0.02] p-5 hover:border-white/20 transition-all duration-300 backdrop-blur-md shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider mb-1">Total Purchases</p>
            <p className="text-3xl font-black text-white">{snapshot.totalPurchases}</p>
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 group-hover:bg-emerald-500/10 group-hover:border-emerald-500/30 transition-all duration-300">
            <Receipt className="h-6 w-6 text-slate-300 group-hover:text-emerald-400 transition-colors" />
          </div>
        </div>

        <div className="group relative rounded-2xl border border-white/10 bg-white/[0.02] p-5 hover:border-white/20 transition-all duration-300 backdrop-blur-md shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider mb-1">Pending Attempts</p>
            <p className="text-3xl font-black text-white">{snapshot.pendingPayments}</p>
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 group-hover:bg-red-500/10 group-hover:border-red-500/30 transition-all duration-300">
            <Activity className="h-6 w-6 text-slate-300 group-hover:text-red-400 transition-colors" />
          </div>
        </div>

        <div className="group relative rounded-2xl border border-white/10 bg-white/[0.02] p-5 hover:border-white/20 transition-all duration-300 backdrop-blur-md shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider mb-1">Active Entitlements</p>
            <p className="text-3xl font-black text-white">{snapshot.activeEntitlements}</p>
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 group-hover:bg-emerald-500/10 group-hover:border-emerald-500/30 transition-all duration-300">
            <BadgeCheck className="h-6 w-6 text-slate-300 group-hover:text-emerald-400 transition-colors" />
          </div>
        </div>
      </div>

      {/* Main Ledger Table Card */}
      <div className="px-6">
        <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-xl shadow-xl space-y-6">
          
          {/* Header & Filter Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Terminal className="w-5 h-5 text-emerald-400" /> Per-User Billing Ledger
              </h2>
              <p className="text-xs text-slate-400 font-light mt-0.5">Showing {filteredRows.length} filtered customer billing accounts</p>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
              {(["all", "attention", "clear", "no_activity"] as const).map((opt) => (
                <Button
                  key={opt}
                  type="button"
                  size="sm"
                  variant="ghost"
                  className={`h-8 px-3.5 rounded-lg text-xs font-semibold transition-all duration-300 ${
                    filter === opt
                      ? "bg-emerald-500 text-slate-950 font-extrabold shadow-sm"
                      : "text-slate-400 hover:bg-white/10 hover:text-white"
                  }`}
                  onClick={() => setFilter(opt)}
                >
                  {opt === "all" ? "All Accounts" : opt === "attention" ? "Attention" : opt === "clear" ? "Clear" : "No Activity"}
                </Button>
              ))}
            </div>
          </div>

          {/* Table Content */}
          <div className="rounded-2xl border border-white/10 bg-black/40 overflow-hidden">
            <div className="max-h-[500px] overflow-auto">
              <Table>
                <TableHeader className="bg-white/[0.02] border-b border-white/10">
                  <TableRow>
                    <TableHead className="text-slate-300 font-bold text-xs py-4">User Identity</TableHead>
                    <TableHead className="text-slate-300 font-bold text-xs py-4 text-center">Completed Purchases</TableHead>
                    <TableHead className="text-slate-300 font-bold text-xs py-4 text-center">Pending Attempts</TableHead>
                    <TableHead className="text-slate-300 font-bold text-xs py-4 text-center">Active Entitlements</TableHead>
                    <TableHead className="text-slate-300 font-bold text-xs py-4 text-center">Expired</TableHead>
                    <TableHead className="text-slate-300 font-bold text-xs py-4 text-center">Revoked</TableHead>
                    <TableHead className="text-slate-300 font-bold text-xs py-4">Status State</TableHead>
                    <TableHead className="text-slate-300 font-bold text-xs py-4">System Message</TableHead>
                    <TableHead className="text-slate-300 font-bold text-xs py-4 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((r) => (
                    <TableRow key={r.user_id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group/row">
                      <TableCell className="font-mono text-xs text-slate-300 py-3.5">
                        {emailByUser[r.user_id] || r.user_id}
                      </TableCell>
                      <TableCell className="text-center font-bold text-slate-200">{r.purchase_count}</TableCell>
                      <TableCell className="text-center font-semibold text-slate-200">
                        {r.pending_payment_count > 0 ? (
                          <span className="text-red-400 font-extrabold">{r.pending_payment_count}</span>
                        ) : (
                          "0"
                        )}
                      </TableCell>
                      <TableCell className="text-center font-semibold text-emerald-400">{r.entitlement_active}</TableCell>
                      <TableCell className="text-center text-slate-400">{r.entitlement_expired}</TableCell>
                      <TableCell className="text-center text-slate-400">
                        {r.entitlement_revoked > 0 ? (
                          <span className="text-amber-400 font-semibold">{r.entitlement_revoked}</span>
                        ) : (
                          "0"
                        )}
                      </TableCell>
                      <TableCell className="py-3.5">{paymentStateBadge(r)}</TableCell>
                      <TableCell className="text-xs text-slate-400 font-light py-3.5 max-w-[200px] truncate">
                        {paymentStateReason(r)}
                      </TableCell>
                      <TableCell className="text-right py-3.5">
                        <div className="flex justify-end gap-1.5 opacity-80 group-hover/row:opacity-100 transition-opacity">
                          <Button asChild variant="ghost" size="sm" className="h-8 text-xs hover:bg-white/5 text-slate-300 hover:text-white rounded-lg">
                            <Link href={`/admin/billing/payments?user_id=${encodeURIComponent(r.user_id)}&status=pending`}>
                              Payments <ExternalLink className="ml-1 h-3 w-3" />
                            </Link>
                          </Button>
                          <Button asChild variant="ghost" size="sm" className="h-8 text-xs hover:bg-emerald-500/10 text-emerald-400 hover:text-emerald-300 rounded-lg">
                            <Link href={`/admin/users?focus_user=${encodeURIComponent(r.user_id)}`}>
                              Open Account <ExternalLink className="ml-1 h-3 w-3" />
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="py-16 text-center text-sm text-slate-500 font-light">
                        No billing accounts match the selected state filter.
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
