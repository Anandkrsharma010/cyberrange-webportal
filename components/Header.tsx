"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Home,
  BookOpenCheck,
  LayoutDashboard,
  ShieldCheck,
  LogOut,
  User,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { getAdminEntry, getRoleHome } from "@/lib/role-home"

type HeaderProps = {
  active?: "home" | "labs" | "dashboard"
}

export default function Header({ active }: HeaderProps) {
  const router = useRouter()
  const { user, isAuthenticated, logout } = useAuth()

  const adminEntry = getAdminEntry(user?.role)

  const handleLogout = async () => {
    await logout()
    router.push("/login")
  }

  const navLinks = [
    { href: "/", label: "Home", icon: Home, key: "home" as const },
    { href: "/labs", label: "Labs", icon: BookOpenCheck, key: "labs" as const },
    ...(isAuthenticated
      ? [
          {
            href: "/dashboard",
            label: "Dashboard",
            icon: LayoutDashboard,
            key: "dashboard" as const,
          },
        ]
      : []),
    ...(adminEntry
      ? [
          {
            href: adminEntry,
            label: "Admin",
            icon: ShieldCheck,
            key: "admin" as const,
          },
        ]
      : []),
  ]

  const initials = user?.email
    ? user.email
        .split("@")[0]
        .split(".")
        .map((p) => p[0]?.toUpperCase())
        .join("")
        .slice(0, 2)
    : "?"

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex min-h-14 max-w-6xl items-center justify-between gap-4 px-4 py-2">
        <Link href="/" className="leading-tight">
          <span className="block text-sm font-bold">RangeOps</span>
          <p className="text-[9px] leading-snug text-muted-foreground/90 sm:max-w-[14rem]">
            by DeepTrustxAI Academy
          </p>
        </Link>

        {/* Navigation */}
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
                active === link.key
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Auth area */}
        <div className="flex items-center gap-2">
          {!isAuthenticated ? (
            <Button size="sm" asChild>
              <Link href="/login">Login</Link>
            </Button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden text-sm sm:inline">
                    {user?.email?.split("@")[0]}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="font-normal">
                  <p className="text-sm font-medium">{user?.email}</p>
                  <p className="text-xs text-muted-foreground">{user?.role}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push(getRoleHome(user?.role))}>
                  <User className="mr-2 h-4 w-4" />
                  Workspace
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  )
}
