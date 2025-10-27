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
} from "@workspace/ui/components/chart";
import {
  createChromaPalette,
  type PaletteColor,
} from "@workspace/ui/lib/chart-palette";
import { cn } from "@workspace/ui/lib/utils";

import type {
  NetToGrossResult,
  TaxBreakdownEntry,
  WageCalculatorResult,
} from "../lib/wage-calculator";

export interface WageCalculatorResultsProps {
  result: WageCalculatorResult;
  inverseResult?: NetToGrossResult;
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

type SankeyLinkDatum = {
  source?: SankeyNodeDatum;
  target?: SankeyNodeDatum;
  value?: number;
  color?: string;
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
}: SankeyNodeWithLabelProps) {
  const fill = typeof payload.fill === "string" ? payload.fill : "var(--muted)";
  const amountValue =
    typeof payload.value === "number" && Number.isFinite(payload.value)
      ? Math.max(payload.value, 0)
      : undefined;
  const adjustedWidth = Math.max(width - 8, 0);
  const adjustedX = x + 4;
  const adjustedY = y - 2;
  const adjustedHeight = height + 4;
  const labelWidth = 168;
  const isSourceNode = (payload.depth ?? 0) === 0;
  const labelHorizontalPadding = 12;
  const labelX = isSourceNode
    ? x + width + labelHorizontalPadding
    : x - labelWidth - labelHorizontalPadding;
  const labelY = y - 6;
  const labelHeight = height + 12;

  return (
    <g>
      <rect
        x={adjustedX}
        y={adjustedY}
        width={adjustedWidth}
        height={adjustedHeight}
        fill={fill}
        rx={3}
        ry={3}
        style={{ cursor: "default" }}
      />
      <foreignObject
        x={labelX}
        y={labelY}
        width={labelWidth}
        height={labelHeight}
        style={{ overflow: "visible", pointerEvents: "none" }}
      >
        <div
          style={{
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            alignItems: isSourceNode ? "flex-start" : "flex-end",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            padding: "0.25rem 0.5rem",
            gap: 6,
            backgroundColor: "hsla(var(--muted), 0.35)",
            border: "1px solid hsla(var(--muted-foreground), 0.2)",
            borderRadius: 6,
            boxShadow: "0 4px 12px rgba(15, 23, 42, 0.08)",
            textAlign: isSourceNode ? "left" : "right",
          }}
        >
          {payload.name ? (
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--foreground)",
              }}
            >
              {payload.name}
            </span>
          ) : null}
          {amountValue !== undefined ? (
            <span
              style={{
                fontSize: 11,
                color: "var(--muted-foreground)",
              }}
            >
              {formatCurrency(amountValue)}
            </span>
          ) : null}
        </div>
      </foreignObject>
    </g>
  );
}

type SankeyLinkWithLabelProps = {
  sourceX: number;
  targetX: number;
  sourceY: number;
  targetY: number;
  sourceControlX: number;
  targetControlX: number;
  sourceRelativeY: number;
  targetRelativeY: number;
  linkWidth: number;
  index: number;
  payload: SankeyLinkDatum;
};

function SankeyLinkWithLabel({
  sourceX,
  targetX,
  sourceY,
  targetY,
  sourceControlX,
  targetControlX,
  linkWidth,
  payload,
}: SankeyLinkWithLabelProps) {
  const strokeColor =
    (typeof payload.color === "string" && payload.color) ||
    (typeof payload.source?.stroke === "string" && payload.source.stroke) ||
    (typeof payload.source?.fill === "string" && payload.source.fill) ||
    (typeof payload.target?.stroke === "string" && payload.target.stroke) ||
    "var(--muted-foreground)";

  return (
    <g>
      <path
        d={`
  M${sourceX},${sourceY}
  C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`}
        fill="none"
        stroke={strokeColor}
        strokeOpacity={0.4}
        strokeWidth={linkWidth}
        strokeLinecap="butt"
      />
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
                link={(linkProps) => (
                  <SankeyLinkWithLabel
                    {...linkProps}
                  />
                )}
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
