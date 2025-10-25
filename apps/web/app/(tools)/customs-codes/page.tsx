export default function CustomsCodesPage() {
  return (
    <article className="space-y-4">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Customs Codes</h1>
        <p className="text-muted-foreground">
          Upcoming directories for HS and TARIC references, duty calculators, and import guidance tailored for Kosovo.
        </p>
      </header>
      <p className="text-sm text-muted-foreground">
        To contribute, stage data loaders under `apps/web/lib/customs-codes/` and UI components inside `packages/ui/src/components/customs-codes/`.
      </p>
    </article>
  )
}
