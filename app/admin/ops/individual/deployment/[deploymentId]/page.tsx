"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Loader2 } from "lucide-react"
import { api, clearToken, type AdminBillingPaymentRow, type AdminDeployment } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { showToast } from "@/components/toast"
import { OpsFeedReturnBanner } from "@/app/admin/ops/_components/ops-feed-return-banner"

type DetailRow = {
  payment: AdminBillingPaymentRow | null
  deployment: AdminDeployment | null
}

type VmInventoryRow = {
  key: string
  label: string
  instanceId: string
  privateIp: string
  publicIp: string
  state: "running" | "provisioning" | "failed" | "unknown"
}

function fmtAge(iso?: string) {
  if (!iso) return "—"
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 60) return `${Math.max(mins, 0)}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

function expectedVmRolesForLab(labType?: string) {
  if ((labType || "").toLowerCase() === "windows") {
    return [
      { key: "subnet_router", label: "Subnet Router" },
      { key: "domain_controller", label: "Domain Controller" },
      { key: "domain_client", label: "Domain Client" },
      { key: "kali_machine", label: "Kali Machine" },
      { key: "wazuh_manager", label: "Wazuh Manager" },
    ]
  }
  return []
}

function safeObj(value: unknown): Record<string, any> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, any>
  return null
}

function extractInstancesFromDeployment(deployment: AdminDeployment | null): Record<string, any> {
  if (!deployment) return {}
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
  if (!obj) return {}
  const summary = safeObj(obj.lab_summary)
  const value = safeObj(summary?.value)
  const directInstances = safeObj(obj.instances)
  const nestedInstances = safeObj(value?.instances) || safeObj(summary?.instances)
  return nestedInstances || directInstances || {}
}

export default function DeploymentDetailPage() {
  const params = useParams<{ deploymentId: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromFeed = searchParams.get("fromFeed") === "1"
  const [loading, setLoading] = useState(true)
  const [retrying, setRetrying] = useState(false)
  const [deployment, setDeployment] = useState<AdminDeployment | null>(null)
  const [payments, setPayments] = useState<AdminBillingPaymentRow[]>([])

  const deploymentId = decodeURIComponent(params.deploymentId || "")
  const userId = searchParams.get("user_id") || ""
  const contentId = searchParams.get("content_id") || ""

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const matched =
          deploymentId && deploymentId !== "unknown"
            ? (await api.adminDeploymentById(deploymentId)).deployment
            : null
        setDeployment(matched)
        const effectiveUserId = matched?.user_id || userId || undefined
        const p = await api.adminBillingPayments({
          user_id: effectiveUserId,
          limit: effectiveUserId ? 100 : 300,
        })
        setPayments(p.rows)
      } catch (err: any) {
        const msg = (err?.message || "Failed to load deployment detail").toLowerCase()
        if (msg.includes("token") || msg.includes("unauthorized")) {
          clearToken()
          showToast("info", "Session expired. Please login again.")
          router.replace("/login")
          return
        }
        showToast("error", err?.message || "Failed to load deployment detail")
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [deploymentId, router, userId])

  const detail = useMemo<DetailRow>(() => {
    const effectiveUserId = deployment?.user_id || userId
    const payment =
      payments
        .filter((p) => p.user_id === effectiveUserId && (p.content_id || "") === (deployment?.content_id || contentId))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] || null
    return { deployment, payment }
  }, [contentId, deployment, payments, userId])

  const deploymentStatus = (detail.deployment?.status || "unknown").toLowerCase()
  const failureReason = (detail.deployment?.error || "").trim()
  const failureFocused = ["failed", "cleanup_failed"].includes(deploymentStatus) || Boolean(failureReason)
  const hasActiveDeployment = ["queued", "provisioning", "running", "terminating"].includes(deploymentStatus)
  const retryEnabled =
    Boolean(detail.deployment) &&
    !retrying &&
    !hasActiveDeployment

  const timeline = [
    { key: "provisioning", label: "PROVISIONING", state: "done" as const },
    { key: "image_pull", label: "IMAGE_PULL", state: "done" as const },
    {
      key: "container_init",
      label: "CONTAINER_INIT",
      state: failureFocused ? ("failed" as const) : ("done" as const),
    },
    {
      key: "health_check",
      label: "HEALTH_CHECK",
      state: failureFocused ? ("halted" as const) : ("running" as const),
    },
  ]

  const vmInventory = useMemo<VmInventoryRow[]>(() => {
    const deployment = detail.deployment
    const roles = expectedVmRolesForLab(deployment?.lab_type)
    const instances = extractInstancesFromDeployment(deployment)
    const deploymentStatus = (deployment?.status || "").toLowerCase()

    const deriveState = (hasInstance: boolean): VmInventoryRow["state"] => {
      if (hasInstance) return "running"
      if (["queued", "provisioning", "running", "terminating"].includes(deploymentStatus)) return "provisioning"
      if (["failed", "cleanup_failed"].includes(deploymentStatus)) return "failed"
      return "unknown"
    }

    return roles.map((role) => {
      const inst = safeObj(instances[role.key]) || {}
      const instanceId = String(inst.id || inst.instance_id || "—")
      const privateIp = String(inst.private_ip || "—")
      const publicIp = String(inst.public_ip || "—")
      const hasInstance = instanceId !== "—" || privateIp !== "—" || publicIp !== "—"
      return {
        key: role.key,
        label: role.label,
        instanceId,
        privateIp,
        publicIp,
        state: deriveState(hasInstance),
      }
    })
  }, [detail.deployment])

  const handleRetry = async () => {
    if (!detail.deployment?.content_id || !detail.deployment?.user_id) {
      showToast("error", "Retry unavailable: deployment mapping missing.")
      return
    }
    if (hasActiveDeployment) {
      showToast("info", "An active deployment already exists for this lab. Wait for completion before retrying.")
      return
    }
    setRetrying(true)
    try {
      const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
      await api.sysDeployLabForUser({
        target_user_id: detail.deployment.user_id,
        content_id: detail.deployment.content_id,
        expires_at: expiresAt,
      })
      showToast("success", "Retry step queued")
    } catch (err: any) {
      const msg = err?.message || "Failed to retry deployment"
      if (String(msg).toLowerCase().includes("active deployment already exists")) {
        showToast("info", "Deployment is already active for this user/lab. No retry needed now.")
      } else {
        showToast("error", msg)
      }
    } finally {
      setRetrying(false)
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
      <OpsFeedReturnBanner />
      <section className="border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Deployment ID</p>
            <h1 className="mt-1 break-all text-3xl font-semibold tracking-tight">{detail.deployment?.deployment_id || deploymentId}</h1>
            <div className="mt-3 grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
              <p className="min-w-0 break-all"><span className="text-muted-foreground">Initiated by:</span> {detail.deployment?.user_email || detail.deployment?.user_id || userId || "—"}</p>
              <p className="min-w-0 break-words"><span className="text-muted-foreground">Lab assignment:</span> {detail.deployment?.lab_title || detail.payment?.content_title || "—"}</p>
              <p><span className="text-muted-foreground">Uptime:</span> {fmtAge(detail.deployment?.created_at)} </p>
            </div>
          </div>
          <span
            className={`inline-flex items-center border px-3 py-1 text-xs font-bold uppercase ${
              failureFocused ? "border-red-700 text-red-300" : "border-zinc-600 text-zinc-300"
            }`}
          >
            {failureFocused ? "FAILURE_DETECTED" : (detail.deployment?.status || "UNKNOWN")}
          </span>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-12">
        <section className="min-w-0 border border-border bg-card p-4 lg:col-span-4">
          <h2 className="text-xl font-semibold">LIFECYCLE_TIMELINE</h2>
          <div className="mt-4 space-y-4">
            {timeline.map((step) => (
              <div
                key={step.key}
                className={`border-l-2 pl-3 ${
                  step.state === "failed"
                    ? "border-red-600 bg-red-950/20"
                    : step.state === "running"
                      ? "border-sky-600"
                      : "border-zinc-700"
                }`}
              >
                <p className="text-xs font-bold tracking-wide">{step.label}</p>
                <p className="text-sm text-muted-foreground">
                  {step.state === "failed" ? "Failed" : step.state === "running" ? "Running checks" : "Completed"}{" "}
                  at {detail.deployment?.created_at ? new Date(detail.deployment.created_at).toLocaleTimeString() : "—"}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="min-w-0 border border-border bg-card p-4 lg:col-span-8">
          <h2 className="text-xl font-semibold">INFRASTRUCTURE_SPEC</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <SpecBox label="NODE_CPU" value="8 CORE XEON" />
            <SpecBox label="MEM_ALLOC" value="32GB DDR4" />
            <SpecBox label="NET_STACK" value={detail.deployment?.private_ip || "VPC_10.0.4.x"} />
            <SpecBox label="STORAGE" value="500GB NVME" />
          </div>

          <h3 className="mt-5 text-lg font-semibold">ASSIGNED_VM_INVENTORY</h3>
          <div className="mt-3 overflow-x-auto border border-zinc-700">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-zinc-700 text-xs uppercase text-muted-foreground">
                  <th className="px-3 py-2 text-left">VM Role</th>
                  <th className="px-3 py-2 text-left">Instance ID</th>
                  <th className="px-3 py-2 text-left">State</th>
                  <th className="px-3 py-2 text-left">Private IP</th>
                  <th className="px-3 py-2 text-left">Public IP</th>
                </tr>
              </thead>
              <tbody>
                {vmInventory.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-xs text-muted-foreground">
                      VM inventory is not mapped for this lab type yet.
                    </td>
                  </tr>
                ) : (
                  vmInventory.map((vm) => (
                    <tr key={vm.key} className="border-b border-zinc-800/70 text-xs">
                      <td className="px-3 py-2">{vm.label}</td>
                      <td className="px-3 py-2 font-mono">{vm.instanceId}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex border px-2 py-0.5 text-[10px] font-bold uppercase ${
                            vm.state === "running"
                              ? "border-emerald-700 text-emerald-300"
                              : vm.state === "provisioning"
                                ? "border-amber-700 text-amber-300"
                                : vm.state === "failed"
                                  ? "border-red-700 text-red-300"
                                  : "border-zinc-600 text-zinc-300"
                          }`}
                        >
                          {vm.state}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono">{vm.privateIp}</td>
                      <td className="px-3 py-2 font-mono">{vm.publicIp}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <h3 className="mt-5 text-lg font-semibold">FAILURE_VIEW</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className={`min-w-0 border p-3 ${failureFocused ? "border-red-800 bg-red-950/20" : "border-zinc-700"}`}>
              <p className="text-xs font-bold uppercase tracking-wide">Failure Reason</p>
              <p className="mt-2 text-sm break-words">{failureReason || "No failure currently mapped for this deployment."}</p>
            </div>
            <div className="min-w-0 overflow-x-auto border border-zinc-700 bg-black p-3 font-mono text-xs leading-5 text-zinc-300">
              <pre className="whitespace-pre-wrap break-words">
                [worker] checking health...
                {"\n"}[worker] deployment: {detail.deployment?.deployment_id || "unknown"}
                {"\n"}[error] {failureReason || "none"}
                {"\n"}[next] click Retry Step to queue immediate recovery
              </pre>
            </div>
          </div>
        </section>
      </div>

      <section className="border border-border bg-card p-4">
        <h2 className="text-lg font-semibold">PAYMENT SNAPSHOT</h2>
        <div className="mt-3 grid gap-3 text-sm md:grid-cols-5">
          <p><span className="text-muted-foreground">Status:</span> {detail.payment?.status || "none"}</p>
          <p><span className="text-muted-foreground">Amount:</span> {typeof detail.payment?.amount === "number" ? `${(detail.payment.amount / 100).toFixed(2)} ${detail.payment.currency}` : "—"}</p>
          <p className="truncate"><span className="text-muted-foreground">Order:</span> {detail.payment?.gateway_order_id || "—"}</p>
          <p className="truncate"><span className="text-muted-foreground">Payment ID:</span> {detail.payment?.gateway_payment_id || "—"}</p>
          <p><span className="text-muted-foreground">Entitlement:</span> {detail.payment?.entitlement_status || "none"}</p>
        </div>
      </section>

      <section className="border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">Manual actions available for this deployment state.</p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="h-9 border border-primary bg-primary px-3 text-xs font-bold uppercase text-primary-foreground disabled:opacity-50"
              onClick={() => void handleRetry()}
              disabled={!retryEnabled}
              title={hasActiveDeployment ? "Active deployment exists; retry is disabled." : undefined}
            >
              {retrying ? "RETRYING..." : hasActiveDeployment ? "ACTIVE_DEPLOYMENT" : "RETRY_STEP"}
            </button>
            <button
              className="h-9 border border-zinc-700 px-3 text-xs font-bold uppercase text-muted-foreground opacity-60 cursor-not-allowed"
              disabled
              title="Coming Soon"
            >
              MARK_RESOLVED (Coming Soon)
            </button>
            <button
              className="h-9 border border-zinc-700 px-3 text-xs font-bold uppercase text-muted-foreground opacity-60 cursor-not-allowed"
              disabled
              title="Coming Soon"
            >
              ESCALATE_TICKET (Coming Soon)
            </button>
            <button
              className="h-9 border border-red-900 px-3 text-xs font-bold uppercase text-red-300 opacity-50 cursor-not-allowed"
              disabled
              title="Coming Soon"
            >
              RESTART_PROCESS (Coming Soon)
            </button>
          </div>
        </div>
      </section>

      <Button asChild variant="outline" size="sm">
        <Link href={fromFeed ? "/admin/ops/feed" : "/admin/ops/individual"}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {fromFeed ? "Back to operations feed" : "Back to Individual Ops"}
        </Link>
      </Button>

    </div>
  )
}

function SpecBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-zinc-700 bg-background p-3">
      <p className="text-[10px] font-bold uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm">{value}</p>
    </div>
  )
}

