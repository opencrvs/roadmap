import { unstable_cache } from "next/cache"
import { Octokit } from "octokit"
import { classifyRelease, isReleaseVersion } from "./releases"
import type {
  IssueSummary,
  Milestone,
  ProjectInfo,
  ProjectStatus,
  ProjectStatusOption,
  RoadmapData
} from "./types"

const OWNER = process.env.GITHUB_REPO_OWNER || "opencrvs"
const REPO = process.env.GITHUB_REPO_NAME || "opencrvs-core"

const PROJECT_OWNER = process.env.GITHUB_PROJECT_OWNER || OWNER
const PROJECT_NUMBER = Number(process.env.GITHUB_PROJECT_NUMBER) || 4
const STATUS_FIELD_NAME = process.env.GITHUB_PROJECT_STATUS_FIELD || "Status"

/**
 * Project statuses that count an issue as done even while the GitHub issue is
 * still open. Comma-separated; defaults to the board's existing "Completed".
 */
const COMPLETED_STATUS_NAMES = new Set(
  (process.env.GITHUB_PROJECT_COMPLETED_STATUSES || "Completed")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
)

/** Issues looked up per GraphQL request (aliased fields). */
const STATUS_BATCH_SIZE = 50

// Revalidate cached GitHub responses periodically instead of on every
// request, since we're often running against an unauthenticated or
// low-rate-limit token.
const REVALIDATE_SECONDS = 5 * 60

export class GitHubApiError extends Error {
  constructor(
    message: string,
    public status?: number
  ) {
    super(message)
    this.name = "GitHubApiError"
  }
}

function getClient() {
  const auth = process.env.GITHUB_TOKEN
  return new Octokit({
    auth,
    request: {
      fetch: (url: string, init?: RequestInit) =>
        fetch(url, { ...init, next: { revalidate: REVALIDATE_SECONDS } })
    }
  })
}

export function getRepoInfo() {
  return { owner: OWNER, repo: REPO }
}

export function isCompletedStatus(status: ProjectStatus | null): boolean {
  return !!status && COMPLETED_STATUS_NAMES.has(status.name.toLowerCase())
}

/* -------------------------------------------------------------------------- */
/* Project status (GraphQL)                                                    */
/* -------------------------------------------------------------------------- */

interface StatusFieldValue {
  name?: string | null
  optionId?: string | null
  color?: string | null
}

interface IssueProjectItems {
  projectItems: {
    nodes: ({
      project: { number: number; owner: { login: string } | null } | null
      fieldValueByName: StatusFieldValue | null
    } | null)[]
  }
}

interface StatusOptionsResult {
  organization: {
    projectV2: {
      title: string
      url: string
      field: { options?: { id: string; name: string; color: string }[] } | null
    } | null
  } | null
}

type StatusBatchResult = {
  repository: Record<string, IssueProjectItems | null> | null
}

const STATUS_OPTIONS_QUERY = `
  query statusOptions($login: String!, $number: Int!, $field: String!) {
    organization(login: $login) {
      projectV2(number: $number) {
        title
        url
        field(name: $field) {
          ... on ProjectV2SingleSelectField {
            options { id name color }
          }
        }
      }
    }
  }
`

function buildStatusBatchQuery(issueNumbers: number[]) {
  const fields = issueNumbers
    .map(
      (n) => `
      i${n}: issue(number: ${n}) {
        projectItems(first: 20, includeArchived: false) {
          nodes {
            project { number owner { ... on Organization { login } ... on User { login } } }
            fieldValueByName(name: $field) {
              ... on ProjectV2ItemFieldSingleSelectValue { name optionId color }
            }
          }
        }
      }`
    )
    .join("\n")

  return `
    query issueStatuses($owner: String!, $repo: String!, $field: String!) {
      repository(owner: $owner, name: $repo) {
        ${fields}
      }
    }
  `
}

/**
 * Octokit throws on any GraphQL error, even when most of the response is
 * usable (e.g. one issue was transferred). Keep the partial data in that case.
 */
async function graphqlAllowPartial<T>(
  octokit: Octokit,
  query: string,
  variables: Record<string, unknown>
): Promise<T> {
  try {
    return await octokit.graphql<T>(query, variables)
  } catch (error) {
    if (error && typeof error === "object" && "data" in error && (error as { data: unknown }).data) {
      console.warn("GitHub GraphQL returned partial data:", error instanceof Error ? error.message : error)
      return (error as { data: T }).data
    }
    throw error
  }
}

