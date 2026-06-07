"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, ShieldCheck, Mail, ArrowRight } from "lucide-react"

import Header from "@/components/Header"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { api, WORKSHOP_INVITE_SESSION_KEY, type WorkshopInvitePreview } from "@/lib/api"
import { useAuth } from "@/lib/auth"

function InviteLandingInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = (searchParams.get("token") || "").trim()
  const { isAuthenticated, isLoading, user } = useAuth()
  const [preview, setPreview] = useState<WorkshopInvitePreview | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) {
      setLoadError("Missing invite token in the link.")
      setLoading(false)
      return
    }
    ;(async () => {
      try {
        const p = await api.previewWorkshopInvite(token)
        setPreview(p)
        if (typeof window !== "undefined") {
          sessionStorage.setItem(WORKSHOP_INVITE_SESSION_KEY, token)
        }
      } catch (e: unknown) {
        setLoadError(e instanceof Error ? e.message : "Could not load invitation.")
      } finally {
        setLoading(false)
      }
    })()
  }, [token])

  const goComplete = () => {
    router.push("/course-invite/complete")
  }

  const goLogin = () => {
    const ret = encodeURIComponent("/course-invite/complete")
    router.push(`/login?return=${ret}`)
  }

  if (loading || isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-[#0A0A0B]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
          <p className="text-sm font-medium text-slate-400 animate-pulse">Loading invitation details…</p>
        </div>
      </div>
    )
  }

  if (loadError || !token) {
    return (
      <Card className="mx-auto max-w-lg border-white/10 bg-white/[0.02] backdrop-blur-xl shadow-2xl rounded-3xl p-4">
        <CardHeader>
          <CardTitle className="text-white text-xl font-bold">Invitation Error</CardTitle>
          <CardDescription className="text-slate-400 font-light mt-1">{loadError || "Invalid link."}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" className="border-white/10 bg-white/5 text-white hover:bg-white/10 rounded-xl px-6">
            <Link href="/">Return Home</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!preview?.valid) {
    const reason = preview?.reason || "unknown"
    const msg =
      reason === "expired"
        ? "This invitation has expired. Ask your course administrator for a new one."
        : reason === "already_used_or_revoked"
          ? "This invitation was already used or revoked."
          : "This invitation link is not valid."
    return (
      <Card className="mx-auto max-w-lg border-white/10 bg-white/[0.02] backdrop-blur-xl shadow-2xl rounded-3xl p-4">
        <CardHeader>
          <CardTitle className="text-white text-xl font-bold">Invitation Unavailable</CardTitle>
          <CardDescription className="text-slate-400 font-light mt-1">{msg}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" className="border-white/10 bg-white/5 text-white hover:bg-white/10 rounded-xl px-6">
            <Link href="/login">Sign in</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mx-auto max-w-lg border-white/10 bg-white/[0.02] backdrop-blur-xl shadow-2xl rounded-3xl p-4">
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 font-mono text-[10px] text-emerald-400 font-bold shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)]">
            <ShieldCheck className="w-3 h-3" /> Workshop Invite
          </span>
        </div>
        <CardTitle className="text-white text-2xl font-black tracking-tight">{preview.workshop_title}</CardTitle>
        <CardDescription className="text-slate-400 font-light mt-2 flex items-center gap-1.5">
          <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Invite key mapped to <span className="font-semibold text-slate-200">{preview.email_mask}</span></span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 text-sm text-slate-300 font-light leading-relaxed mt-2">
        <p>
          Sign in with the <span className="font-semibold text-white">same email address</span> the invitation was sent to, then accept the invite to activate your range seat.
        </p>
        
        {isAuthenticated && user ? (
          <div className="space-y-4 pt-4 border-t border-white/5">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-xs text-slate-400">Authenticated profile:</p>
              <p className="text-sm font-semibold font-mono text-white mt-0.5">{user.email}</p>
            </div>
            <Button type="button" onClick={() => goComplete()} className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold h-11 rounded-xl shadow-lg shadow-emerald-500/20">
              Accept invitation <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        ) : (
          <Button type="button" onClick={() => goLogin()} className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold h-11 rounded-xl shadow-lg shadow-emerald-500/20">
            Sign in to accept
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

export default function CourseInvitePage() {
  return (
    <div className="min-h-screen bg-[#0A0A0B] text-slate-100 flex flex-col selection:bg-emerald-500/30">
      <Header active="home" />
      <main className="mx-auto max-w-2xl px-4 py-24 w-full flex flex-col justify-center">
        <Suspense
          fallback={
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
          }
        >
          <InviteLandingInner />
        </Suspense>
      </main>
    </div>
  )
}
