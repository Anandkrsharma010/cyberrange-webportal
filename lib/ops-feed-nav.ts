/** Phase 3 — deep links from the operations feed append `fromFeed=1` for return navigation. */

export function withFromFeedParam(deepLink: string): string {
  if (!deepLink || deepLink === "#") return "#"
  const path = deepLink.startsWith("/") ? deepLink : `/${deepLink}`
  const sep = path.includes("?") ? "&" : "?"
  return `${path}${sep}fromFeed=1`
}
