import { cn } from "@/lib/utils"
import { NO_STATUS_LABEL, statusColorVar } from "@/lib/project-status"
import type { ProjectStatus } from "@/lib/types"

/** Chip showing an issue's GitHub Project status, coloured as on the board. */
export function ProjectStatusBadge({
  status,
  className
}: {
  status: ProjectStatus | null
  className?: string
}) {
  if (!status) {
    return (
      <span
        className={cn(
          "text-muted-foreground inline-flex shrink-0 items-center rounded-full border border-dashed px-2 py-0.5 text-xs font-medium whitespace-nowrap",
          className
        )}
      >
        {NO_STATUS_LABEL}
      </span>
    )
  }

  const v = statusColorVar(status.color)
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        className
      )}
      style={{
        backgroundColor: `var(${v}-bg)`,
        color: `var(${v}-fg)`,
        borderColor: `var(${v}-border)`
      }}
    >
      <span
        className="size-1.5 rounded-full"
        style={{ backgroundColor: `var(${v}-fg)` }}
        aria-hidden
      />
      {status.name}
    </span>
  )
}

