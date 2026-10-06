import type { IssueSummary, ProjectStatusOption } from "./types"

/** Key used for issues that have no Status on the configured project. */
export const NO_STATUS_KEY = "__no_status__"
export const NO_STATUS_LABEL = "No status"

export interface StatusCount {
  key: string
  name: string
  color: string | null
  count: number
}

export function statusKey(issue: IssueSummary): string {
  return issue.projectStatus ? issue.projectStatus.name : NO_STATUS_KEY
}

/**
 * Count issues per project status, ordered the way the options are ordered on
 * the project board. Statuses not in the option list (e.g. renamed since the
 * options were fetched) are appended; "No status" always comes last.
 * Only statuses with at least one issue are returned.
 */
export function summarizeStatuses(
  issues: IssueSummary[],
  options: ProjectStatusOption[]
): StatusCount[] {
  const counts = new Map<string, StatusCount>()

  for (const issue of issues) {
    const key = statusKey(issue)
    const existing = counts.get(key)
    if (existing) {
      existing.count += 1
    } else {
      counts.set(key, {
        key,
        name: issue.projectStatus?.name ?? NO_STATUS_LABEL,
        color: issue.projectStatus?.color ?? null,
        count: 1
      })
    }
  }

  const order = new Map(options.map((o, i) => [o.name, i]))
  const rank = (c: StatusCount) =>
    c.key === NO_STATUS_KEY ? Number.MAX_SAFE_INTEGER : (order.get(c.name) ?? options.length)

  return [...counts.values()].sort((a, b) => rank(a) - rank(b))
}

/** GitHub's single-select colours → CSS custom-property prefix in globals.css. */
const KNOWN_COLORS = new Set(["GRAY", "BLUE", "GREEN", "YELLOW", "ORANGE", "RED", "PINK", "PURPLE"])

export function statusColorVar(color: string | null): string {
  const c = (color ?? "GRAY").toUpperCase()
  return `--ps-${KNOWN_COLORS.has(c) ? c.toLowerCase() : "gray"}`
}
