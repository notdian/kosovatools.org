import * as React from "react"

import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { cn } from "@workspace/ui/lib/utils"

import type { FuelType } from "../lib/car-import-calculator.js"
import { CAR_IMPORT_CONSTANTS } from "../lib/car-import-calculator.js"

export interface CarImportTaxesInputsProps {
  vehicleYear: number
  euroStandard: number
  fuelType: FuelType
  engineCapacityCc: number
  purchasePrice: number
  shippingCost: number
  insuranceCost: number
  declaredCif?: number | null
  preferentialEuOrigin: boolean
  isBrandNew: boolean
  ecoTax: number
  roadTax: number
  otherFees: number
  currentYear: number
  onVehicleYearChange: (value: number) => void
  onEuroStandardChange: (value: number) => void
  onFuelTypeChange: (value: FuelType) => void
  onEngineCapacityChange: (value: number) => void
  onPurchasePriceChange: (value: number) => void
  onShippingCostChange: (value: number) => void
  onInsuranceCostChange: (value: number) => void
  onDeclaredCifChange: (value: number | null) => void
  onPreferentialEuOriginChange: (value: boolean) => void
  onIsBrandNewChange: (value: boolean) => void
  onEcoTaxChange: (value: number) => void
  onRoadTaxChange: (value: number) => void
  onOtherFeesChange: (value: number) => void
}

interface TextInputChangeEvent {
  target: { value: string }
}

type CheckboxCheckedState = boolean | "indeterminate" | undefined

function parseNumberFromEvent(event: TextInputChangeEvent): number {
  const parsedValue = Number.parseFloat(event.target.value)
  return Number.isFinite(parsedValue) ? parsedValue : 0
}

const EURO_OPTIONS = [4, 5, 6, 7] as const
const DEFAULT_EURO_STANDARD = EURO_OPTIONS[0]

