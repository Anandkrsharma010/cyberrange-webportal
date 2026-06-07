"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  api,
  type AdminDeployment,
  type AdminUser,
  type AdminUserOverviewRow,
} from "@/lib/api"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { AlertTriangle, Loader2, RefreshCcw, ShieldCheck, SlidersHorizontal, Wallet, Users, Activity, Terminal } from "lucide-react"
import { cn } from "@/lib/utils"

const ROLES = ["participant", "course_admin", "sys_admin"] as const
const SPINNING = new Set(["queued", "provisioning"])

type InfraState = "issues" | "running" | "spinning" | "other" | "none"
type FilterPaid = "all" | "has_purchase" | "no_purchase"
type FilterPending = "all" | "pending" | "none"
type FilterEnt = "all" | "active" | "no_active"
type FilterOwnerInfra = "all" | "any" | "running" | "spinning" | "issues" | "none"
type FilterMember = "all" | "yes" | "no"
type FilterRole = "all" | "participant" | "course_admin" | "sys_admin"
type FilterAccount = "all" | "active" | "disabled"
type QuickPreset = "all" | "needs_review" | "disabled" | "pending_payment" | "no_active_access"

type LoadIssue = {
  step: "users" | "overview" | "deployments" | "members"
  message: string
}

function extractErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message
  return fallback
}

function getInfraState(owns: AdminDeployment[]): InfraState {
  if (owns.some((d) => d.status === "failed" || d.status === "cleanup_failed")) {
    return "issues"
  }
  if (owns.some((d) => d.status === "running")) return "running"
  if (owns.some((d) => SPINNING.has(d.status))) return "spinning"
  if (owns.length > 0) return "other"
  return "none"
}

function getGovernanceFlag(
  user: AdminUser,
  row: AdminUserOverviewRow | undefined,
  owns: AdminDeployment[],
): { label: string; variant: "default" | "secondary" | "destructive" | "outline"; css: string } {
  const pending = row?.pending_payment_count ?? 0
  const revoked = row?.entitlement_revoked ?? 0
  const infraState = getInfraState(owns)
  if (!user.is_active) {
    return {
      label: "Disabled",
      variant: "destructive",
      css: "bg-red-500/10 border-red-500/20 text-red-400",
    }
  }
  if (pending > 0 || revoked > 0 || infraState === "issues") {
    return {
      label: "Review Needed",
      variant: "destructive",
      css: "bg-red-500/10 border-red-500/20 text-red-400 shadow-sm shadow-red-500/10",
    }
  }
  if (infraState === "spinning") {
    return {
      label: "In Progress",
      variant: "secondary",
      css: "bg-amber-500/10 border-amber-500/20 text-amber-400",
    }
  }
  return {
    label: "Healthy",
    variant: "outline",
    css: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
  }
}

