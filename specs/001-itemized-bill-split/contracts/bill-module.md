# Contract: `bill` module (pure TypeScript)

The money seam. Every calculation test crosses this interface and nothing else (Constitution III). Files under `src/bill/` import nothing from `react`, `react-native` or `expo*`, so the tests run in Node with no device or emulator. An ESLint `no-restricted-imports` rule on `src/bill/**` enforces this.

Folder: `src/bill/`, re-exported from `src/bill/index.ts`. Callers import only from `src/bill`.

## Interface

```ts
// Entered state (fields and rules: data-model.md). All money is integer sen, always a safe integer.
export type Bill = Readonly<{
  items: readonly Item[];
  people: readonly Person[];
  serviceChargeSen: number;
  sstSen: number;
  roundingSen: number;
  nextId: number;
}>;
export type Item = Readonly<{ id: number; name: string; quantity: number; unitPriceSen: number; assignedTo: readonly number[] }>;
export type Person = Readonly<{ id: number; name: string }>;

export const emptyBill: Bill;
export function lineAmountSen(item: Item): number;

// Edits: each returns the new bill or why it was refused; the input bill is never changed.
export type Edit = { ok: true; bill: Bill } | { ok: false; reason: Rejection };
export type Rejection =
  | 'BlankName' | 'DuplicatePersonName' | 'TooManyPeople' | 'QuantityOutOfRange'
  | 'PriceOutOfRange' | 'ChargeOutOfRange' | 'RoundingOutOfRange' | 'UnknownPerson' | 'UnknownId';

export type ItemInput = Readonly<{ name: string; quantity: number; unitPriceSen: number; assignedTo: readonly number[] }>;

export function addItem(bill: Bill, item: ItemInput): Edit;
export function updateItem(bill: Bill, id: number, item: ItemInput): Edit;
export function removeItem(bill: Bill, id: number): Edit;
export function addPerson(bill: Bill, name: string): Edit;
export function renamePerson(bill: Bill, id: number, name: string): Edit;
export function removePerson(bill: Bill, id: number): Edit;
export function setCharges(bill: Bill, charges: Readonly<{ serviceChargeSen: number; sstSen: number; roundingSen: number }>): Edit;

// Derived state
export function split(bill: Bill): Split;
export type Split = Readonly<{
  itemSubtotalSen: number;
  billTotalSen: number;
  unassignedItems: readonly Item[];
  unassignedAmountSen: number;
  shares: readonly Share[];
  status: SplitStatus;
}>;
export type Share = Readonly<{
  person: Person;
  itemPortions: readonly ItemPortion[];
  assignedSubtotalSen: number;
  serviceChargeSen: number;
  sstSen: number;
  roundingSen: number;
  totalSen: number;
}>;
export type ItemPortion = Readonly<{ item: Item; amountSen: number }>;
export type SplitStatus = 'Complete' | 'Incomplete' | 'ChargesUndividable' | 'ShareBelowZero';

// Money text
// "8.5", "8.50", "RM 8.50", "1,234.50" → sen. A leading "-" is accepted only when allowNegative (rounding adjustment).
export function parseRm(text: string, options?: { allowNegative?: boolean }): number | null;
export function formatRm(sen: number): string; // 1230 → "RM 12.30", -2 → "-RM 0.02", 123450 → "RM 1,234.50"

// Saved form (contracts/bill-file.md)
export function encodeBill(bill: Bill): string;
export function decodeBill(text: string): Bill | null; // null = unreadable
```

## Behaviour callers rely on

- `split` is total: it returns a `Split` for every valid `Bill`, never throws, and its status says whether shares are final.
- When `shares` is non-empty: the sum of `totalSen` plus `unassignedAmountSen` equals `billTotalSen`.
- Division follows the rule in data-model.md, "Division rule". `allocate` lives in `src/bill/allocate.ts` and is not re-exported from `index.ts`; tests reach it through `split`, plus direct tests of its own edge cases.
- `parseRm` accepts at most 2 decimal places and rejects anything else with `null` (FR-004). It does the conversion on the digit string, never through a float (`"8.505"` → `null`, `"0.29"` → `29`). Range checks belong to the edit functions, not to `parseRm`.
- `formatRm` output is for display only and is never parsed back into a calculation (Constitution I). It does not use `Intl` or `toFixed`, so output does not depend on the device locale.
- Every edit function rejects a non-integer or unsafe number with the matching `…OutOfRange` reason, so a fractional value can never enter a `Bill`.
- `decodeBill` returns a `Bill` only when every data-model rule holds; anything else is `null`. `decodeBill(encodeBill(b))` deep-equals `b`.

## Not in the interface

- No mutable state, no I/O, no promises, no classes.
- Charges have no rate or percentage form (spec Assumptions).
