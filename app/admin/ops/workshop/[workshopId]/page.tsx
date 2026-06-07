"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import {
  api,
  type CourseAdminRow,
  type WorkshopActivityRow,
  type WorkshopDetail,
} from "@/lib/api"
import { paymentOpsDisplay, workshopLifecycleDisplay } from "@/lib/workshop-ops-display"
import { cn } from "@/lib/utils"
import { showToast } from "@/components/toast"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { OpsFeedReturnBanner } from "@/app/admin/ops/_components/ops-feed-return-banner"
import { Textarea } from "@/components/ui/textarea"
import {
  ArrowLeft,
  Loader2,
  Pencil,
  RefreshCw,
  Trash2,
  Download,
  Archive,
} from "lucide-react"

const TAB_IDS = ["overview", "billing", "assignments", "roster", "activity"] as const
type TabId = (typeof TAB_IDS)[number]

function fmtShort(iso?: string | null) {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  } catch {
    return "—"
  }
}

function activityBucket(row: WorkshopActivityRow): "all" | "admin" | "billing" | "personnel" | "policy" | "system" {
  const a = (row.action || "").toLowerCase()
  const meta = JSON.stringify(row.metadata || {}).toLowerCase()
  if (a.includes("payment") || a.includes("billing") || meta.includes("payment")) return "billing"
  if (a.includes("admin") || a.includes("assign")) return "personnel"
  if (a.includes("policy") || a.includes("access")) return "policy"
  if (a.includes("system") || row.actor_email == null) return "system"
  return "admin"
}