export default function AdminUsersPage() {
  const searchParams = useSearchParams()
  const focusUserId = searchParams.get("focus_user") || ""
  const processedFocusRef = useRef<string>("")

  const [users, setUsers] = useState<AdminUser[]>([])
  const [overviewById, setOverviewById] = useState<Record<string, AdminUserOverviewRow>>({})
  const [ownerDeps, setOwnerDeps] = useState<Record<string, AdminDeployment[]>>({})
  const [memberLabs, setMemberLabs] = useState<Record<string, { lab_title: string; status: string }[]>>({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadIssues, setLoadIssues] = useState<LoadIssue[]>([])
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const [q, setQ] = useState("")
  const [filterRole, setFilterRole] = useState<FilterRole>("all")
  const [filterAccount, setFilterAccount] = useState<FilterAccount>("all")
  const [filterPending, setFilterPending] = useState<FilterPending>("all")
  const [filterEnt, setFilterEnt] = useState<FilterEnt>("all")
  const [filterPaid, setFilterPaid] = useState<FilterPaid>("all")
  const [filterOwnerInfra, setFilterOwnerInfra] = useState<FilterOwnerInfra>("all")
  const [filterMember, setFilterMember] = useState<FilterMember>("all")
  const [activePreset, setActivePreset] = useState<QuickPreset>("all")
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const router = useRouter()

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true)
    const issues: LoadIssue[] = []
    try {
      const [usersRes, overviewRes, deploymentsRes] = await Promise.allSettled([
        api.listUsers(),
        api.adminUsersOverview(),
        api.allDeployments(),
      ])

      if (usersRes.status === "fulfilled") {
        setUsers(usersRes.value.users)
      } else {
        issues.push({
          step: "users",
          message: `Could not load account list: ${extractErrorMessage(usersRes.reason, "Request failed")}`,
        })
      }

      if (overviewRes.status === "fulfilled") {
        const next: Record<string, AdminUserOverviewRow> = {}
        for (const row of overviewRes.value.rows) {
          next[row.user_id] = row
        }
        setOverviewById(next)
      } else {
        issues.push({
          step: "overview",
          message: `Could not load billing summary: ${extractErrorMessage(overviewRes.reason, "Request failed")}`,
        })
        setOverviewById({})
      }

      if (deploymentsRes.status === "fulfilled") {
        const next: Record<string, AdminDeployment[]> = {}
        for (const dep of deploymentsRes.value.deployments) {
          if (!next[dep.user_id]) next[dep.user_id] = []
          next[dep.user_id]!.push(dep)
        }
        setOwnerDeps(next)
      } else {
        issues.push({
          step: "deployments",
          message: `Could not load lab deployments: ${extractErrorMessage(deploymentsRes.reason, "Request failed")}`,
        })
        setOwnerDeps({})
      }

      const membershipsRes = await Promise.allSettled([api.adminParticipantMembershipsByUser()])
      const membership = membershipsRes[0]
      if (membership.status === "fulfilled") {
        const next: Record<string, { lab_title: string; status: string }[]> = {}
        for (const row of membership.value.rows) {
          if (!next[row.user_id]) next[row.user_id] = []
          next[row.user_id]!.push({ lab_title: row.lab_title, status: row.status })
        }
        setMemberLabs(next)
      } else {
        issues.push({
          step: "members",
          message: `Could not load participant access: ${extractErrorMessage(membership.reason, "Request failed")}`,
        })
        setMemberLabs({})
      }

      setLoadIssues(issues)
      if (issues.length === 0) {
        setLastRefreshedAt(new Date())
        if (manual) showToast("success", "Accounts refreshed")
      } else {
        for (const issue of issues) {
          showToast("error", issue.message)
        }
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!focusUserId || users.length === 0) return
    if (processedFocusRef.current === focusUserId) return
    const target = users.find((u) => u.user_id === focusUserId)
    if (!target) return
    processedFocusRef.current = focusUserId
    setQ(target.email)
    setActivePreset("all")
  }, [focusUserId, users])

  const clearAllFilters = useCallback(() => {
    setQ("")
    setFilterRole("all")
    setFilterAccount("all")
    setFilterPending("all")
    setFilterEnt("all")
    setFilterPaid("all")
    setFilterOwnerInfra("all")
    setFilterMember("all")
    setActivePreset("all")
  }, [])

  const applyPreset = useCallback((preset: QuickPreset) => {
    clearAllFilters()
    setActivePreset(preset)
    if (preset === "disabled") setFilterAccount("disabled")
    if (preset === "pending_payment") setFilterPending("pending")
    if (preset === "no_active_access") setFilterEnt("no_active")
    if (preset === "needs_review") {
      setFilterPending("pending")
      setFilterAccount("active")
    }
  }, [clearAllFilters])

  const presetCounts = useMemo(() => {
    const all = users.length
    const disabled = users.filter((u) => !u.is_active).length
    let pendingPayment = 0
    let noActiveAccess = 0
    let needsReview = 0
    for (const u of users) {
      const o = overviewById[u.user_id]
      const owns = ownerDeps[u.user_id] ?? []
      const pending = o?.pending_payment_count ?? 0
      const active = o?.entitlement_active ?? 0
      const revoked = o?.entitlement_revoked ?? 0
      const infra = getInfraState(owns)
      if (pending > 0) pendingPayment += 1
      if (active === 0) noActiveAccess += 1
      if (!u.is_active || pending > 0 || revoked > 0 || infra === "issues") needsReview += 1
    }
    return { all, disabled, pendingPayment, noActiveAccess, needsReview }
  }, [users, overviewById, ownerDeps])

  const activeAdvancedFilterCount = useMemo(() => {
    let count = 0
    if (filterPaid !== "all") count += 1
    if (filterPending !== "all") count += 1
    if (filterEnt !== "all") count += 1
    if (filterOwnerInfra !== "all") count += 1
    if (filterMember !== "all") count += 1
    return count
  }, [filterPaid, filterPending, filterEnt, filterOwnerInfra, filterMember])

  const filteredUsers = useMemo(() => {
    const term = q.trim().toLowerCase()
    return users.filter((u) => {
      if (term) {
        const emailMatch = u.email.toLowerCase().includes(term)
        const idMatch = u.user_id.toLowerCase().includes(term)
        if (!emailMatch && !idMatch) return false
      }
      if (filterRole !== "all" && u.role !== filterRole) return false
      if (filterAccount === "active" && !u.is_active) return false
      if (filterAccount === "disabled" && u.is_active) return false

      const o = overviewById[u.user_id]
      const owns = ownerDeps[u.user_id] ?? []
      const mem = memberLabs[u.user_id] ?? []

      if (filterPaid === "has_purchase" && (o?.purchase_count ?? 0) < 1) return false
      if (filterPaid === "no_purchase" && (o?.purchase_count ?? 0) > 0) return false
      if (filterPending === "pending" && (o?.pending_payment_count ?? 0) < 1) return false
      if (filterPending === "none" && (o?.pending_payment_count ?? 0) > 0) return false
      if (filterEnt === "active" && (o?.entitlement_active ?? 0) < 1) return false
      if (filterEnt === "no_active" && (o?.entitlement_active ?? 0) > 0) return false

      const hasRunning = owns.some((d) => d.status === "running")
      const hasSpinning = owns.some((d) => SPINNING.has(d.status))
      const hasAnyInfra = owns.length > 0
      const hasIssues = owns.some((d) => d.status === "failed" || d.status === "cleanup_failed")
      if (filterOwnerInfra === "running" && !hasRunning) return false
      if (filterOwnerInfra === "spinning" && !hasSpinning) return false
      if (filterOwnerInfra === "issues" && !hasIssues) return false
      if (filterOwnerInfra === "any" && !hasAnyInfra) return false
      if (filterOwnerInfra === "none" && hasAnyInfra) return false
      if (filterMember === "yes" && mem.length === 0) return false
      if (filterMember === "no" && mem.length > 0) return false
      return true
    })
  }, [
    users,
    q,
    filterRole,
    filterAccount,
    filterPaid,
    filterPending,
    filterEnt,
    filterOwnerInfra,
    filterMember,
    overviewById,
    ownerDeps,
    memberLabs,
  ])

  const changeRole = async (userId: string, currentRole: string, newRole: string, email: string) => {
    if (currentRole === newRole) return
    const needsConfirmation =
      newRole === "sys_admin" ||
      currentRole === "sys_admin" ||
      (currentRole === "participant" && newRole === "course_admin")
    if (
      needsConfirmation &&
      !window.confirm(`Confirm role change for ${email}\n\n${currentRole} -> ${newRole}`)
    ) {
      return
    }
    setBusyId(userId)
    try {
      await api.setRole(userId, newRole)
      showToast("success", `Role updated to ${newRole}`)
      await load()
    } catch (err: unknown) {
      showToast("error", err instanceof Error ? err.message : "Failed to update role")
    } finally {
      setBusyId(null)
    }
  }

  const disableUser = async (userId: string) => {
    const target = users.find((u) => u.user_id === userId)
    if (target && !window.confirm(`Disable account ${target.email}?\n\nThis blocks login immediately.`)) {
      return
    }
    setBusyId(userId)
    try {
      await api.disableUser(userId)
      showToast("success", "User disabled")
      await load()
    } catch (err: unknown) {
      showToast("error", err instanceof Error ? err.message : "Failed to disable user")
    } finally {
      setBusyId(null)
    }
  }

  const enableUser = async (userId: string) => {
    const target = users.find((u) => u.user_id === userId)
    if (target && !window.confirm(`Enable account ${target.email}?\n\nThis restores login access immediately.`)) {
      return
    }
    setBusyId(userId)
    try {
      await api.enableUser(userId)
      showToast("success", "User enabled")
      await load()
    } catch (err: unknown) {
      showToast("error", err instanceof Error ? err.message : "Failed to enable user")
    } finally {
      setBusyId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#0A0A0B]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-16 w-16">
            <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 animate-pulse" />
            <Loader2 className="h-16 w-16 animate-spin text-emerald-500" />
          </div>
          <p className="text-sm font-medium text-slate-400 animate-pulse">Loading identity accounts index...</p>
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
                <Users className="w-3.5 h-3.5" /> Identity & Access
              </span>
              <Badge className="bg-white/5 border border-white/10 text-slate-400 text-xs px-2.5 py-0.5">Accounts</Badge>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">User Accounts</h1>
            <p className="text-slate-400 text-sm max-w-2xl leading-relaxed font-light font-sans">
              Manage user roles, login statuses, and access credentials. Audit commercial health, review flagged issues, and supervise active participant profiles.
            </p>
          </div>
        </div>
      </section>

      {loadIssues.length > 0 && (
        <div className="px-6">
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400 space-y-1">
            <p className="font-bold flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> Load warnings:</p>
            <ul className="list-disc pl-5 font-light text-slate-300">
              {loadIssues.map((issue, idx) => (
                <li key={idx}>{issue.message}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Main Panel */}
      <div className="px-6 space-y-6">
        {/* Toolbar & Filter Panel */}
        <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-xl shadow-xl space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              className="h-11 min-w-[280px] flex-1 rounded-xl border-white/10 bg-white/5 text-sm text-white placeholder-slate-500"
              placeholder="Search by email or user id..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            
            <Select value={filterRole} onValueChange={(v) => setFilterRole(v as FilterRole)}>
              <SelectTrigger className="h-11 w-44 rounded-xl border-white/10 bg-white/5 text-white">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent className="bg-slate-950 border-white/10 text-white rounded-xl">
                <SelectItem value="all">All Roles</SelectItem>
                {ROLES.map((role) => (
                  <SelectItem key={role} value={role}>{role}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterAccount} onValueChange={(v) => setFilterAccount(v as FilterAccount)}>
              <SelectTrigger className="h-11 w-44 rounded-xl border-white/10 bg-white/5 text-white">
                <SelectValue placeholder="All Accounts" />
              </SelectTrigger>
              <SelectContent className="bg-slate-950 border-white/10 text-white rounded-xl">
                <SelectItem value="all">All Accounts</SelectItem>
                <SelectItem value="active">Active Status</SelectItem>
                <SelectItem value="disabled">Disabled Status</SelectItem>
              </SelectContent>
            </Select>

            <Select value={activePreset} onValueChange={(v) => applyPreset(v as QuickPreset)}>
              <SelectTrigger className="h-11 w-52 rounded-xl border-white/10 bg-white/5 text-white">
                <SelectValue placeholder="Quick Filter View" />
              </SelectTrigger>
              <SelectContent className="bg-slate-950 border-white/10 text-white rounded-xl">
                <SelectItem value="all">All ({presetCounts.all})</SelectItem>
                <SelectItem value="needs_review">Needs Review ({presetCounts.needsReview})</SelectItem>
                <SelectItem value="disabled">Disabled ({presetCounts.disabled})</SelectItem>
                <SelectItem value="pending_payment">Pending Payments ({presetCounts.pendingPayment})</SelectItem>
                <SelectItem value="no_active_access">No Active Access ({presetCounts.noActiveAccess})</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="outline"
                className="h-11 rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10 font-semibold px-4 text-xs"
                onClick={() => setShowAdvancedFilters((prev) => !prev)}
              >
                <SlidersHorizontal className="mr-2 h-4 w-4 text-slate-400" />
                Advanced Filters
                {activeAdvancedFilterCount > 0 && (
                  <span className="ml-2 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 px-2 py-0.5 text-[10px] font-bold">
                    {activeAdvancedFilterCount}
                  </span>
                )}
              </Button>

              <Button
                variant="outline"
                className="h-11 rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10 font-semibold px-4 text-xs"
                onClick={() => void load(true)}
                disabled={refreshing}
              >
                {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                Refresh
              </Button>

              <Button
                variant="ghost"
                className="h-11 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 px-4 text-xs"
                onClick={clearAllFilters}
              >
                Reset
              </Button>
            </div>
          </div>

          {showAdvancedFilters && (
            <div className="grid gap-3 rounded-2xl border border-white/15 bg-white/[0.01] p-5 md:grid-cols-2 lg:grid-cols-5">
              <Select value={filterPaid} onValueChange={(v) => setFilterPaid(v as FilterPaid)}>
                <SelectTrigger className="h-10 rounded-lg border-white/10 bg-white/5 text-slate-300"><SelectValue placeholder="Purchases" /></SelectTrigger>
                <SelectContent className="bg-slate-950 border-white/10 text-white rounded-lg">
                  <SelectItem value="all">Purchases: all</SelectItem>
                  <SelectItem value="has_purchase">Has purchase</SelectItem>
                  <SelectItem value="no_purchase">No purchase</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterPending} onValueChange={(v) => setFilterPending(v as FilterPending)}>
                <SelectTrigger className="h-10 rounded-lg border-white/10 bg-white/5 text-slate-300"><SelectValue placeholder="Pending Payments" /></SelectTrigger>
                <SelectContent className="bg-slate-950 border-white/10 text-white rounded-lg">
                  <SelectItem value="all">Payments: all</SelectItem>
                  <SelectItem value="pending">Has pending payments</SelectItem>
                  <SelectItem value="none">No pending payments</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterEnt} onValueChange={(v) => setFilterEnt(v as FilterEnt)}>
                <SelectTrigger className="h-10 rounded-lg border-white/10 bg-white/5 text-slate-300"><SelectValue placeholder="Entitlements" /></SelectTrigger>
                <SelectContent className="bg-slate-950 border-white/10 text-white rounded-lg">
                  <SelectItem value="all">Entitlements: all</SelectItem>
                  <SelectItem value="active">Has active entitlements</SelectItem>
                  <SelectItem value="no_active">No active entitlements</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterOwnerInfra} onValueChange={(v) => setFilterOwnerInfra(v as FilterOwnerInfra)}>
                <SelectTrigger className="h-10 rounded-lg border-white/10 bg-white/5 text-slate-300"><SelectValue placeholder="Own Environments" /></SelectTrigger>
                <SelectContent className="bg-slate-950 border-white/10 text-white rounded-lg">
                  <SelectItem value="all">Own environments: all</SelectItem>
                  <SelectItem value="any">Has deployments</SelectItem>
                  <SelectItem value="running">Has running</SelectItem>
                  <SelectItem value="spinning">Queued/provisioning</SelectItem>
                  <SelectItem value="issues">Failed/cleanup issues</SelectItem>
                  <SelectItem value="none">No deployments</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterMember} onValueChange={(v) => setFilterMember(v as FilterMember)}>
                <SelectTrigger className="h-10 rounded-lg border-white/10 bg-white/5 text-slate-300"><SelectValue placeholder="Participant Access" /></SelectTrigger>
                <SelectContent className="bg-slate-950 border-white/10 text-white rounded-lg">
                  <SelectItem value="all">Participant: all</SelectItem>
                  <SelectItem value="yes">Added on at least one lab</SelectItem>
                  <SelectItem value="no">Not added as participant</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="text-xs text-slate-400 font-light flex items-center justify-between">
          <span>Showing {filteredUsers.length} of {users.length} accounts</span>
          {lastRefreshedAt && <span>Refreshed: {lastRefreshedAt.toLocaleTimeString()}</span>}
        </div>

        {/* Users Table Card */}
        <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-xl shadow-xl space-y-6">
          <div className="border-b border-white/10 pb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Terminal className="w-5 h-5 text-emerald-400" /> Identity Roster Indexes
            </h2>
            <p className="text-xs text-slate-400 font-light mt-0.5">Click a user row to open their operations console history.</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/40 overflow-hidden">
            <div className="max-h-[60vh] overflow-auto">
              <Table>
                <TableHeader className="bg-white/[0.02] border-b border-white/10">
                  <TableRow>
                    <TableHead className="text-slate-300 font-bold text-xs py-4 w-[36%]">Email Identity</TableHead>
                    <TableHead className="text-slate-300 font-bold text-xs py-4 w-[18%]">Assigned Role</TableHead>
                    <TableHead className="text-slate-300 font-bold text-xs py-4 text-center w-[10%]">Account Status</TableHead>
                    <TableHead className="text-slate-300 font-bold text-xs py-4 text-center w-[10%]">Active Entitlements</TableHead>
                    <TableHead className="text-slate-300 font-bold text-xs py-4 text-center w-[10%]">Pending Payments</TableHead>
                    <TableHead className="text-slate-300 font-bold text-xs py-4 text-center w-[8%]">Access Flag</TableHead>
                    <TableHead className="text-slate-300 font-bold text-xs py-4 text-right w-[8%]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-16 text-center text-sm text-slate-500 font-light">
                        {users.length === 0 ? "No accounts loaded. Double check database connection." : "No accounts match current filter criteria."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((u) => {
                      const overview = overviewById[u.user_id]
                      const owns = ownerDeps[u.user_id] ?? []
                      const flag = getGovernanceFlag(u, overview, owns)
                      return (
                        <TableRow
                          key={u.user_id}
                          className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group/row cursor-pointer"
                          onClick={() => router.push(`/admin/ops/individual/user/${u.user_id}`)}
                        >
                          <TableCell className="py-3.5">
                            <p className="truncate font-semibold text-slate-200 text-sm" title={u.email}>{u.email}</p>
                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">{u.user_id}</p>
                          </TableCell>
                          
                          <TableCell
                            className="py-3.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Select
                              value={u.role}
                              disabled={busyId === u.user_id}
                              onValueChange={(nextRole) => changeRole(u.user_id, u.role, nextRole, u.email)}
                            >
                              <SelectTrigger className="h-9 w-40 rounded-lg border-white/10 bg-white/5 text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-950 border-white/10 text-white rounded-lg">
                                {ROLES.map((role) => (
                                  <SelectItem key={role} value={role}>{role}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>

                          <TableCell className="text-center py-3.5">
                            {u.is_active ? (
                              <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 shadow-sm">
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded bg-red-500/10 border border-red-500/20 px-2.5 py-0.5 text-xs font-semibold text-red-400">
                                Disabled
                              </span>
                            )}
                          </TableCell>
                          
                          <TableCell className="text-center py-3.5 text-xs">
                            <span className="inline-flex items-center justify-center gap-1 font-semibold text-slate-300">
                              <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
                              {overview?.entitlement_active ?? 0}
                            </span>
                          </TableCell>

                          <TableCell className="text-center py-3.5 text-xs">
                            <span className="inline-flex items-center justify-center gap-1 font-semibold text-slate-300">
                              <Wallet className="h-3.5 w-3.5 text-slate-400" />
                              {overview?.pending_payment_count ?? 0}
                            </span>
                          </TableCell>

                          <TableCell className="text-center py-3.5">
                            <span className={cn("inline-flex items-center gap-1 rounded border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-sm", flag.css)}>
                              {flag.label}
                            </span>
                          </TableCell>

                          <TableCell
                            className="text-right py-3.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              className={cn(
                                "h-8 rounded-lg text-xs font-semibold hover:scale-[1.02] transition-transform",
                                u.is_active
                                  ? "border-red-500/30 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                  : "border-emerald-500/30 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10",
                              )}
                              disabled={busyId === u.user_id}
                              onClick={() =>
                                u.is_active ? disableUser(u.user_id) : enableUser(u.user_id)
                              }
                            >
                              {busyId === u.user_id ? <Loader2 className="h-3 w-3 animate-spin" /> : u.is_active ? "Disable" : "Enable"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })
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
