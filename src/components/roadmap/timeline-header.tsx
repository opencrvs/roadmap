import { MonthGridlines, TodayLine } from "@/components/roadmap/timeline-track"

const GRID_COLS = "grid-cols-[1fr] gap-2 sm:grid-cols-[220px_1fr] sm:gap-4 lg:grid-cols-[280px_1fr]"

const MONTH_FORMAT = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  year: "2-digit"
})

export function TimelineHeader({
  markers,
  todayPct
}: {
  markers: { date: Date; pct: number }[]
  todayPct: number
}) {
  return (
    <div className={`border-border grid border-b pb-2 ${GRID_COLS}`}>
      <div className="hidden sm:block" />
      <div className="relative h-5">
        <MonthGridlines markers={markers} />
        <TodayLine pct={todayPct} />
        {markers.map(({ date, pct }) => (
          <span
            key={date.toISOString()}
            className="text-muted-foreground absolute -translate-x-1/2 text-[11px] font-medium whitespace-nowrap first:translate-x-0 last:-translate-x-full"
            style={{ left: `${pct}%` }}
          >
            {MONTH_FORMAT.format(date)}
          </span>
        ))}
        <span
          className="text-today-line absolute -translate-x-1/2 text-[11px] font-semibold whitespace-nowrap"
          style={{ left: `${todayPct}%`, top: "-1.1rem" }}
        >
          Today
        </span>
      </div>
    </div>
  )
}

export { GRID_COLS }
