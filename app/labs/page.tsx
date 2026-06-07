'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import Script from 'next/script'
import { Cloud, Brain, Boxes, Cpu } from 'lucide-react'
import Header from '@/components/Header'
import { LabCatalogCard } from '@/components/labs/LabCatalogCard'
import { api, type PublicContentPage } from '@/lib/api'
import { labUrlId, toLab, type Lab } from '@/lib/labs'
import logger from '@/lib/logger'
import { useSearchParams } from 'next/navigation'

const UPCOMING = [
  { icon: Cloud, title: 'Cloud Security', desc: 'AWS / Azure scenarios' },
  { icon: Brain, title: 'AI Model Security', desc: 'Adversarial testing' },
  { icon: Boxes, title: 'Blockchain Systems', desc: 'Smart contract vulnerabilities' },
  { icon: Cpu, title: 'IoT Security', desc: 'Device-level exploitation' },
]

function LabsPageContent() {
  const searchParams = useSearchParams()
  const buyParam = searchParams.get('buy')?.trim() || ''

  const [labs, setLabs] = useState<Lab[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cmsPage, setCmsPage] = useState<PublicContentPage | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [buyTriggerId, setBuyTriggerId] = useState<string | null>(null)

  const loadCatalog = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const rows = await api.catalogLabs()
      setLabs(rows.map(toLab))
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      logger.error('Failed to load lab catalog:', msg, err)
      setError('Could not load labs right now. Please refresh.')
      setLabs([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
    void loadCatalog()
    const loadCms = async () => {
      try {
        const page = await api.publicContentPageBySlug('labs')
        setCmsPage(page)
      } catch {
        setCmsPage(null)
      }
    }
    void loadCms()
  }, [loadCatalog])

  // Deep link: /labs?buy=slug — expand matching lab and trigger checkout once
  useEffect(() => {
    if (!buyParam || labs.length === 0) return
    const p = buyParam.toLowerCase()
    const match = labs.find(
      (l) =>
        labUrlId(l).toLowerCase() === p ||
        l.id.toLowerCase() === p ||
        l.id.toLowerCase().replace(/-/g, '') === p.replace(/-/g, ''),
    )
    if (match) {
      setExpandedId(match.id)
      setBuyTriggerId(match.id)
    }
  }, [buyParam, labs])

  const cmsByKey = useMemo(() => {
    const map: Record<string, Record<string, unknown>> = {}
    for (const s of cmsPage?.sections || []) map[s.section_key] = s.payload || {}
    return map
  }, [cmsPage])

  const labsTitle = String(cmsByKey.labs_hero?.headline || 'Labs')
  const labsSubtitle = String(
    cmsByKey.labs_hero?.subheadline ||
      'Hands-on cyber range environments for offensive and defensive security testing.',
  )

  const upcomingCards = useMemo(() => {
    const items = cmsByKey.upcoming_cards?.items
    if (!Array.isArray(items) || items.length === 0) return UPCOMING
    const iconMap = { cloud: Cloud, ai: Brain, blockchain: Boxes, iot: Cpu } as const
    return items.slice(0, 8).map((item: Record<string, unknown>, i: number) => {
      const iconKey = String(item?.icon || '').toLowerCase() as keyof typeof iconMap
      return {
        icon: iconMap[iconKey] || UPCOMING[i % UPCOMING.length].icon,
        title: String(item?.title || `Upcoming ${i + 1}`),
        desc: String(item?.desc || 'Coming soon'),
      }
    })
  }, [cmsByKey])

  return (
    <div className="min-h-screen common-background">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />

      <Header active="labs" />

      <div className="container mx-auto px-4 py-16 max-w-5xl">
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 tracking-tight">
            {labsTitle}
          </h1>
          <p className="text-lg text-gray-400">{labsSubtitle}</p>
        </div>

        {loading && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-sm text-gray-400">
            Loading catalog…
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6 text-sm text-red-300">
            {error}
          </div>
        )}

        {!loading && !error && labs.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-sm text-gray-400">
            No labs are available yet. Check back soon.
          </div>
        )}

        {!loading && !error && labs.length > 0 && (
          <div className="space-y-6">
            {labs.map((lab) => (
              <LabCatalogCard
                key={lab.id}
                lab={lab}
                expanded={expandedId === lab.id}
                onToggleExpand={() =>
                  setExpandedId((cur) => (cur === lab.id ? null : lab.id))
                }
                triggerBuy={buyTriggerId === lab.id}
                onBuyTriggered={() => setBuyTriggerId(null)}
              />
            ))}
          </div>
        )}

        <div className="mt-16">
          <p className="text-sm text-gray-500 mb-5">
            Additional environments are currently in development.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {upcomingCards.map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-white/10 bg-white/[0.02] p-5 text-center opacity-80"
              >
                <item.icon className="w-6 h-6 text-gray-500 mx-auto mb-3" strokeWidth={1.5} />
                <h3 className="text-sm font-semibold text-gray-300 mb-1">{item.title}</h3>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LabsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen common-background flex items-center justify-center text-gray-400">
          Loading labs…
        </div>
      }
    >
      <LabsPageContent />
    </Suspense>
  )
}
