"use client"

import { useMemo, useState } from "react"
import { AlertTriangleIcon, CircleCheckIcon, CircleDotIcon, ExternalLinkIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  NO_STATUS_KEY,
  statusKey,
  summarizeStatuses
} from "@/lib/project-status"
import type { IssueSummary, ProjectStatusOption } from "@/lib/types"
import { ProjectStatusBadge, StatusDot } from "@/components/roadmap/project-status-badge"

const ALL = "__all__"

export function IssueList({
  issues,
  statusOptions,
  statusError
}: {
  issues: IssueSummary[]
  statusOptions: ProjectStatusOption[]
  statusError: string | null
}) {
  const [filter, setFilter] = useState<string>(ALL)
  const counts = useMemo(() => summarizeStatuses(issues, statusOptions), [issues, statusOptions])

  // If the selected status disappears after a refresh, fall back to "All".
  const activeFilter = filter === ALL || counts.some((c) => c.key === filter) ? filter : ALL
  const visible =
    activeFilter === ALL ? issues : issues.filter((issue) => statusKey(issue) === activeFilter)

  if (issues.length === 0) {
    return (
      <p className="text-muted-foreground px-1 py-2 text-sm">
        No issues are associated with this milestone yet.
      </p>
    )
  }

  return (
    <div className="flex min-w-0 flex-col gap-2 px-1 pb-2">
      {statusError ? (
        <p className="text-status-due-soon-fg flex items-start gap-1.5 text-xs">
          <AlertTriangleIcon className="mt-px size-3.5 shrink-0" aria-hidden />
          {statusError}
        </p>
      ) : null}

      {counts.length > 1 ? (
        <div role="group" aria-label="Filter tasks by status" className="flex flex-wrap gap-1.5">
          <FilterChip active={activeFilter === ALL} onClick={() => setFilter(ALL)}>
            All <Count>{issues.length}</Count>
          </FilterChip>
          {counts.map((c) => (
            <FilterChip
              key={c.key}
              active={activeFilter === c.key}
              onClick={() => setFilter(c.key)}
            >
              <StatusDot color={c.color} isNoStatus={c.key === NO_STATUS_KEY} />
              {c.name} <Count>{c.count}</Count>
            </FilterChip>
          ))}
        </div>
      ) : null}

      <table className="w-full table-fixed text-sm">
        <thead className="sr-only sm:not-sr-only">
          <tr className="text-muted-foreground border-border border-b text-left text-xs">
            <th scope="col" className="px-2 pb-1.5 font-medium">
              Task
            </th>
            <th scope="col" className="w-36 px-2 pb-1.5 font-medium">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-border divide-y">
          {visible.map((issue) => (
            <IssueRow key={issue.id} issue={issue} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function IssueRow({ issue }: { issue: IssueSummary }) {
  return (
    <tr className="hover:bg-muted group align-top">
      <td className="px-2 py-2">
        <a
          href={issue.htmlUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-start gap-2.5 focus-visible:underline"
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
              <ExternalLinkIcon className="text-muted-foreground size-3 shrink-0 self-center opacity-0 group-hover:opacity-100" />
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
        </a>
      </td>
      <td className="px-2 py-2">
        <ProjectStatusBadge status={issue.projectStatus} />
      </td>
    </tr>
  )
}

function FilterChip({
  active,
  onClick,
  children
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "focus-visible:ring-ring/50 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium outline-none focus-visible:ring-2",
        active
          ? "bg-accent text-accent-foreground border-primary/40"
          : "text-muted-foreground hover:bg-muted border-border bg-card"
      )}
    >
      {children}
    </button>
  )
}

function Count({ children }: { children: React.ReactNode }) {
  return <span className="tabular-nums opacity-70">{children}</span>
}
