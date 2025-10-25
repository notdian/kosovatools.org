"use client"

import * as React from "react"

import { Button } from "../button.tsx"

export type StackedKeyTotal = {
  key: string
  label: string
  total: number
}

export type StackedKeySelectorProps = {
  totals: StackedKeyTotal[]
  selectedKeys: string[]
  onSelectedKeysChange: (keys: string[]) => void
  topCount: number
  formatTotal: (value: number) => string
  selectionLabel: string
  searchPlaceholder: string
  includeOther: boolean
  onIncludeOtherChange: (next: boolean) => void
  promoteLabel?: string
}

export function StackedKeySelector({
  totals,
  selectedKeys,
  onSelectedKeysChange,
  topCount,
  formatTotal,
  selectionLabel,
  searchPlaceholder,
  includeOther,
  onIncludeOtherChange,
  promoteLabel = "Promote entries from \u201COther\u201D bucket",
}: StackedKeySelectorProps) {
  const [searchTerm, setSearchTerm] = React.useState("")

  const normalizedSearch = searchTerm.trim().toLowerCase()

  const filteredTotals = React.useMemo(() => {
    if (!normalizedSearch) {
      return totals
    }
    return totals.filter((item) =>
      item.label.toLowerCase().includes(normalizedSearch)
    )
  }, [totals, normalizedSearch])

  const handleToggleKey = React.useCallback(
    (key: string) => {
      const isSelected = selectedKeys.includes(key)
      const next = isSelected
        ? selectedKeys.filter((item) => item !== key)
        : [...selectedKeys, key]
      onSelectedKeysChange(next.length ? next : [key])
    },
    [selectedKeys, onSelectedKeysChange]
  )

  const handleSelectTop = React.useCallback(() => {
    const source = normalizedSearch ? filteredTotals : totals
    const next = source
      .slice(0, Math.max(1, topCount))
      .map((item) => item.key)
    if (next.length) {
      onSelectedKeysChange(next)
    }
  }, [filteredTotals, normalizedSearch, onSelectedKeysChange, topCount, totals])

  const handleSelectAll = React.useCallback(() => {
    const source = normalizedSearch ? filteredTotals : totals
    const next = source.map((item) => item.key)
    if (next.length) {
      onSelectedKeysChange(next)
    }
  }, [filteredTotals, normalizedSearch, onSelectedKeysChange, totals])

  const others = React.useMemo(() => {
    return totals.filter((item) => !selectedKeys.includes(item.key))
  }, [totals, selectedKeys])

  const visibleOthers = React.useMemo(() => {
    if (!normalizedSearch) {
      return others
    }
    return others.filter((item) =>
      item.label.toLowerCase().includes(normalizedSearch)
    )
  }, [others, normalizedSearch])

  const handlePromoteOther = React.useCallback(
    (key: string) => {
      if (selectedKeys.includes(key)) {
        return
      }
      onSelectedKeysChange([...selectedKeys, key])
    },
    [onSelectedKeysChange, selectedKeys]
  )

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-muted-foreground">{selectionLabel}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSelectTop}
          className="h-7 px-2 text-xs"
        >
          Top {topCount}
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
        placeholder={searchPlaceholder}
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
                      (checked
                        ? "border-primary bg-primary"
                        : "border-border")
                    }
                  />
                  <span>{item.label}</span>
                </span>
                <span className="font-mono text-muted-foreground">
                  {formatTotal(item.total)}
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
          onChange={(event) => onIncludeOtherChange(event.target.checked)}
        />
        <span className="text-muted-foreground">Show “Other” bucket</span>
      </label>
      {includeOther && visibleOthers.length > 0 && (
        <div className="grid gap-2">
          <span className="font-medium text-muted-foreground">{promoteLabel}</span>
          <div className="max-h-32 overflow-y-auto rounded-md border bg-background p-2">
            <div className="grid gap-1">
              {visibleOthers.map((item) => (
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
                    {formatTotal(item.total)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
