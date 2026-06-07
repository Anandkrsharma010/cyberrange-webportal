"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

/** Legacy URL: `/course-admin/:contentId` → canonical lab delivery route. */
export default function CourseAdminLegacyLabRedirect() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = typeof params.id === "string" ? params.id : ""

  useEffect(() => {
    if (!id) return
    router.replace(`/course-admin/labs/${encodeURIComponent(id)}`)
  }, [id, router])

  return (
    <div className="flex items-center justify-center py-20 text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  )
}
