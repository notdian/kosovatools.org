export default function WageCalculatorPage() {
  return (
    <article className="space-y-4">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Wage Calculator</h1>
        <p className="text-muted-foreground">
          Design placeholder for gross-to-net salary scenarios, contributions, and employer cost summaries.
        </p>
      </header>
      <p className="text-sm text-muted-foreground">
        Place future calculation logic in `apps/web/lib/payroll/` and export reusable inputs or tables from `packages/ui/src/components/payroll/`.
      </p>
    </article>
  )
}
