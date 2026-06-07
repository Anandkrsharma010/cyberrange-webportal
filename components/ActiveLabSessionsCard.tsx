"use client"

import { useEffect, useState } from "react"
import { api, type LabJoinResponse } from "@/lib/api"
import { apiClient } from "@/lib/api"
import { showToast } from "@/components/toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Activity,
  Copy,
  Loader2,
  PlayCircle,
  RefreshCcw,
  Terminal,
} from "lucide-react"

interface LabStatusItem {
  deployment_id: string
  status: string
  is_owner: boolean
  public_ip: string | null
  private_ip: string | null
  error: string | null
  lab_title: string
  created_at: string
  expires_at: string
  can_join: boolean
}

function formatDateTime(value?: string) {
  if (!value) return "—"
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

function statusBadge(status: string) {
  const s = status.toLowerCase()
  if (s === "running") {
    return (
      <Badge className="bg-emerald-600/15 text-emerald-700 hover:bg-emerald-600/20">
        running
      </Badge>
    )
  }
  if (s === "queued" || s === "provisioning") {
    return <Badge variant="secondary">{status}</Badge>
  }
  if (s === "failed" || s === "cleanup_failed") {
    return <Badge variant="destructive">{status}</Badge>
  }
  if (s === "terminating" || s === "expired") {
    return <Badge variant="outline">{status}</Badge>
  }
  return <Badge variant="outline">{status}</Badge>
}

export default function ActiveLabSessionsCard() {
  const [items, setItems] = useState<LabStatusItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [joinOpen, setJoinOpen] = useState(false)
  const [joinLoading, setJoinLoading] = useState(false)
  const [joinData, setJoinData] = useState<LabJoinResponse | null>(null)
  const [joinFor, setJoinFor] = useState<LabStatusItem | null>(null)

  const load = async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const res = await apiClient.get<{ deployments: LabStatusItem[] }>(
        "/labs/status",
      )
      if (res.success && res.data?.deployments) {
        setItems(res.data.deployments)
      } else {
        setItems([])
      }
    } finally {
      if (!silent) setLoading(false)
      else setRefreshing(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const openJoin = async (item: LabStatusItem) => {
    setJoinFor(item)
    setJoinData(null)
    setJoinOpen(true)
    setJoinLoading(true)
    try {
      const data = await api.joinLab(item.deployment_id)
      setJoinData(data)
    } catch (err: any) {
      showToast("error", err?.message || "Failed to mint join key")
      setJoinOpen(false)
    } finally {
      setJoinLoading(false)
    }
  }

  const copyCommand = async () => {
    if (!joinData?.command) return
    try {
      await navigator.clipboard.writeText(joinData.command)
      showToast("success", "Tailscale command copied to clipboard")
    } catch {
      showToast("error", "Copy failed — select the command and copy manually")
    }
  }

  if (loading) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="w-5 h-5" />
            <span>Active Lab Sessions</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (items.length === 0) {
    return null
  }

  return (
    <>
      <Card className="mb-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="w-5 h-5" />
              <span>Active Lab Sessions</span>
            </CardTitle>
            <CardDescription>
              Deployments you can see. Running labs show a{" "}
              <strong>Join</strong> button that mints a 15-minute Tailscale key.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => load(true)}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.map((it) => (
            <div
              key={it.deployment_id}
              className="rounded-lg border p-4 transition-shadow hover:shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-semibold text-gray-900">
                      {it.lab_title}
                    </h3>
                    {statusBadge(it.status)}
                    {it.is_owner ? (
                      <Badge variant="outline">owner</Badge>
                    ) : (
                      <Badge variant="outline">member</Badge>
                    )}
                  </div>
                  <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                    {it.deployment_id}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>Created {formatDateTime(it.created_at)}</span>
                    <span>Expires {formatDateTime(it.expires_at)}</span>
                    {it.is_owner && it.public_ip && (
                      <span>
                        Public IP:{" "}
                        <code className="font-mono text-gray-900">
                          {it.public_ip}
                        </code>
                      </span>
                    )}
                    {it.is_owner && it.private_ip && (
                      <span>
                        Private IP:{" "}
                        <code className="font-mono text-gray-900">
                          {it.private_ip}
                        </code>
                      </span>
                    )}
                  </div>
                  {it.error && (
                    <p className="mt-2 text-xs text-destructive">{it.error}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => openJoin(it)}
                    disabled={!it.can_join && it.status !== "running"}
                    title={
                      it.can_join
                        ? "Mint a Tailscale join key"
                        : it.is_owner
                          ? "Owners can join too when the lab is running"
                          : "Only running labs can be joined"
                    }
                  >
                    <PlayCircle className="mr-2 h-4 w-4" />
                    Join
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Terminal className="h-4 w-4" />
              Join{joinFor ? ` ${joinFor.lab_title}` : " lab"}
            </DialogTitle>
            <DialogDescription>
              Run this command on your device to connect. Key expires in{" "}
              {joinData?.ttl_minutes ?? 15} minutes; re-open the dialog for a
              fresh key.
            </DialogDescription>
          </DialogHeader>
          {joinLoading || !joinData ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-lg border bg-muted p-3">
                <code className="block break-all font-mono text-xs">
                  {joinData.command}
                </code>
              </div>
              <div className="grid grid-cols-1 gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                <div>
                  <span className="font-semibold">Login server: </span>
                  <code className="font-mono">{joinData.login_server}</code>
                </div>
                <div>
                  <span className="font-semibold">Key expires: </span>
                  {formatDateTime(joinData.expires_at)}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setJoinOpen(false)}>
              Close
            </Button>
            <Button onClick={copyCommand} disabled={!joinData?.command}>
              <Copy className="mr-2 h-4 w-4" />
              Copy command
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
