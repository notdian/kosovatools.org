"use client"

import * as React from "react"

import { Button } from "../button.tsx"
import { Checkbox } from "../checkbox.tsx"
import { Label } from "../label.tsx"

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
  excludedKeys?: string[]
  onExcludedKeysChange?: (keys: string[]) => void
  excludedSearchPlaceholder?: string
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
  promoteLabel = "Exclude entries from \u201COther\u201D bucket",
  excludedKeys: controlledExcludedKeys,
  onExcludedKeysChange,
  excludedSearchPlaceholder,
}: StackedKeySelectorProps) {
  const [searchTerm, setSearchTerm] = React.useState("")
  const [otherSearchTerm, setOtherSearchTerm] = React.useState("")
  const includeOtherId = React.useId()

  const normalizedSearch = searchTerm.trim().toLowerCase()
  const normalizedOtherSearch = otherSearchTerm.trim().toLowerCase()
  const otherDisabled = !includeOther
  const excludedKeys = controlledExcludedKeys ?? []
  const excludedSearchLabel = excludedSearchPlaceholder ?? searchPlaceholder

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
      if (!isSelected && excludedKeys.includes(key)) {
        onExcludedKeysChange?.(
          excludedKeys.filter((item) => item !== key)
        )
      }
      onSelectedKeysChange(next.length ? next : [key])
    },
    [selectedKeys, onSelectedKeysChange, excludedKeys, onExcludedKeysChange]
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
    const excludedSet = new Set(excludedKeys)
    const base = totals.filter((item) => !selectedKeys.includes(item.key))
    base.sort((a, b) => {
      const aExcluded = excludedSet.has(a.key)
      const bExcluded = excludedSet.has(b.key)
      if (aExcluded === bExcluded) return 0
      return aExcluded ? -1 : 1
    })
    return base
  }, [totals, selectedKeys, excludedKeys])

  const visibleOthers = React.useMemo(() => {
    if (!normalizedOtherSearch) {
      return others
    }
    return others.filter((item) =>
      item.label.toLowerCase().includes(normalizedOtherSearch)
    )
  }, [others, normalizedOtherSearch])

  const handleToggleExcluded = React.useCallback(
    (key: string) => {
      if (otherDisabled) {
        return
      }
      const isExcluded = excludedKeys.includes(key)
      const next = isExcluded
        ? excludedKeys.filter((item) => item !== key)
        : [...excludedKeys, key]
      onExcludedKeysChange?.(next)
    },
    [otherDisabled, excludedKeys, onExcludedKeysChange]
  )

  const handleClearExcluded = React.useCallback(() => {
    if (otherDisabled) {
      return
    }
    onExcludedKeysChange?.([])
  }, [otherDisabled, onExcludedKeysChange])

  return (
    <div className="rounded-lg border bg-muted/30 p-3 text-xs">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
        <div className="flex flex-1 flex-col gap-3">
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
        </div>
        <div
          className={
            "flex flex-1 flex-col gap-3 rounded-md border border-dashed border-border/50 p-2 transition-opacity "
          }
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id={includeOtherId}
                checked={includeOther}
                onCheckedChange={(checked) =>
                  onIncludeOtherChange(checked === true)
                }
              />
              <Label
                htmlFor={includeOtherId}
                className="cursor-pointer font-medium text-muted-foreground"
              >
                {promoteLabel}
              </Label>
            </div>
            <div
              className={
                (otherDisabled ? "opacity-60" : "opacity-100")
              }
            >
              {onExcludedKeysChange && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearExcluded}
                  className="h-7 px-2 text-xs"
                  disabled={otherDisabled || excludedKeys.length === 0}
                >
                  Unselect all
                </Button>
              )}
            </div>
            <input
              type="search"
              value={otherSearchTerm}
              onChange={(event) => setOtherSearchTerm(event.target.value)}
              placeholder={excludedSearchLabel}
              disabled={otherDisabled}
              className={
                "h-8 w-full rounded-md border border-border bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-70"
              }
            />
          </div>
          <div
            className={
              "max-h-40 overflow-y-auto rounded-md border bg-background p-2 " +
              (otherDisabled ? "pointer-events-none" : "")
            }
            aria-disabled={otherDisabled}
          >
            <div className="grid gap-1">
              {visibleOthers.map((item) => {
                const isExcluded = excludedKeys.includes(item.key)
                return (
                  <button
                    key={item.key}
                    type="button"
                    disabled={otherDisabled}
                    onClick={() => handleToggleExcluded(item.key)}
                    className={
                      "flex w-full items-center justify-between gap-3 rounded px-2 py-1 text-left transition-colors " +
                      (otherDisabled
                        ? "cursor-not-allowed opacity-70"
                        : isExcluded
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted")
                    }
                    aria-pressed={isExcluded}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={
                          "h-2.5 w-2.5 rounded-full border " +
                          (isExcluded
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
              {visibleOthers.length === 0 && (
                <span className="px-2 py-1 text-muted-foreground">
                  No entries match your search.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
