import Link from "next/link"

import { Button } from "@workspace/ui/components/button"

export default function Page() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-background px-6 py-20">
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-6 text-center">
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-primary">
          Kosova Tools
        </span>
        <h1 className="text-balance text-4xl font-semibold sm:text-5xl">
          Practical tools for Kosovo residents, powered by open data.
        </h1>
        <p className="text-balance text-sm text-muted-foreground sm:text-base">
          Explore customs codes, estimate take-home pay, and visualize Republic of Kosovo statistics
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/customs-codes">Browse customs codes</Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link href="/data-insights">See data insights</Link>
          </Button>
          <Button asChild size="lg" variant="ghost">
            <Link href="/wage-calculator">Plan your salary</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
