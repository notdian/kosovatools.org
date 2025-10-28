export {
  calculateCarImportTaxes,
  evaluateEligibility,
  CAR_IMPORT_CONSTANTS,
} from "./lib/car-import-calculator.js"
export type {
  CarImportCalculationInput,
  CarImportTaxesResult,
  EligibilityCheck,
  FuelType,
  CustomsDutyBreakdown,
  ExciseBreakdown,
  RegistrationFeesBreakdown,
  VatBreakdown,
} from "./lib/car-import-calculator.js"

export { CarImportTaxesInputs } from "./components/car-import-taxes-inputs.js"
export type { CarImportTaxesInputsProps } from "./components/car-import-taxes-inputs.js"

export { CarImportTaxesResults } from "./components/car-import-taxes-results.js"
export type { CarImportTaxesResultsProps } from "./components/car-import-taxes-results.js"
