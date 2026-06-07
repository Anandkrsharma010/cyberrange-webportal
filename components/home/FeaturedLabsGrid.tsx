"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { resolveLabCover } from "@/lib/lab-covers"
import { toLab, type Lab } from "@/lib/labs"

type FeaturedSlot = {
  cover: string
  titleFallback: string
  blurbFallback: string
  match: (lab: Lab) => boolean
}

const SLOTS: FeaturedSlot[] = [
  {
    cover: "/labs/lab-ad-cover.png",
    titleFallback: "Windows Active Directory",
    blurbFallback: "Attack and defend a full AD environment with Kali and Wazuh.",
    match: (l) =>
      l.labType === "windows" ||
      /active directory|lab-?1|windows ad/i.test(`${l.slug} ${l.title}`),
  },
  {
    cover: "/labs/lab-wazuh-cover.png",
    titleFallback: "Wazuh SIEM Lab",
    blurbFallback: "Ingest alerts, tune detection, and respond in a live SIEM stack.",
    match: (l) =>
      l.labType === "wazuh" || /wazuh/i.test(`${l.slug} ${l.title}`),
  },
  {
    cover: "/labs/lab-aws-cover.png",
    titleFallback: "AWS Cloud Security",
    blurbFallback: "Secure-zone vs risk-zone scenarios across VPC workloads.",
    match: (l) =>
      l.labType === "aws" ||
      l.labType === "cloud" ||
      /aws|cloud|vpc/i.test(`${l.slug} ${l.title}`),
  },
]

function pickLabForSlot(labs: Lab[], slot: FeaturedSlot): Lab | null {
  return labs.find(slot.match) ?? null
}

export function FeaturedLabsGrid() {
  const [labs, setLabs] = useState<Lab[]>([])

  useEffect(() => {
    const load = async () => {
      try {
        const rows = await api.catalogLabs()
        setLabs(rows.map(toLab))
      } catch {
        setLabs([])
      }
    }
    void load()
  }, [])

  const cards = useMemo(
    () =>
      SLOTS.map((slot) => {
        const lab = pickLabForSlot(labs, slot)
        const title = lab?.title || slot.titleFallback
        const blurb = lab?.description?.trim() || slot.blurbFallback
        const price =
          lab?.priceMajor != null
            ? `₹${lab.priceMajor.toLocaleString()}`
            : null
        const meta = [
          lab && lab.difficulty !== "—" ? lab.difficulty : null,
          price,
        ]
          .filter(Boolean)
          .join(" · ")

        return {
          key: slot.cover,
          cover:
            resolveLabCover(lab?.labType, lab?.slug, lab?.title) || slot.cover,
          title,
          blurb,
          meta,
          href: "/labs",
        }
      }),
    [labs],
  )

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Training labs
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Hands-on cyber range environments on RangeOps — explore, expand, and
            purchase access from the catalog.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {cards.map((card) => (
            <article
              key={card.key}
              className="group flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden hover:border-emerald-500/30 transition-colors"
            >
              <div className="relative aspect-[16/10] w-full bg-black/40">
                <Image
                  src={card.cover}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h3 className="text-lg font-bold text-white mb-2 line-clamp-2">
                  {card.title}
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed line-clamp-3 flex-1">
                  {card.blurb}
                </p>
                {card.meta ? (
                  <p className="text-xs text-gray-500 mt-3">{card.meta}</p>
                ) : null}
                <Button
                  variant="outline"
                  className="mt-5 w-full border-white/15 bg-transparent text-white hover:bg-emerald-500/10 hover:border-emerald-500/40"
                  asChild
                >
                  <Link href={card.href}>
                    View in catalog
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                </Button>
              </div>
            </article>
          ))}
        </div>

        <div className="text-center mt-10">
          <Button
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-8"
            asChild
          >
            <Link href="/labs">
              Explore all labs
              <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
