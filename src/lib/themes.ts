import type { IssueSummary, ReleaseType } from "./types"

/**
 * Product themes used to filter the tasks inside a release.
 *
 * Every theme is derived from GitHub metadata (the org's Issue Types and the
 * opencrvs-core labels), never from a list of issue numbers. This file is the
 * one place to update when types or labels change on GitHub.
 */
export type ThemeId =
  | "features"
  | "bug"
  | "improvements"
  | "ux"
  | "infrastructure"
  | "technical"
  | "security"

export interface ThemeDefinition {
  /** Plural label for the filter chip, e.g. "Features". */
  label: string
  /** Singular label shown next to a task, e.g. "Feature". */
  singular: string
}

export const THEMES: Record<ThemeId, ThemeDefinition> = {
  features: { label: "Features", singular: "Feature" },
  bug: { label: "Bug", singular: "Bug" },
  improvements: { label: "Improvements", singular: "Improvement" },
  ux: { label: "UX", singular: "UX" },
  infrastructure: { label: "Infrastructure / DevOps", singular: "Infrastructure / DevOps" },
  technical: { label: "Technical", singular: "Technical" },
  security: { label: "Security", singular: "Security" }
}

/** Filter chips offered per release type, in display order (after "All"). */
export const THEME_FILTERS: Record<ReleaseType, ThemeId[]> = {
  major: ["features", "improvements", "ux", "infrastructure", "technical", "security"],
  hotfix: ["bug", "improvements", "infrastructure", "technical", "security"]
}

/**
 * GitHub Issue Types (org-level) that say clearly what an issue is.
 * Names are compared case-insensitively.
 */
const TYPE_THEMES: Record<string, ThemeId> = {
  feature: "features",
  "deprecated epic: functional": "features",
  bug: "bug",
  improvement: "improvements",
  devops: "infrastructure",
  "deprecated epic: technical": "technical"
}

/**
 * Generic Issue Types that only decide the theme when no label or specific
 * type did. "Task" is usually a sub-issue of a Feature; "Configuration" is
 * product functionality delivered through country/application config.
 */
const FALLBACK_TYPE_THEMES: Record<string, ThemeId> = {
  task: "features",
  configuration: "features"
}

/**
 * Labels → themes. A string matches a label name exactly; a RegExp matches
 * any part of it. Names are compared lower-cased with leading emoji removed,
 * so "🛣️ Infrastructure" is matched by "infrastructure".
 * Listed in priority order: the first theme found is the one shown on a task.
 */
const LABEL_THEMES: { theme: ThemeId; match: (string | RegExp)[] }[] = [
  { theme: "security", match: ["security", /vulnerab/, /pen[\s-]?test/] },
  { theme: "bug", match: [/\bbugs?\b/, /\bregression\b/] },
  {
    theme: "infrastructure",
    match: ["infrastructure", "cloud", "on-premise", "application", /devops/, /kubernetes/, /deploy/]
  },
  { theme: "ux", match: ["ui/ux", /\bux\b/, /\bui\b/, /accessib/, /usability/, /\bdesign\b/] },
  {
    theme: "technical",
    match: ["tech", "meta", "chore", "persistence", "scalability", "test automation", /tech debt/, /refactor/]
  }
]

function normalizeLabel(name: string): string {
  return name
    .toLowerCase()
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .trim()
}

/**
 * All themes an issue belongs to, most relevant first: its specific Issue
 * Type, then its labels, then a generic Issue Type as a last resort.
 * Can be empty, in which case the issue only appears under "All".
 */
export function classifyIssue(issue: Pick<IssueSummary, "issueType" | "labels">): ThemeId[] {
  const themes: ThemeId[] = []
  const add = (theme: ThemeId | undefined) => {
    if (theme && !themes.includes(theme)) themes.push(theme)
  }

  const type = issue.issueType?.trim().toLowerCase() ?? ""
  add(TYPE_THEMES[type])

  const labels = issue.labels.map((l) => normalizeLabel(l.name))
  for (const rule of LABEL_THEMES) {
    const matches = labels.some((label) =>
      rule.match.some((m) => (typeof m === "string" ? label === m : m.test(label)))
    )
    if (matches) add(rule.theme)
  }

  if (themes.length === 0) add(FALLBACK_TYPE_THEMES[type])
  return themes
}
