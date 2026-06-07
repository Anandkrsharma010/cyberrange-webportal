"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { showToast } from "@/components/toast"
import Header from "@/components/Header"
import { Shield, Sparkles } from "lucide-react"
import { getRoleHome } from "@/lib/role-home"

export default function LoginPage() {
  const router = useRouter()
  const { isAuthenticated, user, devLogin, devLoginParticipant } = useAuth()
  const [busy, setBusy] = useState<string | null>(null)
  const [testEmail, setTestEmail] = useState("")

  useEffect(() => {
    if (isAuthenticated && user) {
      const ret =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("return") || ""
          : ""
      const safe =
        ret.startsWith("/") && !ret.startsWith("//") ? ret : ""
      router.replace(safe || getRoleHome(user.role))
    }
  }, [isAuthenticated, user, router])

  if (isAuthenticated && user) return null

  const handleDevLogin = async () => {
    setBusy("admin")
    try {
      const role = await devLogin()
      showToast("success", "Logged in (dev mode)")
      const ret =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("return") || ""
          : ""
      const safe = ret.startsWith("/") && !ret.startsWith("//") ? ret : ""
      router.push(safe || getRoleHome(role))
    } catch (err: unknown) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Dev login failed — is the backend running?",
      )
    } finally {
      setBusy(null)
    }
  }

  const handleParticipantLogin = async () => {
    setBusy("participant")
    try {
      const email = testEmail.trim() || undefined
      const role = await devLoginParticipant(email)
      showToast("success", `Logged in as ${email || "participant"}`)
      const ret =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("return") || ""
          : ""
      const safe = ret.startsWith("/") && !ret.startsWith("//") ? ret : ""
      router.push(safe || getRoleHome(role))
    } catch (err: unknown) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Dev login failed — is the backend running?",
      )
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-slate-100 flex flex-col selection:bg-emerald-500/30">
      <Header active="home" />

      <main className="flex-1 flex items-center justify-center px-4 py-24">
        <Card className="w-full max-w-md border-white/10 bg-white/[0.02] backdrop-blur-xl shadow-2xl rounded-3xl p-4">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)]">
              <Shield className="h-7 w-7 text-emerald-400" />
            </div>
            <CardTitle className="text-2xl font-black text-white">Sign in to RangeOps</CardTitle>
            <CardDescription className="space-y-1 text-slate-400 font-light mt-1">
              <span className="block text-sm">Cybersecurity training platform</span>
              <span className="block text-[11px] text-slate-500">
                by DeepTrustxAI Academy
              </span>
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <Button variant="outline" className="w-full h-11 rounded-xl border-white/10 bg-white/5 text-slate-400 cursor-not-allowed hover:bg-white/5 hover:text-slate-400" disabled>
              Continue with Google (coming soon)
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#0e0e11] px-3 text-slate-500 font-light">or</span>
              </div>
            </div>

            <Button
              className="w-full h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-lg shadow-emerald-500/20"
              disabled={busy !== null}
              onClick={handleDevLogin}
            >
              {busy === "admin" ? "Signing in…" : "Dev Login — Admin"}
            </Button>

            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="test@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="flex-1 h-11 rounded-xl border-white/10 bg-white/5 text-sm text-white placeholder-slate-500"
              />
              <Button
                variant="outline"
                disabled={busy !== null}
                onClick={handleParticipantLogin}
                className="h-11 rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10 font-semibold px-5"
              >
                {busy === "participant" ? "..." : "Login"}
              </Button>
            </div>

            <p className="text-center text-[10px] text-slate-500 font-light mt-4 leading-relaxed">
              Dev login creates test accounts automatically in the database.
              <br />
              Google SSO auth will be enabled for production deployments.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
