/** Public cover art for catalog / home (not admin-managed yet). */
export const LAB_COVER_BY_TYPE: Record<string, string> = {
  windows: "/labs/lab-ad-cover.png",
  wazuh: "/labs/lab-wazuh-cover.png",
  aws: "/labs/lab-aws-cover.png",
  cloud: "/labs/lab-aws-cover.png",
}

export function resolveLabCover(
  labType: string | null | undefined,
  slug?: string | null,
  title?: string,
): string | null {
  const type = (labType || "").trim().toLowerCase()
  if (type && LAB_COVER_BY_TYPE[type]) return LAB_COVER_BY_TYPE[type]

  const hay = `${slug || ""} ${title || ""}`.toLowerCase()
  if (hay.includes("wazuh")) return LAB_COVER_BY_TYPE.wazuh
  if (hay.includes("aws") || hay.includes("cloud") || hay.includes("vpc"))
    return LAB_COVER_BY_TYPE.aws
  if (
    hay.includes("active directory") ||
    hay.includes("windows ad") ||
    hay.includes("lab-1") ||
    hay.includes("lab 1")
  ) {
    return LAB_COVER_BY_TYPE.windows
  }
  return null
}

export function isLabCoverImage(src: string | null | undefined): boolean {
  return Boolean(src && src.startsWith("/labs/lab-") && src.endsWith("-cover.png"))
}
