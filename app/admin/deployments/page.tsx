"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import {
  api,
  type AdminDeployment,
  type AdminUser,
  type Course,
  type DeploymentMember,
} from "@/lib/api"
import { getDeploymentOpsSummary } from "@/lib/admin-metrics"
import { showToast } from "@/components/toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Loader2,
  Server,
  PlayCircle,
  AlertCircle,
  Clock,
  RefreshCcw,
  Users2,
  Zap,
  Activity,
  Terminal,
} from "lucide-react"

function statusBadge(status: string) {
  const normal = status.toLowerCase()
  if (normal === "running") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)]">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
        Running
      </span>
    )
  }
  if (normal === "failed" || normal === "error" || normal === "cleanup_failed") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/10 border border-red-500/20 px-2.5 py-0.5 text-xs font-semibold text-red-400">
        <AlertCircle className="w-3.5 h-3.5" />
        {status}
      </span>
    )
  }
  if (normal === "queued" || normal === "provisioning") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-xs font-semibold text-amber-400">
        <Clock className="w-3.5 h-3.5 animate-spin" />
        {status}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 border border-white/10 px-2.5 py-0.5 text-xs font-semibold text-slate-400">
      {status}
    </span>
  )
}

function formatDateTime(value?: string) {
  if (!value) return "—"
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

export default function AdminDeploymentsPage() {
  const searchParams = useSearchParams()
  const focusDeploymentId = searchParams.get("focus_deployment") || ""
  const initialUserFilter = searchParams.get("user_id") || ""
  const processedFocusRef = useRef<string>("")
  const [deployments, setDeployments] = useState<AdminDeployment[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [userFilterId, setUserFilterId] = useState(initialUserFilter)

  const [detailOpen, setDetailOpen] = useState(false)
  const [detailDeployment, setDetailDeployment] = useState<AdminDeployment | null>(null)
  const [members, setMembers] = useState<DeploymentMember[]>([])
  const [membersLoading, setMembersLoading] = useState(false)

  const [deployOpen, setDeployOpen] = useState(false)
  const [courses, setCourses] = useState<Course[]>([])
  const [coursesLoading, setCoursesLoading] = useState(false)
  const [selectedCourseId, setSelectedCourseId] = useState("")
  const [selectedTargetUserId, setSelectedTargetUserId] = useState("")
  const [deployHours, setDeployHours] = useState("2")
  const [deploying, setDeploying] = useState(false)

  const load = async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const [deploymentsRes, usersRes] = await Promise.all([
        api.allDeployments(),
        api.listUsers(),
      ])
      setDeployments(deploymentsRes.deployments)
      setUsers(usersRes.users)
    } catch (err: any) {
      showToast("error", err?.message || "Failed to load deployments")
    } finally {
      if (!silent) setLoading(false)
      else setRefreshing(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const visibleDeployments = useMemo(
    () =>
      userFilterId
        ? deployments.filter((d) => d.user_id === userFilterId)
        : deployments,
    [deployments, userFilterId],
  )

  const stats = useMemo(() => {
    const summary = getDeploymentOpsSummary(visibleDeployments)
    return {
      running: summary.running,
      queued: summary.queuedOrProvisioning,
      failed: summary.failedOrCleanupFailed,
      totalMembers: summary.totalMembers,
    }
  }, [visibleDeployments])

  useEffect(() => {
    if (!focusDeploymentId || deployments.length === 0) return
    if (processedFocusRef.current === focusDeploymentId) return
    const target = deployments.find((d) => d.deployment_id === focusDeploymentId)
    if (!target) return
    processedFocusRef.current = focusDeploymentId
    void openDetails(target)
  }, [focusDeploymentId, deployments])

  const openQuickDeploy = async () => {
    setDeployOpen(true)
    setSelectedCourseId("")
    setDeployHours("2")
    setSelectedTargetUserId(initialUserFilter || "")
    if (courses.length === 0 || users.length === 0) {
      setCoursesLoading(true)
      try {
        const [coursesRes, usersRes] = await Promise.all([
          api.listCourses(),
          api.listUsers(),
        ])
        setCourses(coursesRes.courses)
        setUsers(usersRes.users)
      } catch (err: any) {
        showToast("error", err?.message || "Failed to load deploy options")
      } finally {
        setCoursesLoading(false)
      }
    }
  }

  const handleQuickDeploy = async () => {
    if (!selectedCourseId) {
      showToast("error", "Pick a course first.")
      return
    }
    const hours = parseInt(deployHours, 10)
    if (!hours || hours <= 0 || hours > 72) {
      showToast("error", "Duration must be between 1 and 72 hours.")
      return
    }
    setDeploying(true)
    try {
      const expiresAt = new Date(
        Date.now() + hours * 60 * 60 * 1000,
      ).toISOString()
      const res = selectedTargetUserId
        ? await api.sysDeployLabForUser({
            target_user_id: selectedTargetUserId,
            content_id: selectedCourseId,
            expires_at: expiresAt,
          })
        : await api.sysDeployLab({
            content_id: selectedCourseId,
            expires_at: expiresAt,
          })
      showToast(
        "success",
        selectedTargetUserId
          ? `Deployment queued for selected user (id ${res.deployment_id.slice(0, 8)}…).`
          : `Deployment queued (id ${res.deployment_id.slice(0, 8)}…).`,
      )
      setDeployOpen(false)
      await load(true)
    } catch (err: any) {
      showToast("error", err?.message || "Failed to deploy lab")
    } finally {
      setDeploying(false)
    }
  }

  const openDetails = async (dep: AdminDeployment) => {
    setDetailDeployment(dep)
    setDetailOpen(true)
    setMembers([])
    setMembersLoading(true)
    try {
      const res = await api.listMembers(dep.deployment_id)
      setMembers(res.participants)
    } catch (err: any) {
      showToast("error", err?.message || "Failed to load members")
    } finally {
      setMembersLoading(false)
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
          <p className="text-sm font-medium text-slate-400 animate-pulse">Loading active lab deployments list...</p>
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
                <Server className="w-3.5 h-3.5" /> Operations Engine
              </span>
              <Badge className="bg-white/5 border border-white/10 text-slate-400 text-xs px-2.5 py-0.5">Lab Deployments</Badge>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">Lab Deployments</h1>
            <p className="text-slate-400 text-sm max-w-2xl leading-relaxed font-light font-sans">
              Monitor running range environments, check provisioning statuses, or trigger emergency admin-level deployments using Terraform infrastructure templates.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto shrink-0">
            {userFilterId && (
              <Button variant="outline" onClick={() => setUserFilterId("")} className="h-11 rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10 text-xs font-semibold px-4">
                Clear user filter
              </Button>
            )}
            <Button onClick={openQuickDeploy} className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl h-11 px-5 shadow-[0_0_20px_-5px_rgba(16,185,129,0.4)] transition-all">
              <Zap className="mr-2 h-4 w-4" />
              Quick deploy
            </Button>
            <Button variant="outline" onClick={() => load(true)} disabled={refreshing} className="h-11 rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10 text-xs font-semibold px-4">
              {refreshing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCcw className="mr-2 h-4 w-4" />
              )}
              Refresh
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 px-6">
        <div className="group relative rounded-2xl border border-white/10 bg-white/[0.02] p-5 hover:border-white/20 transition-all duration-300 backdrop-blur-md shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider mb-1">Total Active</p>
            <p className="text-3xl font-black text-white">{visibleDeployments.length}</p>
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 transition-all duration-300">
            <Server className="h-6 w-6 text-slate-300" />
          </div>
        </div>

        <div className="group relative rounded-2xl border border-white/10 bg-white/[0.02] p-5 hover:border-white/20 transition-all duration-300 backdrop-blur-md shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider mb-1">Running</p>
            <p className="text-3xl font-black text-emerald-400">{stats.running}</p>
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 transition-all duration-300">
            <PlayCircle className="h-6 w-6 text-emerald-400" />
          </div>
        </div>

        <div className="group relative rounded-2xl border border-white/10 bg-white/[0.02] p-5 hover:border-white/20 transition-all duration-300 backdrop-blur-md shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider mb-1">Queued / Provisioning</p>
            <p className="text-3xl font-black text-amber-400">{stats.queued}</p>
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 transition-all duration-300">
            <Clock className="h-6 w-6 text-amber-400" />
          </div>
        </div>

        <div className="group relative rounded-2xl border border-white/10 bg-white/[0.02] p-5 hover:border-white/20 transition-all duration-300 backdrop-blur-md shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider mb-1">Failed</p>
            <p className="text-3xl font-black text-red-400">{stats.failed}</p>
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 transition-all duration-300">
            <AlertCircle className="h-6 w-6 text-red-400" />
          </div>
        </div>
      </div>

      {/* Main Deployments List Card */}
      <div className="px-6">
        <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-xl shadow-xl space-y-6">
          <div className="border-b border-white/10 pb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Terminal className="w-5 h-5 text-emerald-400" /> Live Deployment Inventory
            </h2>
            <p className="text-xs text-slate-400 font-light mt-0.5">Click a row's details button to audit connected user roster memberships.</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/40 overflow-hidden">
            <div className="max-h-[540px] overflow-auto">
              <Table>
                <TableHeader className="bg-white/[0.02] border-b border-white/10">
                  <TableRow>
                    <TableHead className="text-slate-300 font-bold text-xs py-4">Course / Lab Module</TableHead>
                    <TableHead className="text-slate-300 font-bold text-xs py-4">Owner Profile</TableHead>
                    <TableHead className="text-slate-300 font-bold text-xs py-4">Active Status</TableHead>
                    <TableHead className="text-slate-300 font-bold text-xs py-4 text-center">Connected Roster</TableHead>
                    <TableHead className="text-slate-300 font-bold text-xs py-4">Created Time</TableHead>
                    <TableHead className="text-slate-300 font-bold text-xs py-4">Expiration</TableHead>
                    <TableHead className="text-slate-300 font-bold text-xs py-4 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleDeployments.map((d) => (
                    <TableRow
                      key={d.deployment_id}
                      className={`border-b border-white/5 hover:bg-white/[0.02] transition-colors group/row ${
                        focusDeploymentId === d.deployment_id
                          ? "ring-1 ring-emerald-500/50 bg-emerald-500/5"
                          : ""
                      }`}
                    >
                      <TableCell className="py-3.5">
                        <div className="font-bold text-slate-200 text-sm">{d.lab_title}</div>
                        <div className="text-[10px] text-emerald-400 font-mono mt-0.5">{d.lab_type}</div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-300 py-3.5">
                        {d.user_email || d.user_id}
                      </TableCell>
                      <TableCell className="py-3.5">{statusBadge(d.status)}</TableCell>
                      <TableCell className="text-center font-bold text-slate-200 py-3.5">
                        {d.participant_count ?? 0}
                      </TableCell>
                      <TableCell className="text-xs text-slate-400 font-light py-3.5">
                        {formatDateTime(d.created_at)}
                      </TableCell>
                      <TableCell className="text-xs text-slate-400 font-light py-3.5">
                        {formatDateTime(d.expires_at)}
                      </TableCell>
                      <TableCell className="text-right py-3.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDetails(d)}
                          className="h-8 text-xs hover:bg-white/5 text-slate-300 hover:text-white rounded-lg"
                        >
                          <Users2 className="mr-1.5 h-3.5 w-3.5" />
                          Roster Members
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {visibleDeployments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="py-16 text-center text-sm text-slate-500 font-light">
                        {userFilterId ? "No active deployments found for the selected user." : "No deployments found in range history."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          
          <div className="text-[11px] text-slate-500 font-light pt-2">
            Total participant session memberships allocated globally: <strong className="text-slate-300">{stats.totalMembers}</strong>.
          </div>
        </div>
      </div>

      {/* Quick Deploy Dialog */}
      <Dialog open={deployOpen} onOpenChange={setDeployOpen}>
        <DialogContent className="sm:max-w-lg bg-[#0E0E10] border border-white/10 text-slate-100 rounded-3xl shadow-2xl p-7 backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-white flex items-center gap-2">
              <Zap className="h-5 w-5 text-emerald-400" />
              Quick Deploy (sys_admin)
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs font-light">
              Queues immediate infrastructure orchestration via <code>POST /labs/deploy</code>. Bypasses standard course guardrails.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-3">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-300">Target User Owner (Optional)</Label>
              {coursesLoading ? (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-400" /> Loading account lists…
                </div>
              ) : (
                <Select
                  value={selectedTargetUserId || "__sys_admin_self__"}
                  onValueChange={(value) =>
                    setSelectedTargetUserId(
                      value === "__sys_admin_self__" ? "" : value,
                    )
                  }
                >
                  <SelectTrigger className="h-11 rounded-xl border-white/10 bg-white/5 text-white">
                    <SelectValue placeholder="Use current sys_admin as owner" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-950 border-white/10 text-white rounded-xl">
                    <SelectItem value="__sys_admin_self__">
                      Use current sys_admin as owner
                    </SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.user_id} value={u.user_id}>
                        {u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-300">Course / Lab Template</Label>
              {coursesLoading ? (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-400" /> Loading templates…
                </div>
              ) : (
                <Select
                  value={selectedCourseId}
                  onValueChange={setSelectedCourseId}
                >
                  <SelectTrigger className="h-11 rounded-xl border-white/10 bg-white/5 text-white">
                    <SelectValue placeholder="Select a course to spin up" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-950 border-white/10 text-white rounded-xl">
                    {courses.map((c) => (
                      <SelectItem key={c.content_id} value={c.content_id}>
                        {c.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-300">Session Lease Duration (Hours, 1-72)</Label>
              <Input
                type="number"
                min={1}
                max={72}
                value={deployHours}
                onChange={(e) => setDeployHours(e.target.value)}
                className="h-11 rounded-xl border-white/10 bg-white/5 text-sm text-white focus:border-emerald-500"
              />
              <p className="text-[10px] text-slate-400 font-light italic">
                Environment resources are automatically torn down and cleaned up by background workers after lease expiry.
              </p>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-white/10">
            <Button
              variant="outline"
              onClick={() => setDeployOpen(false)}
              disabled={deploying}
              className="h-11 rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10 font-semibold px-6"
            >
              Cancel
            </Button>
            <Button onClick={handleQuickDeploy} disabled={deploying} className="h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-8 shadow-lg shadow-emerald-500/20">
              {deploying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Deploy Lab
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deployment Members Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-md bg-[#0E0E10] border border-white/10 text-slate-100 rounded-3xl shadow-2xl p-7 backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-white flex items-center gap-2">
              <Users2 className="h-5 w-5 text-emerald-400" />
              Connected Roster
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs font-light">
              {detailDeployment
                ? `${detailDeployment.lab_title} · Owner: ${
                    detailDeployment.user_email || detailDeployment.user_id
                  }`
                : ""}
            </DialogDescription>
          </DialogHeader>

          {membersLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
            </div>
          ) : members.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400 font-light">
              No participant memberships associated with this deployment lease.
            </p>
          ) : (
            <div className="max-h-80 space-y-2.5 overflow-auto pr-1 my-3">
              {members.map((m) => (
                <div key={m.user_id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4 flex flex-col gap-1">
                  <p className="text-sm font-semibold text-slate-200">{m.email}</p>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-light mt-1">
                    <span>Joined: {formatDateTime(m.added_at)}</span>
                    <span className="font-mono text-emerald-400/80">{m.user_id.slice(0, 8)}…</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <DialogFooter className="pt-4 border-t border-white/10">
            <Button variant="outline" onClick={() => setDetailOpen(false)} className="h-11 rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10 font-semibold px-6 w-full">
              Close Audit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
