import { type Bill, type Item, type Person, lineAmountSen, split } from '.';

// mulberry32: a small seeded PRNG, so every run checks the same bills and a failure can be replayed.
function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Random = ReturnType<typeof mulberry32>;
const intIn = (random: Random, min: number, max: number) => min + Math.floor(random() * (max - min + 1));

// Mostly everyday amounts, sometimes the extremes, so both rounding and the bigint path are exercised.
function amount(random: Random, max: number): number {
  const roll = random();
  if (roll < 0.1) return 0;
  if (roll < 0.2) return max;
  if (roll < 0.8) return intIn(random, 1, 5000);
  return intIn(random, 0, max);
}

function randomBill(random: Random): Bill {
  let nextId = 1;
  const people: Person[] = Array.from({ length: intIn(random, 0, 20) }, (_, i) => ({ id: nextId++, name: `P${i}` }));
  const items: Item[] = Array.from({ length: intIn(random, 0, 50) }, (_, i) => ({
    id: nextId++,
    name: `I${i}`,
    quantity: random() < 0.05 ? 999 : intIn(random, 1, 5),
    unitPriceSen: amount(random, 9999999),
    // Subsets of people, kept in people order as the edit functions keep them.
    assignedTo: random() < 0.15 ? [] : people.filter(() => random() < 0.3).map((person) => person.id),
  }));
  return {
    people,
    items,
    serviceChargeSen: amount(random, 9999999),
    sstSen: amount(random, 9999999),
    roundingSen: intIn(random, -2, 2),
    nextId,
  };
}

const sum = (values: readonly number[]) => values.reduce((total, value) => total + value, 0);

const SEEDS = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89];
const BILLS_PER_SEED = 500;

test.each(SEEDS)('the split invariants hold for %i-seeded random bills', (seed) => {
  const random = mulberry32(seed);
  for (let n = 0; n < BILLS_PER_SEED; n++) {
    const bill = randomBill(random);
    const result = split(bill);
    const context = `seed ${seed}, bill ${n}`;

    const moneyValues = [
      result.itemSubtotalSen,
      result.billTotalSen,
      result.unassignedAmountSen,
      ...result.shares.flatMap((share) => [
        share.assignedSubtotalSen,
        share.serviceChargeSen,
        share.sstSen,
        share.roundingSen,
        share.totalSen,
        ...share.itemPortions.map((portion) => portion.amountSen),
      ]),
    ];
    expect({ context, unsafe: moneyValues.filter((value) => !Number.isSafeInteger(value)) }).toEqual({ context, unsafe: [] });

    if (result.shares.length === 0) continue;

    expect({ context, total: sum(result.shares.map((share) => share.totalSen)) + result.unassignedAmountSen }).toEqual({
      context,
      total: result.billTotalSen,
    });

    for (const item of bill.items) {
      if (item.assignedTo.length === 0) continue;
      const portions = result.shares.flatMap((share) =>
        share.itemPortions.filter((portion) => portion.item.id === item.id).map((portion) => portion.amountSen),
      );
      expect({ context, item: item.id, sum: sum(portions) }).toEqual({ context, item: item.id, sum: lineAmountSen(item) });
      expect({ context, item: item.id, spread: Math.max(...portions) - Math.min(...portions) <= 1 }).toEqual({
        context,
        item: item.id,
        spread: true,
      });
    }

    for (const charge of ['serviceChargeSen', 'sstSen', 'roundingSen'] as const) {
      expect({ context, charge, sum: sum(result.shares.map((share) => share[charge])) }).toEqual({
        context,
        charge,
        sum: bill[charge],
      });
    }

    for (const share of result.shares) {
      if (share.assignedSubtotalSen === 0) expect({ context, person: share.person.id, total: share.totalSen }).toEqual({ context, person: share.person.id, total: 0 });
    }
  }
});

test('split stays well under 1 ms on a 50-item, 20-person bill', () => {
  const random = mulberry32(42);
  const people: Person[] = Array.from({ length: 20 }, (_, i) => ({ id: i + 1, name: `P${i}` }));
  const items: Item[] = Array.from({ length: 50 }, (_, i) => ({
    id: 21 + i,
    name: `I${i}`,
    quantity: intIn(random, 1, 3),
    unitPriceSen: intIn(random, 100, 5000),
    assignedTo: people.filter(() => random() < 0.3).map((person) => person.id),
  }));
  const bill: Bill = { people, items, serviceChargeSen: 1234, sstSen: 987, roundingSen: -2, nextId: 71 };

  for (let i = 0; i < 20; i++) split(bill);
  const times = Array.from({ length: 100 }, () => {
    const start = performance.now();
    split(bill);
    return performance.now() - start;
  }).sort((a, b) => a - b);
  expect(times[50]).toBeLessThan(1);
});
