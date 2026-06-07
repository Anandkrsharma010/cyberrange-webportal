"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { toLab, type Lab } from "@/lib/labs"

export function FeaturedLabTeaser() {
  const [featured, setFeatured] = useState<Lab | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const rows = await api.catalogLabs()
        const labs = rows.map(toLab)
        const pick =
          labs.find((l) => l.isPurchasable) ?? labs[0] ?? null
        setFeatured(pick)
      } catch {
        setFeatured(null)
      }
    }
    void load()
  }, [])

  if (!featured) return null

  const priceHint =
    featured.priceMajor != null
      ? `From ₹${featured.priceMajor.toLocaleString()}`
      : null

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Available now
          </h2>
        </div>

        <div className="max-w-3xl mx-auto rounded-2xl border border-white/10 bg-white/[0.03] p-8 md:p-10 text-center md:text-left">
          <h3 className="text-2xl font-bold text-white mb-3">{featured.title}</h3>
          <p className="text-gray-300 leading-relaxed mb-4 line-clamp-3">
            {featured.description || "Hands-on cyber range lab environment."}
          </p>
          <p className="text-sm text-gray-500 mb-6">
            {[featured.difficulty !== "—" ? featured.difficulty : null, priceHint]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <Button
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-6"
            asChild
          >
            <Link href="/labs">
              Explore labs
              <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
