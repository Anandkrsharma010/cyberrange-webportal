"use client"

import { redirect } from "next/navigation"

export default function AdminLabsPage() {
  redirect("/admin/deployments")
}
