"use client"

import { Suspense, useEffect, useState, useCallback, useRef } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useAuth } from "@/lib/auth"
import { api } from "@/lib/api"
import { contentIdsEqual } from "@/lib/content-id"
import Header from "@/components/Header"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { CheckCircle2, Loader2, AlertCircle, ShieldCheck } from "lucide-react"

type Phase = "polling" | "ready" | "timeout"

function PurchaseSuccessInner() {
  const searchParams = useSearchParams()
  const paymentId = searchParams.get("payment_id")
  const contentId = searchParams.get("content_id")
  const { refreshUser } = useAuth()
  const [phase, setPhase] = useState<Phase>(contentId ? "polling" : "ready")
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const checkEntitlementActive = useCallback(async (): Promise<boolean> => {
    if (!contentId) return true
    try {
      const list = await api.entitlements()
      return list.some(
        (e) =>
          e.status === "active" &&
          contentIdsEqual(String(e.content_id), contentId),
      )
    } catch {
      return false
    }
  }, [contentId])

  useEffect(() => {
    let cancelled = false

    const clear = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    ;(async () => {
      await refreshUser()
      if (cancelled) return

      if (!contentId) {
        setPhase("ready")
        return
      }

      const activateIfReady = async (): Promise<boolean> => {
        const ok = await checkEntitlementActive()
        if (cancelled) return true
        if (ok) {
          await refreshUser()
          setPhase("ready")
          clear()
          return true
        }
        return false
      }

      if (await activateIfReady()) return

      let attempts = 0
      const maxAttempts = 45

      intervalRef.current = setInterval(async () => {
        if (cancelled) return
        attempts += 1
        const done = await activateIfReady()
        if (done) return
        if (attempts >= maxAttempts) {
          clear()
          setPhase("timeout")
        }
      }, 2000)
    })()

    return () => {
      cancelled = true
      clear()
    }
  }, [contentId, refreshUser, checkEntitlementActive])

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-slate-100 flex flex-col selection:bg-emerald-500/30">
      <Header />

      <main className="flex items-center justify-center px-4 py-24 w-full flex-col">
        <Card className="w-full max-w-md border-white/10 bg-white/[0.02] backdrop-blur-xl shadow-2xl rounded-3xl p-4 text-center">
          <CardHeader>
            {phase === "polling" ? (
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
              </div>
            ) : phase === "timeout" ? (
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/20">
                <AlertCircle className="h-8 w-8 text-amber-400" />
              </div>
            ) : (
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30 shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)]">
                <CheckCircle2 className="h-8 w-8 text-emerald-400" />
              </div>
            )}
            <CardTitle className="mt-4 text-2xl font-black tracking-tight text-white">
              {phase === "polling"
                ? "Activating your access"
                : phase === "timeout"
                  ? "Taking longer than expected"
                  : "Payment Successful"}
            </CardTitle>
            {phase === "polling" && (
              <p className="text-xs text-slate-400 font-light mt-1 animate-pulse">
                This usually takes a few seconds.
              </p>
            )}
          </CardHeader>

          <CardContent className="space-y-6 text-left text-sm text-slate-300 font-light leading-relaxed mt-2 pt-4 border-t border-white/5">
            {phase === "polling" && (
              <p>
                Your payment went through. We&apos;re turning on your lab access now — this page will update automatically when it&apos;s ready.
              </p>
            )}
            {phase === "ready" && (
              <p>
                Your payment is confirmed and <strong>lab access</strong> is active on your account. Your environment will appear on the dashboard when it has been prepared; you&apos;ll receive connection details there when it&apos;s ready to use.
              </p>
            )}
            {phase === "timeout" && (
              <p>
                Your payment was received, but we couldn&apos;t confirm access in the app yet. Please refresh the dashboard in a few minutes. If it still doesn&apos;t show, contact{" "}
                <a
                  className="text-emerald-400 underline hover:text-emerald-300 transition-colors"
                  href="mailto:support@deeptrustxai.academy"
                >
                  support@deeptrustxai.academy
                </a>{" "}
                and include this reference:{" "}
                <span className="font-mono text-xs text-slate-100">{paymentId ?? "—"}</span>.
              </p>
            )}

            <div className="flex flex-col gap-2 pt-2">
              {phase === "polling" ? (
                <Button disabled className="h-11 rounded-xl bg-white/5 border border-white/10 text-slate-500">
                  Go to Dashboard
                </Button>
              ) : (
                <Button asChild className="h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-lg shadow-emerald-500/20">
                  <Link href="/dashboard">Go to Dashboard</Link>
                </Button>
              )}
              <Button asChild variant="outline" className="h-11 rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10 font-semibold">
                <Link href="/labs">View Labs Catalogue</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

export default function PurchaseSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0A0A0B]">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      }
    >
      <PurchaseSuccessInner />
    </Suspense>
  )
}
