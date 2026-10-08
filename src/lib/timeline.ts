import type { Milestone } from "./types"

const DAY_MS = 1000 * 60 * 60 * 24
const MIN_SEGMENT_PCT = 1.2

export type MilestoneStatus =
  | "overdue"
  | "due-soon"
  | "on-track"
  | "all-closed"
  /** No due date or no issues yet: not shown as started. */
  | "planning"

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
  dueDate: Date | null
  /** % across the range of the due date, if there is one */
  duePct: number | null
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

/**
 * A milestone without a due date or without any issues hasn't really started:
 * it's still in discovery / planning, whatever its GitHub creation date.
 */
export function isPlanningMilestone(milestone: Milestone): boolean {
  return !milestone.dueOn || milestone.openIssues + milestone.closedIssues === 0
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

  if (!due || isPlanningMilestone(milestone)) {
    status = "planning"
    scheduledEndDate = due ?? now
  } else {
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
    dueDate: due,
    duePct: due ? toPct(due, range) : null,
    daysUntilDue
  }
}

/** Parses a "2.1" / "1.9.18" / "v1.6.2" style title into numeric segments. */
function parseVersion(title: string): number[] {
  return title
    .replace(/^v/, "")
    .split(".")
    .map((segment) => Number(segment))
}

function compareVersionsAscending(a: string, b: string): number {
  const aSegments = parseVersion(a)
  const bSegments = parseVersion(b)
  const length = Math.max(aSegments.length, bSegments.length)
  for (let i = 0; i < length; i++) {
    const diff = (aSegments[i] ?? 0) - (bSegments[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

/**
 * Sort by GitHub due date, earliest first. Milestones without a due date go
 * last. Ties (same date, or both undated) fall back to version order.
 */
export function sortMilestonesForRoadmap(milestones: Milestone[]): Milestone[] {
  const dueTime = (m: Milestone) =>
    m.dueOn ? new Date(m.dueOn).getTime() : Number.POSITIVE_INFINITY
  return [...milestones].sort((a, b) => {
    const diff = dueTime(a) - dueTime(b)
    if (diff !== 0 && !Number.isNaN(diff)) return diff
    return compareVersionsAscending(a.title, b.title)
  })
}
