import { Octokit } from "octokit"
import type { IssueSummary, Milestone } from "./types"

const OWNER = process.env.GITHUB_REPO_OWNER || "opencrvs"
const REPO = process.env.GITHUB_REPO_NAME || "opencrvs-core"

const PROJECT_OWNER = process.env.GITHUB_PROJECT_OWNER || OWNER
const PROJECT_NUMBER = Number(process.env.GITHUB_PROJECT_NUMBER) || 4
const COMPLETED_STATUS_NAME = "Completed"

/** Matches release version titles like "2.1", "1.9.18", or "v1.6.2". */
const RELEASE_VERSION_PATTERN = /^v?\d+(\.\d+)+$/

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

function toMilestone(m: {
  number: number
  title: string
  description: string | null
  state: string
  open_issues: number
  closed_issues: number
  created_at: string
  due_on: string | null
  html_url: string
}): Milestone {
  return {
    number: m.number,
    title: m.title,
    description: m.description,
    state: m.state === "closed" ? "closed" : "open",
    openIssues: m.open_issues,
    closedIssues: m.closed_issues,
    createdAt: m.created_at,
    dueOn: m.due_on,
    htmlUrl: m.html_url
  }
}

export function getRepoInfo() {
  return { owner: OWNER, repo: REPO }
}

interface ProjectStatusQueryResult {
  organization: {
    projectV2: {
      items: {
        nodes: {
          content: {
            number?: number
            repository?: { nameWithOwner: string }
          } | null
          fieldValueByName: { name: string } | null
        }[]
      }
    } | null
  } | null
}

const PROJECT_STATUS_QUERY = `
  query paginate($cursor: String, $login: String!, $number: Int!) {
    organization(login: $login) {
      projectV2(number: $number) {
        items(first: 100, after: $cursor) {
          nodes {
            content {
              ... on Issue {
                number
                repository { nameWithOwner }
              }
            }
            fieldValueByName(name: "Status") {
              ... on ProjectV2ItemFieldSingleSelectValue { name }
            }
          }
          pageInfo { hasNextPage endCursor }
        }
      }
    }
  }
`

/**
 * Issue numbers whose Status field on the "OpenCRVS Core" project board
 * (opencrvs/4) is set to "Completed". A work item can carry this status
 * while the underlying GitHub issue is still open, so it's treated as an
 * additional completion signal alongside the issue's closed state.
 */
async function getCompletedIssueNumbers(): Promise<Set<number>> {
  const octokit = getClient()
  const completed = new Set<number>()

  try {
    const result = await octokit.graphql.paginate<ProjectStatusQueryResult>(
      PROJECT_STATUS_QUERY,
      { login: PROJECT_OWNER, number: PROJECT_NUMBER }
    )

    for (const item of result.organization?.projectV2?.items.nodes ?? []) {
      if (
        item.content?.repository?.nameWithOwner === `${OWNER}/${REPO}` &&
        typeof item.content.number === "number" &&
        item.fieldValueByName?.name === COMPLETED_STATUS_NAME
      ) {
        completed.add(item.content.number)
      }
    }
  } catch (error) {
    console.error(
      "Failed to load project board status field; falling back to issue state only.",
      error
    )
  }

  return completed
}

export async function getOpenMilestones(): Promise<Milestone[]> {
  const octokit = getClient()

  try {
    const milestones = await octokit.paginate(
      octokit.rest.issues.listMilestones,
      {
        owner: OWNER,
        repo: REPO,
        state: "open",
        sort: "due_on",
        direction: "asc",
        per_page: 100
      }
    )

    const openMilestones = milestones.filter((m) =>
      RELEASE_VERSION_PATTERN.test(m.title)
    )
    const completedIssueNumbers = await getCompletedIssueNumbers()

    return await Promise.all(
      openMilestones.map(async (m) => {
        const issues = await getMilestoneIssues(m.number, completedIssueNumbers)
        const closedIssues = issues.filter((issue) => issue.state === "closed").length
        return toMilestone({
          ...m,
          open_issues: issues.length - closedIssues,
          closed_issues: closedIssues
        })
      })
    )
  } catch (error) {
    throw toGitHubApiError(error)
  }
}

export async function getMilestoneIssues(
  milestoneNumber: number,
  completedIssueNumbers?: Set<number>
): Promise<IssueSummary[]> {
  const octokit = getClient()
  const completed = completedIssueNumbers ?? (await getCompletedIssueNumbers())

  try {
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
        state:
          issue.state === "closed" || completed.has(issue.number)
            ? ("closed" as const)
            : ("open" as const),
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
      .sort((a, b) => {
        if (a.state !== b.state) return a.state === "open" ? -1 : 1
        return a.number - b.number
      })
  } catch (error) {
    throw toGitHubApiError(error)
  }
}

function toGitHubApiError(error: unknown): GitHubApiError {
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
