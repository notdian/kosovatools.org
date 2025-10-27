import * as React from "react";

import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { cn } from "@workspace/ui/lib/utils";

type JobType = "primary" | "secondary";

export type CalculationMode = "grossToNet" | "netToGross";

export interface WageCalculatorInputsProps {
  mode: CalculationMode;
  grossPay: number;
  targetNetPay: number;
  employerPensionRate: number;
  employeePensionRate: number;
  jobType: JobType;
  onModeChange: (value: CalculationMode) => void;
  onGrossPayChange: (value: number) => void;
  onTargetNetPayChange: (value: number) => void;
  onEmployeePensionRateChange: (value: number) => void;
  onEmployerPensionRateChange: (value: number) => void;
  onJobTypeChange: (value: JobType) => void;
}

function WageCalculatorInputs({
  mode,
  grossPay,
  targetNetPay,
  employeePensionRate,
  employerPensionRate,
  jobType,
  onModeChange,
  onGrossPayChange,
  onTargetNetPayChange,
  onEmployeePensionRateChange,
  onEmployerPensionRateChange,
  onJobTypeChange,
}: WageCalculatorInputsProps) {
  const handleNumberChange = (
    callback: (value: number) => void,
  ): React.ChangeEventHandler<HTMLInputElement> => {
    return (event) => {
      const parsedValue = Number.parseFloat(event.target.value);
      callback(Number.isFinite(parsedValue) ? parsedValue : 0);
    };
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Zgjidhni llogaritjen
        </Label>
        <div className="grid grid-cols-1 gap-2 sm:max-w-md sm:grid-cols-2">
          {[
            {
              value: "grossToNet" as CalculationMode,
              label: "Nga bruto në neto",
              description: "Futni pagën bruto për të parë pagën neto.",
            },
            {
              value: "netToGross" as CalculationMode,
              label: "Nga neto në bruto",
              description:
                "Futni pagën neto të synuar për të gjetur pagën bruto.",
            },
          ].map((option) => {
            const isActive = mode === option.value;

            return (
              <button
                key={option.value}
                type="button"
                className={cn(
                  "rounded-lg border px-4 py-3 text-left text-sm transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  isActive
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/60 bg-muted/40 text-foreground",
                )}
                onClick={() => onModeChange(option.value)}
              >
                <span className="block font-medium">{option.label}</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {option.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      {mode === "grossToNet" ? (
        <div className="grid gap-2">
          <Label htmlFor="gross-pay">Pagë bruto mujore (€)</Label>
          <Input
            id="gross-pay"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={Number.isFinite(grossPay) ? grossPay : 0}
            onChange={handleNumberChange(onGrossPayChange)}
          />
          <p className="text-xs text-muted-foreground">
            Shkruani pagën bruto mujore për të llogaritur pagën neto pas tatimit
            dhe Trustit.
          </p>
        </div>
      ) : (
        <div className="grid gap-2">
          <Label htmlFor="net-target">Pagë neto e synuar (€)</Label>
          <Input
            id="net-target"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={Number.isFinite(targetNetPay) ? targetNetPay : 0}
            onChange={handleNumberChange(onTargetNetPayChange)}
          />
          <p className="text-xs text-muted-foreground">
            Shkruani pagën neto që dëshironi dhe kalkulatori do të tregojë pagën
            bruto të nevojshme.
          </p>
        </div>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="employee-pension">Kontributi i punonjësit (%)</Label>
          <Input
            id="employee-pension"
            inputMode="decimal"
            min={0}
            max={100}
            step="0.1"
            value={
              Number.isFinite(employeePensionRate) ? employeePensionRate : 0
            }
            onChange={handleNumberChange(onEmployeePensionRateChange)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="employer-pension">
            Kontributi i punëdhënësit (%)
          </Label>
          <Input
            id="employer-pension"
            inputMode="decimal"
            min={0}
            max={100}
            step="0.1"
            value={
              Number.isFinite(employerPensionRate) ? employerPensionRate : 0
            }
            onChange={handleNumberChange(onEmployerPensionRateChange)}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Kontributet ligjore minimale janë 5% + 5%. Vlerat më të ulëta do të
        llogariten si ky minimum.
      </p>
      <div className="grid gap-2">
        <Label htmlFor="job-type">A është ky punësimi kryesor?</Label>
        <select
          id="job-type"
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          )}
          value={jobType}
          onChange={(event) => onJobTypeChange(event.target.value as JobType)}
        >
          <option value="primary">Po, është punësimi im kryesor</option>
          <option value="secondary">Jo, është punë shtesë</option>
        </select>
        <p className="text-xs text-muted-foreground">
          Punësimet sekondare tatohen me normë fikse 10% pa shkallët progresive
          të punësimit kryesor.
        </p>
      </div>
    </div>
  );
}

export { WageCalculatorInputs };
