import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
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
            value={formatCurrency(result.grossPay)}
          />
          <SummaryItem
            label="Kontributi i punonjësit"
            value={`− ${formatCurrency(result.employeePension)}`}
          />
          <SummaryItem
            label="Tatimi në të ardhura"
            value={`− ${formatCurrency(result.incomeTax)}`}
          />
          <SummaryItem
            label="Kontributi i punëdhënësit"
            value={formatCurrency(result.employerPension)}
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
                value={`− ${formatCurrency(inverseResult.breakdown.incomeTax)}`}
              />
              <SummaryItem
                label="Pensioni i punonjësit"
                value={`− ${formatCurrency(inverseResult.breakdown.employeePension)}`}
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
