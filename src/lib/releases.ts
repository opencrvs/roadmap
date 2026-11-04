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
