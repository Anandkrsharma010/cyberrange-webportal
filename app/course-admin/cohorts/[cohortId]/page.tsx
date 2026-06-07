"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import Script from "next/script"
import { ArrowLeft, CreditCard, Loader2, PlayCircle, UserPlus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { showToast } from "@/components/toast"
import {
  api,
  type CohortRosterRuntimeResponse,
  type CohortRosterRuntimeRow,
  type CohortRunRow,
  type WorkshopDetail,
} from "@/lib/api"
import { paymentOpsDisplay, workshopLifecycleDisplay } from "@/lib/workshop-ops-display"
import logger from "@/lib/logger"

type CheckoutPhase = "idle" | "creating" | "opening" | "verifying" | "error"
type AccessFilter = "all" | "not_activated" | "active"
type OnboardingFilter = "all" | "invitation" | "admin_enrollment"
type RuntimeFilter = "all" | "ready" | "in_progress" | "failed"

interface RazorpayHandlerResponse {
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature: string
}

interface RazorpayOptions {
  key: string
  amount: number
  currency: string
  order_id: string
  name: string
  description?: string
  prefill?: { email?: string }
  theme?: { color?: string }
  handler: (response: RazorpayHandlerResponse) => void
  modal?: { ondismiss?: () => void }
}

interface RazorpayInstance {
  open: () => void
  on: (event: string, cb: (resp: unknown) => void) => void
}

type RazorpayCtor = new (opts: RazorpayOptions) => RazorpayInstance

function getRazorpayCtor(): RazorpayCtor | undefined {
  if (typeof window === "undefined") return undefined
  const w = window as unknown as { Razorpay?: RazorpayCtor }
  return w.Razorpay
}

function formatMoney(amountMinor: number, currency: string) {
  const major = amountMinor / 100
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "INR" }).format(major)
  } catch {
    return `${major.toFixed(2)} ${currency}`
  }
}

