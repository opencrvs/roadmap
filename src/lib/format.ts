const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric"
})

export function formatDate(date: Date | string): string {
  return dateFormatter.format(new Date(date))
}

export function formatRelativeDays(days: number): string {
  if (days === 0) return "today"
  if (days > 0) return `in ${days} day${days === 1 ? "" : "s"}`
  return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago`
}
