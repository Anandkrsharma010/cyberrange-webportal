"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

/** Legacy URL: `/course-admin/workshops/:id` → canonical cohort delivery route. */
export default function CourseAdminLegacyWorkshopDetailRedirect() {
  const params = useParams<{ workshopId: string }>()
  const router = useRouter()
  const id = typeof params.workshopId === "string" ? params.workshopId : ""

  useEffect(() => {
    if (!id) return
    router.replace(`/course-admin/cohorts/${encodeURIComponent(id)}`)
  }, [id, router])

  return (
    <div className="flex items-center justify-center py-20 text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  )
}
