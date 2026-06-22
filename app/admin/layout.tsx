"use client"

import { useEffect, useMemo } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboard,
  Users,
  Server,
  BookOpen,
  FileText,
  ShieldCheck,
  UserCog,
  Users2,
  CreditCard,
  BellRing,
  LogOut,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { getRoleHome } from "@/lib/role-home"

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/ops/individual", label: "Individual Ops", icon: Users },
  { href: "/admin/ops/workshop", label: "Workshop Ops", icon: Users2 },
  { href: "/admin/ops/feed", label: "Operations Feed", icon: BellRing },
  { href: "/admin/users", label: "Accounts", icon: Users },
  { href: "/admin/courses", label: "Courses", icon: BookOpen },
  { href: "/admin/content", label: "Content Studio", icon: FileText },
  { href: "/admin/course-admins", label: "Course Admins", icon: UserCog },
  { href: "/admin/guardrails", label: "Guardrails", icon: ShieldCheck },
  { href: "/admin/participants", label: "Participants", icon: Users2 },
  { href: "/admin/deployments", label: "Lab deployments", icon: Server },
  { href: "/admin/billing", label: "Billing Snapshot", icon: CreditCard },
  { href: "/admin/billing/payments", label: "Billing Payments", icon: CreditCard },
] as const

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isLoading, isAuthenticated, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const activeHref = useMemo(() => {
    const matches = NAV.filter((item) => {
      if (item.href === "/admin") return pathname === "/admin"
      return pathname === item.href || pathname.startsWith(`${item.href}/`)
    }).sort((a, b) => b.href.length - a.href.length)
    return matches[0]?.href ?? "/admin"
  }, [pathname])

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) {
      router.replace("/login")
      return
    }
    if (user?.role !== "sys_admin") {
      router.replace(getRoleHome(user?.role))
    }
  }, [isLoading, isAuthenticated, user, router])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070709]">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    )
  }

  if (!user || user.role !== "sys_admin") return null

  return (
    <div className="flex min-h-screen bg-[#070709] text-slate-100 font-sans">
      {/* Sidebar */}
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-white/10 bg-[#0D0D11]/90 backdrop-blur-xl">
        <div className="flex h-auto min-h-16 flex-col justify-center gap-0.5 border-b border-white/10 px-6 py-3">
          <Link href="/" className="font-extrabold tracking-wider leading-tight text-white flex items-center gap-1.5">
            RangeOps{" "}
            <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded text-emerald-400">
              Admin
            </span>
          </Link>
          <p className="text-[9px] uppercase tracking-wider text-slate-500">
            by DeepTrustxAI Academy
          </p>
        </div>

        <nav className="flex-1 space-y-1 p-4 overflow-y-auto custom-scrollbar">
          {NAV.map((item) => {
            const active = item.href === activeHref
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-2.5 text-xs transition-all font-semibold",
                  active
                    ? "bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-500"
                    : "text-slate-400 hover:bg-white/5 hover:text-white",
                )}
              >
                <item.icon className={cn("h-4 w-4 shrink-0", active ? "text-emerald-400" : "text-slate-400")} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-white/10 p-4 bg-black/20">
          <div className="mb-3 truncate px-3 text-[11px] font-mono text-slate-400">
            {user.email}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 rounded-xl h-9"
            onClick={() => {
              logout()
              router.push("/login")
            }}
          >
            <LogOut className="mr-2 h-4 w-4 text-slate-400" />
            Log out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl p-8">{children}</div>
      </div>
    </div>
  )
}
