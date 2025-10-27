export type JobType = "primary" | "secondary";

export interface WageCalculatorInput {
  grossPay: number;
  minimumWage: number;
  employeePensionRate: number;
  employerPensionRate: number;
  jobType: JobType;
}

export interface NetToGrossInput {
  targetNetPay: number;
  minimumWage: number;
  employeePensionRate: number;
  employerPensionRate: number;
  jobType: JobType;
}

export interface TaxBreakdownEntry {
  label: string;
  appliedAmount: number;
  rate: number;
  taxAmount: number;
}

export interface WageCalculatorResult {
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
}

export interface NetToGrossResult {
  targetNetPay: number;
  estimatedGrossPay: number;
  breakdown: WageCalculatorResult;
  differenceFromTarget: number;
}

const PRIMARY_JOB_BRACKETS: Array<{
  limit: number;
  rate: number;
  label: string;
}> = [
  {
    limit: 170,
    rate: 0.04,
    label: "Shkalla 4% pas pagës minimale",
  },
  {
    limit: 200,
    rate: 0.08,
    label: "Shkalla e dytë 8%",
  },
  {
    limit: Number.POSITIVE_INFINITY,
    rate: 0.1,
    label: "Shkalla më e lartë 10%",
  },
];

const SECONDARY_JOB_RATE = 0.1;

const MINIMUM_PENSION_RATE = 5;

function sanitizeRate(rate: number) {
  if (!Number.isFinite(rate)) {
    return 0;
  }

  return Math.min(Math.max(rate, 0), 100);
}

function sanitizeAmount(amount: number) {
  if (!Number.isFinite(amount)) {
    return 0;
  }

  return Math.max(amount, 0);
}

export function calculateWageBreakdown(
  input: WageCalculatorInput,
): WageCalculatorResult {
  const grossPay = sanitizeAmount(input.grossPay);
  const minimumWage = sanitizeAmount(input.minimumWage);
  const employeePensionRate =
    Math.max(sanitizeRate(input.employeePensionRate), MINIMUM_PENSION_RATE) /
    100;
  const employerPensionRate =
    Math.max(sanitizeRate(input.employerPensionRate), MINIMUM_PENSION_RATE) /
    100;
  const jobType = input.jobType;

  const employeePension = Math.min(grossPay, grossPay * employeePensionRate);
  const employerPension = Math.min(grossPay, grossPay * employerPensionRate);

  const taxableIncomeBeforeAllowance = Math.max(grossPay - employeePension, 0);

  const incomeTaxBreakdown: TaxBreakdownEntry[] = [];

  let taxableIncomeAfterAllowance = taxableIncomeBeforeAllowance;
  let incomeTax = 0;

  if (jobType === "secondary") {
    const appliedAmount = taxableIncomeAfterAllowance;
    const taxAmount = appliedAmount * SECONDARY_JOB_RATE;
    incomeTax = taxAmount;

    if (appliedAmount > 0) {
      incomeTaxBreakdown.push({
        label: "Tatimi 10% për punësim sekondar",
        appliedAmount,
        rate: SECONDARY_JOB_RATE,
        taxAmount,
      });
    }
  } else {
    taxableIncomeAfterAllowance = Math.max(
      taxableIncomeAfterAllowance - minimumWage,
      0,
    );

    let remaining = taxableIncomeAfterAllowance;

    for (const bracket of PRIMARY_JOB_BRACKETS) {
      if (remaining <= 0) {
        break;
      }

      const appliedAmount = Math.min(remaining, bracket.limit);
      const taxAmount = appliedAmount * bracket.rate;

      if (appliedAmount > 0) {
        incomeTaxBreakdown.push({
          label: bracket.label,
          appliedAmount,
          rate: bracket.rate,
          taxAmount,
        });
      }

      incomeTax += taxAmount;
      remaining -= appliedAmount;
    }
  }

  const netPay = Math.max(grossPay - employeePension - incomeTax, 0);
  const employerTotalCost = grossPay + employerPension;
  const effectiveTaxRate = grossPay > 0 ? incomeTax / grossPay : 0;

  return {
    grossPay,
    employeePension,
    employerPension,
    taxableIncomeBeforeAllowance,
    taxableIncomeAfterAllowance,
    incomeTax,
    incomeTaxBreakdown,
    netPay,
    employerTotalCost,
    effectiveTaxRate,
  };
}

export function calculateGrossFromNet(
  input: NetToGrossInput,
): NetToGrossResult {
  const minimumWage = sanitizeAmount(input.minimumWage);
  const employeePensionRate = Math.max(
    sanitizeRate(input.employeePensionRate),
    MINIMUM_PENSION_RATE,
  );
  const employerPensionRate = Math.max(
    sanitizeRate(input.employerPensionRate),
    MINIMUM_PENSION_RATE,
  );
  const jobType = input.jobType;
  const targetNetPay = sanitizeAmount(input.targetNetPay);

  if (targetNetPay <= 0) {
    const breakdown = calculateWageBreakdown({
      grossPay: 0,
      minimumWage,
      employeePensionRate,
      employerPensionRate,
      jobType,
    });

    return {
      targetNetPay,
      estimatedGrossPay: 0,
      breakdown,
      differenceFromTarget: 0,
    };
  }

  let lower = 0;
  let upper = Math.max(targetNetPay * 1.5, minimumWage * 2, 1000);
  const MAX_UPPER_BOUND = 100_000;

  while (upper < MAX_UPPER_BOUND) {
    const testBreakdown = calculateWageBreakdown({
      grossPay: upper,
      minimumWage,
      employeePensionRate,
      employerPensionRate,
      jobType,
    });

    if (testBreakdown.netPay >= targetNetPay) {
      break;
    }

    lower = upper;
    upper = Math.min(upper * 2, MAX_UPPER_BOUND);
  }

  let estimatedGross = upper;
  let breakdown = calculateWageBreakdown({
    grossPay: estimatedGross,
    minimumWage,
    employeePensionRate,
    employerPensionRate,
    jobType,
  });

  for (let iteration = 0; iteration < 50; iteration += 1) {
    if (Math.abs(breakdown.netPay - targetNetPay) <= 0.5) {
      break;
    }

    if (breakdown.netPay > targetNetPay) {
      upper = estimatedGross;
    } else {
      lower = estimatedGross;
    }

    estimatedGross = (lower + upper) / 2;
    breakdown = calculateWageBreakdown({
      grossPay: estimatedGross,
      minimumWage,
      employeePensionRate,
      employerPensionRate,
      jobType,
    });
  }

  const differenceFromTarget = breakdown.netPay - targetNetPay;

  return {
    targetNetPay,
    estimatedGrossPay: estimatedGross,
    breakdown,
    differenceFromTarget,
  };
}
