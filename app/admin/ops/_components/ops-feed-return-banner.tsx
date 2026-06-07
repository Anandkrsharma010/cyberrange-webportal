"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { BellRing } from "lucide-react"

/** Shown when the user arrived via `?fromFeed=1` (opened from Operations feed). */
export function OpsFeedReturnBanner() {
  const sp = useSearchParams()
  if (sp.get("fromFeed") !== "1") return null
  return (
    <div className="rounded-lg border border-primary/25 bg-primary/5 px-4 py-3 text-sm">
      <Link
        href="/admin/ops/feed"
        className="inline-flex items-center gap-2 font-medium text-primary hover:underline"
      >
        <BellRing className="h-4 w-4 shrink-0" />
        Back to operations feed
      </Link>
      <span className="ml-2 text-muted-foreground">· opened from inbox</span>
    </div>
  )
}
