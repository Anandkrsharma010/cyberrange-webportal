"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

/** Legacy URL: merged into cohort home (`/course-admin`). */
export default function CourseAdminLegacyWorkshopsListRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/course-admin")
  }, [router])

  return (
    <div className="flex items-center justify-center py-20 text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  )
}
