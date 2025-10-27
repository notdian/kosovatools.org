import * as React from "react";
import { Sankey } from "recharts";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "../chart";
import { createChromaPalette } from "../../lib/chart-palette";
import { cn } from "@workspace/ui/lib/utils";

type TaxBreakdownEntry = {
  label: string;
  appliedAmount: number;
  rate: number;
  taxAmount: number;
};

type WageCalculatorResultsData = {
  grossPay: number;
  employeePension: number;
  employerPension: number;
  taxableIncomeBeforeAllowance: number;
  taxableIncomeAfterAllowance: number;
  incomeTax: number;
  incomeTaxBreakdown: TaxBreakdownEntry[];
  netPay: number;
  employerTotalCost: number;
  effectiveTaxRate: number;
};

type NetToGrossResultsData = {
  targetNetPay: number;
  estimatedGrossPay: number;
  differenceFromTarget: number;
  breakdown: WageCalculatorResultsData;
};

export interface WageCalculatorResultsProps {
  result: WageCalculatorResultsData;
  inverseResult?: NetToGrossResultsData;
  formatCurrency: (value: number) => string;
  formatPercentage: (value: number) => string;
  className?: string;
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

function WageCalculatorResults({
  result,
  inverseResult,
  formatCurrency,
  formatPercentage,
  className,
}: WageCalculatorResultsProps) {
  const hasTax = result.incomeTaxBreakdown.length > 0;
  const showInverse =
    inverseResult !== undefined && inverseResult.targetNetPay > 0;

  const palette = React.useMemo(() => createChromaPalette(6), []);
  const fallbackPalette = React.useMemo(
    () => [
      { light: "#0ea5e9", dark: "#38bdf8" },
      { light: "#2563eb", dark: "#60a5fa" },
      { light: "#16a34a", dark: "#4ade80" },
      { light: "#f97316", dark: "#fb923c" },
      { light: "#dc2626", dark: "#f87171" },
      { light: "#9333ea", dark: "#c084fc" },
    ],
    [],
  );

  const resolveColor = React.useCallback(
    (index: number) => palette[index] ?? fallbackPalette[index] ?? fallbackPalette[0],
    [palette, fallbackPalette],
  );

  const chartConfig = React.useMemo<ChartConfig>(() => {
    return {
      total: {
        label: "Kosto totale për punëdhënësin",
        theme: {
          light: resolveColor(0).light,
          dark: resolveColor(0).dark,
        },
      },
      gross: {
        label: "Pagë bruto",
        theme: {
          light: resolveColor(1).light,
          dark: resolveColor(1).dark,
        },
      },
      employerPension: {
        label: "Kontributi i punëdhënësit",
        theme: {
          light: resolveColor(2).light,
          dark: resolveColor(2).dark,
        },
      },
      employeePension: {
        label: "Kontributi i punonjësit",
        theme: {
          light: resolveColor(3).light,
          dark: resolveColor(3).dark,
        },
      },
      incomeTax: {
        label: "Tatimi në të ardhura",
        theme: {
          light: resolveColor(4).light,
          dark: resolveColor(4).dark,
        },
      },
      net: {
        label: "Pagë neto",
        theme: {
          light: resolveColor(5).light,
          dark: resolveColor(5).dark,
        },
      },
    } satisfies ChartConfig;
  }, [resolveColor]);

  const clamp = React.useCallback((value: number) => {
    if (!Number.isFinite(value)) {
      return 0;
    }

    return Math.max(value, 0);
  }, []);

  const sanitizedGross = clamp(result.grossPay);
  const sanitizedEmployeePension = clamp(result.employeePension);
  const sanitizedEmployerPension = clamp(result.employerPension);
  const sanitizedIncomeTax = clamp(result.incomeTax);
  const sanitizedNetPay = clamp(result.netPay);

  const sankeyNodes = React.useMemo(() => {
    return [
      { name: "Kosto totale për punëdhënësin", key: "total" as const },
      { name: "Pagë bruto", key: "gross" as const },
      { name: "Kontributi i punëdhënësit", key: "employerPension" as const },
      { name: "Kontributi i punonjësit", key: "employeePension" as const },
      { name: "Tatimi në të ardhura", key: "incomeTax" as const },
      { name: "Pagë neto", key: "net" as const },
    ].map((node) => ({
      name: node.name,
      fill: `var(--color-${node.key})`,
      stroke: `var(--color-${node.key})`,
    }));
  }, []);

  const sankeyLinks = React.useMemo(() => {
    return [
      {
        source: 0,
        target: 1,
        value: sanitizedGross,
        color: "var(--color-gross)",
      },
      {
        source: 0,
        target: 2,
        value: sanitizedEmployerPension,
        color: "var(--color-employerPension)",
      },
      {
        source: 1,
        target: 3,
        value: sanitizedEmployeePension,
        color: "var(--color-employeePension)",
      },
      {
        source: 1,
        target: 4,
        value: sanitizedIncomeTax,
        color: "var(--color-incomeTax)",
      },
      {
        source: 1,
        target: 5,
        value: sanitizedNetPay,
        color: "var(--color-net)",
      },
    ].filter((link) => link.value > 0);
  }, [
    sanitizedGross,
    sanitizedEmployerPension,
    sanitizedEmployeePension,
    sanitizedIncomeTax,
    sanitizedNetPay,
  ]);

  const hasFlow = sankeyLinks.length > 0;

  return (
    <Card className={cn("h-full", className)}>
      <CardHeader>
        <CardTitle>Përmbledhja mujore</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div>
          <p className="text-sm text-muted-foreground">Pagë neto e llogaritur</p>
          <p className="text-3xl font-semibold">
            {formatCurrency(result.netPay)}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <SummaryItem
            label="Pagë bruto"
            value={formatCurrency(sanitizedGross)}
          />
          <SummaryItem
            label="Kontributi i punonjësit"
            value={formatCurrency(sanitizedEmployeePension)}
          />
          <SummaryItem
            label="Tatimi në të ardhura"
            value={formatCurrency(sanitizedIncomeTax)}
          />
          <SummaryItem
            label="Kontributi i punëdhënësit"
            value={formatCurrency(sanitizedEmployerPension)}
          />
          <SummaryItem
            label="Kosto totale për punëdhënësin"
            value={formatCurrency(result.employerTotalCost)}
          />
          <SummaryItem
            label="Norma efektive e tatimit"
            value={formatPercentage(result.effectiveTaxRate)}
          />
        </div>
        <div className="space-y-2">
          <div>
            <p className="text-sm font-medium">Vizualizimi i rrjedhës së pagës</p>
            <p className="text-xs text-muted-foreground">
              Shihni se si shpërndahet kostoja totale midis Trustit, tatimit dhe
              pagës neto.
            </p>
          </div>
          {hasFlow ? (
            <ChartContainer
              config={chartConfig}
              className="h-[260px] !aspect-auto"
            >
              <Sankey
                data={{ nodes: sankeyNodes, links: sankeyLinks }}
                nodePadding={24}
                nodeWidth={18}
                iterations={32}
                margin={{ top: 12, bottom: 12, left: 8, right: 8 }}
                linkCurvature={0.45}
                link={{ strokeOpacity: 0.5, strokeWidth: 24, cursor: "default" }}
                node={{ cursor: "default" }}
              >
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      indicator="dot"
                      labelFormatter={() => "Rrjedha e pagës"}
                      formatter={(value, _name, entry) => {
                        const numericValue =
                          typeof value === "number"
                            ? value
                            : Number.parseFloat(String(value ?? 0));
                        const payload = entry?.payload as
                          | {
                              source?: { name?: string };
                              target?: { name?: string };
                              name?: string;
                            }
                          | undefined;
                        const sourceName = payload?.source?.name;
                        const targetName = payload?.target?.name;
                        const label =
                          sourceName && targetName
                            ? `${sourceName} → ${targetName}`
                            : payload?.name || "Rrjedha";

                        return [formatCurrency(Math.max(numericValue, 0)), label];
                      }}
                    />
                  }
                />
              </Sankey>
            </ChartContainer>
          ) : (
            <p className="text-xs text-muted-foreground">
              Plotësoni të dhënat për të parë vizualizimin e rrjedhës së pagës.
            </p>
          )}
        </div>
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium">Të ardhurat e tatueshme</p>
            <p className="text-sm text-muted-foreground">
              Para përjashtimit: {formatCurrency(result.taxableIncomeBeforeAllowance)} ·
              Pas përjashtimit: {formatCurrency(result.taxableIncomeAfterAllowance)}
            </p>
          </div>
          {hasTax ? (
            <div className="overflow-hidden rounded-lg border">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">
                      Shkalla e tatimit
                    </th>
                    <th className="px-3 py-2 text-right font-medium">
                      Shuma e tatueshme
                    </th>
                    <th className="px-3 py-2 text-right font-medium">Norma</th>
                    <th className="px-3 py-2 text-right font-medium">
                      Tatimi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {result.incomeTaxBreakdown.map((entry) => (
                    <tr key={entry.label}>
                      <td className="px-3 py-2 text-left">{entry.label}</td>
                      <td className="px-3 py-2 text-right">
                        {formatCurrency(entry.appliedAmount)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatPercentage(entry.rate)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatCurrency(entry.taxAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Me këto të dhëna nuk ka detyrim tatimor.
            </p>
          )}
        </div>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            Kontributet minimale të pensionit janë 5% nga punonjësi dhe 5% nga
            punëdhënësi (totali 10%). Edhe nëse futni më pak, përllogaritja
            zbaton këtë minimum ligjor.
          </p>
        </div>
        {showInverse ? (
          <div className="space-y-3 rounded-lg border p-4">
            <div>
              <p className="text-sm font-medium text-foreground">
                Neto në bruto
              </p>
              <p className="text-sm text-muted-foreground">
                Për të marrë {formatCurrency(inverseResult.targetNetPay)} neto, ju
                duhet një pagë bruto rreth {" "}
                {formatCurrency(inverseResult.estimatedGrossPay)}.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <SummaryItem
                label="Tatimi i pritur"
                value={formatCurrency(
                  clamp(inverseResult.breakdown.incomeTax),
                )}
              />
              <SummaryItem
                label="Pensioni i punonjësit"
                value={formatCurrency(
                  clamp(inverseResult.breakdown.employeePension),
                )}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Diferenca ndaj netos së synuar: {formatCurrency(Math.abs(inverseResult.differenceFromTarget))}
              {" "}
              {inverseResult.differenceFromTarget >= 0 ? "më shumë" : "më pak"}.
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export { WageCalculatorResults };
