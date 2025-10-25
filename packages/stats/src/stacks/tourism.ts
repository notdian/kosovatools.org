import {
  buildStackSeries,
  summarizeStackTotals,
  type StackBuildResult,
  type StackSeriesRow,
  type StackTotal,
} from "../utils/stack.ts"
import { type TourismCountryRecord } from "../datasets/tourism.ts"

export type TourismMetric = "visitors" | "nights"

export type CountryStackSeries = StackSeriesRow<string>

export type CountryTotal = StackTotal<string>

export type CountryStackOptions = {
  months?: number
  top?: number
  includeOther?: boolean
  metric?: TourismMetric
  selectedKeys?: string[]
}

function accessorsForMetric(metric: TourismMetric) {
  return {
    period: (record: TourismCountryRecord) => record.period,
    key: (record: TourismCountryRecord) => record.country,
    value: (record: TourismCountryRecord) => record[metric],
  }
}

function buildOptions(
  metric: TourismMetric,
  options: CountryStackOptions = {}
) {
  return {
    months: options.months,
    top: options.top,
    includeOther: options.includeOther,
    selectedKeys: options.selectedKeys,
    labelForKey: (key: string) => key,
  }
}

const DEFAULT_METRIC: TourismMetric = "visitors"

export function summarizeCountryTotals(
  records: TourismCountryRecord[],
  {
    months = 12,
    metric = DEFAULT_METRIC,
  }: Pick<CountryStackOptions, "months" | "metric"> = {}
): CountryTotal[] {
  return summarizeStackTotals(
    records,
    accessorsForMetric(metric),
    buildOptions(metric, { months })
  )
}

export function buildCountryStackSeries(
  records: TourismCountryRecord[],
  {
    metric = DEFAULT_METRIC,
    ...options
  }: CountryStackOptions = {}
): Pick<StackBuildResult<string>, "keys" | "series" | "labelMap"> {
  const result = buildStackSeries(
    records,
    accessorsForMetric(metric),
    buildOptions(metric, options)
  )
  return {
    keys: result.keys,
    series: result.series,
    labelMap: result.labelMap,
  }
}
