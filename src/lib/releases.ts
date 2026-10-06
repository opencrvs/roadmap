import type { Milestone, ReleaseType } from "./types"

/** Matches release version titles like "2.1", "1.9.18", or "v1.6.2". */
export const RELEASE_VERSION_PATTERN = /^v?\d+(\.\d+)+$/

export function isReleaseVersion(title: string): boolean {
  return RELEASE_VERSION_PATTERN.test(title.trim())
}

/**
 * Classify a release by its semantic version:
 *   X.Y        → major release
 *   X.Y.Z(...) → hotfix / maintenance release
 */
export function classifyRelease(title: string): ReleaseType {
  const segments = title.trim().replace(/^v/, "").split(".")
  return segments.length <= 2 ? "major" : "hotfix"
}

export function splitReleases(milestones: Milestone[]): {
  major: Milestone[]
  hotfix: Milestone[]
} {
  return {
    major: milestones.filter((m) => m.releaseType === "major"),
    hotfix: milestones.filter((m) => m.releaseType === "hotfix")
  }
}
