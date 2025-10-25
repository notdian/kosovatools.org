export default function ToolsLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <section className="mx-auto flex w-full max-w-[1500px] flex-col gap-8 px-6 py-12">
      {children}
    </section>
  )
}