async function getProjectStatusOptions(
  octokit: Octokit
): Promise<Omit<ProjectInfo, "error">> {
  const result = await graphqlAllowPartial<StatusOptionsResult>(octokit, STATUS_OPTIONS_QUERY, {
    login: PROJECT_OWNER,
    number: PROJECT_NUMBER,
    field: STATUS_FIELD_NAME
  })
  const project = result.organization?.projectV2
  if (!project) {
    throw new Error(`Project ${PROJECT_OWNER}/${PROJECT_NUMBER} was not found or is not accessible.`)
  }
  const statusOptions: ProjectStatusOption[] = (project.field?.options ?? []).map((o) => ({
    id: o.id,
    name: o.name,
    color: o.color
  }))
  return { title: project.title, url: project.url, statusOptions }
}

/**
 * Status of each issue on the configured project, read directly from the
 * project's Status field. Issues that aren't on the project, or have no Status
 * set, are absent from the map — they are never inferred from open/closed.
 */
async function getIssueProjectStatuses(
  octokit: Octokit,
  issueNumbers: number[]
): Promise<Map<number, ProjectStatus>> {
  const statuses = new Map<number, ProjectStatus>()
  const unique = [...new Set(issueNumbers)]

  const batches: number[][] = []
  for (let i = 0; i < unique.length; i += STATUS_BATCH_SIZE) {
    batches.push(unique.slice(i, i + STATUS_BATCH_SIZE))
  }

  const results = await Promise.all(
    batches.map((batch) =>
      graphqlAllowPartial<StatusBatchResult>(octokit, buildStatusBatchQuery(batch), {
        owner: OWNER,
        repo: REPO,
        field: STATUS_FIELD_NAME
      })
    )
  )

  for (const result of results) {
    for (const [alias, issue] of Object.entries(result.repository ?? {})) {
      const number = Number(alias.slice(1))
      const item = issue?.projectItems.nodes.find(
        (node) =>
          node?.project?.number === PROJECT_NUMBER &&
          node.project.owner?.login?.toLowerCase() === PROJECT_OWNER.toLowerCase()
      )
      const value = item?.fieldValueByName
      if (value?.name) {
        statuses.set(number, {
          name: value.name,
          optionId: value.optionId ?? null,
          color: value.color ?? "GRAY"
        })
      }
    }
  }

  return statuses
}

/* -------------------------------------------------------------------------- */
/* Milestones and issues (REST)                                                */
/* -------------------------------------------------------------------------- */

type RawIssue = Omit<IssueSummary, "projectStatus">

async function listMilestoneIssues(octokit: Octokit, milestoneNumber: number): Promise<RawIssue[]> {
  const issues = await octokit.paginate(octokit.rest.issues.listForRepo, {
    owner: OWNER,
    repo: REPO,
    milestone: String(milestoneNumber),
    state: "all",
    per_page: 100
  })

  return issues
    .filter((issue) => !issue.pull_request)
    .map((issue) => ({
      id: issue.id,
      number: issue.number,
      title: issue.title,
      state: issue.state === "closed" ? ("closed" as const) : ("open" as const),
      htmlUrl: issue.html_url,
      labels: (issue.labels ?? []).map((label) =>
        typeof label === "string"
          ? { name: label, color: "cecece" }
          : { name: label.name ?? "", color: label.color ?? "cecece" }
      ),
      assignees: (issue.assignees ?? []).map((assignee) => ({
        login: assignee.login,
        avatarUrl: assignee.avatar_url
      })),
      updatedAt: issue.updated_at
    }))
}

function withStatus(issue: RawIssue, statuses: Map<number, ProjectStatus>): IssueSummary {
  const projectStatus = statuses.get(issue.number) ?? null
  return {
    ...issue,
    projectStatus,
    // A work item can be "Completed" on the board while the GitHub issue is
    // still open, so it counts as closed for milestone progress (as before).
    state: issue.state === "closed" || isCompletedStatus(projectStatus) ? "closed" : "open"
  }
}

function sortIssues(issues: IssueSummary[]): IssueSummary[] {
  return issues.sort((a, b) => {
    if (a.state !== b.state) return a.state === "open" ? -1 : 1
    return a.number - b.number
  })
}

