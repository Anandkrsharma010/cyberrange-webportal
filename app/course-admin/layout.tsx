"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, Layers, LogOut, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { getRoleHome } from "@/lib/role-home"

const NAV = [
  { href: "/course-admin", label: "Cohorts you operate", icon: Layers },
  { href: "/dashboard", label: "Learner dashboard", icon: LayoutDashboard },
] as const

export default function CourseAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isLoading, isAuthenticated, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) {
      router.replace("/login")
      return
    }
    if (user?.role !== "course_admin" && user?.role !== "sys_admin") {
      router.replace(getRoleHome(user?.role))
    }
  }, [isLoading, isAuthenticated, user, router])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user || (user.role !== "course_admin" && user.role !== "sys_admin")) {
    return null
  }

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r bg-card">
        <div className="flex h-auto min-h-14 flex-col justify-center gap-0.5 border-b px-4 py-3">
          <Link href="/" className="font-bold tracking-tight leading-tight">
            RangeOps
          </Link>
          <span className="text-xs font-medium text-muted-foreground">
            Course administration
          </span>
          <p className="text-[10px] leading-tight text-muted-foreground">
            by DeepTrustxAI Academy
          </p>
        </div>

        <p className="border-b px-3 py-2 text-[11px] leading-snug text-muted-foreground">
          <span className="font-medium text-foreground">Cohorts you operate</span> lists
          workshops where you are an operator. Your own purchases stay on the learner
          dashboard.
        </p>

        <nav className="flex-1 space-y-1 p-3">
          {NAV.map((item) => {
            const active =
              item.href === "/course-admin"
                ? pathname.startsWith("/course-admin")
                : pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="leading-tight">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="border-t p-3">
          <div className="mb-2 truncate px-3 text-xs text-muted-foreground">
            {user.email}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={() => {
              logout()
              router.push("/login")
            }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Log out
          </Button>
        </div>
      </aside>

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl p-6">{children}</div>
      </div>
    </div>
  )
}
