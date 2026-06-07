"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { AlertTriangle, ArrowLeft, Loader2 } from "lucide-react"
import {
  api,
  clearToken,
  type AdminBillingPaymentRow,
  type AdminDeployment,
  type AdminUser,
  type AdminUserOverviewRow,
} from "@/lib/api"
import { Button } from "@/components/ui/button"
import { showToast } from "@/components/toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

function money(amount?: number, currency?: string) {
  if (typeof amount !== "number") return "—"
  return `${(amount / 100).toFixed(2)} ${currency || ""}`.trim()
}

function ageText(iso?: string) {
  if (!iso) return "—"
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 60) return `${Math.max(mins, 0)}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function deploymentResultMeta(status?: string) {
  const normalized = (status || "unknown").toLowerCase()
  if (normalized === "running") {
    return {
      label: "RUNNING",
      className: "border-emerald-700 text-emerald-300 bg-emerald-950/30",
      hint: "Healthy deployment",
    }
  }
  if (["queued", "provisioning", "terminating"].includes(normalized)) {
    return {
      label: normalized.toUpperCase(),
      className: "border-amber-700 text-amber-300 bg-amber-950/30",
      hint: "In progress",
    }
  }
  if (["failed", "cleanup_failed"].includes(normalized)) {
    return {
      label: normalized.toUpperCase(),
      className: "border-red-700 text-red-300 bg-red-950/30",
      hint: "Needs intervention",
    }
  }
  return {
    label: normalized.toUpperCase(),
    className: "border-zinc-600 text-zinc-300 bg-zinc-900/40",
    hint: "State unknown",
  }
}

export default function UserDetailPage() {
  const params = useParams<{ userId: string }>()
  const router = useRouter()
  const userId = decodeURIComponent(params.userId || "")
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [overviewById, setOverviewById] = useState<Record<string, AdminUserOverviewRow>>({})
  const [deployments, setDeployments] = useState<AdminDeployment[]>([])
  const [payments, setPayments] = useState<AdminBillingPaymentRow[]>([])
  const [confirmSuspendOpen, setConfirmSuspendOpen] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [u, ov, d, p] = await Promise.all([
        api.listUsers(),
        api.adminUsersOverview(),
        api.allDeployments(),
        api.adminBillingPayments({ limit: 500, user_id: userId }),
      ])
      setUsers(u.users)
      const map: Record<string, AdminUserOverviewRow> = {}
      for (const row of ov.rows) map[row.user_id] = row
      setOverviewById(map)
      setDeployments(d.deployments.filter((x) => x.user_id === userId))
      setPayments(p.rows)
    } catch (err: any) {
      const msg = (err?.message || "Failed to load user detail").toLowerCase()
      if (msg.includes("token") || msg.includes("unauthorized")) {
        clearToken()
        showToast("info", "Session expired. Please login again.")
        router.replace("/login")
        return
      }
      showToast("error", err?.message || "Failed to load user detail")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [userId])

  const user = useMemo(() => users.find((u) => u.user_id === userId) || null, [users, userId])
  const overview = overviewById[userId]

  const purchases = useMemo(
    () =>
      [...payments]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 8),
    [payments],
  )

  const entitlementRows = useMemo(() => {
    const byContent = new Map<string, AdminBillingPaymentRow>()
    for (const p of purchases) {
      const key = p.content_id || p.content_title || p.gateway_order_id
      if (!key) continue
      const prev = byContent.get(key)
      if (!prev || new Date(p.created_at).getTime() > new Date(prev.created_at).getTime()) byContent.set(key, p)
    }
    return Array.from(byContent.values())
  }, [purchases])

  const recentDeployments = useMemo(
    () => [...deployments].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()).slice(0, 8),
    [deployments],
  )

  const eventTimeline = useMemo(() => {
    const events: Array<{ time: string; title: string; subtitle?: string }> = []
    if (recentDeployments[0]) {
      events.push({
        time: ageText(recentDeployments[0].created_at),
        title: `Deployment ${recentDeployments[0].status}`,
        subtitle: recentDeployments[0].lab_title,
      })
    }
    if (purchases[0]) {
      events.push({
        time: ageText(purchases[0].created_at),
        title: `Payment ${purchases[0].status}`,
        subtitle: purchases[0].content_title || purchases[0].gateway_order_id,
      })
    }
    if (user?.created_at) {
      events.push({
        time: new Date(user.created_at).toLocaleDateString(),
        title: "Account created",
      })
    }
    return events
  }, [purchases, recentDeployments, user?.created_at])

  const exportJson = () => {
    const payload = {
      user,
      overview,
      purchases,
      recentDeployments,
      entitlements: entitlementRows.map((e) => ({
        title: e.content_title || e.content_id || "Unknown",
        status: e.entitlement_status || "none",
        payment_status: e.status,
      })),
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `user-${userId}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const toggleSuspend = async () => {
    if (!user) return
    setBusy(true)
    try {
      if (user.is_active) {
        await api.disableUser(user.user_id)
        showToast("success", "Account suspended")
      } else {
        await api.enableUser(user.user_id)
        showToast("success", "Account enabled")
      }
      await load()
    } catch (err: any) {
      showToast("error", err?.message || "Failed to update account status")
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">USER_MANAGEMENT_IDENTITY</p>
          <h1 className="text-4xl font-semibold tracking-tight">USER_ID: {user?.user_id || userId}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button className="h-9 border border-border px-3 text-xs font-bold uppercase" onClick={exportJson}>
            EXPORT_JSON
          </button>
          <button
            className="h-9 border border-border px-3 text-xs font-bold uppercase text-muted-foreground opacity-60 cursor-not-allowed"
            disabled
            title="Coming Soon"
          >
            EDIT_USER_PROFILE (Coming Soon)
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <section className="border border-border bg-card p-4 lg:col-span-8">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">BASIC_INFORMATION</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="min-w-0">
              <p className="text-3xl font-semibold leading-tight break-words">{user?.email || "Unknown user"}</p>
              <p className="mt-1 text-xs text-muted-foreground break-all">{user?.user_id || userId}</p>
              <span className={`mt-3 inline-flex border px-2 py-0.5 text-[10px] font-bold uppercase ${user?.is_active ? "border-primary text-primary" : "border-red-700 text-red-400"}`}>
                {user?.is_active ? "ACTIVE" : "SUSPENDED"}
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">Account created:</span> {user?.created_at ? new Date(user.created_at).toLocaleString() : "—"}</p>
              <p><span className="text-muted-foreground">Role:</span> {user?.role || "—"}</p>
              <p><span className="text-muted-foreground">Last login:</span> Coming Soon</p>
            </div>
            <div className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">Region cluster:</span> Coming Soon</p>
              <p><span className="text-muted-foreground">Risk score:</span> Coming Soon</p>
              <p><span className="text-muted-foreground">Pending payments:</span> {overview?.pending_payment_count ?? 0}</p>
            </div>
          </div>
        </section>

        <section className="border border-border bg-card p-4 lg:col-span-4">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">CRITICAL_ACTIONS</h3>
          <div className="mt-3 space-y-2">
            <button className="flex h-10 w-full items-center justify-between border border-border px-3 text-sm opacity-60 cursor-not-allowed" disabled>
              <span>Resend Access Token</span>
              <span>Coming Soon</span>
            </button>
            <button className="flex h-10 w-full items-center justify-between border border-border px-3 text-sm opacity-60 cursor-not-allowed" disabled>
              <span>Resync Payment Method</span>
              <span>Coming Soon</span>
            </button>
            <button className="flex h-10 w-full items-center justify-between border border-border px-3 text-sm opacity-60 cursor-not-allowed" disabled>
              <span>Grant Temp Entitlement (24h)</span>
              <span>Coming Soon</span>
            </button>
            <button
              className="flex h-10 w-full items-center justify-between border border-red-700 px-3 text-sm text-red-400"
              onClick={() => setConfirmSuspendOpen(true)}
              disabled={busy}
            >
              <span>{user?.is_active ? "FORCE_SUSPEND_ACCOUNT" : "RESTORE_ACCOUNT"}</span>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
            </button>
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <section className="border border-border bg-card lg:col-span-7">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">PURCHASE_HISTORY</h3>
            <span className="text-xs text-muted-foreground">COUNT: {purchases.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                  <th className="px-4 py-2 text-left">TX_ID</th>
                  <th className="px-4 py-2 text-left">Product</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                  <th className="px-4 py-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {purchases.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-muted-foreground" colSpan={4}>No purchase history found.</td>
                  </tr>
                ) : (
                  purchases.map((p) => (
                    <tr key={p.payment_id} className="border-b border-border/70 text-xs">
                      <td className="px-4 py-2 font-mono">{p.payment_id.slice(0, 12)}</td>
                      <td className="px-4 py-2">{p.content_title || p.content_id || "Unknown"}</td>
                      <td className="px-4 py-2 text-right font-mono">{money(p.amount, p.currency)}</td>
                      <td className="px-4 py-2 text-center">
                        <span className="inline-flex border border-zinc-500 px-2 py-0.5 text-[10px] font-bold uppercase">
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="border border-border bg-card p-4 lg:col-span-5">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">ACTIVE_ENTITLEMENTS</h3>
          <div className="mt-3 space-y-2">
            {entitlementRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No entitlement records found.</p>
            ) : (
              entitlementRows.map((e) => (
                <div key={e.payment_id} className="flex items-center justify-between border border-border px-3 py-2 text-sm">
                  <span className="truncate pr-2">{e.content_title || e.content_id || "Unknown item"}</span>
                  <span className="text-xs uppercase text-muted-foreground">{e.entitlement_status || "none"}</span>
                </div>
              ))
            )}
            <button className="w-full border border-dashed border-border px-3 py-2 text-left text-sm text-muted-foreground opacity-70 cursor-not-allowed" disabled>
              Provision New... (Coming Soon)
            </button>
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <section className="border border-border bg-card lg:col-span-8">
          <div className="border-b border-border px-4 py-3">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">RECENT_DEPLOYMENT_HISTORY</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                  <th className="px-4 py-2 text-left">DEP_ID</th>
                  <th className="px-4 py-2 text-left">LAB</th>
                  <th className="px-4 py-2 text-left">Time</th>
                  <th className="px-4 py-2 text-left">Result</th>
                </tr>
              </thead>
              <tbody>
                {recentDeployments.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-muted-foreground" colSpan={4}>No deployments for this user.</td>
                  </tr>
                ) : (
                  recentDeployments.map((d) => (
                    <tr key={d.deployment_id} className="border-b border-border/70 text-xs">
                      {(() => {
                        const result = deploymentResultMeta(d.status)
                        return (
                          <>
                      <td className="px-4 py-2 font-mono">{d.deployment_id.slice(0, 12)}</td>
                      <td className="px-4 py-2">{d.lab_title}</td>
                      <td className="px-4 py-2">{d.created_at ? new Date(d.created_at).toLocaleString() : "—"}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex border px-2 py-0.5 text-[10px] font-bold uppercase ${result.className}`}>
                            {result.label}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{result.hint}</span>
                        </div>
                      </td>
                          </>
                        )
                      })()}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="border border-border bg-card p-4 lg:col-span-4">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">EVENT_TIMELINE</h3>
          <div className="mt-3 space-y-3 border-l border-border pl-4">
            {eventTimeline.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events available yet.</p>
            ) : (
              eventTimeline.map((e, i) => (
                <div key={`${e.title}-${i}`} className="relative">
                  <span className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border ${i === 0 ? "border-primary bg-primary" : "border-zinc-500 bg-zinc-700"}`} />
                  <p className="text-[10px] uppercase text-muted-foreground">{e.time}</p>
                  <p className="text-sm font-semibold">{e.title}</p>
                  {e.subtitle ? <p className="text-xs text-muted-foreground">{e.subtitle}</p> : null}
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
        <span>OBJECT_REF: {user?.user_id || userId}</span>
        <div className="flex items-center gap-3">
          <span className="opacity-70">SCHEMA_DOCS</span>
          <span className="opacity-70">AUDIT_LOGS</span>
          <span className="opacity-70">RELATIONSHIP_GRAPH</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/ops/individual/user">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to User Detail List
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/ops/individual">Back to Individual Ops</Link>
        </Button>
      </div>

      <AlertDialog open={confirmSuspendOpen} onOpenChange={setConfirmSuspendOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {user?.is_active ? "Suspend account?" : "Restore account?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {user?.is_active
                ? "This will immediately block login and admin-managed access for this user."
                : "This will restore login and account access for this user."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void toggleSuspend()}
              disabled={busy}
            >
              {busy
                ? "Processing..."
                : user?.is_active
                  ? "Confirm suspend"
                  : "Confirm restore"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

