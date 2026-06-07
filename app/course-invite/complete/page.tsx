"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2, ShieldCheck } from "lucide-react"

import Header from "@/components/Header"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { api, WORKSHOP_INVITE_SESSION_KEY } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { getRoleHome } from "@/lib/role-home"
import { showToast } from "@/components/toast"

export default function CourseInviteCompletePage() {
  const router = useRouter()
  const { isAuthenticated, isLoading, user, refreshUser } = useAuth()
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">("idle")
  const [summary, setSummary] = useState<string | null>(null)
  const ranRef = useRef(false)

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) {
      router.replace("/login?return=%2Fcourse-invite%2Fcomplete")
      return
    }
    if (ranRef.current) return
    const token =
      typeof window !== "undefined"
        ? sessionStorage.getItem(WORKSHOP_INVITE_SESSION_KEY) || ""
        : ""
    if (!token) {
      setStatus("error")
      setSummary("No invitation token found. Open your invite link again.")
      return
    }
    ranRef.current = true
    setStatus("working")
    ;(async () => {
      try {
        const out = await api.redeemWorkshopInvite(token)
        sessionStorage.removeItem(WORKSHOP_INVITE_SESSION_KEY)
        await refreshUser()
        setStatus("done")
        setSummary(
          `You are now enrolled in “${out.workshop_title || "the workshop"}”.`,
        )
        showToast("success", "Workshop seat activated.")
      } catch (e: unknown) {
        ranRef.current = false
        setStatus("error")
        setSummary(e instanceof Error ? e.message : "Could not accept the invitation.")
      }
    })()
  }, [isLoading, isAuthenticated, router, refreshUser])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] text-slate-100 flex flex-col">
        <Header active="home" />
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
            <p className="text-sm font-medium text-slate-400 animate-pulse">Synchronizing auth state…</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-slate-100 flex flex-col selection:bg-emerald-500/30">
      <Header active="home" />
      <main className="mx-auto max-w-lg px-4 py-24 w-full flex flex-col justify-center">
        <Card className="border-white/10 bg-white/[0.02] backdrop-blur-xl shadow-2xl rounded-3xl p-4">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 font-mono text-[10px] text-emerald-400 font-bold shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)]">
                <ShieldCheck className="w-3 h-3" /> Workshop Activation
              </span>
            </div>
            <CardTitle className="text-white text-xl font-bold">Workshop invitation</CardTitle>
            <CardDescription className="text-slate-400 font-light mt-1">
              {status === "working" && "Confirming your range seat…"}
              {status === "done" && summary}
              {status === "error" && summary}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4 border-t border-white/5 mt-2">
            {status === "working" && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-7 w-7 animate-spin text-emerald-500" />
              </div>
            )}
            {status === "done" && user && (
              <Button asChild className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold h-11 rounded-xl shadow-lg shadow-emerald-500/20">
                <Link href={getRoleHome(user.role)}>Go to dashboard</Link>
              </Button>
            )}
            {status === "error" && (
              <div className="flex flex-col sm:flex-row gap-2">
                <Button asChild variant="outline" className="flex-1 border-white/10 bg-white/5 text-white hover:bg-white/10 rounded-xl">
                  <Link href="/course-invite">Back to invite</Link>
                </Button>
                <Button asChild className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-md">
                  <Link href="/login">Sign in</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
