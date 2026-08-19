export type MilestoneState = "open" | "closed"

export interface Milestone {
  number: number
  title: string
  description: string | null
  state: MilestoneState
  openIssues: number
  closedIssues: number
  createdAt: string
  dueOn: string | null
  htmlUrl: string
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

export interface IssueSummary {
  id: number
  number: number
  title: string
  state: IssueState
  htmlUrl: string
  labels: IssueLabel[]
  assignees: IssueAssignee[]
  updatedAt: string
}
