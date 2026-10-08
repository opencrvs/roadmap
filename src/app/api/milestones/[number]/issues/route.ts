import { NextRequest, NextResponse } from "next/server"
import { GitHubApiError, getMilestoneIssues } from "@/lib/github"

// The page now ships each milestone's issues (with project status) directly,
// so the UI no longer calls this route. It's kept for external consumers and
// reads from the same cached snapshot, so it costs no extra GitHub calls.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ number: string }> }
) {
  const { number } = await params
  const milestoneNumber = Number(number)

  if (!Number.isInteger(milestoneNumber)) {
    return NextResponse.json(
      { error: "Invalid milestone number" },
      { status: 400 }
    )
  }

  try {
    const issues = await getMilestoneIssues(milestoneNumber)
    return NextResponse.json({ issues })
  } catch (error) {
    const message =
      error instanceof GitHubApiError ? error.message : "Failed to load issues"
    const status =
      error instanceof GitHubApiError && error.status ? error.status : 500
    return NextResponse.json({ error: message }, { status })
  }
}
