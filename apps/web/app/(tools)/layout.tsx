import { Github } from "lucide-react"

export default function ToolsLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <section className="mx-auto flex w-full max-w-[1500px] flex-col gap-8 px-6 py-12">
      {children}
      <footer className="border-t border-border/60 pt-6 text-xs text-muted-foreground sm:text-sm">
        <a
          className="inline-flex items-center gap-2 font-medium text-foreground transition hover:text-primary"
          href="https://github.com/kosovatools/kosovatools.org"
          rel="noreferrer"
          target="_blank"
        >
          <Github aria-hidden className="h-4 w-4" />
          Shih kodin burimor në GitHub
        </a>
      </footer>
    </section>
  )
}
