import type { Metadata } from "next"
import "@workspace/ui/globals.css"
import { Providers } from "@/components/providers"
import { ThemeToggle } from "@/components/theme-toggle"

export const metadata: Metadata = {
  metadataBase: new URL("https://kosovatools.org"),
  title: {
    default: "Kosova Tools",
    template: "%s | Kosova Tools",
  },
  description:
    "Practical tools for Kosovo residents, powered by open data.",
  openGraph: {
    type: "website",
    url: "https://kosovatools.org",
    title: "Kosova Tools",
    description:
      "Practical tools for Kosovo residents, powered by open data.",
    siteName: "Kosova Tools",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kosova Tools",
    description:
      "Practical tools for Kosovo residents, powered by open data.",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Providers>
          <ThemeToggle className="fixed right-6 top-6 z-50" />
          {children}
        </Providers>
      </body>
    </html>
  )
}
