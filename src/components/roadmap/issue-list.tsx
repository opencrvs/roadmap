"use client"

import { useEffect, useState } from "react"
import { CircleCheckIcon, CircleDotIcon, ExternalLinkIcon } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import type { IssueSummary } from "@/lib/types"

export function IssueList({ milestoneNumber }: { milestoneNumber: number }) {
  const [issues, setIssues] = useState<IssueSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    fetch(`/api/milestones/${milestoneNumber}/issues`)
      .then(async (res) => {
        const body = await res.json()
        if (!res.ok) throw new Error(body.error ?? "Failed to load issues")
        return body.issues as IssueSummary[]
      })
      .then((data) => {
        if (!cancelled) setIssues(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load issues")
      })

    return () => {
      cancelled = true
    }
  }, [milestoneNumber])

  if (error) {
    return <p className="text-status-overdue-fg px-1 py-2 text-sm">{error}</p>
  }

  if (!issues) {
    return (
      <ul className="flex flex-col gap-2 px-1 py-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <li key={i} className="flex items-center gap-2">
            <Skeleton className="size-4 shrink-0 rounded-full" />
            <Skeleton className="h-4 w-full max-w-md" />
          </li>
        ))}
      </ul>
    )
  }

  if (issues.length === 0) {
    return (
      <p className="text-muted-foreground px-1 py-2 text-sm">
        No issues are associated with this milestone yet.
      </p>
    )
  }

  return (
    <ul className="divide-border flex flex-col divide-y px-1">
      {issues.map((issue) => (
        <li key={issue.id}>
          <a
            href={issue.htmlUrl}
            target="_blank"
            rel="noreferrer"
            className="hover:bg-muted group flex items-start gap-2.5 rounded-md px-2 py-2 text-sm"
          >
            {issue.state === "closed" ? (
              <CircleCheckIcon
                className="text-status-good-fg mt-0.5 size-4 shrink-0"
                aria-label="Closed"
              />
            ) : (
              <CircleDotIcon
                className="text-status-good-fg/70 mt-0.5 size-4 shrink-0"
                aria-label="Open"
              />
            )}
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="flex flex-wrap items-baseline gap-x-1.5">
                <span
                  className={
                    issue.state === "closed"
                      ? "text-muted-foreground line-through"
                      : "text-foreground"
                  }
                >
                  {issue.title}
                </span>
                <span className="text-muted-foreground text-xs">#{issue.number}</span>
              </span>
              {issue.labels.length > 0 ? (
                <span className="flex flex-wrap gap-1">
                  {issue.labels.map((label) => (
                    <span
                      key={label.name}
                      className="rounded-full border px-1.5 py-0.5 text-[10px] leading-none font-medium"
                      style={{
                        borderColor: `#${label.color}80`,
                        backgroundColor: `#${label.color}1a`,
                        color: `#${label.color}`
                      }}
                    >
                      {label.name}
                    </span>
                  ))}
                </span>
              ) : null}
            </span>
            <ExternalLinkIcon className="text-muted-foreground mt-0.5 size-3.5 shrink-0 opacity-0 group-hover:opacity-100" />
          </a>
        </li>
      ))}
    </ul>
  )
}
