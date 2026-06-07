"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { api, type AdminDeployment } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { showToast } from "@/components/toast"

function ageText(iso?: string) {
  if (!iso) return "—"
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 60) return `${Math.max(mins, 0)}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

type StatusFilter = "all" | "queued" | "running" | "failed" | "terminated" | "in_flight"
type DateFilter = "all" | "24h" | "7d" | "30d"
type SortMode = "updated_desc" | "status_severity" | "user_az"
type ViewMode = "flat" | "by_user"

function safeObj(value: unknown): Record<string, any> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, any>
  return null
}

function expectedVmCount(labType?: string) {
  return (labType || "").toLowerCase() === "windows" ? 5 : 0
}

function knownVmCount(deployment: AdminDeployment) {
  const raw = (deployment as any).terraform_outputs
  let parsed: any = raw
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw)
    } catch {
      parsed = null
    }
  }
  const obj = safeObj(parsed)
  const summary = safeObj(obj?.lab_summary)
  const value = safeObj(summary?.value)
  const instances = safeObj(value?.instances) || safeObj(summary?.instances) || safeObj(obj?.instances) || {}
  return Object.keys(instances).length
}

function vmProgressLabel(deployment: AdminDeployment) {
  const expected = expectedVmCount(deployment.lab_type)
  if (expected === 0) return "—"
  const known = knownVmCount(deployment)
  if (known > 0) return `${Math.min(known, expected)}/${expected}`
  const status = (deployment.status || "").toLowerCase()
  if (status === "running") return `${expected}/${expected}`
  if (["queued", "provisioning", "terminating"].includes(status)) return `0/${expected}`
  if (["failed", "cleanup_failed"].includes(status)) return `partial/${expected}`
  return `0/${expected}`
}

export default function DeploymentDetailIndexPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedId = searchParams.get("deployment_id") || ""
  const [loading, setLoading] = useState(true)
  const [userQuery, setUserQuery] = useState("")
  const [deployments, setDeployments] = useState<AdminDeployment[]>([])
  const [selectedId, setSelectedId] = useState(preselectedId)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [labFilter, setLabFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState<DateFilter>("all")
  const [sortMode, setSortMode] = useState<SortMode>("updated_desc")
  const [viewMode, setViewMode] = useState<ViewMode>("flat")
  const [expandedUsers, setExpandedUsers] = useState<Record<string, boolean>>({})
  const [offset, setOffset] = useState(0)
  const pageSize = 100
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await api.allDeployments({ limit: pageSize, offset })
        setDeployments(res.deployments || [])
        setTotal(typeof res.total === "number" ? res.total : res.count || 0)
        setHasMore(Boolean(res.has_more))
      } catch (err: any) {
        showToast("error", err?.message || "Failed to load deployments")
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [offset])

  useEffect(() => {
    if (preselectedId) setSelectedId(preselectedId)
  }, [preselectedId])

  const labs = useMemo(
    () => Array.from(new Set(deployments.map((d) => d.lab_title || "Unknown lab"))).sort((a, b) => a.localeCompare(b)),
    [deployments],
  )

  const filtered = useMemo(() => {
    const q = userQuery.trim().toLowerCase()
    const now = Date.now()

    const statusMatch = (d: AdminDeployment) => {
      const s = (d.status || "").toLowerCase()
      if (statusFilter === "all") return true
      if (statusFilter === "failed") return ["failed", "cleanup_failed"].includes(s)
      if (statusFilter === "in_flight") return ["queued", "provisioning", "running", "terminating"].includes(s)
      if (statusFilter === "terminated") return ["terminated", "expired", "cleanup_done"].includes(s)
      return s === statusFilter
    }

    const dateMatch = (d: AdminDeployment) => {
      if (dateFilter === "all") return true
      const t = new Date(d.created_at || 0).getTime()
      if (!t) return false
      const dayMs = 24 * 60 * 60 * 1000
      if (dateFilter === "24h") return now - t <= dayMs
      if (dateFilter === "7d") return now - t <= 7 * dayMs
      if (dateFilter === "30d") return now - t <= 30 * dayMs
      return true
    }

    const next = deployments.filter((d) => {
      const matchesQuery =
        !q ||
        [d.user_email || "", d.user_id, d.deployment_id]
          .join(" ")
          .toLowerCase()
          .includes(q)
      const matchesLab = labFilter === "all" || (d.lab_title || "Unknown lab") === labFilter
      return matchesQuery && matchesLab && statusMatch(d) && dateMatch(d)
    })

    const severity = (s: string) => {
      const v = (s || "").toLowerCase()
      if (["failed", "cleanup_failed"].includes(v)) return 0
      if (["queued", "provisioning", "running", "terminating"].includes(v)) return 1
      return 2
    }

    next.sort((a, b) => {
      if (sortMode === "user_az") {
        const au = (a.user_email || a.user_id || "").toLowerCase()
        const bu = (b.user_email || b.user_id || "").toLowerCase()
        return au.localeCompare(bu)
      }
      if (sortMode === "status_severity") {
        const diff = severity(a.status || "") - severity(b.status || "")
        if (diff !== 0) return diff
      }
      return new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime()
    })
    return next
  }, [deployments, userQuery, labFilter, statusFilter, dateFilter, sortMode])

  const summary = useMemo(() => {
    const failed = deployments.filter((d) => ["failed", "cleanup_failed"].includes((d.status || "").toLowerCase())).length
    const users = new Set(deployments.map((d) => d.user_id)).size
    const showingUsers = new Set(filtered.map((d) => d.user_id)).size
    return { total: deployments.length, failed, users, showing: filtered.length, showingUsers }
  }, [deployments, filtered])

  const groupedByUser = useMemo(() => {
    const map = new Map<string, AdminDeployment[]>()
    for (const d of filtered) {
      const key = d.user_id
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(d)
    }
    return Array.from(map.entries()).map(([userId, rows]) => ({
      userId,
      userLabel: rows[0]?.user_email || userId,
      rows,
      failedCount: rows.filter((r) => ["failed", "cleanup_failed"].includes((r.status || "").toLowerCase())).length,
    }))
  }, [filtered])

  const vmProgressByDeploymentId = useMemo(() => {
    const map = new Map<string, string>()
    for (const d of filtered) map.set(d.deployment_id, vmProgressLabel(d))
    return map
  }, [filtered])

  const openDetail = (deploymentId: string) => {
    const selected = deployments.find((d) => d.deployment_id === deploymentId)
    const qs = new URLSearchParams({
      user_id: selected?.user_id || "",
      content_id: selected?.content_id || "",
      focus: (selected?.status || "").toLowerCase(),
    })
    router.push(`/admin/ops/individual/deployment/${encodeURIComponent(deploymentId)}?${qs.toString()}`)
  }

  return (
    <div className="space-y-6">
      <section className="border border-border bg-card p-6">
        <h1 className="text-3xl font-semibold tracking-tight">Deployment Detail</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Standalone diagnostics workspace. Search and select any deployment to open full lifecycle details.
        </p>
      </section>

      <section className="border border-border bg-card p-6">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-6">
          <input
            className="h-10 w-full border border-border bg-background px-3 text-sm"
            placeholder="User email/id..."
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
          />
          <select className="h-10 border border-border bg-background px-2 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}>
            <option value="all">Status: All</option>
            <option value="failed">Status: Failed</option>
            <option value="in_flight">Status: In Flight</option>
            <option value="queued">Status: Queued</option>
            <option value="running">Status: Running</option>
            <option value="terminated">Status: Terminated</option>
          </select>
          <select className="h-10 border border-border bg-background px-2 text-sm" value={labFilter} onChange={(e) => setLabFilter(e.target.value)}>
            <option value="all">Lab: All</option>
            {labs.map((lab) => (
              <option key={lab} value={lab}>{lab}</option>
            ))}
          </select>
          <select className="h-10 border border-border bg-background px-2 text-sm" value={dateFilter} onChange={(e) => setDateFilter(e.target.value as DateFilter)}>
            <option value="all">Date: All</option>
            <option value="24h">Last 24h</option>
            <option value="7d">Last 7d</option>
            <option value="30d">Last 30d</option>
          </select>
          <select className="h-10 border border-border bg-background px-2 text-sm" value={sortMode} onChange={(e) => setSortMode(e.target.value as SortMode)}>
            <option value="updated_desc">Sort: Updated desc</option>
            <option value="status_severity">Sort: Failed first</option>
            <option value="user_az">Sort: User A-Z</option>
          </select>
          <div className="flex items-center gap-2">
            <button
              className={`h-10 border px-3 text-xs font-semibold uppercase ${viewMode === "flat" ? "border-primary bg-primary/10 text-primary" : "border-border"}`}
              onClick={() => setViewMode("flat")}
            >
              Flat
            </button>
            <button
              className={`h-10 border px-3 text-xs font-semibold uppercase ${viewMode === "by_user" ? "border-primary bg-primary/10 text-primary" : "border-border"}`}
              onClick={() => setViewMode("by_user")}
            >
              By User
            </button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <button className={`border px-2 py-1 font-semibold ${statusFilter === "all" ? "border-primary bg-primary/10 text-primary" : "border-border"}`} onClick={() => setStatusFilter("all")}>All</button>
            <button className={`border px-2 py-1 font-semibold ${statusFilter === "failed" ? "border-primary bg-primary/10 text-primary" : "border-border"}`} onClick={() => setStatusFilter("failed")}>Failed</button>
            <button className={`border px-2 py-1 font-semibold ${statusFilter === "in_flight" ? "border-primary bg-primary/10 text-primary" : "border-border"}`} onClick={() => setStatusFilter("in_flight")}>In Flight</button>
            <button className={`border px-2 py-1 font-semibold ${statusFilter === "queued" ? "border-primary bg-primary/10 text-primary" : "border-border"}`} onClick={() => setStatusFilter("queued")}>Queued</button>
          </div>
          <div className="text-muted-foreground">
            Total: {summary.total} | Unique users: {summary.users} | Failed: {summary.failed} | Showing {summary.showing} of {summary.total}
          </div>
        </div>
        <div className="mt-3 flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOffset((prev) => Math.max(prev - pageSize, 0))}
            disabled={loading || offset === 0}
          >
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {Math.floor(offset / pageSize) + 1} / {Math.max(Math.ceil(total / pageSize), 1)}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOffset((prev) => prev + pageSize)}
            disabled={loading || !hasMore}
          >
            Next
          </Button>
        </div>
        <div className="mt-3 flex justify-end">
          <Button asChild variant="ghost">
            <Link href="/admin/ops/individual">Back to Individual Ops</Link>
          </Button>
        </div>

        <div className="mt-4 border border-border">
          <div className="grid grid-cols-[24%_20%_22%_12%_10%_12%] gap-x-3 border-b border-border bg-muted/20 px-3 py-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            <span className="block">Deployment ID</span>
            <span className="block">User</span>
            <span className="block">Lab</span>
            <span className="block">Status</span>
            <span className="block">VMs</span>
            <span className="block">Updated</span>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-3 py-8 text-sm text-muted-foreground">No deployments match your search.</div>
          ) : (
            <div className="max-h-[440px] overflow-y-auto">
              {viewMode === "flat"
                ? filtered.map((d) => {
                    const active = selectedId === d.deployment_id
                    return (
                      <button
                        key={d.deployment_id}
                        type="button"
                        className={`grid w-full grid-cols-[24%_20%_22%_12%_10%_12%] items-center gap-x-3 border-b border-border px-3 py-2 text-left text-xs transition-colors ${
                          active ? "bg-primary/10" : "hover:bg-muted/30"
                        }`}
                        onClick={() => {
                          setSelectedId(d.deployment_id)
                          openDetail(d.deployment_id)
                        }}
                      >
                        <span className="block min-w-0 truncate font-mono" title={d.deployment_id}>{d.deployment_id}</span>
                        <span className="block min-w-0 truncate" title={d.user_email || d.user_id}>{d.user_email || d.user_id}</span>
                        <span className="block min-w-0 truncate" title={d.lab_title}>{d.lab_title}</span>
                        <span className="block truncate uppercase">{d.status || "unknown"}</span>
                        <span className="block truncate font-mono text-muted-foreground">{vmProgressByDeploymentId.get(d.deployment_id) || "—"}</span>
                        <span className="block truncate text-muted-foreground">{ageText(d.updated_at || d.created_at)}</span>
                      </button>
                    )
                  })
                : groupedByUser.map((group) => {
                    const isOpen = expandedUsers[group.userId] ?? true
                    return (
                      <div key={group.userId} className="border-b border-border">
                        <button
                          type="button"
                          className="flex w-full items-center justify-between bg-muted/10 px-3 py-2 text-left text-xs"
                          onClick={() => setExpandedUsers((prev) => ({ ...prev, [group.userId]: !isOpen }))}
                        >
                          <span className="font-semibold">{group.userLabel}</span>
                          <span className="text-muted-foreground">
                            Deployments: {group.rows.length} | Failed: {group.failedCount} | {isOpen ? "Hide" : "Show"}
                          </span>
                        </button>
                        {isOpen
                          ? group.rows.map((d) => {
                              const active = selectedId === d.deployment_id
                              return (
                                <button
                                  key={d.deployment_id}
                                  type="button"
                                  className={`grid w-full grid-cols-[24%_20%_22%_12%_10%_12%] items-center gap-x-3 border-t border-border px-3 py-2 text-left text-xs transition-colors ${
                                    active ? "bg-primary/10" : "hover:bg-muted/30"
                                  }`}
                                  onClick={() => {
                                    setSelectedId(d.deployment_id)
                                    openDetail(d.deployment_id)
                                  }}
                                >
                                  <span className="block min-w-0 truncate font-mono" title={d.deployment_id}>{d.deployment_id}</span>
                                  <span className="block min-w-0 truncate" title={d.user_email || d.user_id}>{d.user_email || d.user_id}</span>
                                  <span className="block min-w-0 truncate" title={d.lab_title}>{d.lab_title}</span>
                                  <span className="block truncate uppercase">{d.status || "unknown"}</span>
                                  <span className="block truncate font-mono text-muted-foreground">{vmProgressByDeploymentId.get(d.deployment_id) || "—"}</span>
                                  <span className="block truncate text-muted-foreground">{ageText(d.updated_at || d.created_at)}</span>
                                </button>
                              )
                            })
                          : null}
                      </div>
                    )
                  })}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