export default function WorkshopDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const workshopId = typeof params.workshopId === "string" ? params.workshopId : ""

  const tabParam = searchParams.get("tab") as TabId | null
  const activeTab: TabId =
    tabParam && TAB_IDS.includes(tabParam) ? tabParam : "overview"

  const setTab = (v: string) => {
    const p = new URLSearchParams(searchParams.toString())
    p.set("tab", v)
    if (searchParams.get("fromFeed") === "1") p.set("fromFeed", "1")
    router.replace(`?${p.toString()}`, { scroll: false })
  }

  const [loading, setLoading] = useState(true)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [detail, setDetail] = useState<WorkshopDetail | null>(null)
  const [activity, setActivity] = useState<WorkshopActivityRow[]>([])
  const [courseAdmins, setCourseAdmins] = useState<CourseAdminRow[]>([])
  const [activityFilter, setActivityFilter] = useState<string>("all")
  const [notes, setNotes] = useState("")
  const [assignBusy, setAssignBusy] = useState<string | null>(null)
  const [removeUserId, setRemoveUserId] = useState<string | null>(null)
  const [markPaidOpen, setMarkPaidOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [exportInfoOpen, setExportInfoOpen] = useState(false)
  const [seatCapDraft, setSeatCapDraft] = useState("")
  const [seatCapOpen, setSeatCapOpen] = useState(false)
  const [grantSeatUserId, setGrantSeatUserId] = useState("")
  const [grantBusy, setGrantBusy] = useState(false)
  const [policyBusy, setPolicyBusy] = useState(false)

  const load = useCallback(async () => {
    if (!workshopId) return
    setLoading(true)
    setDetailError(null)
    try {
      const d = await api.getWorkshop(workshopId)
      const [act, adminsRes] = await Promise.all([
        api.getWorkshopActivity(workshopId),
        api.listCourseAdmins(d.content_id).catch(() => ({ admins: [] as CourseAdminRow[] })),
      ])
      setDetail(d)
      setActivity(act.rows)
      setCourseAdmins(adminsRes.admins)
      setNotes(d.description || "")
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load workshop"
      setDetailError(msg)
      showToast("error", msg)
      setDetail(null)
    } finally {
      setLoading(false)
    }
  }, [workshopId])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (detail) setSeatCapDraft(String(detail.seat_cap))
  }, [detail?.id, detail?.seat_cap])

  const leadUserId = useMemo(() => {
    const x = detail?.admins.find((a) => a.is_lead)
    return x?.user_id ?? ""
  }, [detail])

  const refreshActivity = async () => {
    if (!workshopId) return
    try {
      const act = await api.getWorkshopActivity(workshopId)
      setActivity(act.rows)
      showToast("success", "Activity refreshed")
    } catch (e: unknown) {
      showToast("error", e instanceof Error ? e.message : "Refresh failed")
    }
  }

  const setLead = async (userId: string) => {
    if (!workshopId || !userId || !detail) return
    setAssignBusy("lead")
    try {
      const prev = detail.admins.filter((a) => a.is_lead)
      if (prev.length && prev[0].user_id !== userId) {
        await api.assignWorkshopAdmin(workshopId, prev[0].user_id, { is_lead: false })
      }
      await api.assignWorkshopAdmin(workshopId, userId, { is_lead: true })
      await load()
      showToast("success", "Lead course admin updated")
    } catch (e: unknown) {
      showToast("error", e instanceof Error ? e.message : "Update failed")
    } finally {
      setAssignBusy(null)
    }
  }

  const addSecondary = async (userId: string) => {
    if (!workshopId || !userId) return
    if (detail?.admins.some((a) => a.user_id === userId)) {
      showToast("warning", "Already assigned")
      return
    }
    setAssignBusy(userId)
    try {
      await api.assignWorkshopAdmin(workshopId, userId, { is_lead: false })
      await load()
      showToast("success", "Admin assigned")
    } catch (e: unknown) {
      showToast("error", e instanceof Error ? e.message : "Assign failed")
    } finally {
      setAssignBusy(null)
    }
  }

  const confirmRemoveAdmin = async () => {
    const userId = removeUserId
    if (!workshopId || !userId) return
    try {
      await api.removeWorkshopAdmin(workshopId, userId)
      await load()
      showToast("success", "Removed")
    } catch (e: unknown) {
      showToast("error", e instanceof Error ? e.message : "Remove failed")
    } finally {
      setRemoveUserId(null)
    }
  }

  const saveNotes = async () => {
    if (!workshopId) return
    try {
      await api.patchWorkshop(workshopId, { description: notes })
      await load()
      showToast("success", "Overview notes saved")
    } catch (e: unknown) {
      showToast("error", e instanceof Error ? e.message : "Save failed")
    }
  }

  const confirmMarkPaid = async () => {
    if (!workshopId) return
    try {
      await api.patchWorkshop(workshopId, { payment_status: "paid" })
      await load()
      showToast("success", "Payment status updated")
    } catch (e: unknown) {
      showToast("error", e instanceof Error ? e.message : "Update failed")
    } finally {
      setMarkPaidOpen(false)
    }
  }

  const updateAccessPolicy = async (policy: "requires_payment" | "demo") => {
    if (!workshopId) return
    setPolicyBusy(true)
    try {
      await api.patchWorkshop(workshopId, { access_policy: policy })
      await load()
      showToast("success", "Access policy updated")
    } catch (e: unknown) {
      showToast("error", e instanceof Error ? e.message : "Policy update failed")
    } finally {
      setPolicyBusy(false)
    }
  }

  const grantSeat = async () => {
    if (!workshopId) return
    const uid = grantSeatUserId.trim()
    if (!uid) {
      showToast("error", "Enter learner user UUID")
      return
    }
    setGrantBusy(true)
    try {
      const out = await api.grantWorkshopSeat(workshopId, uid)
      showToast("success", `Seat granted${out.valid_until ? ` until ${fmtShort(out.valid_until)}` : ""}`)
      setGrantSeatUserId("")
      await load()
    } catch (e: unknown) {
      showToast("error", e instanceof Error ? e.message : "Failed to grant seat")
    } finally {
      setGrantBusy(false)
    }
  }

  const confirmSeatCapUpdate = async () => {
    if (!workshopId) return
    const n = parseInt(seatCapDraft, 10)
    if (Number.isNaN(n) || n < 0) {
      showToast("error", "Seat cap must be a non-negative number.")
      setSeatCapOpen(false)
      return
    }
    try {
      await api.patchWorkshop(workshopId, { seat_cap: n })
      await load()
      showToast("success", "Seat cap updated")
    } catch (e: unknown) {
      showToast("error", e instanceof Error ? e.message : "Update failed")
    } finally {
      setSeatCapOpen(false)
    }
  }

  const confirmArchive = async () => {
    if (!workshopId) return
    try {
      await api.patchWorkshop(workshopId, { status: "archived" })
      await load()
      showToast("success", "Workshop archived")
    } catch (e: unknown) {
      showToast("error", e instanceof Error ? e.message : "Archive failed")
    } finally {
      setArchiveOpen(false)
    }
  }

  const filteredActivity = useMemo(() => {
    if (activityFilter === "all") return activity
    return activity.filter((r) => activityBucket(r) === activityFilter)
  }, [activity, activityFilter])

  if (!workshopId) {
    return <p className="p-6 text-sm text-muted-foreground">Invalid workshop.</p>
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-8 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading workshop…
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="space-y-4 p-8">
        <p className="text-sm text-destructive">{detailError || "Workshop not found."}</p>
        <Button type="button" variant="secondary" size="sm" asChild>
          <Link href="/admin/ops/workshop">Back to list</Link>
        </Button>
      </div>
    )
  }

  const seatPct = detail.seat_cap > 0 ? Math.round((detail.used_seats / detail.seat_cap) * 100) : 0
  const codeLabel = detail.internal_code || detail.id.slice(0, 8).toUpperCase()
  const lifecycle = workshopLifecycleDisplay(detail.status)
  const paymentOps = paymentOpsDisplay(detail.payment_status)

  const secondaryPool = courseAdmins.filter(
    (a) => !detail.admins.some((x) => x.user_id === a.user_id),
  )

  return (
    <div className="space-y-6 pb-8">
      <OpsFeedReturnBanner />
      <div className="flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 h-8 gap-1 text-muted-foreground">
            <Link href="/admin/ops/workshop">
              <ArrowLeft className="h-4 w-4" />
              Workshops
            </Link>
          </Button>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
              {codeLabel} · {detail.title}
            </h1>
            <span
              className={cn(
                "rounded border px-2 py-0.5 text-[10px] font-bold uppercase",
                lifecycle.pillClass,
              )}
              title="workshops.status — draft, active (live), or archived"
            >
              {lifecycle.label}
            </span>
            {detail.mode === "sponsored" && (
              <span className="rounded border border-primary/50 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                Sponsored
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {fmtShort(detail.start_at)} — {fmtShort(detail.end_at)}
            {detail.content_title && (
              <span className="ml-2 font-mono text-[11px]">
                Lab: {detail.content_lab_type || detail.content_title}
              </span>
            )}
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" type="button" onClick={() => setTab("overview")}>
          <Pencil className="h-4 w-4" />
          Modify details
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card className="border-border">
          <CardHeader className="pb-1">
            <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Seat utilization
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-2xl font-semibold tabular-nums">
              {detail.used_seats} / {detail.seat_cap}
            </div>
            <p className="text-[11px] text-muted-foreground">
              In use = active entitlements with this workshop id (not course admins).
            </p>
            <Progress value={seatPct} className="h-2" />
            <div className="space-y-1.5 border-t border-border pt-3">
              <Label htmlFor="seat-cap" className="text-[11px] text-muted-foreground">
                Change seat cap (purchased / licensed seats)
              </Label>
              <div className="flex flex-wrap gap-2">
                <Input
                  id="seat-cap"
                  type="number"
                  min={0}
                  className="h-9 w-28 font-mono text-sm"
                  value={seatCapDraft}
                  onChange={(e) => setSeatCapDraft(e.target.value)}
                />
                <Button type="button" size="sm" variant="secondary" onClick={() => setSeatCapOpen(true)}>
                  Apply
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader className="pb-1">
            <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Payment (billing flag)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className={cn("h-2 w-2 shrink-0 rounded-full", paymentOps.dot)} />
              <p
                className="text-lg font-bold uppercase tracking-wide text-foreground"
                title="workshops.payment_status — independent of lifecycle until finance reconciles"
              >
                {paymentOps.label}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader className="pb-1">
            <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Payer entity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-medium">{detail.payer_ref || "—"}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setTab} className="space-y-6">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-lg border border-border bg-muted/30 p-1">
          <TabsTrigger value="overview" className="text-[11px] font-bold uppercase">
            Overview
          </TabsTrigger>
          <TabsTrigger value="billing" className="text-[11px] font-bold uppercase">
            Payment &amp; billing
          </TabsTrigger>
          <TabsTrigger value="assignments" className="text-[11px] font-bold uppercase">
            Assignments
          </TabsTrigger>
          <TabsTrigger value="roster" className="text-[11px] font-bold uppercase">
            Roster audit
          </TabsTrigger>
          <TabsTrigger value="activity" className="text-[11px] font-bold uppercase">
            Activity log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-sm font-semibold uppercase tracking-wide">Event timeline</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm">
                <div className="flex justify-between border-b border-border py-2">
                  <span className="text-muted-foreground">Created</span>
                  <span className="font-mono text-xs">{fmtShort(detail.created_at)}</span>
                </div>
                <div className="flex justify-between border-b border-border py-2">
                  <span className="text-muted-foreground">Paid</span>
                  <span className="font-mono text-xs">
                    {detail.payment_status === "paid" || detail.payment_status === "waived"
                      ? fmtShort(detail.updated_at)
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between border-b border-border py-2">
                  <span className="text-muted-foreground">Start</span>
                  <span className="font-mono text-xs">{fmtShort(detail.start_at)}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">End</span>
                  <span className="font-mono text-xs">{fmtShort(detail.end_at)}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-sm font-semibold uppercase tracking-wide">Personnel</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <Label className="text-muted-foreground">Lead course admin</Label>
                  <Select
                    value={leadUserId}
                    onValueChange={(v) => setLead(v)}
                    disabled={assignBusy === "lead"}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select lead" />
                    </SelectTrigger>
                    <SelectContent>
                      {courseAdmins.map((a) => (
                        <SelectItem key={a.user_id} value={a.user_id}>
                          {a.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-muted-foreground">Assigned operators</Label>
                  <ul className="mt-2 space-y-1 font-mono text-xs">
                    {detail.admins.map((a) => (
                      <li key={a.user_id} className="flex justify-between gap-2">
                        <span>
                          {a.email} {a.is_lead ? "(lead)" : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-wide">Operations notes</CardTitle>
              <p className="text-[11px] text-muted-foreground">
                Stored as workshop description (overview copy); tighten schema later if you split public vs internal notes.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} className="resize-y" />
              <Button type="button" size="sm" onClick={saveNotes}>
                Save notes
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold uppercase tracking-wide">Roster preview</CardTitle>
                <p className="text-[11px] text-muted-foreground">
                  Invites issue from the course admin app; full audit on the Roster tab.
                </p>
              </div>
              <Button variant="outline" size="sm" type="button" disabled>
                Sync DB
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                No roster rows in platform DB yet — cohort invites will bind here when that pipeline lands.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          {detail.payment_status === "pending" && (
            <div className="flex items-center justify-between rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
              <span>Awaiting finance confirmation</span>
              <span className="font-mono text-[11px] uppercase text-amber-600">Status: pending_verification</span>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-border">
              <CardHeader className="pb-1">
                <CardTitle className="text-[10px] font-bold uppercase text-muted-foreground">Order summary</CardTitle>
              </CardHeader>
              <CardContent>
                {detail.payment ? (
                  <>
                    <p className="text-3xl font-semibold text-primary">
                      {(detail.payment.amount / 100).toLocaleString(undefined, {
                        style: "currency",
                        currency: detail.payment.currency || "USD",
                      })}
                    </p>
                    <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                      REF: {detail.payment.gateway_order_id}
                    </p>
                  </>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">No linked package payment yet.</p>
                    <p className="text-[11px] text-muted-foreground">
                      Payment is initiated from the Course Admin dashboard. Sys admin tracks and reconciles here.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardHeader className="pb-1">
                <CardTitle className="text-[10px] font-bold uppercase text-muted-foreground">
                  Seat entitlement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">{detail.seat_cap}</p>
                <p className="text-[11px] uppercase text-muted-foreground">Purchased seats</p>
                <Progress value={seatPct} className="mt-3 h-2" />
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardHeader className="pb-1">
                <CardTitle className="text-[10px] font-bold uppercase text-muted-foreground">
                  Payment lifecycle
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Workshop payment_status</span>
                  <span className="font-mono text-xs capitalize">{detail.payment_status}</span>
                </div>
                {detail.payment && (
                  <div className="flex justify-between">
                    <span>Gateway</span>
                    <span className="font-mono text-xs">{detail.payment.gateway_status}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Access policy</span>
                  <span className="font-mono text-xs">{detail.access_policy}</span>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-2 w-full"
                  type="button"
                  onClick={() => setMarkPaidOpen(true)}
                  disabled={detail.payment_status === "paid"}
                >
                  Mark paid (ops)
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wide">Event log cluster</CardTitle>
              <p className="text-[11px] text-muted-foreground">Mirrors workshop-scoped rows from platform activity.</p>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-mono text-[10px] uppercase">Timestamp</TableHead>
                    <TableHead className="font-mono text-[10px] uppercase">Actor</TableHead>
                    <TableHead className="font-mono text-[10px] uppercase">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activity.slice(0, 12).map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-[11px]">{r.created_at}</TableCell>
                        <TableCell className="text-xs">{r.actor_email || "system"}</TableCell>
                        <TableCell className="text-xs">{r.action}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="border-border lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-sm uppercase tracking-wide">Personnel assignments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Lead course admin</Label>
                  <Select value={leadUserId} onValueChange={setLead} disabled={!!assignBusy}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select lead" />
                    </SelectTrigger>
                    <SelectContent>
                      {courseAdmins.map((a) => (
                        <SelectItem key={a.user_id} value={a.user_id}>
                          {a.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Add secondary (course admin on this lab)</Label>
                  <Select
                    value=""
                    onValueChange={(v) => v && addSecondary(v)}
                    disabled={!!assignBusy}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Search / pick secondary…" />
                    </SelectTrigger>
                    <SelectContent>
                      {secondaryPool.map((a) => (
                        <SelectItem key={a.user_id} value={a.user_id}>
                          {a.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="rounded-md border border-dashed border-border px-3 py-2 text-[11px] text-muted-foreground">
                  External observer: locked until invite pipeline ships.
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-sm uppercase tracking-wide">Delegated capabilities</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <Checkbox checked disabled id="c1" />
                  <label htmlFor="c1" className="text-[13px] leading-snug">
                    Seat cap enforced by platform{" "}
                    <span className="block font-mono text-[10px] text-muted-foreground">hard_limit_enabled</span>
                  </label>
                </div>
                <div className="flex items-start gap-2">
                  <Checkbox checked disabled id="c2" />
                  <label htmlFor="c2" className="text-[13px] leading-snug">
                    Course admins manage roster in their app{" "}
                    <span className="block font-mono text-[10px] text-muted-foreground">delegated_lane</span>
                  </label>
                </div>
                <div className="flex items-start gap-2 opacity-50">
                  <Checkbox disabled id="c3" />
                  <label htmlFor="c3" className="text-[13px] leading-snug">
                    Self-serve registration portal <span className="text-muted-foreground">(locked)</span>
                  </label>
                </div>
                <p className="rounded border border-primary/30 bg-primary/5 p-2 text-[11px] text-muted-foreground">
                  Capability flags are product-controlled; personnel changes stay on this workshop only.
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wide">Internal access policy</CardTitle>
              <p className="text-[11px] text-muted-foreground">
                Policy gates seat grants. Demo allows grant before payment; requires_payment needs paid/waived first.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select
                value={detail.access_policy}
                onValueChange={(v) => void updateAccessPolicy(v as "requires_payment" | "demo")}
                disabled={policyBusy || detail.status === "archived"}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select policy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="requires_payment">requires_payment</SelectItem>
                  <SelectItem value="demo">demo</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wide">Grant learner seat</CardTitle>
              <p className="text-[11px] text-muted-foreground">
                Adds/refreshes workshop-scoped entitlement for one learner user id.
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              <Input
                value={grantSeatUserId}
                onChange={(e) => setGrantSeatUserId(e.target.value)}
                placeholder="Learner user UUID"
                className="font-mono text-xs"
              />
              <Button
                type="button"
                size="sm"
                className="w-full"
                onClick={() => void grantSeat()}
                disabled={grantBusy || detail.status === "archived"}
              >
                {grantBusy ? (
                  <>
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                    Granting...
                  </>
                ) : (
                  "Grant seat"
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm uppercase tracking-wide">Current assignments</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Lead</TableHead>
                    <TableHead className="text-right">Remove</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.admins.map((a) => (
                    <TableRow key={a.user_id}>
                      <TableCell>{a.email}</TableCell>
                      <TableCell>{a.is_lead ? "yes" : ""}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setRemoveUserId(a.user_id)}
                          aria-label={`Remove ${a.email}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roster" className="space-y-6">
          <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm">
            <span className="font-semibold">Access outcome audit (read-only)</span>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Invites are sent from the course admin dashboard; this view reconciles acceptance when roster rows exist.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <Card className="border-border py-4">
              <div className="text-[10px] font-bold uppercase text-muted-foreground">Delivered</div>
              <div className="text-2xl font-semibold">0</div>
            </Card>
            <Card className="border-border py-4">
              <div className="text-[10px] font-bold uppercase text-muted-foreground">Accepted</div>
              <div className="text-2xl font-semibold">0</div>
            </Card>
            <Card className="border-border py-4">
              <div className="text-[10px] font-bold uppercase text-muted-foreground">Access used</div>
              <div className="text-2xl font-semibold">{detail.used_seats}</div>
            </Card>
          </div>
          <Card className="border-border">
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Roster participants will appear here when invite rows are stored in the platform database.
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {["all", "admin", "billing", "personnel", "policy", "system"].map((f) => (
              <Button
                key={f}
                type="button"
                size="sm"
                variant={activityFilter === f ? "default" : "outline"}
                className="text-[10px] font-bold uppercase"
                onClick={() => setActivityFilter(f)}
              >
                {f}
              </Button>
            ))}
            <Button type="button" variant="ghost" size="sm" onClick={refreshActivity} className="gap-1">
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>
          <Card className="border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px] font-mono text-[10px] uppercase">Timestamp</TableHead>
                  <TableHead className="font-mono text-[10px] uppercase">Actor</TableHead>
                  <TableHead className="font-mono text-[10px] uppercase">Action</TableHead>
                  <TableHead className="font-mono text-[10px] uppercase">Metadata</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredActivity.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-[11px]">{r.created_at}</TableCell>
                    <TableCell className="text-xs">{r.actor_email || "SYSTEM"}</TableCell>
                    <TableCell className="text-xs">{r.action}</TableCell>
                    <TableCell className="max-w-[320px] truncate font-mono text-[10px] text-muted-foreground">
                      {JSON.stringify(r.metadata)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="border-border">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <span className="font-mono text-[11px] text-muted-foreground">Workshop: {codeLabel}</span>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              type="button"
              disabled={detail.status === "archived"}
              onClick={() => setArchiveOpen(true)}
            >
              <Archive className="h-4 w-4" />
              Archive workshop
            </Button>
            <Button
              variant="default"
              size="sm"
              className="gap-1"
              type="button"
              onClick={() => setExportInfoOpen(true)}
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!removeUserId} onOpenChange={(o) => !o && setRemoveUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove course admin?</AlertDialogTitle>
            <AlertDialogDescription>
              They immediately lose this workshop assignment in the platform database. This does not delete their
              user account or course-wide roles.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button type="button" variant="destructive" onClick={() => void confirmRemoveAdmin()}>
              Remove
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={markPaidOpen} onOpenChange={setMarkPaidOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark workshop payment as paid?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  This updates <code className="rounded bg-muted px-1 text-[11px]">workshops.payment_status</code> to{" "}
                  <strong>paid</strong> for ops reporting. It does not capture money in Razorpay — reconcile with finance
                  first.
                </p>
                {detail.payment && (
                  <p className="font-mono text-[11px] text-muted-foreground">
                    Linked payment row: {detail.payment.gateway_order_id}
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button type="button" onClick={() => void confirmMarkPaid()}>
              Confirm paid
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this workshop?</AlertDialogTitle>
            <AlertDialogDescription>
              Sets status to <strong>archived</strong>. Existing entitlements and billing records elsewhere are not
              deleted; workshop stops appearing as live in filters.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button type="button" variant="secondary" onClick={() => void confirmArchive()}>
              Archive
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={seatCapOpen} onOpenChange={setSeatCapOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update seat cap?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  New cap: <strong className="text-foreground">{seatCapDraft || "—"}</strong> (currently{" "}
                  {detail.used_seats} seats in use).
                </p>
                {parseInt(seatCapDraft, 10) < detail.used_seats && !Number.isNaN(parseInt(seatCapDraft, 10)) && (
                  <p className="text-amber-600 dark:text-amber-400">
                    Cap is below used seats — reconcile roster / finance before confirming.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button type="button" onClick={() => void confirmSeatCapUpdate()}>
              Confirm
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={exportInfoOpen} onOpenChange={setExportInfoOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Export not wired yet</AlertDialogTitle>
            <AlertDialogDescription>
              CSV export will reuse the same workshop IDs as billing exports once we attach the shared export worker.
              Use Billing Payments or raw DB for now.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>OK</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
