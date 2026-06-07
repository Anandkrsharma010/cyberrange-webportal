"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { api, type AdminUser, type Course, type CourseAdminRow } from "@/lib/api"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ArrowRight,
  Loader2,
  ShieldCheck,
  Trash2,
  UserCog,
  Sparkles,
  Users,
  BookOpen,
  UserCheck,
  Calendar,
  AlertCircle,
  ShieldAlert,
  Terminal,
  Activity
} from "lucide-react"

export default function AdminCourseAdminsPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])
  const [admins, setAdmins] = useState<CourseAdminRow[]>([])
  const [selectedCourse, setSelectedCourse] = useState("")
  const [assignUserId, setAssignUserId] = useState("")
  const [loading, setLoading] = useState(true)
  const [assignBusy, setAssignBusy] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [removeTarget, setRemoveTarget] = useState<{
    userId: string
    email: string
  } | null>(null)

  const loadBase = async () => {
    try {
      const [cRes, uRes] = await Promise.all([api.listCourses(), api.listUsers()])
      setCourses(cRes.courses)
      setUsers(uRes.users.filter((u) => u.is_active && u.role !== "sys_admin"))
      if (!selectedCourse && cRes.courses[0]) {
        setSelectedCourse(cRes.courses[0].content_id)
      }
    } catch {
      showToast("error", "Failed to load courses and users")
    } finally {
      setLoading(false)
    }
  }

  const loadAdmins = async (contentId: string) => {
    if (!contentId) return
    try {
      const res = await api.listCourseAdmins(contentId)
      setAdmins(res.admins)
    } catch {
      showToast("error", "Failed to load course admins")
      setAdmins([])
    }
  }

  useEffect(() => {
    void loadBase()
  }, [])

  useEffect(() => {
    if (selectedCourse) void loadAdmins(selectedCourse)
  }, [selectedCourse])

  const assignableUsers = useMemo(() => {
    const existing = new Set(admins.map((a) => a.user_id))
    return users.filter((u) => !existing.has(u.user_id))
  }, [users, admins])

  const selectedCourseObj = courses.find((c) => c.content_id === selectedCourse)
  const selectedCourseTitle = selectedCourseObj?.title ?? "selected course"

  const handleAssign = async () => {
    if (!selectedCourse || !assignUserId) return
    setAssignBusy(true)
    try {
      await api.assignCourseAdmin(selectedCourse, assignUserId)
      showToast("success", "Course administrator assigned successfully")
      setAssignUserId("")
      await loadAdmins(selectedCourse)
    } catch (err: any) {
      showToast("error", err?.message || "Failed to assign course admin")
    } finally {
      setAssignBusy(false)
    }
  }

  const handleRemove = async (userId: string) => {
    if (!selectedCourse) return
    setRemovingId(userId)
    try {
      await api.removeCourseAdmin(selectedCourse, userId)
      showToast("success", "Course administrator assignment removed successfully")
      await loadAdmins(selectedCourse)
    } catch (err: any) {
      showToast("error", err?.message || "Failed to remove course admin")
    } finally {
      setRemovingId(null)
      setRemoveTarget(null)
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
          <p className="text-sm font-medium text-slate-400 animate-pulse">Loading Course Administrator & Guardrail assignment suite...</p>
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
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 font-mono text-xs text-emerald-400 font-bold shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)]">
                <ShieldCheck className="w-3.5 h-3.5" /> SysAdmin Controls
              </span>
              <Badge className="bg-white/5 border border-white/10 text-slate-400 text-xs px-2.5 py-0.5">RBAC & Guardrails</Badge>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">Course Administrator & Guardrail Management</h1>
            <p className="text-slate-400 text-sm leading-relaxed font-light">
              Assign certified instructors to specific lab courses and configure effective operational guardrail boundaries. Limits shown below represent the effective concurrent deployment caps and maximum session durations per instructor.
            </p>
          </div>

          {/* Stat Badges */}
          <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-3 backdrop-blur-md shadow-lg w-full lg:w-auto justify-around lg:justify-start shrink-0">
            <div className="px-4 py-2 text-center border-r border-white/10 last:border-0">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">Active Courses</p>
              <p className="text-2xl font-extrabold text-white flex items-center justify-center gap-1.5">
                <BookOpen className="w-5 h-5 text-emerald-400" /> {courses.length}
              </p>
            </div>
            <div className="px-4 py-2 text-center border-r border-white/10 last:border-0">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">Assigned Admins</p>
              <p className="text-2xl font-extrabold text-blue-400 flex items-center justify-center gap-1.5">
                <UserCheck className="w-5 h-5 text-blue-500" /> {admins.length}
              </p>
            </div>
            <div className="px-4 py-2 text-center">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">Eligible Users</p>
              <p className="text-2xl font-extrabold text-purple-400 flex items-center justify-center gap-1.5">
                <Users className="w-5 h-5 text-purple-500" /> {assignableUsers.length}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Workspace Grid */}
      <div className="px-6 max-w-[1600px] mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column (col-span-5): Assignment Controls & Course Selection */}
        <section className="lg:col-span-5 space-y-6">
          <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-7 backdrop-blur-xl shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h2 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                <UserCog className="w-5 h-5 text-emerald-400" /> Instructor Assignment Console
              </h2>
              <Badge className="bg-white/5 border border-white/10 text-slate-400 text-[10px] px-2.5 py-0.5 uppercase font-bold">
                Scoped RBAC
              </Badge>
            </div>

            <p className="text-xs text-slate-400 font-light leading-relaxed">
              Select a target course below, then choose an eligible platform user to grant course administrator privileges. The active instructor directory on the right will instantly reflect assignments for the selected course.
            </p>

            <div className="space-y-6 pt-2">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-300 uppercase tracking-wider">1. Select Target Course</Label>
                <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                  <SelectTrigger className="w-full h-12 rounded-2xl border-white/10 bg-white/5 text-sm text-white focus:border-emerald-500 font-semibold">
                    <SelectValue placeholder="Select course" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-950 border-white/10 text-white rounded-2xl max-h-80">
                    {courses.map((course) => (
                      <SelectItem key={course.content_id} value={course.content_id} className="focus:bg-white/10 focus:text-white py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-emerald-400 bg-white/5 px-1.5 py-0.5 rounded border border-white/10 uppercase">
                            {course.lab_type}
                          </span>
                          <span className="font-bold text-slate-200">{course.title}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-300 uppercase tracking-wider">2. Select Eligible User to Assign</Label>
                <Select value={assignUserId} onValueChange={setAssignUserId}>
                  <SelectTrigger className="w-full h-12 rounded-2xl border-white/10 bg-white/5 text-sm text-white focus:border-emerald-500 font-medium">
                    <SelectValue
                      placeholder={
                        assignableUsers.length > 0
                          ? "Select platform user to assign..."
                          : "All eligible users are currently assigned"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-950 border-white/10 text-white rounded-2xl max-h-80">
                    {assignableUsers.map((u) => (
                      <SelectItem key={u.user_id} value={u.user_id} className="focus:bg-white/10 focus:text-white py-2.5">
                        <div className="flex items-center justify-between gap-4 w-full">
                          <span className="font-semibold text-white">{u.email}</span>
                          <Badge className="bg-white/5 border border-white/10 text-slate-400 text-[10px] uppercase font-mono">
                            {u.role}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="w-full h-12 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-[0_0_30px_-5px_rgba(16,185,129,0.4)] transition-all duration-300 hover:scale-[1.02]"
                onClick={handleAssign}
                disabled={assignBusy || !selectedCourse || !assignUserId}
              >
                {assignBusy ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <UserCog className="mr-2 h-5 w-5" />
                )}
                Assign as Course Administrator
              </Button>
            </div>

            {courses.length === 0 && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>No courses found. Create a course first from the Courses dashboard.</span>
              </div>
            )}
            {selectedCourse && assignableUsers.length === 0 && (
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-slate-400 text-xs flex items-center gap-2 font-light">
                <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>All eligible platform users are already assigned as course administrators for this lab.</span>
              </div>
            )}
          </div>

          {/* Guardrails Callout Card */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-7 backdrop-blur-xl shadow-xl space-y-4">
            <div className="flex items-center gap-3 border-b border-white/10 pb-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold text-white tracking-tight">Per-Course Guardrail Policies</h3>
            </div>
            <p className="text-xs text-slate-400 font-light leading-relaxed">
              Guardrail badges displayed in the instructor directory represent the effective operational limits (custom overrides or global fallbacks) enforced during lab deployment.
            </p>
            {selectedCourse ? (
              <Button asChild size="sm" variant="outline" className="w-full h-11 rounded-2xl border-white/10 bg-white/5 text-white hover:bg-white/10 font-bold transition-all shadow">
                <Link href={`/admin/guardrails?course_id=${selectedCourse}`}>
                  <span className="flex items-center justify-center gap-2">
                    Open Guardrails for this Course
                    <ArrowRight className="w-4 h-4 text-emerald-400" />
                  </span>
                </Link>
              </Button>
            ) : (
              <Button size="sm" variant="outline" disabled className="w-full h-11 rounded-2xl border-white/10 bg-white/5 text-slate-500 font-bold">
                Open Guardrails for this Course
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </section>

        {/* Right Column (col-span-7): Active Instructors Directory */}
        <section className="lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between rounded-3xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-xl shadow-xl">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-400" /> Assigned Instructors Directory
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 font-light">Showing active administrators assigned to <span className="text-white font-bold">{selectedCourseTitle}</span></p>
            </div>

            <Badge className="bg-white/5 border border-white/10 text-slate-300 text-xs px-3 py-1 rounded-full font-bold font-mono">
              {admins.length} Assigned
            </Badge>
          </div>

          {/* Admins Cards List */}
          <div className="space-y-4">
            {admins.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.01] p-16 text-center backdrop-blur-sm">
                <Users className="mx-auto h-12 w-12 text-slate-500 mb-4 animate-pulse" />
                <h3 className="text-base font-semibold text-white mb-1">No Instructors Assigned</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4 font-light leading-relaxed">
                  No course administrators have been assigned to <span className="text-white font-bold">{selectedCourseTitle}</span> yet. Use the assignment console on the left to authorize your first instructor.
                </p>
              </div>
            ) : (
              admins.map((admin) => (
                <div
                  key={admin.user_id}
                  className="group rounded-3xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-xl shadow-lg hover:border-white/20 hover:bg-white/[0.04] transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-6 overflow-hidden relative"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/10 transition-colors" />

                  <div className="space-y-3 min-w-0 relative z-10">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-emerald-400 font-bold shadow-inner">
                        <UserCog className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-base font-bold text-white tracking-tight truncate">{admin.email}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-slate-500" /> Assigned: {new Date(admin.assigned_at).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Guardrail Badges */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
                      <Badge className="bg-white/5 border border-white/10 text-slate-300 text-xs py-1.5 px-3 rounded-xl flex items-center gap-1.5 font-medium shadow">
                        <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                        <span>Max Concurrent: <strong className="text-white font-mono">{admin.max_concurrent_deployments}</strong></span>
                      </Badge>
                      <Badge className="bg-white/5 border border-white/10 text-slate-300 text-xs py-1.5 px-3 rounded-xl flex items-center gap-1.5 font-medium shadow">
                        <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                        <span>Max Duration: <strong className="text-white font-mono">{admin.max_duration_hours}h</strong></span>
                      </Badge>
                    </div>
                  </div>

                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setRemoveTarget({ userId: admin.user_id, email: admin.email })}
                    disabled={assignBusy || removingId === admin.user_id}
                    className="h-11 rounded-2xl px-6 font-bold shrink-0 self-end sm:self-center shadow-lg transition-all relative z-10"
                  >
                    {removingId === admin.user_id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    {removingId === admin.user_id ? "Removing..." : "Remove Assignment"}
                  </Button>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={!!removeTarget} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <AlertDialogContent className="bg-[#0E0E10] border border-white/10 text-slate-100 rounded-3xl shadow-2xl p-8 backdrop-blur-2xl sm:max-w-lg">
          <AlertDialogHeader className="space-y-3">
            <AlertDialogTitle className="text-xl font-extrabold text-white flex items-center gap-2.5">
              <ShieldAlert className="w-6 h-6 text-red-500 animate-pulse" /> Remove Instructor Assignment?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400 text-xs font-light leading-relaxed">
              {removeTarget?.email
                ? `This will immediately revoke course administrator privileges for ${removeTarget.email} on "${selectedCourseTitle}".`
                : "This removes the selected user from this course immediately."}{" "}
              If this is their last active course assignment, the backend security policy may automatically demote their system role back to participant.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-6 border-t border-white/10 mt-6">
            <AlertDialogCancel disabled={removingId !== null} className="h-11 rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10 font-semibold px-6">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removeTarget && void handleRemove(removeTarget.userId)}
              disabled={removingId !== null}
              className="h-11 rounded-xl bg-red-500 hover:bg-red-400 text-slate-950 font-bold px-8 shadow-lg shadow-red-500/20"
            >
              {removingId !== null ? "Removing..." : "Confirm Revocation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
