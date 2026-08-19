import { Octokit } from "octokit"
import type { IssueSummary, Milestone } from "./types"

const OWNER = process.env.GITHUB_REPO_OWNER || "opencrvs"
const REPO = process.env.GITHUB_REPO_NAME || "opencrvs-core"

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

    return milestones.map(toMilestone)
  } catch (error) {
    throw toGitHubApiError(error)
  }
}

export async function getMilestoneIssues(
  milestoneNumber: number
): Promise<IssueSummary[]> {
  const octokit = getClient()

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
