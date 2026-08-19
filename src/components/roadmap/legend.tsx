import type { CSSProperties } from "react"

const OVERRUN_HATCH =
  "repeating-linear-gradient(135deg, var(--status-overdue-fg) 0 3px, transparent 3px 7px)"
const TAIL_HATCH =
  "repeating-linear-gradient(135deg, var(--muted-foreground) 0 3px, transparent 3px 7px)"

export function Legend() {
  return (
    <div className="text-muted-foreground flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
      <LegendSwatch className="bg-primary" label="Issues closed" />
      <LegendSwatch className="bg-track" label="Issues open" />
      <LegendSwatch style={{ backgroundImage: OVERRUN_HATCH }} label="Past due, still open" />
      <LegendSwatch style={{ backgroundImage: TAIL_HATCH }} label="No due date set" />
      <span className="flex items-center gap-1.5">
        <span className="bg-today-line inline-block h-3.5 w-px" />
        Today
      </span>
    </div>
  )
}

function LegendSwatch({
  label,
  className,
  style
}: {
  label: string
  className?: string
  style?: CSSProperties
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className={`inline-block h-2.5 w-5 rounded-full ${className ?? ""}`}
        style={style}
      />
      {label}
    </span>
  )
}
