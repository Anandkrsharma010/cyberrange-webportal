"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { apiClient } from "@/lib/api"
import logger from "@/lib/logger"
import type { Lab } from "@/lib/labs"

type CheckoutPhase = "idle" | "creating" | "opening" | "verifying" | "error"

interface CreateOrderResult {
  razorpay_order_id: string
  amount_minor: number
  currency: string
  razorpay_key_id: string
  internal_payment_id: string
}

interface RazorpayHandlerResponse {
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature: string
}

interface RazorpayOptions {
  key: string
  amount: number
  currency: string
  order_id: string
  name: string
  description?: string
  prefill?: { email?: string; name?: string; contact?: string }
  theme?: { color?: string }
  handler: (response: RazorpayHandlerResponse) => void
  modal?: { ondismiss?: () => void }
  notes?: Record<string, string>
}

interface RazorpayInstance {
  open: () => void
  on: (event: string, cb: (resp: unknown) => void) => void
}

declare global {
  interface Window {
    Razorpay?: any
  }
}

export function useLabCheckout(opts: {
  lab: Lab | null
  userEmail?: string | null
  isRenewal?: boolean
  onError?: (message: string) => void
}) {
  const router = useRouter()
  const { lab, userEmail, isRenewal = false, onError } = opts
  const [phase, setPhase] = useState<CheckoutPhase>("idle")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [scriptReady, setScriptReady] = useState(false)
  const initiatedRef = useRef(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    if (window.Razorpay) {
      setScriptReady(true)
      return
    }
    const id = window.setInterval(() => {
      if (window.Razorpay) {
        setScriptReady(true)
        window.clearInterval(id)
      }
    }, 200)
    const timeout = window.setTimeout(() => window.clearInterval(id), 15000)
    return () => {
      window.clearInterval(id)
      window.clearTimeout(timeout)
    }
  }, [])

  const reportError = useCallback(
    (message: string) => {
      setErrorMessage(message)
      setPhase("error")
      onError?.(message)
    },
    [onError],
  )

  const openRazorpay = useCallback(
    (order: CreateOrderResult) => {
      if (!lab) return

      if (order.razorpay_order_id.startsWith("order_mock_")) {
        // Mock payment captured callback directly for sandbox developer flow
        setPhase("verifying")
        const mockPaymentId = `pay_mock_${Math.random().toString(36).substring(2, 15)}`;
        void (async () => {
          try {
            await apiClient.verifyPayment(
              order.razorpay_order_id,
              mockPaymentId,
              "mock_signature"
            )
          } catch (err) {
            logger.warn("Mock verify-capture failed:", err)
          }
          const successUrl =
            `/purchase/success` +
            `?payment_id=${encodeURIComponent(mockPaymentId)}` +
            `&content_id=${encodeURIComponent(lab.id)}`
          router.push(successUrl)
        })()
        return
      }

      if (!window.Razorpay) {
        reportError("Payment SDK not ready. Please wait a moment and try again.")
        return
      }

      const rzp = new window.Razorpay({
        key: order.razorpay_key_id,
        amount: order.amount_minor,
        currency: order.currency,
        order_id: order.razorpay_order_id,
        name: "RangeOps",
        description: lab.title,
        prefill: userEmail ? { email: userEmail } : undefined,
        theme: { color: "#10b981" },
        notes: isRenewal ? { renewal: "1" } : undefined,
        handler: async (response: any) => {
          setPhase("verifying")
          try {
            await apiClient.verifyPayment(
              response.razorpay_order_id,
              response.razorpay_payment_id,
              response.razorpay_signature,
            )
          } catch (err) {
            logger.warn("verify-capture failed (webhook may fulfil):", err)
          }
          const successUrl =
            `/purchase/success` +
            `?payment_id=${encodeURIComponent(response.razorpay_payment_id)}` +
            `&content_id=${encodeURIComponent(lab.id)}`
          router.push(successUrl)
        },
        modal: {
          ondismiss: () => setPhase("idle"),
        },
      })

      rzp.on("payment.failed", (resp: unknown) => {
        const errObj = resp as { error?: { description?: string; reason?: string } }
        reportError(
          errObj?.error?.description ||
            errObj?.error?.reason ||
            "Payment failed. Please try again.",
        )
      })
      rzp.open()
      setPhase("opening")
    },
    [lab, userEmail, isRenewal, router, reportError],
  )

  const buyLab = useCallback(async () => {
    if (!lab) return
    if (!lab.isPurchasable) {
      reportError("This lab is not available for purchase yet.")
      return
    }
    if (!scriptReady) {
      reportError("Loading payment… try again in a second.")
      return
    }
    if (initiatedRef.current) return
    initiatedRef.current = true
    setErrorMessage(null)
    setPhase("creating")
    try {
      const res = (await apiClient.createCheckout(lab.id)) as unknown as
        | CreateOrderResult
        | { success: false; message?: string; error?: string }
      if ("success" in res && res.success === false) {
        throw new Error(res.message || res.error || "Could not create order")
      }
      openRazorpay(res as CreateOrderResult)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not start checkout. Please try again."
      logger.error("createCheckout failed:", message)
      reportError(message)
    } finally {
      initiatedRef.current = false
    }
  }, [lab, scriptReady, openRazorpay, reportError])

  const busy = phase === "creating" || phase === "opening" || phase === "verifying"

  return {
    buyLab,
    phase,
    busy,
    scriptReady,
    errorMessage,
    clearError: () => {
      setErrorMessage(null)
      setPhase("idle")
    },
  }
}