export function CarImportTaxesInputs({
  vehicleYear,
  euroStandard,
  fuelType,
  engineCapacityCc,
  purchasePrice,
  shippingCost,
  insuranceCost,
  declaredCif,
  preferentialEuOrigin,
  isBrandNew,
  ecoTax,
  roadTax,
  otherFees,
  currentYear,
  onVehicleYearChange,
  onEuroStandardChange,
  onFuelTypeChange,
  onEngineCapacityChange,
  onPurchasePriceChange,
  onShippingCostChange,
  onInsuranceCostChange,
  onDeclaredCifChange,
  onPreferentialEuOriginChange,
  onIsBrandNewChange,
  onEcoTaxChange,
  onRoadTaxChange,
  onOtherFeesChange,
}: CarImportTaxesInputsProps) {
  const euroSelectId = React.useId()

  return (
    <div className="space-y-6">
      <section className="grid gap-4">
        <header className="space-y-1">
          <h2 className="text-lg font-semibold">Të dhënat bazë të automjetit</h2>
          <p className="text-sm text-muted-foreground">
            Verifikoni që automjeti përmbush standardet ligjore të importit: maksimumi
            {" "}
            {CAR_IMPORT_CONSTANTS.MAX_VEHICLE_AGE} vjet dhe standardi minimal Euro
            {" "}
            {CAR_IMPORT_CONSTANTS.MIN_EURO_STANDARD}.
          </p>
        </header>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="vehicle-year">Viti i regjistrimit të parë</Label>
            <Input
              id="vehicle-year"
              type="number"
              min={currentYear - CAR_IMPORT_CONSTANTS.MAX_VEHICLE_AGE}
              max={currentYear}
              value={Number.isFinite(vehicleYear) ? vehicleYear : currentYear}
              onChange={(event: TextInputChangeEvent) =>
                onVehicleYearChange(parseNumberFromEvent(event))
              }
            />
            <p className="text-xs text-muted-foreground">
              Automjetet më të vjetra se {CAR_IMPORT_CONSTANTS.MAX_VEHICLE_AGE} vjet nuk
              mund të regjistrohen në Kosovë.
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor={euroSelectId}>Standardi i emetimeve</Label>
            <select
              id={euroSelectId}
              className={cn(
                "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              )}
              value={`Euro ${euroStandard}`}
              onChange={(event: TextInputChangeEvent) => {
                const numericValue = Number.parseInt(event.target.value.replace(/[^0-9]/g, ""), 10)
                onEuroStandardChange(
                  Number.isFinite(numericValue) ? numericValue : DEFAULT_EURO_STANDARD,
                )
              }}
            >
              {EURO_OPTIONS.map((option) => (
                <option key={option} value={`Euro ${option}`}>
                  Euro {option}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Ligji për Automjete kërkon së paku Euro {CAR_IMPORT_CONSTANTS.MIN_EURO_STANDARD}.
            </p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="fuel-type">Lloji i karburantit</Label>
            <select
              id="fuel-type"
              className={cn(
                "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              )}
              value={fuelType}
              onChange={(event: TextInputChangeEvent) =>
                onFuelTypeChange(event.target.value as FuelType)
              }
            >
              <option value="petrol">Benzinë</option>
              <option value="diesel">Naftë</option>
              <option value="hybrid">Hibride</option>
              <option value="electric">Elektrike</option>
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="engine-capacity">Kubikazhi i motorit (cc)</Label>
            <Input
              id="engine-capacity"
              type="number"
              min={0}
              step={1}
              value={Number.isFinite(engineCapacityCc) ? engineCapacityCc : 0}
              onChange={(event: TextInputChangeEvent) =>
                onEngineCapacityChange(
                  Math.max(0, Math.round(parseNumberFromEvent(event))),
                )
              }
            />
            <p className="text-xs text-muted-foreground">
              Për automjetet elektrike vendosni 0 cc – akciza nuk aplikohet.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-lg border border-dashed border-border/70 bg-muted/40 p-4">
          <Checkbox
            id="brand-new"
            checked={isBrandNew}
            onCheckedChange={(checked: CheckboxCheckedState) =>
              onIsBrandNewChange(Boolean(checked))
            }
          />
          <div className="space-y-1 text-sm">
            <Label htmlFor="brand-new" className="font-medium">
              Automjet i ri, i paregjistruar
            </Label>
            <p className="text-xs text-muted-foreground">
              Automjetet e reja të paregjistruara përjashtohen nga akciza sipas vendimit qeveritar.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4">
        <header className="space-y-1">
          <h2 className="text-lg font-semibold">Kosto doganore dhe transporti</h2>
          <p className="text-sm text-muted-foreground">
            Vlera CIF përbëhet nga çmimi i blerjes, transporti dhe sigurimi. Mund të vendosni një vlerë të deklaruar nëse e keni nga faturat.
          </p>
        </header>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="purchase-price">Çmimi i blerjes (€)</Label>
            <Input
              id="purchase-price"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={Number.isFinite(purchasePrice) ? purchasePrice : 0}
              onChange={(event: TextInputChangeEvent) =>
                onPurchasePriceChange(parseNumberFromEvent(event))
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="shipping-cost">Transporti &amp; ngarkimi (€)</Label>
            <Input
              id="shipping-cost"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={Number.isFinite(shippingCost) ? shippingCost : 0}
              onChange={(event: TextInputChangeEvent) =>
                onShippingCostChange(parseNumberFromEvent(event))
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="insurance-cost">Sigurimi gjatë transportit (€)</Label>
            <Input
              id="insurance-cost"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={Number.isFinite(insuranceCost) ? insuranceCost : 0}
              onChange={(event: TextInputChangeEvent) =>
                onInsuranceCostChange(parseNumberFromEvent(event))
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="declared-cif">Vlera CIF e deklaruar (€)</Label>
            <Input
              id="declared-cif"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={declaredCif ?? ""}
              placeholder="Llogaritet automatikisht nëse lihet bosh"
              onChange={(event: TextInputChangeEvent) => {
                const value = event.target.value.trim()
                if (value === "") {
                  onDeclaredCifChange(null)
                  return
                }
                onDeclaredCifChange(parseNumberFromEvent(event))
              }}
            />
            <p className="text-xs text-muted-foreground">
              Lëreni bosh për të përdorur shumën automatike (blerje + transport + sigurim).
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-lg border border-dashed border-border/70 bg-muted/40 p-4">
          <Checkbox
            id="preferential-origin"
            checked={preferentialEuOrigin}
            onCheckedChange={(checked: CheckboxCheckedState) =>
              onPreferentialEuOriginChange(Boolean(checked))
            }
          />
          <div className="space-y-1 text-sm">
            <Label htmlFor="preferential-origin" className="font-medium">
              Origjinë preferenciale BE (MSA)
            </Label>
            <p className="text-xs text-muted-foreground">
              Zbaton normë dogane 0% vetëm nëse posedoni provë origjine (p.sh. EUR.1) dhe kodi tarifor është liberalizuar. Përndryshe lëreni të çaktivizuar.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4">
        <header className="space-y-1">
          <h2 className="text-lg font-semibold">Tarifat e regjistrimit të vitit të parë</h2>
          <p className="text-sm text-muted-foreground">
            Vlerat mund të ndryshojnë sipas komunës. Përdorni këto fusha për t’i përshtatur me tarifat lokale.
          </p>
        </header>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="grid gap-2">
            <Label htmlFor="eco-tax">Taksa ekologjike (€)</Label>
            <Input
              id="eco-tax"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={Number.isFinite(ecoTax) ? ecoTax : CAR_IMPORT_CONSTANTS.annualFees.environmentalTax}
              onChange={(event: TextInputChangeEvent) =>
                onEcoTaxChange(parseNumberFromEvent(event))
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="road-tax">Taksa e rrugës/registrimit (€)</Label>
            <Input
              id="road-tax"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={Number.isFinite(roadTax) ? roadTax : CAR_IMPORT_CONSTANTS.annualFees.roadTax.defaultPassenger}
              onChange={(event: TextInputChangeEvent) =>
                onRoadTaxChange(parseNumberFromEvent(event))
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="other-fees">Tarifa shtesë administrative (€)</Label>
            <Input
              id="other-fees"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={Number.isFinite(otherFees) ? otherFees : 0}
              onChange={(event: TextInputChangeEvent) =>
                onOtherFeesChange(parseNumberFromEvent(event))
              }
            />
          </div>
        </div>
      </section>
    </div>
  )
}
