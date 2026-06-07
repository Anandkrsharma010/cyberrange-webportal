"use client"

import { usePathname } from "next/navigation"
import { SiteFooter } from "@/components/SiteFooter"

/** Hides the marketing footer on admin routes. */
export function SiteFooterGate() {
  const pathname = usePathname()
  if (
    pathname?.startsWith("/admin") ||
    pathname === "/login" ||
    pathname === "/register"
  ) {
    return null
  }
  return <SiteFooter />
}
