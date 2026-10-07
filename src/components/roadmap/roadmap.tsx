import { Accordion } from "@/components/ui/accordion"
import { Legend } from "@/components/roadmap/legend"
import { MilestoneRow } from "@/components/roadmap/milestone-row"
import { TimelineHeader } from "@/components/roadmap/timeline-header"
import {
  computeMilestoneGeometry,
  getMonthMarkers,
  getTimelineRange,
  sortMilestonesForRoadmap
} from "@/lib/timeline"
import type { Milestone } from "@/lib/types"

export function Roadmap({
  milestones,
  now,
  statusError,
  compact = false,
  showLegend = true,
  emptyMessage
}: {
  milestones: Milestone[]
  now: Date
  statusError: string | null
  compact?: boolean
  showLegend?: boolean
  emptyMessage: string
}) {
  const range = getTimelineRange(now)
  const markers = getMonthMarkers(range)
  const todayPct =
    ((now.getTime() - range.start.getTime()) /
      (range.end.getTime() - range.start.getTime())) *
    100
  const sorted = sortMilestonesForRoadmap(milestones)

  if (sorted.length === 0) {
    return <p className="text-muted-foreground py-2 text-sm">{emptyMessage}</p>
  }

  return (
    <div className="min-w-[720px]">
      {showLegend ? (
        <div className="mb-4">
          <Legend />
        </div>
      ) : (
        // Leaves room for the "Today" label that sits above the month axis.
        <div className="h-5" aria-hidden />
      )}
      <TimelineHeader markers={markers} todayPct={todayPct} />
      <Accordion multiple className="divide-border divide-y">
        {sorted.map((milestone) => (
          <MilestoneRow
            key={milestone.number}
            milestone={milestone}
            geometry={computeMilestoneGeometry(milestone, range, now)}
            statusError={statusError}
            compact={compact}
          />
        ))}
      </Accordion>
    </div>
  )
}
