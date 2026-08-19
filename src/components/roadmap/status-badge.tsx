import {
  AlertTriangleIcon,
  CalendarOffIcon,
  CheckCircle2Icon,
  ClockIcon
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { MilestoneStatus } from "@/lib/timeline"

const STATUS_CONFIG: Record<
  MilestoneStatus,
  { label: string; icon: typeof AlertTriangleIcon; classes: string }
> = {
  overdue: {
    label: "Overdue",
    icon: AlertTriangleIcon,
    classes:
      "bg-status-overdue-bg text-status-overdue-fg border-status-overdue-border"
  },
  "due-soon": {
    label: "Due soon",
    icon: ClockIcon,
    classes:
      "bg-status-due-soon-bg text-status-due-soon-fg border-status-due-soon-border"
  },
  "on-track": {
    label: "On track",
    icon: CheckCircle2Icon,
    classes: "bg-status-good-bg text-status-good-fg border-status-good-border"
  },
  "all-closed": {
    label: "Issues complete",
    icon: CheckCircle2Icon,
    classes: "bg-status-good-bg text-status-good-fg border-status-good-border"
  },
  "no-due-date": {
    label: "No due date",
    icon: CalendarOffIcon,
    classes: "bg-status-info-bg text-status-info-fg border-status-info-border"
  }
}

export function StatusBadge({
  status,
  detail
}: {
  status: MilestoneStatus
  detail?: string
}) {
  const config = STATUS_CONFIG[status]
  const Icon = config.icon

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        config.classes
      )}
    >
      <Icon className="size-3" aria-hidden />
      {config.label}
      {detail ? <span className="opacity-80">· {detail}</span> : null}
    </span>
  )
}
