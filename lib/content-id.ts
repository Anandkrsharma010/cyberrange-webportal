/**
 * Compare content UUIDs from API vs catalog (case / hyphen insensitive).
 */
export function normalizeContentId(id: string): string {
  return String(id)
    .trim()
    .replace(/-/g, "")
    .toLowerCase()
}

export function contentIdsEqual(a: string, b: string): boolean {
  return normalizeContentId(a) === normalizeContentId(b)
}
