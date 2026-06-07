"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { api, type Course, type CreateWorkshopRequest } from "@/lib/api"
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
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Loader2, UserPlus } from "lucide-react"

function dayIso(d: string, endOfDay = false) {
  if (!d) return undefined
  const [y, m, day] = d.split("-").map(Number)
  if (!y || !m || !day) return undefined
  const dt = new Date(Date.UTC(y, m - 1, day, endOfDay ? 23 : 12, endOfDay ? 59 : 0, 0))
  return dt.toISOString()
}

function needsBillingConfirmation(ps: CreateWorkshopRequest["payment_status"]) {
  return ps !== "pending"
}

export default function CreateWorkshopPage() {
  const router = useRouter()
  const [courses, setCourses] = useState<Course[]>([])
  const [loadingCourses, setLoadingCourses] = useState(true)
  const [saving, setSaving] = useState(false)

  const [title, setTitle] = useState("")
  const [internalCode, setInternalCode] = useState("")
  const [description, setDescription] = useState("")
  const [contentId, setContentId] = useState("")
  const [startDay, setStartDay] = useState("")
  const [endDay, setEndDay] = useState("")
  const [mode, setMode] = useState<CreateWorkshopRequest["mode"]>("sponsored")
  const [seatCap, setSeatCap] = useState("30")
  const [paymentStatus, setPaymentStatus] =
    useState<CreateWorkshopRequest["payment_status"]>("pending")

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<CreateWorkshopRequest["status"] | null>(
    null,
  )

  useEffect(() => {
    ;(async () => {
      try {
        const r = await api.listCourses()
        setCourses(r.courses)
      } catch {
        showToast("error", "Could not load labs — check API and sys_admin session.")
      } finally {
        setLoadingCourses(false)
      }
    })()
  }, [])

  const submit = async (status: CreateWorkshopRequest["status"]) => {
    const seats = parseInt(seatCap, 10)
    if (!title.trim() || !contentId) {
      showToast("error", "Workshop name and lab are required.")
      return
    }
    if (Number.isNaN(seats) || seats < 0) {
      showToast("error", "Seat cap must be a valid number.")
      return
    }
    setSaving(true)
    try {
      const body: CreateWorkshopRequest = {
        title: title.trim(),
        description: description.trim() || undefined,
        content_id: contentId,
        internal_code: internalCode.trim() || undefined,
        start_at: dayIso(startDay),
        end_at: dayIso(endDay, true),
        mode,
        seat_cap: seats,
        payment_status: paymentStatus,
        status,
      }
      const { workshop } = await api.createWorkshop(body)
      showToast("success", status === "draft" ? "Draft saved" : "Workshop created")
      router.push(`/admin/ops/workshop/${workshop.id}?tab=assignments`)
    } catch (e: unknown) {
      showToast("error", e instanceof Error ? e.message : "Create failed")
    } finally {
      setSaving(false)
      setConfirmOpen(false)
      setPendingStatus(null)
    }
  }

  const requestSubmit = (status: CreateWorkshopRequest["status"]) => {
    const seats = parseInt(seatCap, 10)
    if (!title.trim() || !contentId) {
      showToast("error", "Workshop name and lab are required.")
      return
    }
    if (Number.isNaN(seats) || seats < 0) {
      showToast("error", "Seat cap must be a valid number.")
      return
    }

    const billing = needsBillingConfirmation(paymentStatus)
    const goLive = status === "active"

    if (billing || goLive) {
      setPendingStatus(status)
      setConfirmOpen(true)
      return
    }
    void submit(status)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 gap-2 text-muted-foreground">
          <Link href="/admin/ops/workshop">
            <ArrowLeft className="h-4 w-4" />
            Workshops
          </Link>
        </Button>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">Create new workshop</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Define parameters and enrollment model for this session. Course admins are assigned after save.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="border-b border-border pb-2 text-sm font-semibold uppercase tracking-wide text-primary">
          Basics
        </h2>
        <div className="space-y-2">
          <Label htmlFor="title">Workshop name</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Advanced system architecture"
          />
          <p className="text-[11px] text-muted-foreground">Public-facing title for operators and admins.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="code">Internal code</Label>
          <Input
            id="code"
            value={internalCode}
            onChange={(e) => setInternalCode(e.target.value)}
            placeholder="e.g. WS-ARCH-001"
            className="font-mono text-sm"
          />
          <p className="text-[11px] text-muted-foreground">Unique identifier for internal tracking.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="desc">Description</Label>
          <Textarea
            id="desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief overview of objectives…"
            rows={4}
            className="resize-y"
          />
          <p className="text-[11px] text-muted-foreground">Shown where participant-facing copy is wired.</p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="border-b border-border pb-2 text-sm font-semibold uppercase tracking-wide text-primary">
          Content
        </h2>
        <div className="space-y-2">
          <Label>Lab / course</Label>
          <Select value={contentId} onValueChange={setContentId} disabled={loadingCourses}>
            <SelectTrigger>
              <SelectValue placeholder={loadingCourses ? "Loading…" : "Select a core curriculum…"} />
            </SelectTrigger>
            <SelectContent>
              {courses.map((c) => (
                <SelectItem key={c.content_id} value={c.content_id}>
                  {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">Pre-approved lab content item from Courses.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="sd">Start date</Label>
            <Input id="sd" type="date" value={startDay} onChange={(e) => setStartDay(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ed">End date</Label>
            <Input id="ed" type="date" value={endDay} onChange={(e) => setEndDay(e.target.value)} />
          </div>
        </div>
        <p className="text-center text-[11px] text-muted-foreground">
          Defines the availability window for materials access.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="border-b border-border pb-2 text-sm font-semibold uppercase tracking-wide text-primary">
          Enrollment model
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Commerce mode</Label>
            <Select
              value={mode}
              onValueChange={(v) => setMode(v as CreateWorkshopRequest["mode"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sponsored">Sponsored (corporate seats)</SelectItem>
                <SelectItem value="open_organizer">Open / organizer-led</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="seats">Seat cap</Label>
            <Input
              id="seats"
              type="number"
              min={0}
              value={seatCap}
              onChange={(e) => setSeatCap(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Initial payment status</Label>
          <Select
            value={paymentStatus}
            onValueChange={(v) =>
              setPaymentStatus(v as CreateWorkshopRequest["payment_status"])
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="waived">Waived</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">
            Recording paid/waived/refunded is an operational label until a gateway payment is linked (
            <code className="text-[10px]">payment_id</code>) on the workshop.
          </p>
        </div>
      </section>

      {/* Actions in document flow — always visible after scrolling the form (no viewport-fixed bar). */}
      <Card className="border-primary/20 bg-muted/30">
        <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <Button type="button" variant="outline" size="sm" className="gap-2 self-start" asChild>
            <Link href="/admin/ops/workshop">
              <UserPlus className="h-4 w-4" />
              Back without saving
            </Link>
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="ghost" onClick={() => router.push("/admin/ops/workshop")}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={saving}
              onClick={() => requestSubmit("draft")}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save draft"}
            </Button>
            <Button type="button" disabled={saving} onClick={() => requestSubmit("active")}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create & open"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(o) => {
          setConfirmOpen(o)
          if (!o) setPendingStatus(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm workshop actions</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  You are about to{" "}
                  <strong className="text-foreground">
                    {pendingStatus === "active" ? "create an active (live) workshop" : "save a draft"}
                  </strong>{" "}
                  with:
                </p>
                <ul className="list-inside list-disc font-mono text-xs">
                  <li>Payment status: {paymentStatus}</li>
                  <li>Seat cap: {seatCap}</li>
                  <li>Mode: {mode}</li>
                </ul>
                {(needsBillingConfirmation(paymentStatus) || pendingStatus === "active") && (
                  <p className="text-amber-600 dark:text-amber-400">
                    Commercial state affects ops reporting. Ensure finance alignment before confirming.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Go back</AlertDialogCancel>
            <Button
              type="button"
              disabled={saving || !pendingStatus}
              onClick={() => pendingStatus && void submit(pendingStatus)}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm & save"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
