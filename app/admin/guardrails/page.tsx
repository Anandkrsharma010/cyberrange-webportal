"use client"

import { useSearchParams } from "next/navigation"
import { Fragment, useEffect, useMemo, useState } from "react"
import {
  api,
  type Course,
  type CourseAdminRow,
} from "@/lib/api"
import { showToast } from "@/components/toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Loader2, Save, ShieldCheck, Terminal, Layers, Clock, Settings } from "lucide-react"

const DEFAULT_MAX_CONCURRENT = 10
const DEFAULT_MAX_DURATION = 4

export default function AdminGuardrailsPage() {
  const searchParams = useSearchParams()
  const initialCourseId = searchParams.get("course_id") ?? ""
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourse, setSelectedCourse] = useState("")
  const [admins, setAdmins] = useState<CourseAdminRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busyAdminId, setBusyAdminId] = useState<string | null>(null)
  const [expandedUserId, setExpandedUserId] = useState<string>("")
  const [editingAdmin, setEditingAdmin] = useState<CourseAdminRow | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editForm, setEditForm] = useState<{
    userId: string
    maxConcurrent: string
    maxDuration: string
  }>({
    userId: "",
    maxConcurrent: String(DEFAULT_MAX_CONCURRENT),
    maxDuration: String(DEFAULT_MAX_DURATION),
  })
  const [fieldErrors, setFieldErrors] = useState<{
    maxConcurrent?: string
    maxDuration?: string
  }>({})

  const loadCourses = async () => {
    try {
      const res = await api.listCourses()
      setCourses(res.courses)
      if (!selectedCourse) {
        const fromQuery = initialCourseId
          ? res.courses.find((c) => c.content_id === initialCourseId)?.content_id
          : ""
        if (fromQuery) {
          setSelectedCourse(fromQuery)
        } else if (res.courses[0]) {
          setSelectedCourse(res.courses[0].content_id)
        }
      }
    } catch (err: any) {
      showToast("error", err?.message || "Failed to load courses")
    } finally {
      setLoading(false)
    }
  }

  const loadAdmins = async (contentId: string) => {
    if (!contentId) return
    try {
      const res = await api.listCourseAdmins(contentId)
      setAdmins(res.admins)
    } catch (err: any) {
      showToast("error", err?.message || "Failed to load course admins")
      setAdmins([])
    }
  }

  useEffect(() => {
    loadCourses()
  }, [initialCourseId, selectedCourse])

  useEffect(() => {
    if (selectedCourse) {
      loadAdmins(selectedCourse)
      setExpandedUserId("")
      setEditingAdmin(null)
      setEditDialogOpen(false)
      setFieldErrors({})
      setEditForm({
        userId: "",
        maxConcurrent: String(DEFAULT_MAX_CONCURRENT),
        maxDuration: String(DEFAULT_MAX_DURATION),
      })
    }
  }, [selectedCourse])

  const selectedCourseTitle = useMemo(
    () => courses.find((c) => c.content_id === selectedCourse)?.title || "—",
    [courses, selectedCourse],
  )
  const isDirty = useMemo(() => {
    if (!editingAdmin) return false
    return (
      editForm.maxConcurrent !== String(editingAdmin.max_concurrent_deployments) ||
      editForm.maxDuration !== String(editingAdmin.max_duration_hours)
    )
  }, [editForm.maxConcurrent, editForm.maxDuration, editingAdmin])
  const hasFieldErrors = Boolean(fieldErrors.maxConcurrent || fieldErrors.maxDuration)

  const validateValues = (maxConcurrentRaw: string, maxDurationRaw: string) => {
    const errors: { maxConcurrent?: string; maxDuration?: string } = {}
    const maxConcurrent = Number(maxConcurrentRaw)
    const maxDuration = Number(maxDurationRaw)
    if (
      !Number.isFinite(maxConcurrent) ||
      !Number.isInteger(maxConcurrent) ||
      maxConcurrent < 1 ||
      maxConcurrent > 50
    ) {
      errors.maxConcurrent = "Must be an integer between 1 and 50."
    }
    if (
      !Number.isFinite(maxDuration) ||
      !Number.isInteger(maxDuration) ||
      maxDuration < 1 ||
      maxDuration > 72
    ) {
      errors.maxDuration = "Must be an integer between 1 and 72."
    }
    return errors
  }

  const handleSubmit = async () => {
    if (!selectedCourse) {
      showToast("error", "Select a course first")
      return
    }
    if (!editForm.userId) {
      showToast("error", "Choose a course admin row to update")
      return
    }
    const errors = validateValues(editForm.maxConcurrent, editForm.maxDuration)
    setFieldErrors(errors)
    if (errors.maxConcurrent || errors.maxDuration) {
      showToast("error", "Fix validation errors before saving")
      return
    }
    if (!isDirty) {
      showToast("success", "No changes to save")
      return
    }
    const maxConcurrent = Number(editForm.maxConcurrent)
    const maxDuration = Number(editForm.maxDuration)
    setBusyAdminId(editForm.userId)
    try {
      await api.setGuardrails(selectedCourse, editForm.userId, {
        max_concurrent_deployments: maxConcurrent,
        max_duration_hours: maxDuration,
      })
      showToast("success", "Guardrails updated")
      setEditingAdmin(null)
      setEditDialogOpen(false)
      setFieldErrors({})
      await loadAdmins(selectedCourse)
    } catch (err: any) {
      showToast("error", err?.message || "Failed to update guardrails")
    } finally {
      setBusyAdminId(null)
    }
  }

  const startEditingRow = (row: CourseAdminRow) => {
    setEditingAdmin(row)
    setEditDialogOpen(true)
    setEditForm({
      userId: row.user_id,
      maxConcurrent: String(row.max_concurrent_deployments),
      maxDuration: String(row.max_duration_hours),
    })
    setFieldErrors({})
  }

  const cancelEditing = () => {
    setEditDialogOpen(false)
    setEditingAdmin(null)
    setFieldErrors({})
    setEditForm({
      userId: "",
      maxConcurrent: String(DEFAULT_MAX_CONCURRENT),
      maxDuration: String(DEFAULT_MAX_DURATION),
    })
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#0A0A0B]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-16 w-16">
            <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 animate-pulse" />
            <Loader2 className="h-16 w-16 animate-spin text-emerald-500" />
          </div>
          <p className="text-sm font-medium text-slate-400 animate-pulse">Loading platform guardrails policy...</p>
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
                <ShieldCheck className="w-3.5 h-3.5" /> Policy Engine
              </span>
              <Badge className="bg-white/5 border border-white/10 text-slate-400 text-xs px-2.5 py-0.5">Guardrails</Badge>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">Platform Guardrails</h1>
            <p className="text-slate-400 text-sm max-w-2xl leading-relaxed font-light font-sans">
              Manage operational limits for each Course Administrator. Configure maximum concurrent active labs and lease duration policies to protect cloud infrastructure budgets.
            </p>
          </div>
        </div>
      </section>

      {/* Main Guardrails Workspace */}
      <div className="px-6 space-y-6">
        {/* Selector Card */}
        <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-xl shadow-xl space-y-4">
          <div className="space-y-1">
            <label className="text-xs uppercase font-bold text-slate-400 tracking-wider">Select Course Module</label>
            <p className="text-[10px] text-slate-500 font-light">Limits are course-specific and scoped per assigned admin.</p>
          </div>
          
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger className="h-11 rounded-xl border-white/10 bg-white/5 text-white max-w-md">
              <SelectValue placeholder="Select a course to configure" />
            </SelectTrigger>
            <SelectContent className="bg-slate-950 border-white/10 text-white rounded-xl">
              {courses.map((c) => (
                <SelectItem key={c.content_id} value={c.content_id}>
                  {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {courses.length === 0 && (
            <p className="text-xs text-red-400 font-light">
              No course definitions loaded. Create a course first.
            </p>
          )}
        </div>

        {/* Admins Table Card */}
        <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-xl shadow-xl space-y-6">
          <div className="border-b border-white/10 pb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Terminal className="w-5 h-5 text-emerald-400" /> Active Course Administrators limits
            </h2>
            <p className="text-xs text-slate-400 font-light mt-0.5">Review guardrail overrides for <span className="text-white font-semibold">{selectedCourseTitle}</span>.</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/40 overflow-hidden">
            <div className="max-h-[420px] overflow-auto">
              <Table>
                <TableHeader className="bg-white/[0.02] border-b border-white/10">
                  <TableRow>
                    <TableHead className="text-slate-300 font-bold text-xs py-4">Course Administrator</TableHead>
                    <TableHead className="text-slate-300 font-bold text-xs py-4 text-center">Max Concurrent Labs</TableHead>
                    <TableHead className="text-slate-300 font-bold text-xs py-4 text-center">Max Lease Duration</TableHead>
                    <TableHead className="text-slate-300 font-bold text-xs py-4">Assigned Time</TableHead>
                    <TableHead className="text-slate-300 font-bold text-xs py-4 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {admins.map((a) => (
                    <Fragment key={a.user_id}>
                      <TableRow className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group/row">
                        <TableCell className="py-3.5">
                          <button
                            type="button"
                            className="text-left font-bold text-slate-200 hover:text-emerald-400 hover:underline transition-colors text-sm"
                            onClick={() =>
                              setExpandedUserId((prev) =>
                                prev === a.user_id ? "" : a.user_id,
                              )
                            }
                          >
                            {a.email}
                          </button>
                        </TableCell>
                        <TableCell className="text-center py-3.5">
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 shadow-sm">
                            <Layers className="w-3.5 h-3.5" /> {a.max_concurrent_deployments} Labs
                          </span>
                        </TableCell>
                        <TableCell className="text-center py-3.5">
                          <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-xs font-semibold text-amber-400 shadow-sm">
                            <Clock className="w-3.5 h-3.5" /> {a.max_duration_hours}h Lease
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-slate-400 font-light py-3.5">
                          {new Date(a.assigned_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right py-3.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEditingRow(a)}
                            disabled={busyAdminId !== null}
                            className="h-8 text-xs hover:bg-white/5 text-slate-300 hover:text-white rounded-lg"
                          >
                            Edit Limits
                          </Button>
                        </TableCell>
                      </TableRow>
                      {expandedUserId === a.user_id && (
                        <TableRow className="bg-white/[0.01] hover:bg-white/[0.01]">
                          <TableCell colSpan={5} className="py-4 px-6 border-b border-white/5 text-xs text-slate-400 font-light">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="space-y-0.5">
                                <p className="text-[10px] uppercase font-bold text-slate-500">Policy Source</p>
                                <p className="font-semibold text-slate-300">{a.guardrail_source === "custom" ? "Custom Override" : "System Default"}</p>
                              </div>
                              <div className="space-y-0.5">
                                <p className="text-[10px] uppercase font-bold text-slate-500">Last Modified</p>
                                <p className="font-semibold text-slate-300">
                                  {new Date(a.guardrail_updated_at || a.assigned_at).toLocaleString()}
                                </p>
                              </div>
                              <div className="space-y-0.5">
                                <p className="text-[10px] uppercase font-bold text-slate-500">Modified By</p>
                                <p className="font-semibold text-slate-300">
                                  {a.guardrail_set_by_email ||
                                    (a.guardrail_set_by
                                      ? `${a.guardrail_set_by.slice(0, 8)}…`
                                      : "—")}
                                </p>
                              </div>
                              <div className="space-y-0.5">
                                <p className="text-[10px] uppercase font-bold text-slate-500">Usage Metrics</p>
                                <p className="font-semibold text-slate-300">
                                  {a.active_deployments_count ?? 0} active ({percentUsage(a)}% limit)
                                </p>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  ))}
                  {admins.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-16 text-center text-sm text-slate-500 font-light">
                        No course administrators assigned to this module. Add admins first.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-light pt-2">
          Platform default guardrail limits: <strong className="text-slate-300">{DEFAULT_MAX_CONCURRENT} concurrent deployments</strong> and <strong className="text-slate-300">{DEFAULT_MAX_DURATION}h max lease duration</strong> per session.
        </div>
      </div>

      {/* Edit Limits Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => !open && cancelEditing()}>
        <DialogContent className="sm:max-w-md bg-[#0E0E10] border border-white/10 text-slate-100 rounded-3xl shadow-2xl p-7 backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-white flex items-center gap-2">
              <Settings className="h-5 w-5 text-emerald-400" />
              Configure Guardrail
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs font-light">
              {editingAdmin
                ? `Override limits for ${editingAdmin.email} on ${selectedCourseTitle}.`
                : "Override guardrail limits for the selected operator."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-3">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-300">Max Concurrent Deployments (1-50)</Label>
              <Input
                type="number"
                min={1}
                max={50}
                value={editForm.maxConcurrent}
                onChange={(e) => {
                  const next = e.target.value
                  setEditForm((prev) => ({ ...prev, maxConcurrent: next }))
                  setFieldErrors(validateValues(next, editForm.maxDuration))
                }}
                className="h-11 rounded-xl border-white/10 bg-white/5 text-sm text-white focus:border-emerald-500"
              />
              {fieldErrors.maxConcurrent && (
                <p className="text-xs text-red-400 font-light">{fieldErrors.maxConcurrent}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-300">Max Lease Duration (Hours, 1-72)</Label>
              <Input
                type="number"
                min={1}
                max={72}
                value={editForm.maxDuration}
                onChange={(e) => {
                  const next = e.target.value
                  setEditForm((prev) => ({ ...prev, maxDuration: next }))
                  setFieldErrors(validateValues(editForm.maxConcurrent, next))
                }}
                className="h-11 rounded-xl border-white/10 bg-white/5 text-sm text-white focus:border-emerald-500"
              />
              {fieldErrors.maxDuration && (
                <p className="text-xs text-red-400 font-light">{fieldErrors.maxDuration}</p>
              )}
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-white/10">
            <Button
              variant="outline"
              onClick={cancelEditing}
              disabled={busyAdminId !== null}
              className="h-11 rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10 font-semibold px-6"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={busyAdminId !== null || !isDirty || hasFieldErrors}
              className="h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-8 shadow-lg shadow-emerald-500/20"
            >
              {busyAdminId !== null ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Limits
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function percentUsage(a: CourseAdminRow): number {
  if (!a.max_concurrent_deployments) return 0
  const count = a.active_deployments_count ?? 0
  return Math.min(Math.round((count / a.max_concurrent_deployments) * 100), 100)
}
