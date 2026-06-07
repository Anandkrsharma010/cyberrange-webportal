"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  BarChart2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth"
import { labUrlId, type Lab } from "@/lib/labs"
import { useLabCheckout } from "@/lib/use-lab-checkout"

type LabCatalogCardProps = {
  lab: Lab
  expanded: boolean
  onToggleExpand: () => void
  triggerBuy?: boolean
  onBuyTriggered?: () => void
}

export function LabCatalogCard({
  lab,
  expanded,
  onToggleExpand,
  triggerBuy,
  onBuyTriggered,
}: LabCatalogCardProps) {
  const { user, isLabPurchased, isLabEntitled } = useAuth()
  const [agreed, setAgreed] = useState(false)
  const purchased = isLabPurchased(lab.id)
  const entitled = isLabEntitled(lab.id)
  const urlId = labUrlId(lab)

  const buyOnceRef = useRef(false)
  const { buyLab, busy, errorMessage, clearError } = useLabCheckout({
    lab,
    userEmail: user?.email,
  })

  const priceLabel =
    lab.priceMajor != null ? `₹${lab.priceMajor.toLocaleString()}` : null
  const catalogThumb =
    lab.image && lab.image !== "/placeholder.svg" ? lab.image : null

  useEffect(() => {
    if (!triggerBuy || buyOnceRef.current) return
    if (!expanded || !user || !lab.isPurchasable || entitled) return
    buyOnceRef.current = true
    setAgreed(true)
    void buyLab().finally(() => onBuyTriggered?.())
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot deep link
  }, [triggerBuy, expanded, user, lab.isPurchasable, entitled])

  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden transition-colors hover:border-emerald-500/30">
      <div className="p-5 md:p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5">
          <div className="flex gap-4 flex-1 min-w-0">
            {catalogThumb && (
              <div className="shrink-0">
                <div className="relative w-[104px] h-[66px] sm:w-[120px] sm:h-[72px] rounded-lg overflow-hidden border border-white/10 bg-black/40">
                  <Image
                    src={catalogThumb}
                    alt=""
                    fill
                    className="object-cover object-center"
                    sizes="120px"
                  />
                </div>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="text-xl md:text-2xl font-bold text-white mb-2">{lab.title}</h2>
              <p className="text-gray-300 leading-relaxed line-clamp-2">
                {lab.description || "Hands-on cybersecurity lab environment."}
              </p>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-400 mt-4">
                <span className="inline-flex items-center gap-1.5">
                  <BarChart2 className="w-4 h-4 text-gray-500" />
                  {lab.difficulty}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-gray-500" />
                  {lab.durationLabel}
                </span>
                {lab.category && (
                  <span className="text-gray-500">{lab.category}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex md:flex-col md:items-end items-center justify-between md:justify-start gap-3 md:min-w-[140px] shrink-0">
            {priceLabel ? (
              <div className="text-3xl font-bold text-white whitespace-nowrap">
                {priceLabel}
              </div>
            ) : (
              <span className="text-base text-gray-400">Coming soon</span>
            )}
            <Button
              type="button"
              variant="outline"
              className="border-white/15 bg-transparent text-gray-200 hover:bg-white/5"
              onClick={onToggleExpand}
            >
              {expanded ? (
                <>
                  Show less
                  <ChevronUp className="ml-2 h-4 w-4" />
                </>
              ) : (
                <>
                  Show more
                  <ChevronDown className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>

        {expanded && (
          <div className="mt-8 pt-8 border-t border-white/10 space-y-6">
            {lab.description && (
              <div>
                <h3 className="text-sm font-semibold text-white mb-2">About this lab</h3>
                <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-wrap">
                  {lab.description}
                </p>
              </div>
            )}

            {lab.featureChips.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-white mb-3">Environment includes</h3>
                <ul className="flex flex-wrap gap-2">
                  {lab.featureChips.map((chip) => (
                    <li
                      key={chip}
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-300"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      {chip}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-col gap-3 pt-2">
              {purchased || entitled ? (
                <Button
                  className="w-fit bg-emerald-500 hover:bg-emerald-600 text-white font-semibold"
                  asChild
                >
                  <Link href={`/quiz/${urlId}`}>Access lab</Link>
                </Button>
              ) : lab.isPurchasable ? (
                <>
                  {!user ? (
                    <Button
                      className="w-fit bg-emerald-500 hover:bg-emerald-600 text-white font-semibold"
                      asChild
                    >
                      <Link href={`/login?return=${encodeURIComponent("/labs")}`}>
                        Sign in to buy
                      </Link>
                    </Button>
                  ) : (
                    <>
                      <label className="flex items-start gap-2 text-xs text-gray-400 cursor-pointer max-w-lg">
                        <input
                          type="checkbox"
                          checked={agreed}
                          onChange={(e) => setAgreed(e.target.checked)}
                          className="mt-0.5 rounded border-white/20"
                        />
                        <span>
                          I agree to the{" "}
                          <Link href="/terms" className="text-emerald-400 underline">
                            Terms
                          </Link>{" "}
                          and{" "}
                          <Link href="/privacy" className="text-emerald-400 underline">
                            Privacy Policy
                          </Link>
                          . 30-day access · INR.
                        </span>
                      </label>
                      <Button
                        type="button"
                        disabled={busy || !agreed}
                        className="w-fit bg-emerald-500 hover:bg-emerald-600 text-white font-semibold disabled:opacity-50"
                        onClick={() => void buyLab()}
                      >
                        {busy ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing…
                          </>
                        ) : (
                          <>Buy lab{priceLabel ? ` — ${priceLabel}` : ""}</>
                        )}
                      </Button>
                    </>
                  )}
                </>
              ) : (
                <Button
                  disabled
                  className="w-fit bg-white/[0.04] text-gray-500 cursor-not-allowed"
                >
                  Coming soon
                </Button>
              )}
              {errorMessage && (
                <p className="text-sm text-red-400">
                  {errorMessage}{" "}
                  <button type="button" className="underline" onClick={clearError}>
                    Dismiss
                  </button>
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </article>
  )
}
