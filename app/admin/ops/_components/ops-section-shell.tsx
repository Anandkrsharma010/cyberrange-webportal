"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock3, RefreshCcw } from "lucide-react"

type OpsSectionShellProps = {
  title: string
  description: string
  modeLabel: string
  lastRefreshedAt?: string
  refreshing?: boolean
  onRefresh?: () => void
  children?: React.ReactNode
}

export function OpsSectionShell({
  title,
  description,
  modeLabel,
  lastRefreshedAt,
  refreshing = false,
  onRefresh,
  children,
}: OpsSectionShellProps) {
  return (
    <section className="rounded-2xl border bg-card/40 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          {onRefresh ? (
            <Button variant="outline" onClick={onRefresh} disabled={refreshing}>
              <RefreshCcw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          ) : null}
          <Badge variant="outline" className="gap-1">
            <Clock3 className="h-3.5 w-3.5" />
            {modeLabel}
          </Badge>
        </div>
      </div>
      {lastRefreshedAt ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Last refreshed: {new Date(lastRefreshedAt).toLocaleTimeString()}
        </p>
      ) : null}
      {children}
    </section>
  )
}

