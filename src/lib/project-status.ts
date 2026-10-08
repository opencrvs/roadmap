export const NO_STATUS_LABEL = "No status"

/** GitHub's single-select colours → CSS custom-property prefix in globals.css. */
const KNOWN_COLORS = new Set(["GRAY", "BLUE", "GREEN", "YELLOW", "ORANGE", "RED", "PINK", "PURPLE"])

export function statusColorVar(color: string | null): string {
  const c = (color ?? "GRAY").toUpperCase()
  return `--ps-${KNOWN_COLORS.has(c) ? c.toLowerCase() : "gray"}`
}
