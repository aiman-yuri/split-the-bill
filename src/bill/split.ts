// Derives what each person owes from the entered bill. Nothing here is stored (data-model.md, "Split").
import { allocate } from './allocate';
import { type Bill, type Item, type Person, lineAmountSen } from './bill';

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

export function split(bill: Bill): Split {
  const itemSubtotalSen = sum(bill.items.map(lineAmountSen));
  const billTotalSen = itemSubtotalSen + bill.serviceChargeSen + bill.sstSen + bill.roundingSen;
  const unassignedItems = bill.items.filter((item) => item.assignedTo.length === 0);
  const unassignedAmountSen = sum(unassignedItems.map(lineAmountSen));

  const portions = new Map<number, ItemPortion[]>(bill.people.map((person) => [person.id, []]));
  for (const item of bill.items) {
    if (item.assignedTo.length === 0) continue;
    // assignedTo is already in people order, the tie-break order for the extra sen.
    const amounts = allocate(lineAmountSen(item), item.assignedTo.map(() => 1));
    item.assignedTo.forEach((id, i) => portions.get(id)?.push({ item, amountSen: amounts[i] }));
  }

  const subtotals = bill.people.map((person) => sum((portions.get(person.id) ?? []).map((portion) => portion.amountSen)));
  const charges = [bill.serviceChargeSen, bill.sstSen, bill.roundingSen];
  const base = { itemSubtotalSen, billTotalSen, unassignedItems, unassignedAmountSen };

  // A charge is divided by assigned subtotals; with all of them 0 there is nothing to divide by (FR-013).
  if (charges.some((charge) => charge !== 0) && subtotals.every((subtotal) => subtotal === 0)) {
    return { ...base, shares: [], status: 'ChargesUndividable' };
  }
  const [service, sst, rounding] = charges.map((charge) =>
    charge === 0 ? subtotals.map(() => 0) : allocate(charge, subtotals),
  );

  const shares = bill.people.map((person, i): Share => ({
    person,
    itemPortions: portions.get(person.id) ?? [],
    assignedSubtotalSen: subtotals[i],
    serviceChargeSen: service[i],
    sstSen: sst[i],
    roundingSen: rounding[i],
    totalSen: subtotals[i] + service[i] + sst[i] + rounding[i],
  }));

  if (shares.some((share) => share.totalSen < 0)) return { ...base, shares: [], status: 'ShareBelowZero' };
  return { ...base, shares, status: unassignedItems.length > 0 ? 'Incomplete' : 'Complete' };
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
