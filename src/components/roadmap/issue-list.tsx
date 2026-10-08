"use client"

import { useMemo, useState } from "react"
import { AlertTriangleIcon, CircleCheckIcon, CircleDotIcon, ExternalLinkIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { THEMES, THEME_FILTERS, classifyIssue, type ThemeId } from "@/lib/themes"
import type { IssueSummary, ReleaseType } from "@/lib/types"
import { ProjectStatusBadge } from "@/components/roadmap/project-status-badge"

const ALL = "all"

interface ClassifiedIssue {
  issue: IssueSummary
  themes: ThemeId[]
}

export function IssueList({
  issues,
  releaseType,
  isPlanning,
  statusError
}: {
  issues: IssueSummary[]
  releaseType: ReleaseType
  isPlanning: boolean
  statusError: string | null
}) {
  const [filter, setFilter] = useState<ThemeId | typeof ALL>(ALL)
  const classified = useMemo<ClassifiedIssue[]>(
    () => issues.map((issue) => ({ issue, themes: classifyIssue(issue) })),
    [issues]
  )
  const filters = THEME_FILTERS[releaseType]
  const counts = useMemo(
    () =>
      new Map(filters.map((theme) => [theme, classified.filter((c) => c.themes.includes(theme)).length])),
    [classified, filters]
  )

  const visible =
    filter === ALL ? classified : classified.filter((c) => c.themes.includes(filter))

  if (issues.length === 0) {
    return (
      <p className="text-muted-foreground px-1 py-2 text-sm">
        {isPlanning
          ? "No tasks have been added yet. This release is in discovery / planning."
          : "No issues are associated with this milestone yet."}
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

      <div role="group" aria-label="Filter tasks by product theme" className="flex flex-wrap items-center gap-1.5">
        <span className="text-muted-foreground mr-1 text-xs font-medium">Product theme</span>
        <FilterChip active={filter === ALL} onClick={() => setFilter(ALL)}>
          All <Count>{issues.length}</Count>
        </FilterChip>
        {filters.map((theme) => {
          const count = counts.get(theme) ?? 0
          return (
            <FilterChip
              key={theme}
              active={filter === theme}
              disabled={count === 0 && filter !== theme}
              onClick={() => setFilter(theme)}
            >
              {THEMES[theme].label} <Count>{count}</Count>
            </FilterChip>
          )
        })}
      </div>

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
          {visible.map(({ issue, themes }) => (
            <IssueRow key={issue.id} issue={issue} theme={themes[0] ?? null} />
          ))}
          {visible.length === 0 ? (
            <tr>
              <td colSpan={2} className="text-muted-foreground px-2 py-3 text-sm">
                No tasks in this release match this theme.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  )
}

function IssueRow({ issue, theme }: { issue: IssueSummary; theme: ThemeId | null }) {
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
            {theme || issue.labels.length > 0 ? (
              <span className="flex flex-wrap items-center gap-1">
                {theme ? (
                  <span className="text-muted-foreground mr-0.5 text-xs font-medium">
                    {THEMES[theme].singular}
                  </span>
                ) : null}
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
  disabled = false,
  onClick,
  children
}: {
  active: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      disabled={disabled}
      className={cn(
        "focus-visible:ring-ring/50 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50",
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
