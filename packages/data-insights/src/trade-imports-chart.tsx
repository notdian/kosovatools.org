"use client"

import * as React from "react"
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts"

import {
  formatEuro,
  formatEuroCompact,
  type TradeImportRecord,
} from "@workspace/stats"

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@workspace/ui/components/chart"
import { createChromaPalette } from "@workspace/ui/lib/chart-palette"

const [importsColor] = createChromaPalette(1)

const chartConfig: ChartConfig = {
  imports_eur: {
    label: "Imports (EUR)",
    theme: {
      light: importsColor?.light ?? "#6d4dd3",
      dark: importsColor?.dark ?? "#9a78ff",
    },
  },
}

const axisFormatter = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  year: "2-digit",
})

export function TradeImportsChart({
  data,
  months = 24,
}: {
  data: TradeImportRecord[]
  months?: number
}) {
  const chartClassName = "w-full aspect-[4/3] sm:aspect-video"

  const series = React.useMemo(() => {
    const points = data
      .slice()
      .sort((a, b) => a.period.localeCompare(b.period))
      .slice(-months)
      .map((row) => ({
        ...row,
        periodLabel: axisFormatter.format(new Date(`${row.period}-01`)),
      }))

    return points
  }, [data, months])

  if (!series.length) {
    return (
      <ChartContainer config={chartConfig} className={chartClassName}>
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          No trade import data available.
        </div>
      </ChartContainer>
    )
  }

  return (
    <ChartContainer config={chartConfig} className={chartClassName}>
      <LineChart data={series}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="periodLabel"
          tickMargin={8}
          minTickGap={24}
          axisLine={false}
        />
        <YAxis
          tickFormatter={(value) => formatEuroCompact(value as number)}
          width={80}
          axisLine={false}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(label: string) => label}
              formatter={(value) =>
                value != null ? formatEuro(value as number) : "Not reported"
              }
            />
          }
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="imports_eur"
          stroke="var(--color-imports_eur)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ChartContainer>
  )
}
