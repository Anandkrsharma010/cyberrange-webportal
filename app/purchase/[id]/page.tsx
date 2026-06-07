'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

/** Legacy checkout URLs redirect to labs catalog with inline Razorpay buy. */
export default function PurchaseRedirectPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params?.id ?? ''

  useEffect(() => {
    if (!id) {
      router.replace('/labs')
      return
    }
    router.replace(`/labs?buy=${encodeURIComponent(id)}`)
  }, [id, router])

  return (
    <div className="min-h-screen common-background flex items-center justify-center">
      <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
    </div>
  )
}
