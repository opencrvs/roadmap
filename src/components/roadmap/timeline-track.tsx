import type { MilestoneGeometry } from "@/lib/timeline"
import type { TimelineRange } from "@/lib/timeline"
import { formatDate } from "@/lib/format"

const OVERRUN_HATCH =
  "repeating-linear-gradient(135deg, var(--status-overdue-fg) 0 3px, transparent 3px 7px)"
const TAIL_HATCH =
  "repeating-linear-gradient(135deg, var(--muted-foreground) 0 3px, transparent 3px 7px)"

export function MonthGridlines({
  markers
}: {
  markers: { date: Date; pct: number }[]
}) {
  return (
    <>
      {markers.map(({ date, pct }) => (
        <div
          key={date.toISOString()}
          className="absolute top-0 bottom-0 w-px bg-border"
          style={{ left: `${pct}%` }}
        />
      ))}
    </>
  )
}

export function TodayLine({ pct, className }: { pct: number; className?: string }) {
  return (
    <div
      className={`absolute top-0 bottom-0 w-px bg-today-line ${className ?? ""}`}
      style={{ left: `${pct}%` }}
    />
  )
}

export function MilestoneBar({
  geometry,
  createdAt
}: {
  geometry: MilestoneGeometry
  createdAt: string
}) {
  const {
    startPct,
    scheduledEndPct,
    overrunEndPct,
    tailEndPct,
    progressPct,
    clampedStart,
    dueDate
  } = geometry

  const committedWidth = Math.max(0, scheduledEndPct - startPct)
  const filledWidth = committedWidth * (progressPct / 100)
  const isFullyFilled = progressPct >= 100

  const rangeLabel = dueDate
    ? `${formatDate(createdAt)} → ${formatDate(dueDate)}`
    : `${formatDate(createdAt)} → ongoing (no due date)`

  return (
    <div className="relative h-7 w-full" title={`${rangeLabel} · ${progressPct}% of issues closed`}>
      {/* track (committed span) */}
      <div
        className="bg-track absolute top-1/2 h-2.5 -translate-y-1/2 rounded-full"
        style={{ left: `${startPct}%`, width: `${committedWidth}%` }}
      />
      {/* progress fill */}
      <div
        className="bg-primary absolute top-1/2 h-2.5 -translate-y-1/2 rounded-l-full"
        style={{
          left: `${startPct}%`,
          width: `${filledWidth}%`,
          borderTopRightRadius: isFullyFilled ? 9999 : 0,
          borderBottomRightRadius: isFullyFilled ? 9999 : 0
        }}
      />
      {/* overrun hatch (overdue, still open) */}
      {overrunEndPct !== null && overrunEndPct > scheduledEndPct ? (
        <div
          className="absolute top-1/2 h-2.5 -translate-y-1/2 rounded-r-full"
          style={{
            left: `${scheduledEndPct}%`,
            width: `${overrunEndPct - scheduledEndPct}%`,
            backgroundImage: OVERRUN_HATCH
          }}
        />
      ) : null}
      {/* open-ended tail (no due date set) */}
      {tailEndPct !== null && tailEndPct > scheduledEndPct ? (
        <div
          className="absolute top-1/2 h-2.5 -translate-y-1/2 rounded-r-full opacity-60"
          style={{
            left: `${scheduledEndPct}%`,
            width: `${tailEndPct - scheduledEndPct}%`,
            backgroundImage: TAIL_HATCH
          }}
        />
      ) : null}
      {/* indicator that the milestone actually started before the visible window */}
      {clampedStart ? (
        <div
          className="border-y-transparent border-r-muted-foreground absolute top-1/2 size-0 -translate-y-1/2 border-y-4 border-r-4"
          style={{ left: 0 }}
          aria-hidden
        />
      ) : null}
    </div>
  )
}

export type { TimelineRange }