async function loadRoadmapData(): Promise<RoadmapData> {
  const octokit = getClient()

  try {
    const allMilestones = await octokit.paginate(octokit.rest.issues.listMilestones, {
      owner: OWNER,
      repo: REPO,
      state: "open",
      sort: "due_on",
      direction: "asc",
      per_page: 100
    })
    const releaseMilestones = allMilestones.filter((m) => isReleaseVersion(m.title))

    const issuesByMilestone = await Promise.all(
      releaseMilestones.map((m) => listMilestoneIssues(octokit, m.number))
    )

    // Project statuses are best-effort: if they fail (missing token, missing
    // read:project scope, rate limit) the roadmap still renders and every
    // issue shows "No status" alongside an explanatory notice.
    let statuses = new Map<number, ProjectStatus>()
    let project: ProjectInfo = { title: null, url: null, statusOptions: [], error: null }
    try {
      const [options, issueStatuses] = await Promise.all([
        getProjectStatusOptions(octokit),
        getIssueProjectStatuses(
          octokit,
          issuesByMilestone.flat().map((i) => i.number)
        )
      ])
      statuses = issueStatuses
      project = { ...options, error: null }
    } catch (error) {
      console.error("Failed to load project statuses; showing issues without status.", error)
      project = {
        ...project,
        error: describeProjectError(error)
      }
    }

    const milestones: Milestone[] = releaseMilestones.map((m, index) => {
      const issues = sortIssues(issuesByMilestone[index].map((i) => withStatus(i, statuses)))
      const closedIssues = issues.filter((i) => i.state === "closed").length
      return {
        number: m.number,
        title: m.title,
        description: m.description,
        state: m.state === "closed" ? "closed" : "open",
        releaseType: classifyRelease(m.title),
        openIssues: issues.length - closedIssues,
        closedIssues,
        createdAt: m.created_at,
        dueOn: m.due_on,
        htmlUrl: m.html_url,
        issues
      }
    })

    return { milestones, project }
  } catch (error) {
    throw toGitHubApiError(error)
  }
}

/**
 * Everything the roadmap needs, fetched once and cached for five minutes so
 * the page and the issues API route share the same snapshot and expanding a
 * milestone costs no extra GitHub calls.
 */
export const getRoadmapData = unstable_cache(
  loadRoadmapData,
  ["roadmap-data", OWNER, REPO, PROJECT_OWNER, String(PROJECT_NUMBER), STATUS_FIELD_NAME],
  { revalidate: REVALIDATE_SECONDS, tags: ["roadmap"] }
)

export async function getOpenMilestones(): Promise<Milestone[]> {
  return (await getRoadmapData()).milestones
}

export async function getMilestoneIssues(milestoneNumber: number): Promise<IssueSummary[]> {
  const { milestones } = await getRoadmapData()
  const milestone = milestones.find((m) => m.number === milestoneNumber)
  if (!milestone) {
    throw new GitHubApiError(`Milestone ${milestoneNumber} is not an open release milestone.`, 404)
  }
  return milestone.issues
}

function describeProjectError(error: unknown): string {
  const status =
    error && typeof error === "object" && "status" in error
      ? (error as { status?: number }).status
      : undefined
  if (!process.env.GITHUB_TOKEN || status === 401) {
    return "Project statuses need a GITHUB_TOKEN with the read:project scope."
  }
  if (status === 403 || status === 429) {
    return "GitHub rate limit reached while loading project statuses. They'll reappear on the next refresh."
  }
  const message = error instanceof Error ? error.message : ""
  if (/scope|read:project|resource not accessible/i.test(message)) {
    return "The GITHUB_TOKEN can't read the project. Add the read:project scope."
  }
  return "Project statuses couldn't be loaded from GitHub."
}

function toGitHubApiError(error: unknown): GitHubApiError {
  if (error instanceof GitHubApiError) return error
  if (error && typeof error === "object" && "status" in error) {
    const status = (error as { status?: number }).status
    if (status === 403 || status === 429) {
      return new GitHubApiError(
        "GitHub API rate limit exceeded. Add a GITHUB_TOKEN to your .env file to raise the limit.",
        status
      )
    }
    if (status === 404) {
      return new GitHubApiError(
        `Repository ${OWNER}/${REPO} was not found or is not accessible.`,
        status
      )
    }
    if (status === 401) {
      return new GitHubApiError(
        "GitHub API rejected the configured GITHUB_TOKEN. Check that it is valid.",
        status
      )
    }
  }
  return new GitHubApiError(
    error instanceof Error ? error.message : "Unknown GitHub API error"
  )
}
