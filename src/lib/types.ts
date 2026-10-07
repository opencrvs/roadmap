export type MilestoneState = "open" | "closed"

/** Derived from the milestone title: "X.Y" is major, "X.Y.Z" (or deeper) is a hotfix. */
export type ReleaseType = "major" | "hotfix"

export interface Milestone {
  number: number
  title: string
  description: string | null
  state: MilestoneState
  releaseType: ReleaseType
  openIssues: number
  closedIssues: number
  createdAt: string
  dueOn: string | null
  htmlUrl: string
  /** Issues tracked against this milestone, including their project status. */
  issues: IssueSummary[]
}

export type IssueState = "open" | "closed"

export interface IssueLabel {
  name: string
  color: string
}

export interface IssueAssignee {
  login: string
  avatarUrl: string
}

/**
 * Colours GitHub allows for single-select options on a Projects (v2) field.
 * Kept as a string so new colours added by GitHub degrade to the gray style.
 */
export type ProjectStatusColor = string

/** One option of the project's "Status" field, in the order set on the board. */
export interface ProjectStatusOption {
  id: string
  name: string
  color: ProjectStatusColor
}

/** The value of an issue's "Status" field on the configured project. */
export interface ProjectStatus {
  optionId: string | null
  name: string
  color: ProjectStatusColor
}

export interface IssueSummary {
  id: number
  number: number
  title: string
  state: IssueState
  htmlUrl: string
  /** The org-level GitHub Issue Type (e.g. "Feature", "Bug"), if set. */
  issueType: string | null
  labels: IssueLabel[]
  assignees: IssueAssignee[]
  updatedAt: string
  /** null when the issue isn't on the project or has no Status set. */
  projectStatus: ProjectStatus | null
}

export interface ProjectInfo {
  title: string | null
  url: string | null
  statusOptions: ProjectStatusOption[]
  /** Set when project statuses couldn't be loaded at all (e.g. token scope). */
  error: string | null
}

export interface RoadmapData {
  milestones: Milestone[]
  project: ProjectInfo
}
