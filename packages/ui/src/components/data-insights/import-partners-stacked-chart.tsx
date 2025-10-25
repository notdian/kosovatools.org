"use client"

import * as React from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  XAxis,
  YAxis,
} from "recharts"

import {
  buildPartnerStackSeries,
  summarizePartnerTotals,
  type TradePartnerRecord,
  formatEuro,
  formatEuroCompact,
} from "@workspace/stats"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "../chart.tsx"
import { buildStackedChartView } from "./stacked-chart-helpers.ts"
import { StackedKeySelector } from "./stacked-key-selector.tsx"

const DEFAULT_TOP_PARTNERS = 5

const axisFormatter = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  year: "2-digit",
})

export function ImportPartnersStackedChart({
  data,
  months = 12,
  top = DEFAULT_TOP_PARTNERS,
}: {
  data: TradePartnerRecord[]
  months?: number
  top?: number
}) {
  const totals = React.useMemo(
    () => summarizePartnerTotals(data, months),
    [data, months]
  )

  const defaultKeys = React.useMemo(
    () => totals.slice(0, Math.max(1, top)).map((item) => item.key),
    [totals, top]
  )

  const [selectedKeys, setSelectedKeys] = React.useState<string[]>(defaultKeys)
  const [includeOther, setIncludeOther] = React.useState(false)

  React.useEffect(() => {
    if (!totals.length) {
      setSelectedKeys([])
      return
    }
    const validKeys = new Set(totals.map((item) => item.key))
    const nextKeys = selectedKeys.filter((key) => validKeys.has(key))
    if (!nextKeys.length) {
      setSelectedKeys(defaultKeys)
    } else if (nextKeys.length !== selectedKeys.length) {
      setSelectedKeys(nextKeys)
    }
  }, [totals, defaultKeys, selectedKeys])

  const handleSelectedKeysChange = React.useCallback((keys: string[]) => {
    setSelectedKeys(keys)
  }, [])

  const handleIncludeOtherChange = React.useCallback((next: boolean) => {
    setIncludeOther(next)
  }, [])

  const { chartData, keyMap, config } = React.useMemo(() => {
    const { keys, series, labelMap } = buildPartnerStackSeries(data, {
      months,
      top,
      includeOther,
      selectedKeys,
    })

    return buildStackedChartView({
      keys,
      labelMap,
      series,
      periodFormatter: (period) =>
        axisFormatter.format(new Date(`${period}-01`)),
    })
  }, [data, months, top, includeOther, selectedKeys])

  if (!chartData.length || !keyMap.length) {
    return (
      <ChartContainer config={{}}>
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          No partner data available.
        </div>
      </ChartContainer>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <StackedKeySelector
        totals={totals}
        selectedKeys={selectedKeys}
        onSelectedKeysChange={handleSelectedKeysChange}
        topCount={top}
        formatTotal={(value) => formatEuro(value)}
        selectionLabel="Select partners"
        searchPlaceholder="Search countries..."
        includeOther={includeOther}
        onIncludeOtherChange={handleIncludeOtherChange}
        promoteLabel="Promote countries from “Other” bucket"
      />
      <ChartContainer config={config} className="h-[360px] !aspect-auto">
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="periodLabel"
            tickMargin={8}
            minTickGap={24}
            axisLine={false}
          />
          <YAxis
            tickFormatter={(value) => formatEuroCompact(value as number)}
            width={90}
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
          {keyMap.map((entry) => (
            <Area
              key={entry.id}
              type="monotone"
              dataKey={entry.id}
              stackId="partners"
              stroke={`var(--color-${entry.id})`}
              fill={`var(--color-${entry.id})`}
              fillOpacity={0.85}
              name={entry.label}
            />
          ))}
        </AreaChart>
      </ChartContainer>
    </div>
  )
}
