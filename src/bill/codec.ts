// The saved form of a bill (contracts/bill-file.md). decodeBill trusts nothing it reads:
// a bill comes back only when every data-model.md rule holds.
import {
  Bill,
  Item,
  MAX_PEOPLE,
  Person,
  isChargeSen,
  isInPeopleOrder,
  isPriceSen,
  isQuantity,
  isRoundingSen,
  sameName,
} from './bill';

const VERSION = 1;

export function encodeBill(bill: Bill): string {
  return JSON.stringify({
    version: VERSION,
    nextId: bill.nextId,
    serviceChargeSen: bill.serviceChargeSen,
    sstSen: bill.sstSen,
    roundingSen: bill.roundingSen,
    people: bill.people.map(({ id, name }) => ({ id, name })),
    items: bill.items.map(({ id, name, quantity, unitPriceSen, assignedTo }) => ({
      id,
      name,
      quantity,
      unitPriceSen,
      assignedTo,
    })),
  });
}

export function decodeBill(text: string): Bill | null {
  let doc: unknown;
  try {
    doc = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isRecord(doc) || doc.version !== VERSION) return null;
  const { nextId, serviceChargeSen, sstSen, roundingSen } = doc;
  if (!Number.isSafeInteger(nextId) || (nextId as number) < 1) return null;
  if (!isChargeSen(serviceChargeSen) || !isChargeSen(sstSen) || !isRoundingSen(roundingSen)) return null;

  const people = decodeList(doc.people, decodePerson);
  if (people === null || people.length > MAX_PEOPLE) return null;
  if (people.some((person, i) => people.slice(0, i).some((other) => sameName(other.name, person.name)))) return null;

  const items = decodeList(doc.items, decodeItem);
  if (items === null || items.some((item) => !isInPeopleOrder(item.assignedTo, people))) return null;

  const ids = [...people, ...items].map((entry) => entry.id);
  if (new Set(ids).size !== ids.length || ids.some((id) => id >= (nextId as number))) return null;

  return { items, people, serviceChargeSen, sstSen, roundingSen, nextId: nextId as number };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function decodeList<T>(value: unknown, decode: (entry: unknown) => T | null): T[] | null {
  if (!Array.isArray(value)) return null;
  const list: T[] = [];
  for (const entry of value) {
    const decoded = decode(entry);
    if (decoded === null) return null;
    list.push(decoded);
  }
  return list;
}

function isId(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 1;
}

function isName(value: unknown): value is string {
  return typeof value === 'string' && value !== '' && value === value.trim();
}

function decodePerson(entry: unknown): Person | null {
  if (!isRecord(entry) || !isId(entry.id) || !isName(entry.name)) return null;
  return { id: entry.id, name: entry.name };
}

function decodeItem(entry: unknown): Item | null {
  if (!isRecord(entry) || !isId(entry.id) || !isName(entry.name)) return null;
  const { quantity, unitPriceSen, assignedTo } = entry;
  if (!isQuantity(quantity) || !isPriceSen(unitPriceSen)) return null;
  if (!Array.isArray(assignedTo) || !assignedTo.every(isId)) return null;
  return { id: entry.id, name: entry.name, quantity, unitPriceSen, assignedTo };
}
