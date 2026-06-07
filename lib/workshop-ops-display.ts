import type { WorkshopRow } from "@/lib/api"

/** Maps `workshops.status` (draft | active | archived) to ops list/detail labels. */
export function workshopLifecycleDisplay(status: WorkshopRow["status"]) {
  switch (status) {
    case "active":
      return {
        label: "LIVE",
        dot: "bg-primary",
        pillClass: "border-transparent bg-primary text-primary-foreground",
      }
    case "draft":
      return {
        label: "DRAFT",
        dot: "bg-zinc-500",
        pillClass: "border-zinc-500/40 bg-zinc-500/15 text-zinc-200",
      }
    case "archived":
      return {
        label: "ARCHIVED",
        dot: "bg-red-400/80",
        pillClass: "border-red-400/45 bg-red-950/35 text-red-200",
      }
    default:
      return {
        label: status,
        dot: "bg-zinc-500",
        pillClass: "border-muted-foreground/30 bg-muted text-muted-foreground",
      }
  }
}

/** Maps `workshops.payment_status` to ops list/detail labels. */
export function paymentOpsDisplay(payment: WorkshopRow["payment_status"]) {
  switch (payment) {
    case "pending":
      return { label: "PENDING", dot: "bg-amber-500" }
    case "paid":
      return { label: "PAID", dot: "bg-emerald-500" }
    case "waived":
      return { label: "WAIVED", dot: "bg-zinc-400" }
    case "refunded":
      return { label: "REFUNDED", dot: "bg-orange-500" }
    default:
      return { label: payment, dot: "bg-zinc-500" }
  }
}
