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

export function Roadmap({ milestones, now }: { milestones: Milestone[]; now: Date }) {
  const range = getTimelineRange(now)
  const markers = getMonthMarkers(range)
  const todayPct =
    ((now.getTime() - range.start.getTime()) /
      (range.end.getTime() - range.start.getTime())) *
    100
  const sorted = sortMilestonesForRoadmap(milestones)

  return (
    <div className="min-w-[720px]">
      <div className="mb-4">
        <Legend />
      </div>
      <TimelineHeader markers={markers} todayPct={todayPct} />
      <Accordion multiple className="divide-border divide-y">
        {sorted.map((milestone) => (
          <MilestoneRow
            key={milestone.number}
            milestone={milestone}
            geometry={computeMilestoneGeometry(milestone, range, now)}
          />
        ))}
      </Accordion>
    </div>
  )
}
