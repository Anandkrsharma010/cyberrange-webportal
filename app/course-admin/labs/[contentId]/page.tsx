"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  api,
  type CourseManagedDeployment,
  type CourseParticipant,
  type MyCourse,
} from "@/lib/api"
import { showToast } from "@/components/toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
  ArrowLeft,
  Clock,
  Info,
  Loader2,
  PlayCircle,
  Server,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react"

function formatDateTime(value?: string) {
  if (!value) return "—"
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

function shortId(id: string) {
  return id.length > 10 ? `${id.slice(0, 8)}…` : id
}

/** Deployment is still leaving the queue or being torn down — poll for UI updates. */
function deploymentNeedsLivePoll(status: string) {
  return status === "queued" || status === "provisioning" || status === "terminating"
}

/** Another run cannot be queued until this clears (matches course /deploy guardrail). */
function deploymentPipelinePending(status: string) {
  return status === "queued" || status === "provisioning"
}

export default function CourseAdminCatalogLabDeliveryPage() {
  const params = useParams<{ contentId: string }>()
  const router = useRouter()
  const contentId =
    typeof params.contentId === "string" ? params.contentId : ""

  const [course, setCourse] = useState<MyCourse | null>(null)
  const [participants, setParticipants] = useState<CourseParticipant[]>([])
  const [deployments, setDeployments] = useState<CourseManagedDeployment[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const [enrollOpen, setEnrollOpen] = useState(false)
  const [enrollUserId, setEnrollUserId] = useState("")
  const [enrollSaving, setEnrollSaving] = useState(false)

  const [deployOpen, setDeployOpen] = useState(false)
  const [deployHours, setDeployHours] = useState<string>("2")
  const [deploying, setDeploying] = useState(false)

  const reload = useCallback(async () => {
    if (!contentId) {
      setLoading(false)
      return
    }
    try {
      const [coursesRes, participantsRes, depRes] = await Promise.all([
        api.myCourses(),
        api.listCourseParticipants(contentId),
        api.listCourseManagedDeployments(contentId),
      ])
      const found =
        coursesRes.courses.find((c) => c.content_id === contentId) || null
      setCourse(found)
      setParticipants(participantsRes.participants)
      setDeployments(depRes.deployments)
      if (!found) {
        showToast("error", "You are not assigned to this lab course.")
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load lab course"
      showToast("error", msg)
    } finally {
      setLoading(false)
    }
  }, [contentId])

  const reloadDeploymentsOnly = useCallback(async () => {
    try {
      const depRes = await api.listCourseManagedDeployments(contentId)
      setDeployments(depRes.deployments)
    } catch {
      /* avoid toast spam during background poll */
    }
  }, [contentId])

  useEffect(() => {
    if (!contentId) {
      setLoading(false)
      return
    }
    setLoading(true)
    void reload()
  }, [contentId, reload])

  const hasPipelinePending = useMemo(
    () => deployments.some((d) => deploymentPipelinePending(d.status)),
    [deployments],
  )

  const canQueueLabRun =
    Boolean(course?.is_active) &&
    !hasPipelinePending &&
    participants.length > 0

  const queueLabRunDisabledTitle = useMemo(() => {
    if (!course?.is_active) return "This lab course is inactive; you cannot queue a run."
    if (hasPipelinePending) {
      return "A run is already queued or starting. Wait until it is running or has finished before queuing another."
    }
    if (participants.length === 0) {
      return "Enroll at least one learner first. A lab run attaches everyone on the roster when you queue it."
    }
    return undefined
  }, [course?.is_active, hasPipelinePending, participants.length])

  const hasDeploymentsNeedingPoll = useMemo(
    () => deployments.some((d) => deploymentNeedsLivePoll(d.status)),
    [deployments],
  )

  useEffect(() => {
    if (!hasDeploymentsNeedingPoll) return
    const id = setInterval(() => {
      void reloadDeploymentsOnly()
    }, 4000)
    return () => clearInterval(id)
  }, [hasDeploymentsNeedingPoll, reloadDeploymentsOnly])

  const maxHours = course?.max_duration_hours ?? 4
  const maxConcurrent = course?.max_concurrent_deployments ?? 0
  const hourOptions = useMemo(() => {
    const presets = [1, 2, 4, 8, 12, 24, 48, 72]
    return presets.filter((h) => h <= maxHours)
  }, [maxHours])

  const handleEnroll = async () => {
    const trimmed = enrollUserId.trim()
    if (!trimmed) {
      showToast("error", "Enter the learner user ID (UUID).")
      return
    }
    setEnrollSaving(true)
    try {
      await api.enrollCourseParticipant(contentId, trimmed)
      showToast("success", "Participant enrolled.")
      setEnrollUserId("")
      setEnrollOpen(false)
      await reload()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to enroll"
      showToast("error", msg)
    } finally {
      setEnrollSaving(false)
    }
  }

  const handleUnenroll = async (userId: string, email: string) => {
    if (!confirm(`Unenroll ${email} from this lab course?`)) return
    setBusy(true)
    try {
      await api.unenrollCourseParticipant(contentId, userId)
      showToast("success", "Participant unenrolled.")
      await reload()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to unenroll"
      showToast("error", msg)
    } finally {
      setBusy(false)
    }
  }

  const handleDeploy = async () => {
    const hours = parseInt(deployHours, 10)
    if (!hours || hours <= 0 || hours > maxHours) {
      showToast("error", `Duration must be between 1 and ${maxHours} hours.`)
      return
    }
    setDeploying(true)
    try {
      const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
      const res = await api.deployCourseLab(contentId, {
        content_id: contentId,
        expires_at: expiresAt,
      })
      showToast(
        "success",
        `Lab run queued (${shortId(res.deployment_id)}). ${
          res.participants_added ?? 0
        } participant(s) attached as deployment members.`,
      )
      setDeployOpen(false)
      await reload()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to deploy lab"
      showToast("error", msg)
    } finally {
      setDeploying(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!course) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/course-admin")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Cohorts you operate
        </Button>
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            You are not assigned to this lab course.
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2">
          <Link href="/course-admin">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Cohorts you operate
          </Link>
        </Button>
        <section className="rounded-2xl border bg-card/40 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">{course.title}</h1>
                <Badge variant="secondary" className="text-xs font-normal">
                  Catalog lab
                </Badge>
              </div>
              {course.description && (
                <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                  {course.description}
                </p>
              )}
              <p className="mt-3 max-w-3xl text-sm text-muted-foreground leading-relaxed">
                <span className="font-medium text-foreground">What you do here:</span> build
                the learner roster, then use{" "}
                <span className="font-medium text-foreground">Queue lab run</span> to request
                one lab environment window from the platform. Each run lists as a row below;
                <span className="font-medium text-foreground"> Members</span> are the learners
                who were enrolled at the moment you queued (they join from the main learner
                app when the run is running).
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="outline" className="capitalize">
                  {course.difficulty || "unrated"}
                </Badge>
                {course.duration_minutes ? (
                  <Badge variant="outline">{course.duration_minutes} min</Badge>
                ) : null}
                <Badge variant={course.is_active ? "default" : "secondary"}>
                  {course.is_active ? "active" : "inactive"}
                </Badge>
              </div>
            </div>
            <Button
              onClick={() => setDeployOpen(true)}
              disabled={!canQueueLabRun}
              title={queueLabRunDisabledTitle}
            >
              <PlayCircle className="mr-2 h-4 w-4" />
              Queue lab run
            </Button>
          </div>
        </section>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Enrolled learners
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-3xl font-bold">{participants.length}</p>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Max concurrent runs
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-3xl font-bold">{maxConcurrent}</p>
            <PlayCircle className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Max run duration
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-3xl font-bold">{maxHours}h</p>
            <Clock className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-4 w-4" />
            Learner runtime status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground leading-relaxed">
          <p>
            This page tracks <span className="font-medium text-foreground">who is enrolled</span>{" "}
            and <span className="font-medium text-foreground">each lab run</span> you queued (queue
            → running → teardown). There is no separate per-learner infrastructure timeline here
            yet; when the platform exposes it, it will appear in this delivery view.
          </p>
          <p>
            Learners use the main learner app to open a run while it is active; if someone cannot
            connect, confirm they are on the roster and that a run is in the{" "}
            <span className="font-medium text-foreground">running</span> state below.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Learner roster</CardTitle>
          <Button size="sm" onClick={() => setEnrollOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Enroll learner
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {participants.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              No learners enrolled yet. Use <strong>Enroll learner</strong> to add a user
              by UUID (interim until email invites ship). Each enrolled learner is added as
              a deployment member on every lab run you queue.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>Enrolled</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {participants.map((p) => (
                  <TableRow key={p.user_id}>
                    <TableCell className="font-medium">{p.email}</TableCell>
                    <TableCell className="font-mono text-[10px] text-muted-foreground">
                      {p.user_id}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDateTime(p.enrolled_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        onClick={() => handleUnenroll(p.user_id, p.email)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Unenroll
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Server className="h-4 w-4" />
            Lab runs you queued
          </CardTitle>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Each row is <span className="font-medium text-foreground">one run</span> you
            asked for (queue time and expiry window).{" "}
            <span className="font-medium text-foreground">Members</span> shows who was on the
            roster when you queued; if you see a dash, that run was created before roster
            checks or the roster was empty.{" "}
            <span className="font-medium text-foreground">Failed</span> includes a short
            reason from the platform when available. While a run is{" "}
            <span className="font-medium text-foreground">queued</span> or{" "}
            <span className="font-medium text-foreground">provisioning</span>, this table
            refreshes every few seconds on this page.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {deployments.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              No lab runs yet. Queue one with <strong>Queue lab run</strong>.
            </p>
          ) : (
            <div className="max-h-[420px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Deployment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Queued</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Members</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deployments.map((d) => (
                    <TableRow key={d.deployment_id}>
                      <TableCell className="font-mono text-xs">
                        {shortId(d.deployment_id)}
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <div className="space-y-1">
                          <Badge variant="outline" className="text-xs capitalize">
                            {d.status}
                          </Badge>
                          {d.status === "failed" && d.error_message ? (
                            <p
                              className="text-xs text-destructive/90 line-clamp-3 break-words"
                              title={d.error_message}
                            >
                              {d.error_message}
                            </p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDateTime(d.created_at)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDateTime(d.expires_at)}
                      </TableCell>
                      <TableCell className="max-w-[240px] text-xs text-muted-foreground">
                        {d.members.length === 0 ? (
                          <span
                            className="text-muted-foreground"
                            title="No deployment members: roster was empty when queued, or an older run."
                          >
                            —
                          </span>
                        ) : (
                          <span className="line-clamp-2" title={d.members.map((m) => m.email).join(", ")}>
                            {d.members.map((m) => m.email).join(", ")}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={enrollOpen} onOpenChange={setEnrollOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enroll learner</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Add a learner to <span className="font-medium text-foreground">{course.title}</span>{" "}
                  so they are included on the next lab runs you queue.
                </p>
                <p>
                  <span className="font-medium text-foreground">Interim:</span> paste the
                  learner&apos;s user ID (UUID). This screen is the legacy{" "}
                  <span className="font-medium text-foreground">managed-lab</span> path (per-course
                  assignment). For email invites and seats, open the right cohort under{" "}
                  <span className="font-medium text-foreground">Cohorts you operate</span>. Until
                  email enrollment exists here, system administration can supply UUIDs from the
                  accounts directory.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="user-id">User ID (UUID)</Label>
            <Input
              id="user-id"
              value={enrollUserId}
              onChange={(e) => setEnrollUserId(e.target.value)}
              placeholder="00000000-0000-0000-0000-000000000000"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setEnrollOpen(false)}
              disabled={enrollSaving}
            >
              Cancel
            </Button>
            <Button onClick={() => void handleEnroll()} disabled={enrollSaving}>
              {enrollSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enroll
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deployOpen} onOpenChange={setDeployOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Queue lab run — {course.title}</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Starts a new lab deployment owned by you and attaches{" "}
                  <span className="font-medium text-foreground">{participants.length}</span>{" "}
                  enrolled learner(s) as deployment members.
                </p>
                <p>
                  <span className="font-medium text-foreground">Guardrails (from system administration):</span>{" "}
                  at most <span className="font-medium text-foreground">{maxConcurrent}</span>{" "}
                  concurrent active runs for this lab course, and each run may run up to{" "}
                  <span className="font-medium text-foreground">{maxHours}</span> hours.
                </p>
                <p>
                  <span className="font-medium text-foreground">One start at a time:</span> you
                  cannot queue another run while one is still{" "}
                  <span className="font-medium text-foreground">queued</span> or{" "}
                  <span className="font-medium text-foreground">provisioning</span>. Queue the
                  next run once the current one is{" "}
                  <span className="font-medium text-foreground">running</span> or has finished.
                </p>
                {participants.length === 0 ? (
                  <p className="text-destructive/90">
                    <span className="font-medium text-foreground">Roster required:</span> enroll
                    at least one learner before you can queue a run.
                  </p>
                ) : null}
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="duration">Run duration</Label>
            <Select value={deployHours} onValueChange={setDeployHours}>
              <SelectTrigger id="duration">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {hourOptions.map((h) => (
                  <SelectItem key={h} value={String(h)}>
                    {h} hour{h === 1 ? "" : "s"}
                  </SelectItem>
                ))}
                {!hourOptions.includes(maxHours) && (
                  <SelectItem value={String(maxHours)}>
                    {maxHours} hours (maximum)
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              The run expires at the selected time; infrastructure cleanup follows platform
              policy.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeployOpen(false)}
              disabled={deploying}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleDeploy()}
              disabled={deploying || participants.length === 0}
            >
              {deploying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Queue run
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
