import { apiClient } from "./api"

declare global {
  interface Window {
    Razorpay?: any
  }
}

function loadScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && window.Razorpay) {
      resolve(true)
      return
    }
    const s = document.createElement("script")
    s.src = "https://checkout.razorpay.com/v1/checkout.js"
    s.onload = () => resolve(true)
    s.onerror = () => resolve(false)
    document.body.appendChild(s)
  })
}

async function confirmPaymentOnServer(
  razorpayPaymentId: string,
  razorpayOrderId: string,
  onError: (msg: string) => void,
): Promise<boolean> {
  const maxAttempts = 6
  const delayMs = 1500
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await apiClient.verifyPayment(
        razorpayOrderId,
        razorpayPaymentId,
      )
      const status = res.data?.status
      if (status === "fulfilled" || status === "already_fulfilled") {
        return true
      }
      if (status === "not_captured" && i < maxAttempts - 1) {
        await new Promise((r) => setTimeout(r, delayMs))
        continue
      }
      onError(
        "Payment not confirmed yet. Wait a moment and refresh the dashboard, or contact support.",
      )
      return false
    } catch (err: any) {
      onError(err?.message || "Could not confirm payment with server")
      return false
    }
  }
  onError("Could not confirm payment — try again shortly.")
  return false
}

/**
 * Purchase flow:
 *  1. POST /billing/orders
 *  2. Razorpay checkout
 *  3. POST /billing/verify-capture — server fetches payment from Razorpay and
 *     writes DB (same as webhook). Works even if webhooks/ngrok fail.
 */
export async function startCheckout(
  contentId: string,
  labTitle: string,
  userName: string,
  userEmail: string,
  onSuccess: (paymentId: string) => void,
  onError: (msg: string) => void,
) {
  const loaded = await loadScript()
  if (!loaded) {
    onError("Failed to load Razorpay SDK")
    return
  }

  let order: any
  try {
    const res = await apiClient.createCheckout(contentId)
    order = res.data
  } catch (err: any) {
    onError(err?.message || "Could not create order")
    return
  }

  if (order.razorpay_order_id.startsWith("order_mock_")) {
    const mockPaymentId = `pay_mock_${Math.random().toString(36).substring(2, 15)}`;
    void (async () => {
      const ok = await confirmPaymentOnServer(mockPaymentId, order.razorpay_order_id, onError)
      if (ok) onSuccess(mockPaymentId)
    })()
    return
  }

  const rzp = new window.Razorpay({
    key: order.razorpay_key_id,
    amount: order.amount_minor,
    currency: order.currency,
    name: "RangeOps",
    description: `Lab: ${labTitle}`,
    order_id: order.razorpay_order_id,
    prefill: { name: userName, email: userEmail },
    handler(response: any) {
      void (async () => {
        const paymentId =
          response.razorpay_payment_id || response.payment_id || ""
        const orderId =
          response.razorpay_order_id || order.razorpay_order_id || ""
        if (!paymentId || !orderId) {
          onError("Missing payment or order id from Razorpay response")
          return
        }
        const ok = await confirmPaymentOnServer(paymentId, orderId, onError)
        if (ok) onSuccess(paymentId)
      })()
    },
    modal: {
      ondismiss() {
        onError("Payment cancelled")
      },
    },
  })

  rzp.open()
}
