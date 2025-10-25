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
  buildCountryStackSeries,
  summarizeCountryTotals,
  type TourismCountryRecord,
  formatCount,
} from "@workspace/stats"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "../chart.tsx"
import { Button } from "../button.tsx"
import { buildStackedChartView } from "./stacked-chart-helpers.ts"

const DEFAULT_TOP_COUNTRIES = 5

const axisFormatter = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  year: "2-digit",
})

const metricOptions = [
  { id: "visitors" as const, label: "Visitors" },
  { id: "nights" as const, label: "Overnight stays" },
]

export function TourismCountryStackedChart({
  data,
  months = 12,
  top = DEFAULT_TOP_COUNTRIES,
}: {
  data: TourismCountryRecord[]
  months?: number
  top?: number
}) {
  const [metric, setMetric] = React.useState<"visitors" | "nights">(
    "visitors"
  )

  const totals = React.useMemo(
    () => summarizeCountryTotals(data, { months, metric }),
    [data, months, metric]
  )

  const defaultKeys = React.useMemo(
    () => totals.slice(0, Math.max(1, top)).map((item) => item.key),
    [totals, top]
  )

  const [selectedKeys, setSelectedKeys] = React.useState<string[]>(defaultKeys)
  const [includeOther, setIncludeOther] = React.useState(true)
  const [searchTerm, setSearchTerm] = React.useState("")

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

  const handleToggleKey = React.useCallback((key: string) => {
    setSelectedKeys((prev) => {
      const next = prev.includes(key)
        ? prev.filter((item) => item !== key)
        : [...prev, key]
      return next.length ? next : [key]
    })
  }, [])

  const normalizedSearch = searchTerm.trim().toLowerCase()

  const filteredTotals = React.useMemo(() => {
    if (!normalizedSearch) {
      return totals
    }
    return totals.filter((item) =>
      item.label.toLowerCase().includes(normalizedSearch)
    )
  }, [totals, normalizedSearch])

  const handleSelectTop = React.useCallback(
    (count: number) => {
      const source = normalizedSearch ? filteredTotals : totals
      const keys = source.slice(0, Math.max(1, count)).map((item) => item.key)
      if (keys.length) {
        setSelectedKeys(keys)
      }
    },
    [totals, filteredTotals, normalizedSearch]
  )

  const handleSelectAll = React.useCallback(() => {
    const source = normalizedSearch ? filteredTotals : totals
    const keys = source.map((item) => item.key)
    if (keys.length) {
      setSelectedKeys(keys)
    }
  }, [totals, filteredTotals, normalizedSearch])

  const others = React.useMemo(() => {
    const base = totals.filter((item) => !selectedKeys.includes(item.key))
    if (!normalizedSearch) {
      return base
    }
    return base.filter((item) =>
      item.label.toLowerCase().includes(normalizedSearch)
    )
  }, [totals, selectedKeys, normalizedSearch])

  const handlePromoteOther = React.useCallback((key: string) => {
    setSelectedKeys((prev) => (prev.includes(key) ? prev : [...prev, key]))
  }, [])

  const { chartData, keyMap, config } = React.useMemo(() => {
    const { keys, series, labelMap } = buildCountryStackSeries(data, {
      months,
      top,
      metric,
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
  }, [data, months, top, metric, includeOther, selectedKeys])

  const metricLabel = metric === "visitors" ? "visitors" : "nights"

  if (!chartData.length || !keyMap.length) {
    return (
      <ChartContainer config={config}>
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          No tourism country data available.
        </div>
      </ChartContainer>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Metric</span>
        <div className="flex gap-2 text-xs">
          {metricOptions.map((option) => {
            const active = metric === option.id
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setMetric(option.id)}
                className={
                  "rounded-full border px-3 py-1 transition-colors " +
                  (active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background hover:bg-muted")
                }
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>
      <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-muted-foreground">Select countries</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleSelectTop(top)}
            className="h-7 px-2 text-xs"
          >
            Top {top}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSelectAll}
            className="h-7 px-2 text-xs"
          >
            Select all
          </Button>
        </div>
        <input
          type="search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search countries..."
          className="h-8 w-full rounded-md border border-border bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <div className="max-h-40 overflow-y-auto rounded-md border bg-background p-2">
          <div className="grid gap-1">
            {filteredTotals.map((item) => {
              const checked = selectedKeys.includes(item.key)
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleToggleKey(item.key)}
                  className={
                    "flex w-full items-center justify-between gap-3 rounded px-2 py-1 text-left transition-colors " +
                    (checked ? "bg-primary/10 text-primary" : "hover:bg-muted")
                  }
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={
                        "h-2.5 w-2.5 rounded-full border " +
                        (checked ? "border-primary bg-primary" : "border-border")
                      }
                    />
                    <span>{item.label}</span>
                  </span>
                  <span className="font-mono text-muted-foreground">
                    {formatCount(item.total)}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            className="h-3.5 w-3.5 accent-primary"
            checked={includeOther}
            onChange={(event) => setIncludeOther(event.target.checked)}
          />
          <span className="text-muted-foreground">Show “Other” bucket</span>
        </label>
        {includeOther && others.length > 0 && (
          <div className="grid gap-2">
            <span className="font-medium text-muted-foreground">
              Promote countries from “Other” bucket
            </span>
            <div className="max-h-32 overflow-y-auto rounded-md border bg-background p-2">
              <div className="grid gap-1">
                {others.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handlePromoteOther(item.key)}
                    className="flex w-full items-center justify-between gap-3 rounded px-2 py-1 text-left transition-colors hover:bg-muted"
                  >
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full border border-border" />
                      <span>{item.label}</span>
                    </span>
                    <span className="font-mono text-muted-foreground">
                      {formatCount(item.total)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
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
            tickFormatter={(value) => formatCount(value as number)}
            width={90}
            axisLine={false}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(label: string) => label}
                formatter={(value) =>
                  value != null
                    ? `${formatCount(value as number)} ${metricLabel}`
                    : "Not reported"
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
              stackId="tourism-countries"
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