function formatTs(value?: string | null) {
  if (!value) return "-"
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

function shortId(id?: string | null) {
  if (!id) return "-"
  return id.length > 10 ? `${id.slice(0, 8)}...` : id
}

function packagePaymentNotes(d: WorkshopDetail): string[] {
  const lines: string[] = []
  if (d.access_policy === "demo") {
    lines.push("Demo cohort: no package checkout required. Seat grants follow demo policy.")
    return lines
  }
  if (d.payment_status === "pending" && d.access_policy === "requires_payment") {
    lines.push("Use checkout while payment is pending for this cohort.")
    lines.push("After capture, status updates via webhook/verification and records on payment + cohort rows.")
    return lines
  }
  if (d.payment_status === "paid" || d.payment_status === "waived") {
    lines.push("No further package checkout required under current payment status.")
  }
  return lines
}

function runtimeLabel(state: CohortRosterRuntimeRow["runtime"]["state"]) {
  switch (state) {
    case "not_requested":
      return "Not requested"
    case "queued":
      return "Queued"
    case "provisioning":
      return "Provisioning"
    case "ready":
      return "Ready"
    case "failed":
      return "Failed"
    case "ended":
      return "Ended"
    default:
      return state
  }
}

function rowAccessLabel(row: CohortRosterRuntimeRow): string {
  switch (row.access_status) {
    case "active":
      return "Active"
    case "not_activated":
      return "Not activated"
    case "revoked":
      return "Revoked"
    case "expired":
      return "Expired"
    default:
      return row.access_status
  }
}

function onboardingLabel(method: CohortRosterRuntimeRow["onboarding_method"]): string {
  return method === "invitation" ? "Invitation" : "Administrator enrollment"
}

export default function CourseAdminCohortDeliveryPage() {
  const params = useParams<{ cohortId: string }>()
  const cohortId = typeof params.cohortId === "string" ? params.cohortId : ""

  const [detail, setDetail] = useState<WorkshopDetail | null>(null)
  const [roster, setRoster] = useState<CohortRosterRuntimeResponse | null>(null)
  const [runs, setRuns] = useState<CohortRunRow[]>([])
  const [loading, setLoading] = useState(true)

  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteBusy, setInviteBusy] = useState(false)
  const [grantUserId, setGrantUserId] = useState("")
  const [grantBusy, setGrantBusy] = useState(false)

  const [accessFilter, setAccessFilter] = useState<AccessFilter>("all")
  const [onboardingFilter, setOnboardingFilter] = useState<OnboardingFilter>("all")
  const [runtimeFilter, setRuntimeFilter] = useState<RuntimeFilter>("all")
  const [rosterQuery, setRosterQuery] = useState("")
  const [selectedRow, setSelectedRow] = useState<CohortRosterRuntimeRow | null>(null)

  const [runHours, setRunHours] = useState("4")
  const [runBusy, setRunBusy] = useState(false)

  const [scriptReady, setScriptReady] = useState(false)
  const [payPhase, setPayPhase] = useState<CheckoutPhase>("idle")
  const [payError, setPayError] = useState<string | null>(null)
  const payStartedRef = useRef(false)

  const reload = useCallback(async () => {
    if (!cohortId) return
    const [d, rr, runRes] = await Promise.all([
      api.getCourseWorkshop(cohortId),
      api.getCohortRosterRuntime(cohortId),
      api.getCohortRuns(cohortId),
    ])
    setDetail(d)
    setRoster(rr)
    setRuns(runRes.runs)
  }, [cohortId])

  useEffect(() => {
    if (!cohortId) {
      setLoading(false)
      return
    }
    ;(async () => {
      try {
        await reload()
      } catch (err: unknown) {
        showToast("error", err instanceof Error ? err.message : "Failed to load cohort")
      } finally {
        setLoading(false)
      }
    })()
  }, [cohortId, reload])

  useEffect(() => {
    if (scriptReady) return
    if (typeof window === "undefined") return
    if (getRazorpayCtor()) {
      setScriptReady(true)
      return
    }
    const intervalId = window.setInterval(() => {
      if (getRazorpayCtor()) {
        setScriptReady(true)
        window.clearInterval(intervalId)
      }
    }, 300)
    const timeoutId = window.setTimeout(() => window.clearInterval(intervalId), 15000)
    return () => {
      window.clearInterval(intervalId)
      window.clearTimeout(timeoutId)
    }
  }, [scriptReady])

  const openRazorpay = useCallback(
    (order: { razorpay_order_id: string; amount_minor: number; currency: string; razorpay_key_id: string }) => {
      const Rzp = getRazorpayCtor()
      if (!detail || typeof window === "undefined" || !Rzp) {
        setPayPhase("error")
        setPayError("Payment SDK not ready yet. Please retry in a moment.")
        return
      }
      const options: RazorpayOptions = {
        key: order.razorpay_key_id,
        amount: order.amount_minor,
        currency: order.currency,
        order_id: order.razorpay_order_id,
        name: "RangeOps",
        description: `Cohort package - ${detail.title}`,
        prefill: undefined,
        theme: { color: "#10b981" },
        handler: async (response) => {
          setPayPhase("verifying")
          try {
            await api.verifyWorkshopCapture(response.razorpay_order_id, response.razorpay_payment_id)
          } catch (e) {
            logger.warn("verifyWorkshopCapture failed (webhook may still fulfil)", e)
          }
          showToast("success", "Payment submitted. Status will update shortly.")
          await reload()
          setPayPhase("idle")
        },
        modal: { ondismiss: () => setPayPhase("idle") },
      }
      try {
        const rzp = new Rzp(options)
        rzp.on("payment.failed", (resp: unknown) => {
          logger.error("Razorpay payment.failed:", resp)
          setPayPhase("error")
          setPayError("Payment failed. You were not charged.")
        })
        rzp.open()
        setPayPhase("opening")
      } catch (err) {
        logger.error("Failed to open Razorpay:", err)
        setPayPhase("error")
        setPayError("Could not open the payment window.")
      }
    },
    [detail, reload],
  )

  const handlePayPackage = useCallback(async () => {
    if (!cohortId || payStartedRef.current) return
    payStartedRef.current = true
    setPayError(null)
    setPayPhase("creating")
    try {
      const res = await api.createWorkshopPackageOrder(cohortId)
      openRazorpay(res)
    } catch (err: unknown) {
      setPayPhase("error")
      setPayError(err instanceof Error ? err.message : "Could not start checkout.")
    } finally {
      payStartedRef.current = false
    }
  }, [cohortId, openRazorpay])

  const handleSendInvite = async () => {
    const email = inviteEmail.trim()
    if (!email || !cohortId) {
      showToast("error", "Enter learner email.")
      return
    }
    setInviteBusy(true)
    try {
      const out = await api.createWorkshopInvite(cohortId, { email })
      if (out.invite_url) void navigator.clipboard?.writeText(out.invite_url).catch(() => {})
      showToast("success", out.email_dispatched ? `Invite sent to ${out.email}` : `Invite created for ${out.email}.`)
      setInviteEmail("")
      await reload()
    } catch (err: unknown) {
      showToast("error", err instanceof Error ? err.message : "Failed to create invite")
    } finally {
      setInviteBusy(false)
    }
  }

  const handleResendInvite = async (inviteId: string) => {
    if (!cohortId) return
    setInviteBusy(true)
    try {
      const out = await api.resendWorkshopInvite(cohortId, inviteId)
      if (out.invite_url) void navigator.clipboard?.writeText(out.invite_url).catch(() => {})
      showToast("success", out.email_dispatched ? "Invite email resent." : "Invite link refreshed.")
      await reload()
    } catch (err: unknown) {
      showToast("error", err instanceof Error ? err.message : "Resend failed")
    } finally {
      setInviteBusy(false)
    }
  }

  const handleRevokeInvite = async (inviteId: string, email: string) => {
    if (!cohortId || !confirm(`Withdraw invite for ${email}?`)) return
    setInviteBusy(true)
    try {
      await api.revokeWorkshopInvite(cohortId, inviteId)
      showToast("success", "Invite withdrawn.")
      await reload()
    } catch (err: unknown) {
      showToast("error", err instanceof Error ? err.message : "Withdraw failed")
    } finally {
      setInviteBusy(false)
    }
  }

  const handleGrant = async () => {
    const uid = grantUserId.trim()
    if (!uid || !cohortId) {
      showToast("error", "Enter learner user ID (UUID).")
      return
    }
    setGrantBusy(true)
    try {
      await api.grantWorkshopSeat(cohortId, uid)
      showToast("success", "Seat granted.")
      setGrantUserId("")
      await reload()
    } catch (err: unknown) {
      showToast("error", err instanceof Error ? err.message : "Failed to grant seat")
    } finally {
      setGrantBusy(false)
    }
  }

  const handleRequestRun = async () => {
    const hours = parseInt(runHours, 10)
    if (!cohortId || Number.isNaN(hours) || hours < 1 || hours > 72) {
      showToast("error", "Run duration must be between 1 and 72 hours.")
      return
    }
    const seated = roster?.rows.filter((r) => r.access_status === "active").length ?? 0
    if (seated === 0) {
      showToast(
        "error",
        "No learners have an active seat yet. Invite learners (or grant a seat), then try again.",
      )
      return
    }
    setRunBusy(true)
    try {
      const out = await api.requestCohortRun(cohortId, { duration_hours: hours })
      showToast(
        "success",
        `Lab session started (${shortId(out.deployment_id)}). ${out.members_attached} seated learner(s) attached.`,
      )
      await reload()
    } catch (err: unknown) {
      showToast("error", err instanceof Error ? err.message : "Failed to queue delivery run")
    } finally {
      setRunBusy(false)
    }
  }

  const filteredRoster = useMemo(() => {
    if (!roster) return []
    const q = rosterQuery.trim().toLowerCase()
    return roster.rows.filter((r) => {
      if (accessFilter !== "all" && r.access_status !== accessFilter) return false
      if (onboardingFilter !== "all" && r.onboarding_method !== onboardingFilter) return false
      if (runtimeFilter !== "all") {
        if (runtimeFilter === "in_progress") {
          if (!["queued", "provisioning"].includes(r.runtime.state)) return false
        } else if (r.runtime.state !== runtimeFilter) {
          return false
        }
      }
      if (!q) return true
      return `${r.email} ${r.user_id ?? ""} ${r.name ?? ""}`.toLowerCase().includes(q)
    })
  }, [roster, rosterQuery, accessFilter, onboardingFilter, runtimeFilter])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/course-admin">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Cohorts you operate
          </Link>
        </Button>
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Cohort not found or you are not assigned as an operator.
          </CardContent>
        </Card>
      </div>
    )
  }

  const life = workshopLifecycleDisplay(detail.status)
  const pay = paymentOpsDisplay(detail.payment_status)
  const showPayCta = detail.payment_status === "pending" && detail.access_policy === "requires_payment"
  const payNotes = packagePaymentNotes(detail)

  const activeSeatedLearners =
    roster?.rows.filter((r) => r.access_status === "active").length ?? 0
  const runBlockedNoSeats = activeSeatedLearners === 0
  const runBlockedInFlight = runs.some((r) =>
    ["queued", "provisioning"].includes((r.status || "").toLowerCase()),
  )
  const runButtonDisabled = runBusy || runBlockedNoSeats || runBlockedInFlight

  return (
    <div className="space-y-6">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" onLoad={() => setScriptReady(true)} />

      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2">
          <Link href="/course-admin">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Cohorts you operate
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">{detail.title}</h1>
        {detail.internal_code && <p className="text-sm text-muted-foreground">{detail.internal_code}</p>}
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 font-medium ${life.pillClass}`}>{life.label}</span>
        <span className="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-medium">
          <span className={`h-1.5 w-1.5 rounded-full ${pay.dot}`} />
          {pay.label}
        </span>
        <span className="inline-flex items-center rounded-md border px-2 py-0.5 font-medium">{detail.mode === "sponsored" ? "Sponsored" : "Organizer-led"}</span>
        <span className="inline-flex items-center rounded-md border px-2 py-0.5 font-medium">{detail.access_policy === "demo" ? "Demo" : "Billable policy"}</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Summary</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div><span className="text-muted-foreground">Lab</span><div>{detail.content_title ?? detail.content_id}</div></div>
            <div><span className="text-muted-foreground">Schedule window</span><div>{formatTs(detail.start_at)} {"->"} {formatTs(detail.end_at)}</div></div>
            <div><span className="text-muted-foreground">Seat meter</span><div>{detail.used_seats} / {detail.seat_cap}</div></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><CreditCard className="h-4 w-4" />Payment summary</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {detail.payment && (
              <div className="text-muted-foreground">Last linked payment: <span className="text-foreground">{formatMoney(detail.payment.amount, detail.payment.currency)}</span> ({detail.payment.gateway_status})</div>
            )}
            {payNotes.map((line, i) => <p key={i} className="text-muted-foreground">{line}</p>)}
            {showPayCta && (
              <>
                {payError && <p className="text-sm text-destructive">{payError}</p>}
                <Button type="button" disabled={payPhase === "creating" || payPhase === "opening" || payPhase === "verifying" || !scriptReady} onClick={() => void handlePayPackage()}>
                  {payPhase !== "idle" && payPhase !== "error" ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</> : "Pay cohort package"}
                </Button>
                {!scriptReady && <p className="text-xs text-muted-foreground">Loading payment SDK...</p>}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle className="text-base">Cohort roster & onboarding</CardTitle>
            <Input className="max-w-sm" placeholder="Search learner email or user ID..." value={rosterQuery} onChange={(e) => setRosterQuery(e.target.value)} />
          </div>
          <p className="text-sm text-muted-foreground">
            Single roster view for learner identity, onboarding method, access status, seat usage,
            and latest lab-session runtime state.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Access</Label>
              <Select value={accessFilter} onValueChange={(v) => setAccessFilter(v as AccessFilter)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Access" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Everyone</SelectItem>
                  <SelectItem value="not_activated">Not activated</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Onboarding</Label>
              <Select value={onboardingFilter} onValueChange={(v) => setOnboardingFilter(v as OnboardingFilter)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Onboarding" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any method</SelectItem>
                  <SelectItem value="invitation">Invitation</SelectItem>
                  <SelectItem value="admin_enrollment">Admin enrollment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Lab session state</Label>
              <Select value={runtimeFilter} onValueChange={(v) => setRuntimeFilter(v as RuntimeFilter)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Runtime" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any state</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                  <SelectItem value="in_progress">In progress</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-md border p-3 text-sm"><div className="text-muted-foreground">Ready</div><div className="text-xl font-semibold">{roster?.runtime_counts.ready ?? 0}</div></div>
            <div className="rounded-md border p-3 text-sm"><div className="text-muted-foreground">In progress</div><div className="text-xl font-semibold">{roster?.runtime_counts.in_progress ?? 0}</div></div>
            <div className="rounded-md border p-3 text-sm"><div className="text-muted-foreground">Failed</div><div className="text-xl font-semibold">{roster?.runtime_counts.failed ?? 0}</div></div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1">
              <Label htmlFor="invite-email">Issue invitation (email)</Label>
              <Input id="invite-email" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="learner@company.com" autoComplete="off" />
            </div>
            <Button type="button" onClick={() => void handleSendInvite()} disabled={inviteBusy}>{inviteBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Issue invite"}</Button>
          </div>

          <div className="max-h-[380px] overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Learner</TableHead>
                  <TableHead>Onboarding</TableHead>
                  <TableHead>Access status</TableHead>
                  <TableHead>Seat</TableHead>
                  <TableHead>Lab session</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>Failure</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRoster.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground">No learners match current filters.</TableCell></TableRow>
                ) : filteredRoster.map((row) => (
                  <TableRow key={row.learner_key}>
                    <TableCell><div className="font-medium">{row.email}</div><div className="text-xs text-muted-foreground">{row.user_id ?? "Not linked yet"}</div></TableCell>
                    <TableCell className="text-xs">{onboardingLabel(row.onboarding_method)}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs font-normal">{rowAccessLabel(row)}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{row.seat_consuming ? "Consumes seat" : "No seat"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs font-normal">
                        {runtimeLabel(row.runtime.state)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatTs(row.runtime.last_updated_at)}
                    </TableCell>
                    <TableCell className="max-w-[200px] text-xs text-destructive/90 line-clamp-2" title={row.runtime.failure_reason ?? ""}>
                      {row.runtime.failure_reason || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {row.invite?.id && row.invite?.status === "pending" ? (
                          <>
                            <Button type="button" size="sm" variant="ghost" disabled={inviteBusy} onClick={() => void handleResendInvite(row.invite!.id!)}>Resend</Button>
                            <Button type="button" size="sm" variant="ghost" disabled={inviteBusy} onClick={() => void handleRevokeInvite(row.invite!.id!, row.email)}>Withdraw</Button>
                          </>
                        ) : null}
                        <Button type="button" size="sm" variant="ghost" onClick={() => setSelectedRow(row)}>Details</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <PlayCircle className="h-4 w-4" />
            Cohort lab sessions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Starts one shared lab session for this cohort for the duration you pick. Learners with an{" "}
            <span className="font-medium text-foreground">active seat</span> are attached to the
            session. This is not a live &quot;who is clicking&quot; monitor; it is the run history +
            session control.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="w-40 space-y-1"><Label htmlFor="run-hours">Run duration (hours)</Label><Input id="run-hours" type="number" min={1} max={72} value={runHours} onChange={(e) => setRunHours(e.target.value)} /></div>
            <Button type="button" onClick={() => void handleRequestRun()} disabled={runButtonDisabled} title={runBlockedInFlight ? "Wait until the current session finishes starting." : runBlockedNoSeats ? "Need at least one learner with an active seat." : undefined}>
              {runBusy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Starting...</> : "Start lab session"}
            </Button>
          </div>
          {runBlockedNoSeats && (
            <p className="text-xs text-muted-foreground">
              Seated learners: {activeSeatedLearners}. Invite or grant seats first.
            </p>
          )}
          {runBlockedInFlight && !runBlockedNoSeats && (
            <p className="text-xs text-muted-foreground">A session is already queued or starting.</p>
          )}
          <div className="max-h-[320px] overflow-auto rounded-md border">
            <Table>
              <TableHeader><TableRow><TableHead>Run ID</TableHead><TableHead>Status</TableHead><TableHead>Window</TableHead><TableHead>Members attached</TableHead></TableRow></TableHeader>
              <TableBody>
                {runs.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground">No lab sessions yet. Start one when learners have active seats.</TableCell></TableRow> : runs.map((r) => (
                  <TableRow key={r.deployment_id}>
                    <TableCell className="font-mono text-xs">{shortId(r.deployment_id)}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs font-normal capitalize">{r.status}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatTs(r.created_at)} {"->"} {formatTs(r.expires_at)}</TableCell>
                    <TableCell className="max-w-[220px] text-xs text-muted-foreground line-clamp-2" title={r.members.map((m) => m.email).join(", ")}>{r.members.length === 0 ? "-" : r.members.map((m) => m.email).join(", ")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><UserPlus className="h-4 w-4" />Add learner by user ID (manual)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Use when you already have learner UUID. Invitation flow is preferred for external cohorts.</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1"><Label htmlFor="grant-uid">Learner user ID (UUID)</Label><Input id="grant-uid" value={grantUserId} onChange={(e) => setGrantUserId(e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" autoComplete="off" /></div>
            <Button type="button" onClick={() => void handleGrant()} disabled={grantBusy}>{grantBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add learner"}</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Operators on this cohort</CardTitle></CardHeader>
        <CardContent><div className="space-y-2">{detail.admins.map((a) => <div key={a.user_id} className="flex items-center justify-between rounded-md border p-2 text-sm"><span>{a.email}</span><Badge variant="outline" className="text-xs font-normal">{a.is_lead ? "Lead operator" : "Operator"}</Badge></div>)}</div></CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">Full audit history and platform overrides live under system administration; this view is operational truth for cohort operators.</p>

      <Sheet open={Boolean(selectedRow)} onOpenChange={(open) => !open && setSelectedRow(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{selectedRow?.email ?? "Learner details"}</SheetTitle>
            <SheetDescription>
              Access lifecycle, onboarding timeline, runtime snapshot, and escalation context.
            </SheetDescription>
          </SheetHeader>
          {selectedRow ? (
            <div className="space-y-4 px-4 pb-4 text-sm">
              <div className="rounded-md border p-3"><div className="text-xs text-muted-foreground">Access status</div><div className="font-medium">{rowAccessLabel(selectedRow)}</div></div>
              <div className="rounded-md border p-3"><div className="text-xs text-muted-foreground">Onboarding method</div><div className="font-medium">{onboardingLabel(selectedRow.onboarding_method)}</div></div>
              <div className="rounded-md border p-3 space-y-1"><div className="font-medium">Invitation timeline</div><div className="text-xs text-muted-foreground">Invite created: {formatTs(selectedRow.invite?.created_at)}</div><div className="text-xs text-muted-foreground">Invite sent: {formatTs(selectedRow.invite?.email_sent_at)}</div><div className="text-xs text-muted-foreground">Accepted at: {formatTs(selectedRow.invite?.accepted_at)}</div><div className="text-xs text-muted-foreground">Expires at: {formatTs(selectedRow.invite?.expires_at)}</div></div>
              <div className="rounded-md border p-3 space-y-1"><div className="font-medium">Runtime snapshot</div><div className="text-xs text-muted-foreground">State: {runtimeLabel(selectedRow.runtime.state)}</div><div className="text-xs text-muted-foreground">Last updated: {formatTs(selectedRow.runtime.last_updated_at)}</div><div className="text-xs text-muted-foreground">Deployment: {shortId(selectedRow.runtime.deployment_id)}</div><div className="text-xs text-muted-foreground">Failure: {selectedRow.runtime.failure_reason || "-"}</div></div>
              <div className="rounded-md border p-3"><div className="font-medium">Support escalation</div><p className="mt-1 text-xs text-muted-foreground">If runtime repeatedly fails, capture learner email + deployment ID and escalate to system administration.</p></div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}
