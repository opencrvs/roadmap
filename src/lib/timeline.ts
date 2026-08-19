import type { Milestone } from "./types"

const DAY_MS = 1000 * 60 * 60 * 24
const MIN_SEGMENT_PCT = 1.2

export type MilestoneStatus =
  | "overdue"
  | "due-soon"
  | "on-track"
  | "no-due-date"
  | "all-closed"

export interface TimelineRange {
  start: Date
  end: Date
}

export interface MilestoneGeometry {
  status: MilestoneStatus
  progressPct: number
  totalIssues: number
  /** % across the range where the bar begins */
  startPct: number
  /** true if the milestone was actually created before the visible range */
  clampedStart: boolean
  /** % across the range where the solid, progress-filled segment ends */
  scheduledEndPct: number
  /** % where a red "running over" hatch ends, only set when overdue */
  overrunEndPct: number | null
  /** % where a grey "no committed date" hatch ends, only set with no due date */
  tailEndPct: number | null
  dueDate: Date | null
  daysUntilDue: number | null
}

/** Roadmap window: 6 months back to 12 months forward from `now`. */
export function getTimelineRange(now: Date): TimelineRange {
  const start = new Date(now)
  start.setMonth(start.getMonth() - 6)
  const end = new Date(now)
  end.setMonth(end.getMonth() + 12)
  return { start, end }
}

export function getMonthMarkers(range: TimelineRange): {
  date: Date
  pct: number
}[] {
  const markers: { date: Date; pct: number }[] = []
  const cursor = new Date(range.start)
  cursor.setDate(1)
  cursor.setHours(0, 0, 0, 0)
  if (cursor < range.start) cursor.setMonth(cursor.getMonth() + 1)

  while (cursor <= range.end) {
    markers.push({ date: new Date(cursor), pct: toPct(cursor, range) })
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return markers
}

function toPct(date: Date, range: TimelineRange): number {
  const span = range.end.getTime() - range.start.getTime()
  const offset = date.getTime() - range.start.getTime()
  return Math.min(100, Math.max(0, (offset / span) * 100))
}

export function computeMilestoneGeometry(
  milestone: Milestone,
  range: TimelineRange,
  now: Date
): MilestoneGeometry {
  const created = new Date(milestone.createdAt)
  const due = milestone.dueOn ? new Date(milestone.dueOn) : null
  const totalIssues = milestone.openIssues + milestone.closedIssues
  const progressPct =
    totalIssues === 0 ? 0 : Math.round((milestone.closedIssues / totalIssues) * 100)

  const startPct = toPct(created, range)
  const clampedStart = created.getTime() < range.start.getTime()

  const daysUntilDue = due
    ? Math.round((due.getTime() - now.getTime()) / DAY_MS)
    : null

  let status: MilestoneStatus
  let scheduledEndDate: Date
  let overrunEndPct: number | null = null
  let tailEndPct: number | null = null

  if (due) {
    const isOverdue = due.getTime() < now.getTime() && milestone.openIssues > 0
    const isDueSoon =
      !isOverdue && (daysUntilDue ?? Infinity) <= 30 && milestone.openIssues > 0
    const isAllClosed = milestone.openIssues === 0 && totalIssues > 0

    scheduledEndDate = due
    if (isOverdue) {
      status = "overdue"
      overrunEndPct = toPct(now, range)
    } else if (isAllClosed) {
      status = "all-closed"
    } else if (isDueSoon) {
      status = "due-soon"
    } else {
      status = "on-track"
    }
  } else {
    scheduledEndDate = now
    status = milestone.openIssues === 0 && totalIssues > 0 ? "all-closed" : "no-due-date"
    if (status === "no-due-date") {
      tailEndPct = toPct(range.end, range)
    }
  }

  const scheduledEndPct = Math.min(
    100,
    Math.max(toPct(scheduledEndDate, range), startPct + MIN_SEGMENT_PCT)
  )

  return {
    status,
    progressPct,
    totalIssues,
    startPct,
    clampedStart,
    scheduledEndPct,
    overrunEndPct,
    tailEndPct,
    dueDate: due,
    daysUntilDue
  }
}

/** Sort dated milestones chronologically first, undated ones after by age. */
export function sortMilestonesForRoadmap(milestones: Milestone[]): Milestone[] {
  return [...milestones].sort((a, b) => {
    const aKey = a.dueOn ? new Date(a.dueOn).getTime() : Infinity
    const bKey = b.dueOn ? new Date(b.dueOn).getTime() : Infinity
    if (aKey !== bKey) return aKey - bKey
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })
}
