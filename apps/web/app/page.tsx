import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import {
  ArrowRight,
  BarChart3,
  Car,
  Factory,
  HandCoins,
  PackageSearch,
  Sparkles,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

type ToolCard = {
  name: string
  href: string
  description: string
  cta: string
  icon: LucideIcon
  category: string
}

const tools: ToolCard[] = [
  {
    name: "Customs Codes Explorer",
    href: "/customs-codes",
    description: "Search Kosovo's tariff schedule, compare duty rates, and calculate import obligations instantly.",
    cta: "Browse customs codes",
    icon: PackageSearch,
    category: "Trade & customs",
  },
  {
    name: "Data Insights",
    href: "/data-insights",
    description: "Visual dashboards powered by KAS datasets to understand demographics, employment, and prices.",
    cta: "See the dashboards",
    icon: BarChart3,
    category: "Statistics",
  },
  {
    name: "Car Import Taxes",
    href: "/car-import-taxes",
    description: "Estimate VAT, excise, and customs dues for vehicles imported into the Republic of Kosovo.",
    cta: "Estimate costs",
    icon: Car,
    category: "Transport",
  },
  {
    name: "Wage Calculator",
    href: "/wage-calculator",
    description: "Project your net salary after pension, income tax, and contributions based on Kosovo regulations.",
    cta: "Plan your salary",
    icon: HandCoins,
    category: "Finance",
  },
]

type RoadmapCard = {
  name: string
  description: string
  cta: string
  icon: LucideIcon
  category: string
  href?: string
  external?: boolean
}

const roadmap: RoadmapCard[] = [
  {
    name: "Business permits",
    description: "Guides for licensing, fees, and compliance steps for new ventures across Kosovo municipalities.",
    cta: "Coming soon",
    icon: Factory,
    category: "In progress",
  },
  {
    name: "More civic tools",
    description: "Help us decide what to build next—budget trackers, procurement explorers, and more.",
    cta: "Suggest an idea",
    icon: Sparkles,
    category: "Ideas",
    href: "https://github.com/kosovatools/kosovatools.org/issues/new/choose",
    external: true,
  },
]

export default function Page() {
  return (
    <main className="flex flex-col gap-24 px-6 py-16 sm:py-24">
      <section className="mx-auto flex w-full max-w-5xl flex-col items-center gap-8 text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1 text-xs font-medium uppercase tracking-wide text-primary">
          Open data for everyone
        </span>
        <div className="space-y-6">
          <h1 className="text-balance text-4xl font-semibold leading-tight sm:text-5xl">
            Practical tools for Kosovo residents, entrepreneurs, and policy makers.
          </h1>
          <p className="text-balance text-muted-foreground text-sm sm:text-lg">
            Kosova Tools brings together calculators, explorers, and dashboards so you can make informed decisions using reliable public data.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/#tools">
              Explore the tools
              <ArrowRight aria-hidden className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href="https://github.com/notdian/kosovatools.org" rel="noreferrer" target="_blank">
              Contribute on GitHub
            </a>
          </Button>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-10" id="tools">
        <header className="flex flex-col gap-3 text-center sm:text-left">
          <span className="text-xs font-semibold uppercase tracking-wide text-primary">Current lineup</span>
          <h2 className="text-3xl font-semibold sm:text-4xl">Citizen tools ready to use today</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            Each tool is crafted with bilingual interfaces, accurate calculations, and up-to-date references from Kosovo institutions.
          </p>
        </header>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {tools.map((tool) => {
            const Icon = tool.icon

            return (
              <Card key={tool.name} className="h-full border-border/70 pb-0">
                <CardHeader className="gap-4">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full border border-border/70 px-3 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {tool.category}
                    </span>
                    <Icon aria-hidden className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-xl font-semibold leading-tight">{tool.name}</CardTitle>
                  <CardDescription className="text-sm">{tool.description}</CardDescription>
                </CardHeader>
                <CardContent className="pb-6">
                  <Button asChild className="w-full" variant="secondary">
                    <Link href={tool.href}>
                      {tool.cta}
                      <ArrowRight aria-hidden className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      <section
        aria-labelledby="how-it-works-title"
        className="mx-auto flex w-full max-w-5xl flex-col gap-10 rounded-3xl border border-border/60 bg-card/60 px-8 py-12 backdrop-blur"
        id="how-it-works"
      >
        <div className="space-y-3 text-center sm:text-left">
          <span className="text-xs font-semibold uppercase tracking-wide text-primary">Why it matters</span>
          <h2 id="how-it-works-title" className="text-3xl font-semibold sm:text-4xl">
            Built for clarity, maintained in the open
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            Every feature is documented, transparent, and grounded in the latest legal frameworks. You always know which dataset feeds your decisions.
          </p>
        </div>
        <dl className="grid gap-6 sm:grid-cols-3">
          <div className="space-y-2 rounded-2xl bg-background/70 p-5 shadow-sm">
            <dt className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Verified sources</dt>
            <dd className="text-sm text-muted-foreground">
              Updated directly from Kosovo Customs, Tax Administration, and the Kosovo Agency of Statistics.
            </dd>
          </div>
          <div className="space-y-2 rounded-2xl bg-background/70 p-5 shadow-sm">
            <dt className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Transparent math</dt>
            <dd className="text-sm text-muted-foreground">
              Calculations reference published formulas so you can validate every assumption and rate change.
            </dd>
          </div>
          <div className="space-y-2 rounded-2xl bg-background/70 p-5 shadow-sm">
            <dt className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Accessible design</dt>
            <dd className="text-sm text-muted-foreground">
              Interfaces adapt to Albanian and English, keyboard navigation, and dark mode out of the box.
            </dd>
          </div>
        </dl>
      </section>

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-10" id="about">
        <header className="flex flex-col gap-3 text-center sm:text-left">
          <span className="text-xs font-semibold uppercase tracking-wide text-primary">Roadmap</span>
          <h2 className="text-3xl font-semibold sm:text-4xl">More public-interest tools on the way</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            We collaborate with civic organizations and independent developers to grow the platform. Here is what we are planning next.
          </p>
        </header>
        <div className="grid gap-6 md:grid-cols-2">
          {roadmap.map((entry) => {
            const Icon = entry.icon
            const actionable = Boolean(entry.href)

            return (
              <Card key={entry.name} className="h-full border-dashed border-border/60 bg-background/60">
                <CardHeader className="gap-4">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full border border-border/60 px-3 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {entry.category}
                    </span>
                    <Icon aria-hidden className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-2xl font-semibold leading-tight">{entry.name}</CardTitle>
                  <CardDescription className="text-sm">{entry.description}</CardDescription>
                </CardHeader>
                <CardContent className="pb-6">
                  {actionable ? (
                    <Button asChild className="w-full" variant="secondary">
                      {entry.external ? (
                        <a href={entry.href} rel="noreferrer" target="_blank">
                          {entry.cta}
                          <ArrowRight aria-hidden className="ml-2 h-4 w-4" />
                        </a>
                      ) : (
                        <Link href={entry.href!}>
                          {entry.cta}
                          <ArrowRight aria-hidden className="ml-2 h-4 w-4" />
                        </Link>
                      )}
                    </Button>
                  ) : (
                    <Button className="w-full" disabled variant="outline">
                      {entry.cta}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>
    </main>
  )
}
