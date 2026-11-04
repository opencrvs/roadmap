import type { Milestone, ReleaseType } from "./types"

/**
 * Matches release version titles: "2.1", "1.9.18", "v1.6.2", and series
 * placeholders ending in ".x" or ".X" such as "2.x" or "1.9.X". The "x" is
 * only allowed as the last segment. Anything else (e.g. "IET Triage",
 * "IET Configuration: Somalia") is not a release and stays off the roadmap.
 */
export const RELEASE_VERSION_PATTERN = /^v?\d+(\.\d+)*\.(\d+|x)$/i

export function isReleaseVersion(title: string): boolean {
  return RELEASE_VERSION_PATTERN.test(title.trim())
}

/**
 * Classify a release by its semantic version:
 *   X.Y        → major release            (also "2.x")
 *   X.Y.Z(...) → hotfix / maintenance release (also "1.9.x")
 */
export function classifyRelease(title: string): ReleaseType {
  const segments = title.trim().replace(/^v/, "").split(".")
  return segments.length <= 2 ? "major" : "hotfix"
}

const DAY_MS = 1000 * 60 * 60 * 24

/** Published security releases stay on the roadmap for this many days. */
export const SECURITY_RELEASE_WINDOW_DAYS = 30

/**
 * True when a security milestone was published within the window. The proof
 * of publication is the date the milestone was closed; a due date never
 * counts. A missing, invalid or future date means "not published": exclude.
 */
export function isRecentSecurityRelease(
  closedAt: string | null | undefined,
  now: Date,
  windowDays: number = SECURITY_RELEASE_WINDOW_DAYS
): boolean {
  if (!closedAt) return false
  const releasedAt = Date.parse(closedAt)
  if (Number.isNaN(releasedAt)) return false
  const age = now.getTime() - releasedAt
  return age >= 0 && age <= windowDays * DAY_MS
}

export function splitReleases(milestones: Milestone[]): {
  major: Milestone[]
  hotfix: Milestone[]
  security: Milestone[]
} {
  const core = milestones.filter((m) => m.source === "core")
  return {
    major: core.filter((m) => m.releaseType === "major"),
    hotfix: core.filter((m) => m.releaseType === "hotfix"),
    security: milestones.filter((m) => m.source === "security")
  }
}
