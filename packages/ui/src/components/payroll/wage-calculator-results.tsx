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
import {
  createChromaPalette,
  type PaletteColor,
} from "../../lib/chart-palette";
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
  taxableIncome: number;
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

type SankeyNodeDatum = {
  name?: string;
  value?: number;
  depth?: number;
  fill?: string;
  stroke?: string;
  [key: string]: unknown;
};

type SankeyNodeWithLabelProps = {
  x: number;
  y: number;
  width: number;
  height: number;
  index: number;
  payload: SankeyNodeDatum;
  formatCurrency: (value: number) => string;
} & Record<string, unknown>;

function SankeyNodeWithLabel({
  x,
  y,
  width,
  height,
  payload,
  formatCurrency,
  index: _index,
  ...rest
}: SankeyNodeWithLabelProps) {
  const fill = typeof payload.fill === "string" ? payload.fill : "var(--muted)";
  const stroke =
    typeof payload.stroke === "string"
      ? payload.stroke
      : typeof payload.fill === "string"
        ? payload.fill
        : "var(--muted)";
  const amountValue =
    typeof payload.value === "number" && Number.isFinite(payload.value)
      ? Math.max(payload.value, 0)
      : undefined;
  const depth = typeof payload.depth === "number" ? payload.depth : 0;
  const labelOffset = 12;
  const hasInnerSpace = width >= 96;
  const isLeftAligned = depth <= 1;
  const baseX = hasInnerSpace
    ? x + width / 2
    : isLeftAligned
      ? x - labelOffset
      : x + width + labelOffset;
  const textAnchor = hasInnerSpace ? "middle" : isLeftAligned ? "end" : "start";
  const centerY = y + height / 2;
  const amountX = hasInnerSpace ? baseX : x + width / 2;
  const amountAnchor = hasInnerSpace ? textAnchor : "middle";
  const amountY = hasInnerSpace ? centerY + 14 : y + height + 12;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fill}
        fillOpacity={0.9}
        stroke={stroke}
        strokeWidth={1}
        rx={4}
        ry={4}
        style={{ cursor: "default" }}
        {...(rest as React.SVGProps<SVGRectElement>)}
      />
      {payload.name ? (
        <text
          x={baseX}
          y={centerY}
          textAnchor={textAnchor}
          dominantBaseline="middle"
          fontSize={12}
          fontWeight={600}
          fill="var(--foreground)"
        >
          {payload.name}
        </text>
      ) : null}
      {amountValue !== undefined ? (
        <text
          x={amountX}
          y={amountY}
          textAnchor={amountAnchor}
          dominantBaseline="middle"
          fontSize={11}
          fill="var(--muted-foreground)"
        >
          {formatCurrency(amountValue)}
        </text>
      ) : null}
    </g>
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
  const fallbackPalette = React.useMemo<PaletteColor[]>(
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

  const fallbackColor = React.useMemo<PaletteColor>(
    () => fallbackPalette[0] ?? { light: "#0ea5e9", dark: "#38bdf8" },
    [fallbackPalette],
  );

  const resolveColor = React.useCallback(
    (index: number) =>
      palette[index] ?? fallbackPalette[index] ?? fallbackColor,
    [palette, fallbackPalette, fallbackColor],
  );

  const chartConfig = React.useMemo<ChartConfig>(() => {
    return {
      gross: {
        label: "Pagë bruto",
        theme: {
          light: resolveColor(0).light,
          dark: resolveColor(0).dark,
        },
      },
      employeePension: {
        label: "Kontributi i punonjësit",
        theme: {
          light: resolveColor(1).light,
          dark: resolveColor(1).dark,
        },
      },
      incomeTax: {
        label: "Tatimi në të ardhura",
        theme: {
          light: resolveColor(2).light,
          dark: resolveColor(2).dark,
        },
      },
      net: {
        label: "Pagë neto",
        theme: {
          light: resolveColor(3).light,
          dark: resolveColor(3).dark,
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
      { name: "Pagë bruto", key: "gross" as const },
      { name: "Pagë neto", key: "net" as const },
      { name: "Tatimi në të ardhura", key: "incomeTax" as const },
      { name: "Kontributi i punonjësit", key: "employeePension" as const },
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
        value: sanitizedNetPay,
        color: "var(--color-net)",
      },
      {
        source: 0,
        target: 2,
        value: sanitizedIncomeTax,
        color: "var(--color-incomeTax)",
      },
      {
        source: 0,
        target: 3,
        value: sanitizedEmployeePension,
        color: "var(--color-employeePension)",
      },
    ].filter((link) => link.value > 0);
  }, [sanitizedEmployeePension, sanitizedIncomeTax, sanitizedNetPay]);

  const hasFlow = sankeyLinks.length > 0;

  return (
    <Card className={cn("h-full", className)}>
      <CardHeader>
        <CardTitle>Përmbledhja mujore</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div>
          <p className="text-sm text-muted-foreground">
            Pagë neto e llogaritur
          </p>
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
            <p className="text-sm font-medium">
              Vizualizimi i rrjedhës së pagës
            </p>
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
                link={{
                  strokeOpacity: 0.5,
                  strokeWidth: 24,
                  cursor: "default",
                }}
                node={(nodeProps) => (
                  <SankeyNodeWithLabel
                    {...nodeProps}
                    formatCurrency={formatCurrency}
                  />
                )}
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

                        return [
                          formatCurrency(Math.max(numericValue, 0)),
                          label,
                        ];
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
              Pas kontributit të punonjësit në Trust:{" "}
              {formatCurrency(result.taxableIncome)}
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
                    <th className="px-3 py-2 text-right font-medium">Tatimi</th>
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
                Për të marrë {formatCurrency(inverseResult.targetNetPay)} neto,
                ju duhet një pagë bruto rreth{" "}
                {formatCurrency(inverseResult.estimatedGrossPay)}.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <SummaryItem
                label="Tatimi i pritur"
                value={formatCurrency(clamp(inverseResult.breakdown.incomeTax))}
              />
              <SummaryItem
                label="Pensioni i punonjësit"
                value={formatCurrency(
                  clamp(inverseResult.breakdown.employeePension),
                )}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Diferenca ndaj netos së synuar:{" "}
              {formatCurrency(Math.abs(inverseResult.differenceFromTarget))}{" "}
              {inverseResult.differenceFromTarget >= 0 ? "më shumë" : "më pak"}.
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export { WageCalculatorResults };
