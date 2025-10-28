import Link from "next/link"
import { ArrowLeft, Compass } from "lucide-react"

export default function ToolsLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <section className="mx-auto flex w-full max-w-[1500px] flex-col gap-6 px-6 sm:gap-8">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 py-3 text-xs text-muted-foreground sm:text-sm">
        <div className="flex items-center gap-2 font-medium text-foreground">
          <Compass aria-hidden className="h-4 w-4" />
          Kosova Tools
        </div>
        <Link
          className="inline-flex items-center gap-2 rounded-full border border-border/60 px-3 py-1 font-medium text-foreground transition hover:border-primary hover:text-primary"
          href="/#tools"
        >
          <ArrowLeft aria-hidden className="h-4 w-4" />
          Back to all tools
        </Link>
      </header>
      {children}
    </section>
  )
}
