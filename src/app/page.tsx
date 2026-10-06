import Image from "next/image"
import { AlertTriangleIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Roadmap } from "@/components/roadmap/roadmap"
import { GitHubApiError, getRepoInfo, getRoadmapData } from "@/lib/github"
import { splitReleases } from "@/lib/releases"
import type { Milestone, ProjectInfo } from "@/lib/types"

export const revalidate = 300

export default async function Home() {
  const { owner, repo } = getRepoInfo()

  let milestones: Milestone[]
  let project: ProjectInfo = { title: null, url: null, statusOptions: [], error: null }
  let loadError: string | null = null
  try {
    const data = await getRoadmapData()
    milestones = data.milestones
    project = data.project
  } catch (error) {
    loadError =
      error instanceof GitHubApiError
        ? error.message
        : "Something went wrong talking to the GitHub API."
    milestones = []
  }

  const now = new Date()
  const totalOpen = milestones.reduce((sum, m) => sum + m.openIssues, 0)
  const totalClosed = milestones.reduce((sum, m) => sum + m.closedIssues, 0)
  const { major, hotfix } = splitReleases(milestones)

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Image
            src="/opencrvs-logo.png"
            alt="OpenCRVS"
            width={28}
            height={28}
            className="size-7"
            priority
          />
          <span className="text-muted-foreground text-lg font-medium">
            OpenCRVS Core Roadmap
          </span>
        </div>
        <p className="text-muted-foreground max-w-2xl text-sm">
          A live view of every open milestone (future release) on{" "}
          <a
            href={`https://github.com/${owner}/${repo}`}
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            {owner}/{repo}
          </a>
          , plotted from six months ago through twelve months ahead. Expand a
          milestone to see the issues tracked against it.
        </p>
      </header>

      {loadError ? (
        <Card className="border-status-overdue-border bg-status-overdue-bg">
          <CardContent className="text-status-overdue-fg flex items-start gap-3 text-sm">
            <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-medium">Couldn&apos;t load milestones</p>
              <p className="mt-1">{loadError}</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <dl className="grid grid-cols-3 gap-3 sm:gap-4">
            <StatTile label="Open milestones" value={milestones.length} />
            <StatTile label="Open issues" value={totalOpen} />
            <StatTile label="Closed issues" value={totalClosed} />
          </dl>

          <section aria-labelledby="major-releases" className="flex flex-col gap-3">
            <SectionHeading
              id="major-releases"
              title="Major releases"
              count={major.length}
              description="Feature releases (X.Y). Expand a release to see each task and its status on the project board."
            />
            <Card className="py-4 sm:py-6">
              <CardContent className="overflow-x-auto px-4 sm:px-6">
                <Roadmap
                  milestones={major}
                  now={now}
                  statusOptions={project.statusOptions}
                  statusError={project.error}
                  emptyMessage="There are no open major release milestones."
                />
              </CardContent>
            </Card>
          </section>

          <section aria-labelledby="hotfix-releases" className="flex flex-col gap-3">
            <SectionHeading
              id="hotfix-releases"
              title="Hotfix and maintenance releases"
              count={hotfix.length}
              description="Patch releases (X.Y.Z) for versions already in use."
            />
            <Card className="py-3 sm:py-4">
              <CardContent className="overflow-x-auto px-4 sm:px-6">
                <Roadmap
                  milestones={hotfix}
                  now={now}
                  statusOptions={project.statusOptions}
                  statusError={project.error}
                  compact
                  showLegend={false}
                  emptyMessage="There are no open hotfix or maintenance release milestones."
                />
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  )
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-border bg-card rounded-lg border p-4">
      <dt className="text-muted-foreground text-xs font-medium">{label}</dt>
      <dd className="text-foreground mt-1 text-2xl font-semibold tabular-nums">
        {value}
      </dd>
    </div>
  )
}

function SectionHeading({
  id,
  title,
  count,
  description
}: {
  id: string
  title: string
  count: number
  description: string
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <h2 id={id} className="text-foreground flex items-baseline gap-2 text-base font-semibold">
        {title}
        <span className="text-muted-foreground text-sm font-normal tabular-nums">{count}</span>
      </h2>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  )
}
