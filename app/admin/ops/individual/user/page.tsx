"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, RefreshCcw } from "lucide-react"
import { api, type AdminUserOpsSummaryRow } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { showToast } from "@/components/toast"

type Segment = "all" | "attention" | "no_access" | "admins"
type SortMode = "created_desc" | "attention_first" | "user_az"
export default function UserDetailIndexPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const focusUser = searchParams.get("focus_user") || ""
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [query, setQuery] = useState("")
  const [segment, setSegment] = useState<Segment>("all")
  const [sortMode, setSortMode] = useState<SortMode>("attention_first")
  const [rows, setRows] = useState<AdminUserOpsSummaryRow[]>([])

  const load = async (manual = false) => {
    if (manual) setRefreshing(true)
    else setLoading(true)
    try {
      const res = await api.adminUsersOpsSummary()
      setRows(res.rows || [])
    } catch (err: any) {
      showToast("error", err?.message || "Failed to load user directory")
    } finally {
      if (manual) setRefreshing(false)
      else setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const stats = useMemo(() => {
    const failedUsers = new Set<string>()
    let noAccess = 0
    let admins = 0
    for (const u of rows) {
      if (u.role === "course_admin" || u.role === "sys_admin") admins += 1
      if ((u.entitlement_active ?? 0) === 0) noAccess += 1
      if ((u.pending_payment_count ?? 0) > 0 || u.has_failed_any) failedUsers.add(u.user_id)
    }
    return { total: rows.length, attention: failedUsers.size, noAccess, admins }
  }, [rows])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows
      .filter((u) => {
        const attention = (u.pending_payment_count ?? 0) > 0 || u.has_failed_any
        const noAccess = (u.entitlement_active ?? 0) === 0
        const isAdmin = u.role === "course_admin" || u.role === "sys_admin"
        if (segment === "attention" && !attention) return false
        if (segment === "no_access" && !noAccess) return false
        if (segment === "admins" && !isAdmin) return false
        if (!q) return true
        return [u.email, u.user_id, u.role].join(" ").toLowerCase().includes(q)
      })
      .sort((a, b) => {
        if (sortMode === "user_az") return a.email.localeCompare(b.email)
        const aAttention = (a.pending_payment_count ?? 0) > 0 || a.has_failed_any
        const bAttention = (b.pending_payment_count ?? 0) > 0 || b.has_failed_any
        if (sortMode === "attention_first" && aAttention !== bAttention) return aAttention ? -1 : 1
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      })
      .slice(0, 120)
  }, [rows, segment, query, sortMode])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="border border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">User Detail</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Admin governance console for account identity, access, payments, and deployment health.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="inline-flex h-9 items-center gap-2 border border-border px-3 text-xs font-semibold uppercase"
              onClick={() => void load(true)}
              disabled={refreshing}
            >
              {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
              Refresh
            </button>
            <Button asChild variant="ghost">
              <Link href="/admin/ops/individual">Back to Individual Ops</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="border border-border bg-card p-6">
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <input
            className="h-10 border border-border bg-background px-3 text-sm"
            placeholder="Search by user email, id, role..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select className="h-10 border border-border bg-background px-2 text-sm" value={segment} onChange={(e) => setSegment(e.target.value as Segment)}>
            <option value="all">Segment: All</option>
            <option value="attention">Segment: Needs Attention</option>
            <option value="no_access">Segment: No Active Access</option>
            <option value="admins">Segment: Course/Admin Users</option>
          </select>
          <select className="h-10 border border-border bg-background px-2 text-sm" value={sortMode} onChange={(e) => setSortMode(e.target.value as SortMode)}>
            <option value="attention_first">Sort: Attention first</option>
            <option value="created_desc">Sort: Newest created</option>
            <option value="user_az">Sort: User A-Z</option>
          </select>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            Total: {stats.total} | Needs attention: {stats.attention} | No access: {stats.noAccess} | Admins: {stats.admins}
          </span>
          <span>
            Showing {filtered.length} users {focusUser ? "(focused user highlighted)" : ""}
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="mt-6 rounded border border-border p-8 text-center text-sm text-muted-foreground">
            No users match current filters.
          </div>
        ) : (
          <div className="mt-4 rounded-md border border-border">
            <table className="w-full table-fixed">
              <colgroup>
                <col style={{ width: "30%" }} />
                <col style={{ width: "11%" }} />
                <col style={{ width: "11%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "17%" }} />
                <col style={{ width: "15%" }} />
              </colgroup>
              <thead className="bg-muted/20">
                <tr className="border-b border-border text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  <th className="px-2 py-2 text-left">User</th>
                  <th className="px-2 py-2 text-left">Role</th>
                  <th className="px-2 py-2 text-left">Account</th>
                  <th className="px-2 py-2 text-center">Purchases</th>
                  <th className="px-2 py-2 text-center">Access</th>
                  <th className="px-2 py-2 text-left">Lab Ops</th>
                  <th className="px-2 py-2 text-left">Health</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const hasIssue = (u.pending_payment_count ?? 0) > 0 || u.has_failed_any
                  const isFocused = focusUser === u.user_id
                  return (
                    <tr
                      key={u.user_id}
                      className={`cursor-pointer border-b border-border text-[11px] transition-colors ${
                        isFocused ? "bg-primary/10" : "hover:bg-muted/20"
                      }`}
                      onClick={() => router.push(`/admin/ops/individual/user/${encodeURIComponent(u.user_id)}`)}
                    >
                      <td className="px-2 py-2 align-middle">
                        <p className="truncate font-semibold" title={u.email}>{u.email}</p>
                        <p className="truncate text-[11px] text-muted-foreground" title={u.user_id}>{u.user_id}</p>
                      </td>
                      <td className="px-2 py-2 uppercase text-muted-foreground align-middle">{u.role.replace("_", " ")}</td>
                      <td className="px-2 py-2 align-middle">{u.is_active ? "Active" : "Suspended"}</td>
                      <td className="px-2 py-2 text-center tabular-nums align-middle">{u.purchase_count ?? 0}</td>
                      <td className="px-2 py-2 text-center tabular-nums align-middle">{u.entitlement_active ?? 0}</td>
                      <td className="px-2 py-2 align-middle">
                        <p className="truncate text-[10px] tabular-nums text-muted-foreground" title={`${u.attempts30d} attempts in 30 days`}>
                          {u.attempts30d} attempts
                        </p>
                        <p className="truncate text-[10px] tabular-nums text-red-300" title={`${u.failed30d} failed attempts in 30 days`}>
                          {u.failed30d} failed
                        </p>
                        <p className="truncate text-[10px] tabular-nums text-emerald-300" title={`${u.live_now} currently live labs`}>
                          {u.live_now} live now
                        </p>
                      </td>
                      <td className="px-2 py-2 align-middle">
                        <span className={`inline-flex rounded border px-2 py-0.5 font-bold uppercase ${hasIssue ? "border-amber-600/60 text-amber-300" : "border-zinc-600 text-zinc-300"}`}>
                          {hasIssue ? "Attention" : "Healthy"}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

