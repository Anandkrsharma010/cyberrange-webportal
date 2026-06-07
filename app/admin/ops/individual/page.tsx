"use client"

import Link from "next/link"
import { Fragment, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { api, type AdminBillingPaymentRow, type AdminDeployment, type AdminUser } from "@/lib/api"
import { showToast } from "@/components/toast"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ArrowLeft, Loader2 } from "lucide-react"

type OpsRow = {
  key: string
  user_id: string
  user_email: string
  content_id: string | null
  lab_title: string
  lab_type: string
  deployment: AdminDeployment | null
  payment: AdminBillingPaymentRow | null
  paymentStatus: string
  entitlementStatus: string
  deploymentStatus: string
  failureReason: string
  updatedAt?: string
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

function statusChip(status: string) {
  const s = (status || "").toLowerCase()
  if (["failed", "cleanup_failed"].includes(s)) {
    return (
      <span className="inline-flex items-center gap-1 border border-red-500 text-red-600 px-2 py-0.5 text-[10px] font-bold uppercase">
        failed
      </span>
    )
  }
  if (["queued", "provisioning", "terminating"].includes(s)) {
    return (
      <span className="inline-flex items-center gap-1 bg-black text-white px-2 py-0.5 text-[10px] font-bold uppercase">
        in flight
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 border border-zinc-400 px-2 py-0.5 text-[10px] font-bold uppercase">
      ready
    </span>
  )
}

type MetricFilter = "all" | "ready" | "in_flight" | "failed" | "pending"

export default function IndividualOpsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>("")
  const [users, setUsers] = useState<AdminUser[]>([])
  const [deployments, setDeployments] = useState<AdminDeployment[]>([])
  const [payments, setPayments] = useState<AdminBillingPaymentRow[]>([])
  const [retryingId, setRetryingId] = useState<string | null>(null)
  const [deployingKey, setDeployingKey] = useState<string | null>(null)
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [metricFilter, setMetricFilter] = useState<MetricFilter>("all")

  const load = async (manual = false) => {
    if (manual) setRefreshing(true)
    else setLoading(true)
    try {
      const [usersRes, deploymentsRes, paymentsRes] = await Promise.allSettled([
        api.listUsers(),
        api.allDeployments(),
        api.adminBillingPayments({ limit: 500 }),
      ])
      if (usersRes.status === "fulfilled") setUsers(usersRes.value.users)
      else setUsers([])
      if (deploymentsRes.status === "fulfilled") setDeployments(deploymentsRes.value.deployments)
      else setDeployments([])
      if (paymentsRes.status === "fulfilled") setPayments(paymentsRes.value.rows)
      else setPayments([])
      setLastRefreshedAt(new Date().toISOString())
    } catch (err: any) {
      showToast("error", err?.message || "Failed to load individual ops")
    } finally {
      if (manual) setRefreshing(false)
      else setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const rows = useMemo<OpsRow[]>(() => {
    const emailByUser = users.reduce<Record<string, string>>((acc, u) => {
      acc[u.user_id] = u.email
      return acc
    }, {})

    const paymentByKey: Record<string, AdminBillingPaymentRow> = {}
    for (const p of payments) {
      if (!p.content_id) continue
      const key = `${p.user_id}:${p.content_id}`
      const prev = paymentByKey[key]
      if (!prev || new Date(p.created_at).getTime() > new Date(prev.created_at).getTime()) {
        paymentByKey[key] = p
      }
    }

    const deploymentByKey: Record<string, AdminDeployment> = {}
    for (const d of deployments) {
      if (!d.content_id) continue
      const key = `${d.user_id}:${d.content_id}`
      const prev = deploymentByKey[key]
      if (!prev || new Date(d.created_at || 0).getTime() >= new Date(prev.created_at || 0).getTime()) {
        deploymentByKey[key] = d
      }
    }

    const keys = new Set<string>([...Object.keys(paymentByKey), ...Object.keys(deploymentByKey)])
    const merged: OpsRow[] = []
    for (const key of keys) {
      const deployment = deploymentByKey[key] || null
      const payment = paymentByKey[key] || null
      const [userId, contentId] = key.split(":")
      merged.push({
        key,
        user_id: userId,
        user_email: emailByUser[userId] || payment?.email || userId,
        content_id: contentId || null,
        lab_title: deployment?.lab_title || payment?.content_title || "Unknown lab",
        lab_type: deployment?.lab_type || "unknown",
        deployment,
        payment,
        paymentStatus: (payment?.status || "none").toLowerCase(),
        entitlementStatus: (payment?.entitlement_status || "none").toLowerCase(),
        deploymentStatus: (deployment?.status || "none").toLowerCase(),
        failureReason: (deployment?.error || "").trim(),
        updatedAt: deployment?.updated_at || deployment?.created_at || payment?.created_at,
      })
    }

    return merged.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
  }, [deployments, payments, users])

  const kpis = useMemo(() => {
    const ready = rows.filter(
      (r) =>
        r.entitlementStatus === "active" &&
        ["none", "expired", "running"].includes(r.deploymentStatus),
    ).length
    const inFlight = rows.filter((r) =>
      ["queued", "provisioning", "terminating"].includes(r.deploymentStatus),
    ).length
    const failed = rows.filter((r) => ["failed", "cleanup_failed"].includes(r.deploymentStatus)).length
    const pending = rows.filter((r) => ["pending", "created"].includes(r.paymentStatus)).length
    return { ready, inFlight, failed, pending }
  }, [rows])

  const filteredRows = useMemo(() => {
    if (metricFilter === "ready") {
      return rows.filter(
        (r) =>
          r.entitlementStatus === "active" &&
          ["none", "expired", "running"].includes(r.deploymentStatus),
      )
    }
    if (metricFilter === "in_flight") {
      return rows.filter((r) =>
        ["queued", "provisioning", "terminating"].includes(r.deploymentStatus),
      )
    }
    if (metricFilter === "failed") {
      return rows.filter((r) => ["failed", "cleanup_failed"].includes(r.deploymentStatus))
    }
    if (metricFilter === "pending") {
      return rows.filter((r) => ["pending", "created"].includes(r.paymentStatus))
    }
    return rows
  }, [rows, metricFilter])

  const previewRows = useMemo(() => filteredRows.slice(0, 10), [filteredRows])

  const handleRetry = async (d: AdminDeployment) => {
    if (!d.content_id) {
      showToast("error", "Retry unavailable: content mapping is missing.")
      return
    }
    const ok = window.confirm(`Retry deployment for ${d.user_email || d.user_id}?`)
    if (!ok) return
    setRetryingId(d.deployment_id)
    try {
      const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
      await api.sysDeployLabForUser({
        target_user_id: d.user_id,
        content_id: d.content_id,
        expires_at: expiresAt,
      })
      showToast("success", "Retry queued successfully")
      await load(true)
    } catch (err: any) {
      showToast("error", err?.message || "Failed to retry deployment")
    } finally {
      setRetryingId(null)
    }
  }

  const handleDeploy = async (row: OpsRow) => {
    if (!row.content_id) {
      showToast("error", "Deploy unavailable: missing content mapping")
      return
    }
    const ok = window.confirm(`Deploy ${row.lab_title} for ${row.user_email}?`)
    if (!ok) return
    setDeployingKey(row.key)
    try {
      const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
      await api.sysDeployLabForUser({
        target_user_id: row.user_id,
        content_id: row.content_id,
        expires_at: expiresAt,
      })
      showToast("success", "Deployment queued")
      await load(true)
    } catch (err: any) {
      showToast("error", err?.message || "Failed to deploy for user")
    } finally {
      setDeployingKey(null)
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
      <section className="rounded-none border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[32px] font-semibold tracking-tight">Individual Operations</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage paid users from purchase to running lab across all cloud instances.
            </p>
            <p className="mt-2 text-[10px] font-mono text-muted-foreground">
              LAST_UPDATE: {lastRefreshedAt ? new Date(lastRefreshedAt).toLocaleString() : "—"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="border border-border bg-background px-3 py-1.5 text-xs hover:bg-muted"
              onClick={() => void load(true)}
              disabled={refreshing}
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
            <span className="border border-border bg-background px-3 py-1.5 text-xs">Mode: Monitoring</span>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Lifecycle: Admin queues deployment -&gt; <strong>lab_worker</strong> provisions -&gt;{" "}
          <strong>lab_cleanup_worker</strong> handles expiry cleanup.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="READY"
          value={kpis.ready}
          hint="Stable services"
          active={metricFilter === "ready"}
          onClick={() => setMetricFilter("ready")}
        />
        <KpiCard
          label="IN FLIGHT"
          value={kpis.inFlight}
          hint="Active deployments"
          active={metricFilter === "in_flight"}
          onClick={() => setMetricFilter("in_flight")}
        />
        <KpiCard
          label="FAILED"
          value={kpis.failed}
          hint="Requires attention"
          danger
          active={metricFilter === "failed"}
          onClick={() => setMetricFilter("failed")}
        />
        <KpiCard
          label="PENDING PAYMENTS"
          value={kpis.pending}
          hint="Verification needed"
          active={metricFilter === "pending"}
          onClick={() => setMetricFilter("pending")}
        />
      </div>

      <section className="flex items-center justify-between border border-border bg-card px-3 py-2">
        <div className="flex items-center gap-3 text-sm">
          <span className="bg-destructive px-2 py-0.5 text-[10px] font-bold text-destructive-foreground">URGENT</span>
          <span>
            {kpis.failed} failures detected. Manual intervention required.
          </span>
        </div>
        <button className="text-xs underline" onClick={() => setMetricFilter("failed")}>
          Focus failed rows
        </button>
      </section>

      <div className="grid gap-4 lg:grid-cols-12">
        <section className="lg:col-span-9 border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2 pr-6">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">QUEUE PREVIEW (TOP 10 - MONITOR ONLY)</span>
            <Link href="/admin/deployments" className="text-xs underline text-primary hover:text-primary/80 whitespace-nowrap">
              View full queue
            </Link>
          </div>
          <div className="w-full overflow-hidden">
          <Table className="w-full table-fixed">
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="w-[22%] text-xs uppercase text-muted-foreground">USER</TableHead>
                <TableHead className="w-[42%] text-xs uppercase text-muted-foreground">LAB_ID</TableHead>
                <TableHead className="w-[14%] text-xs uppercase text-muted-foreground">STATUS</TableHead>
                <TableHead className="w-[22%] text-xs uppercase text-muted-foreground text-right">ACTION</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {previewRows.map((row) => {
                const canRetry = row.deployment && ["failed", "cleanup_failed"].includes(row.deploymentStatus)
                const canDeploy =
                  row.entitlementStatus === "active" && ["none", "expired"].includes(row.deploymentStatus)
                const paymentAmount =
                  typeof row.payment?.amount === "number"
                    ? `${(row.payment.amount / 100).toFixed(2)} ${row.payment.currency || ""}`.trim()
                    : "—"
                const isExpanded = expandedKey === row.key
                return (
                  <Fragment key={row.key}>
                    <TableRow key={row.key} className="border-border hover:bg-muted/40 transition-colors">
                      <TableCell className="text-xs">
                        <div className="truncate font-mono">{row.user_email}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                      <div className="truncate font-mono" title={row.lab_title}>
                        {row.lab_title}
                      </div>
                      </TableCell>
                      <TableCell className="text-xs">{statusChip(row.deploymentStatus)}</TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex max-w-full justify-end items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          {canRetry && row.deployment ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 w-[64px] justify-center rounded-none border-black px-2 text-[10px] font-bold uppercase"
                              onClick={() => void handleRetry(row.deployment!)}
                              disabled={retryingId === row.deployment.deployment_id}
                            >
                              {retryingId === row.deployment.deployment_id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                "Retry"
                              )}
                            </Button>
                          ) : canDeploy ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 w-[64px] justify-center rounded-none border-black px-2 text-[10px] font-bold uppercase"
                              onClick={() => void handleDeploy(row)}
                              disabled={deployingKey === row.key}
                            >
                              {deployingKey === row.key ? <Loader2 className="h-3 w-3 animate-spin" /> : "Deploy"}
                            </Button>
                          ) : null}
                          <Button
                            size="sm"
                            variant="outline"
                          className="h-7 w-[64px] justify-center rounded-none border-border px-2 text-[10px] font-bold uppercase"
                            onClick={() => setExpandedKey(isExpanded ? null : row.key)}
                          >
                            {isExpanded ? "Hide" : "View"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {isExpanded ? (
                      <TableRow className="border-border bg-muted/20">
                        <TableCell colSpan={4} className="align-top">
                          <div className="grid gap-6 lg:grid-cols-2 text-xs">
                            <div className="space-y-2 min-w-0">
                              <p><strong>User:</strong> {row.user_email}</p>
                              <p className="break-all"><strong>User ID:</strong> {row.user_id}</p>
                              <p><strong>Lab:</strong> {row.lab_title}</p>
                              <p className="break-all"><strong>Content ID:</strong> {row.content_id || "—"}</p>
                              <p><strong>Last Updated:</strong> {row.updatedAt || "—"} ({ageText(row.updatedAt)})</p>
                            </div>
                            <div className="space-y-2 min-w-0">
                              <p><strong>Payment:</strong> {row.paymentStatus}</p>
                              <p><strong>Amount:</strong> {paymentAmount}</p>
                              <p className="break-all"><strong>Order ID:</strong> {row.payment?.gateway_order_id || "—"}</p>
                              <p className="break-all"><strong>Payment ID:</strong> {row.payment?.gateway_payment_id || "—"}</p>
                              <p><strong>Invoice Summary:</strong> Coming Soon</p>
                            </div>
                            <div className="space-y-2 min-w-0 lg:col-span-2">
                              <p><strong>Entitlement:</strong> {row.entitlementStatus}</p>
                              <p><strong>Deployment:</strong> {row.deploymentStatus}</p>
                              <p><strong>Failure:</strong> {row.failureReason ? "present" : "none"}</p>
                              {row.failureReason ? (
                                <p className="max-h-24 overflow-y-auto overflow-x-hidden text-[11px] leading-5 text-muted-foreground break-all whitespace-pre-wrap">
                                  {row.failureReason}
                                </p>
                              ) : null}
                            </div>
                          </div>
                          <div className="mt-4 border-t border-border pt-3">
                            <div className="flex flex-wrap gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 rounded-none border-black px-2 text-[10px] font-bold uppercase"
                                  onClick={() => {
                                    if (row.deployment?.deployment_id) {
                                      router.push(
                                        `/admin/deployments?focus_deployment=${encodeURIComponent(row.deployment.deployment_id)}`,
                                      )
                                    } else {
                                      showToast("info", "Deployment detail is not available yet for this row.")
                                    }
                                  }}
                                >
                                  Open Deployment
                                </Button>
                                <Button
                                  asChild
                                  size="sm"
                                  variant="outline"
                                  className="h-7 rounded-none px-2 text-[10px] font-bold uppercase"
                                >
                                  <Link href={`/admin/ops/individual/user/${encodeURIComponent(row.user_id)}`}>Open Account</Link>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 rounded-none border-primary px-2 text-[10px] font-bold uppercase"
                                  onClick={() => {
                                    const deploymentId = row.deployment?.deployment_id || "unknown"
                                    const query = new URLSearchParams({
                                      user_id: row.user_id,
                                      content_id: row.content_id || "",
                                      focus: row.deploymentStatus,
                                    })
                                    router.push(`/admin/ops/individual/deployment/${encodeURIComponent(deploymentId)}?${query.toString()}`)
                                  }}
                                >
                                  More Details
                                </Button>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </Fragment>
                )
              })}
            </TableBody>
          </Table>
          </div>
        </section>

        <aside className="space-y-4 lg:col-span-3">
          <div className="border border-border bg-card p-3">
            <span className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">SYSTEM_MAPPING</span>
            <div className="mt-3 space-y-2 text-[10px] font-mono text-muted-foreground">
              <p>
                <strong>KPI CLICK:</strong>{" "}
                <button className="underline" onClick={() => setMetricFilter("all")}>
                  Operations Queue
                </button>{" "}
                filtered by selected metric.
              </p>
              <p>
                <strong>ROW CLICK:</strong>{" "}
                <button className="underline" onClick={() => router.push("/admin/deployments")}>
                  Deployment Detail
                </button>{" "}
                (existing page).
              </p>
              <p>
                <strong>FAILURE CHIP:</strong>{" "}
                <button className="underline" onClick={() => setMetricFilter("failed")}>
                  Failure Triage
                </button>{" "}
                view in this table.
              </p>
            </div>
          </div>
          
        </aside>
      </div>

      <div>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Admin Operations
          </Link>
        </Button>
      </div>

      <section className="rounded border border-border bg-card p-3 text-xs text-muted-foreground">
        <p className="font-medium">Upcoming Features</p>
        <ul className="mt-2 list-disc pl-5 space-y-1">
          <li>Escalate ticket workflow from this screen (structured reason/severity/owner)</li>
          <li>Live worker stack trace stream in right diagnostic area</li>
          <li>Automated triage feed with category-based failure grouping</li>
        </ul>
      </section>
    </div>
  )
}

function KpiCard({
  label,
  value,
  hint,
  danger = false,
  active = false,
  onClick,
}: {
  label: string
  value: number
  hint: string
  danger?: boolean
  active?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full border bg-card p-4 text-left transition-colors ${
        active ? "border-primary" : "border-border hover:border-primary/50"
      }`}
    >
      <p className={`text-xs font-bold uppercase tracking-wider ${danger ? "text-destructive" : "text-muted-foreground"}`}>
        {label}
      </p>
      <p className={`mt-2 text-[40px] leading-none font-semibold ${danger ? "text-destructive" : "text-foreground"}`}>{value}</p>
      <p className={`mt-2 text-xs ${danger ? "text-destructive/80" : "text-muted-foreground"}`}>{hint}</p>
    </button>
  )
}

