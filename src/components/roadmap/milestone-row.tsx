"use client"

import { ChevronDownIcon } from "lucide-react"
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion"
import { IssueList } from "@/components/roadmap/issue-list"
import { MilestoneBar } from "@/components/roadmap/timeline-track"
import { StatusBadge } from "@/components/roadmap/status-badge"
import type { Milestone } from "@/lib/types"
import type { MilestoneGeometry } from "@/lib/timeline"
import { formatDate, formatRelativeDays } from "@/lib/format"
import { GRID_COLS } from "@/components/roadmap/timeline-header"
import { cn } from "@/lib/utils"

export function MilestoneRow({
  milestone,
  geometry,
  statusError,
  compact = false
}: {
  milestone: Milestone
  geometry: MilestoneGeometry
  statusError: string | null
  /** Hotfix rows: tighter spacing and a thinner bar. */
  compact?: boolean
}) {
  const totalIssues = geometry.totalIssues
  const isPlanning = geometry.status === "planning"
  const dueDetail =
    geometry.status === "overdue" || geometry.status === "due-soon"
      ? formatRelativeDays(geometry.daysUntilDue ?? 0)
      : undefined

  return (
    <AccordionItem value={String(milestone.number)} className="border-b-0">
      <AccordionTrigger className="hover:no-underline focus-visible:ring-0 focus-visible:border-transparent focus-visible:after:border-transparent [&>svg]:hidden py-0">
        <div className={cn("grid w-full items-center", compact ? "py-2" : "py-3", GRID_COLS)}>
          <div className="flex min-w-0 flex-col gap-1 pr-2">
            <div className="flex flex-wrap items-center gap-2">
              <ChevronDownIcon className="text-muted-foreground group-aria-expanded/accordion-trigger:rotate-180 size-4 shrink-0 transition-transform" />
              <a
                href={milestone.htmlUrl}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  "text-foreground truncate hover:underline",
                  compact ? "text-sm font-medium" : "font-semibold"
                )}
                title={milestone.title}
              >
                {milestone.title}
              </a>
              <StatusBadge status={geometry.status} detail={dueDetail} />
            </div>
            <div className="text-muted-foreground flex flex-wrap gap-x-3 text-xs">
              {isPlanning ? (
                <>
                  {totalIssues > 0 ? (
                    <span>
                      {totalIssues} task{totalIssues === 1 ? "" : "s"} scoped
                    </span>
                  ) : null}
                  <span>
                    {geometry.dueDate
                      ? `Target ${formatDate(geometry.dueDate)}`
                      : "No due date"}
                  </span>
                </>
              ) : (
                <>
                  <span>
                    {milestone.closedIssues}/{totalIssues} issues closed
                  </span>
                  {geometry.dueDate ? <span>Due {formatDate(geometry.dueDate)}</span> : null}
                </>
              )}
            </div>
          </div>
          <MilestoneBar geometry={geometry} createdAt={milestone.createdAt} compact={compact} />
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className={`grid ${GRID_COLS}`}>
          <div className="hidden sm:block" />
          <IssueList
            issues={milestone.issues}
            releaseType={milestone.releaseType}
            isPlanning={isPlanning}
            statusError={statusError}
          />
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}
