// Entered state of the bill and the rules every edit and every saved bill must keep (data-model.md).
// All money is integer sen in a safe integer (Constitution I).

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

// Each edit returns the new bill or why it was refused; the input bill is never changed.
export type Edit = { ok: true; bill: Bill } | { ok: false; reason: Rejection };
export type Rejection =
  | 'BlankName'
  | 'DuplicatePersonName'
  | 'TooManyPeople'
  | 'QuantityOutOfRange'
  | 'PriceOutOfRange'
  | 'ChargeOutOfRange'
  | 'RoundingOutOfRange'
  | 'UnknownPerson'
  | 'UnknownId';

export const emptyBill: Bill = {
  items: [],
  people: [],
  serviceChargeSen: 0,
  sstSen: 0,
  roundingSen: 0,
  nextId: 1,
};

export const MAX_PEOPLE = 20;

export function lineAmountSen(item: Item): number {
  return item.quantity * item.unitPriceSen;
}

function isIntegerIn(value: unknown, min: number, max: number): value is number {
  return Number.isSafeInteger(value) && (value as number) >= min && (value as number) <= max;
}

export const isQuantity = (value: unknown) => isIntegerIn(value, 1, 999);
export const isPriceSen = (value: unknown) => isIntegerIn(value, 0, 9999999);
export const isChargeSen = (value: unknown) => isIntegerIn(value, 0, 9999999);
export const isRoundingSen = (value: unknown) => isIntegerIn(value, -2, 2);

export function sameName(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

// True when assignedTo lists distinct people on the bill, in people order.
export function isInPeopleOrder(assignedTo: readonly number[], people: readonly Person[]): boolean {
  let last = -1;
  for (const id of assignedTo) {
    const position = people.findIndex((person) => person.id === id);
    if (position <= last) return false;
    last = position;
  }
  return true;
}

export type ItemInput = Readonly<{ name: string; quantity: number; unitPriceSen: number; assignedTo: readonly number[] }>;

export function addItem(bill: Bill, input: ItemInput): Edit {
  const checked = checkItem(bill, input);
  if (!checked.ok) return checked;
  const item: Item = { id: bill.nextId, ...checked.fields };
  return { ok: true, bill: { ...bill, items: [...bill.items, item], nextId: bill.nextId + 1 } };
}

export function updateItem(bill: Bill, id: number, input: ItemInput): Edit {
  if (!bill.items.some((item) => item.id === id)) return refuse('UnknownId');
  const checked = checkItem(bill, input);
  if (!checked.ok) return checked;
  const items = bill.items.map((item) => (item.id === id ? { id, ...checked.fields } : item));
  return { ok: true, bill: { ...bill, items } };
}

export function removeItem(bill: Bill, id: number): Edit {
  if (!bill.items.some((item) => item.id === id)) return refuse('UnknownId');
  return { ok: true, bill: { ...bill, items: bill.items.filter((item) => item.id !== id) } };
}

export function addPerson(bill: Bill, name: string): Edit {
  const trimmed = name.trim();
  if (trimmed === '') return refuse('BlankName');
  if (bill.people.some((person) => sameName(person.name, trimmed))) return refuse('DuplicatePersonName');
  if (bill.people.length >= MAX_PEOPLE) return refuse('TooManyPeople');
  const person: Person = { id: bill.nextId, name: trimmed };
  return { ok: true, bill: { ...bill, people: [...bill.people, person], nextId: bill.nextId + 1 } };
}

export function renamePerson(bill: Bill, id: number, name: string): Edit {
  if (!bill.people.some((person) => person.id === id)) return refuse('UnknownId');
  const trimmed = name.trim();
  if (trimmed === '') return refuse('BlankName');
  if (bill.people.some((person) => person.id !== id && sameName(person.name, trimmed))) return refuse('DuplicatePersonName');
  const people = bill.people.map((person) => (person.id === id ? { id, name: trimmed } : person));
  return { ok: true, bill: { ...bill, people } };
}

// Items only this person had become unassigned; shared items lose them.
export function removePerson(bill: Bill, id: number): Edit {
  if (!bill.people.some((person) => person.id === id)) return refuse('UnknownId');
  const people = bill.people.filter((person) => person.id !== id);
  const items = bill.items.map((item) =>
    item.assignedTo.includes(id) ? { ...item, assignedTo: item.assignedTo.filter((other) => other !== id) } : item,
  );
  return { ok: true, bill: { ...bill, people, items } };
}

export function setCharges(
  bill: Bill,
  charges: Readonly<{ serviceChargeSen: number; sstSen: number; roundingSen: number }>,
): Edit {
  const { serviceChargeSen, sstSen, roundingSen } = charges;
  if (!isChargeSen(serviceChargeSen) || !isChargeSen(sstSen)) return refuse('ChargeOutOfRange');
  if (!isRoundingSen(roundingSen)) return refuse('RoundingOutOfRange');
  return { ok: true, bill: { ...bill, serviceChargeSen, sstSen, roundingSen } };
}

function refuse(reason: Rejection): Edit & { ok: false } {
  return { ok: false, reason };
}

function checkItem(bill: Bill, input: ItemInput): { ok: true; fields: Omit<Item, 'id'> } | { ok: false; reason: Rejection } {
  const name = input.name.trim();
  if (name === '') return refuse('BlankName');
  if (!isQuantity(input.quantity)) return refuse('QuantityOutOfRange');
  if (!isPriceSen(input.unitPriceSen)) return refuse('PriceOutOfRange');
  if (!input.assignedTo.every((id) => bill.people.some((person) => person.id === id))) return refuse('UnknownPerson');
  // People order, no repeats: the order the division rule breaks ties by.
  const assignedTo = bill.people.filter((person) => input.assignedTo.includes(person.id)).map((person) => person.id);
  return { ok: true, fields: { name, quantity: input.quantity, unitPriceSen: input.unitPriceSen, assignedTo } };
}
