"use client";

import { useMemo, useState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  WageCalculatorInputs,
  type WageCalculatorInputsProps,
  WageCalculatorResults,
  type CalculationMode,
  calculateGrossFromNet,
  calculateWageBreakdown,
  type JobType,
} from "@workspace/payroll";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

const percentageFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

const DEFAULT_VALUES: Pick<
  WageCalculatorInputsProps,
  | "grossPay"
  | "targetNetPay"
  | "employeePensionRate"
  | "employerPensionRate"
  | "jobType"
> = {
  grossPay: 650,
  targetNetPay: 550,
  employeePensionRate: 5,
  employerPensionRate: 5,
  jobType: "primary",
};

const DEFAULT_MODE: CalculationMode = "grossToNet";

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function formatPercentage(value: number) {
  return percentageFormatter.format(value);
}

export function WageCalculatorClient() {
  const [mode, setMode] = useState<CalculationMode>(DEFAULT_MODE);
  const [grossPay, setGrossPay] = useState(DEFAULT_VALUES.grossPay);
  const [targetNetPay, setTargetNetPay] = useState(DEFAULT_VALUES.targetNetPay);
  const [employeePensionRate, setEmployeePensionRate] = useState(
    DEFAULT_VALUES.employeePensionRate,
  );
  const [employerPensionRate, setEmployerPensionRate] = useState(
    DEFAULT_VALUES.employerPensionRate,
  );
  const [jobType, setJobType] = useState<JobType>(DEFAULT_VALUES.jobType);

  const grossBreakdown = useMemo(
    () =>
      calculateWageBreakdown({
        grossPay,
        employeePensionRate,
        employerPensionRate,
        jobType,
      }),
    [grossPay, employeePensionRate, employerPensionRate, jobType],
  );

  const inverseBreakdown = useMemo(
    () =>
      calculateGrossFromNet({
        targetNetPay,
        employeePensionRate,
        employerPensionRate,
        jobType,
      }),
    [targetNetPay, employeePensionRate, employerPensionRate, jobType],
  );

  const activeResult =
    mode === "grossToNet" ? grossBreakdown : inverseBreakdown.breakdown;

  return (
    <article className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Kalkulatori i pagave në Kosovë
        </h1>
        <p className="text-muted-foreground">
          Llogarit pagën neto dhe bruto duke marrë parasysh Trustin e Kursimeve
          të Kosovës dhe tatimin mbi të ardhurat.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Shënoni të dhënat e pagës</CardTitle>
            <CardDescription>
              Zgjidhni nëse po nisni nga paga bruto apo nga paga neto dhe më pas
              përshtatni kontributet në pension sipas nevojës.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WageCalculatorInputs
              mode={mode}
              grossPay={grossPay}
              targetNetPay={targetNetPay}
              employeePensionRate={employeePensionRate}
              employerPensionRate={employerPensionRate}
              jobType={jobType}
              onModeChange={setMode}
              onGrossPayChange={setGrossPay}
              onTargetNetPayChange={setTargetNetPay}
              onEmployeePensionRateChange={setEmployeePensionRate}
              onEmployerPensionRateChange={setEmployerPensionRate}
              onJobTypeChange={setJobType}
            />
          </CardContent>
        </Card>

        <WageCalculatorResults
          result={activeResult}
          inverseResult={mode === "netToGross" ? inverseBreakdown : undefined}
          formatCurrency={formatCurrency}
          formatPercentage={formatPercentage}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Si funksionon tatimi mbi pagat në Kosovë</CardTitle>
          <CardDescription>
            Rregullat më poshtë përmbledhin legjislacionin aktual. Për raste të
            veçanta konsultohuni me punëdhënësin ose me Administratën Tatimore
            të Kosovës.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            Punëdhënësi dhe punonjësi kontribuojnë secili të paktën 5% të pagës
            bruto në Trustin e Kursimeve të Kosovës. Totali minimal është 10%.
            Kontributi i punonjësit zbritet përpara tatimit, prandaj tatimi mbi
            të ardhurat llogaritet pasi hiqet kjo shumë nga paga bruto.
          </p>
          <p>
            Tatimi progresiv mbi pagat në Kosovë zbatohet sipas kufijve mujorë:
            0% për €0–€250, 8% për pjesën €250.01–€450 dhe 10% për çdo shumë mbi
            €450. Kalkulatori i aplikon automatikisht këto shkallë mbi të
            ardhurat e tatueshme pas kontributit të punonjësit në Trust.
          </p>
          <p>
            Të ardhurat nga punësimi sekondar tatohen me normë fikse 10% dhe nuk
            përfitojnë nga shkallët progresive të punësimit kryesor. Kalkulatori
            e aplikon këtë automatikisht kur e ndryshoni llojin e punësimit.
            Kontributet e punëdhënësit shfaqen për transparencë, por nuk zbriten
            nga paga juaj neto.
          </p>
        </CardContent>
      </Card>
    </article>
  );
}
