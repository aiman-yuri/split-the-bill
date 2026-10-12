import { type Bill, type Edit, type ItemInput, type Split, addItem, emptyBill, setCharges, split, updateItem } from '.';

function billOf(edit: Edit): Bill {
  if (!edit.ok) throw new Error(`Edit refused: ${edit.reason}`);
  return edit.bill;
}

const ALI = 1;
const MEI = 2;
const RAJ = 3;

// Ali, Mei and Raj, added in that order.
const table: Bill = {
  ...emptyBill,
  people: [
    { id: ALI, name: 'Ali' },
    { id: MEI, name: 'Mei' },
    { id: RAJ, name: 'Raj' },
  ],
  nextId: 4,
};

function withItems(bill: Bill, ...items: ItemInput[]): Bill {
  return items.reduce((current, item) => billOf(addItem(current, item)), bill);
}

const item = (name: string, unitPriceSen: number, assignedTo: number[], quantity = 1): ItemInput => ({
  name,
  quantity,
  unitPriceSen,
  assignedTo,
});

const totals = (result: Split) => result.shares.map((share) => share.totalSen);
const portionsOf = (result: Split, itemName: string) =>
  result.shares.map((share) => share.itemPortions.find((portion) => portion.item.name === itemName)?.amountSen ?? 0);

describe('split by item', () => {
  test('the item subtotal is the sum of line amounts', () => {
    expect(split(withItems(emptyBill, item('Nasi Lemak', 850, [], 2))).itemSubtotalSen).toBe(1700);
  });

  test('each person owes their own items', () => {
    const result = split(withItems(table, item('Teh Tarik', 300, [ALI]), item('Roti Canai', 250, [MEI])));
    expect(totals(result)).toEqual([300, 250, 0]);
    expect(result.billTotalSen).toBe(550);
    expect(result.status).toBe('Complete');
  });

  test('an unassigned item makes the split incomplete and is counted apart', () => {
    const bill = withItems(table, item('Teh Tarik', 300, [ALI]), item('Roti Canai', 250, [MEI]), item('Milo', 400, []));
    const result = split(bill);
    expect(result.status).toBe('Incomplete');
    expect(result.unassignedItems.map((i) => i.name)).toEqual(['Milo']);
    expect(result.unassignedAmountSen).toBe(400);
    expect(result.billTotalSen).toBe(950);
    expect(totals(result)).toEqual([300, 250, 0]);
  });

  test('a person with no items owes nothing', () => {
    const share = split(withItems(table, item('Teh Tarik', 300, [ALI]))).shares[2];
    expect(share.person.name).toBe('Raj');
    expect(share.itemPortions).toEqual([]);
    expect(share.totalSen).toBe(0);
  });

  test('with no people every item is unassigned', () => {
    const result = split(withItems(emptyBill, item('Teh Tarik', 300, [])));
    expect(result.shares).toEqual([]);
    expect(result.unassignedAmountSen).toBe(300);
    expect(result.status).toBe('Incomplete');
  });
});

describe('shared items', () => {
  test('a shared item is divided equally', () => {
    expect(portionsOf(split(withItems(table, item('Satay', 1200, [ALI, MEI, RAJ]))), 'Satay')).toEqual([400, 400, 400]);
  });

  test('the extra sen goes to the first-added person, whatever order the assignment was given in', () => {
    const result = split(withItems(table, item('Rojak', 1000, [RAJ, MEI, ALI])));
    expect(portionsOf(result, 'Rojak')).toEqual([334, 333, 333]);
    expect(totals(result)).toEqual([334, 333, 333]);
  });

  test('the line amount is divided, not the unit price', () => {
    expect(portionsOf(split(withItems(table, item('Kopi', 500, [ALI, MEI, RAJ], 2))), 'Kopi')).toEqual([334, 333, 333]);
  });

  test('taking someone off a shared item divides it among the rest', () => {
    const bill = withItems(table, item('Satay', 1200, [ALI, MEI, RAJ]));
    const result = split(billOf(updateItem(bill, bill.items[0].id, item('Satay', 1200, [ALI, MEI]))));
    expect(totals(result)).toEqual([600, 600, 0]);
  });
});

describe('charges', () => {
  // Assigned subtotals Ali RM 30.00 and Mei RM 10.00 (spec US3).
  const thirtyAndTen = withItems(table, item('Nasi Kandar', 3000, [ALI]), item('Roti Canai', 1000, [MEI]));

  function charged(bill: Bill, serviceChargeSen: number, sstSen = 0, roundingSen = 0): Split {
    return split(billOf(setCharges(bill, { serviceChargeSen, sstSen, roundingSen })));
  }

  test('the service charge is divided in proportion to assigned subtotals', () => {
    expect(charged(thirtyAndTen, 400).shares.map((share) => share.serviceChargeSen)).toEqual([300, 100, 0]);
  });

  test('service charge and SST make the shares add up to the bill total', () => {
    const result = charged(thirtyAndTen, 400, 264);
    expect(totals(result)).toEqual([3498, 1166, 0]);
    expect(result.billTotalSen).toBe(4664);
    expect(result.status).toBe('Complete');
  });

  test('a negative rounding adjustment brings the shares down to the amount paid', () => {
    // 4662 before rounding. SST 262 over 3:1 is 196.5 and 65.5, the tie goes to Ali: 197 and 65.
    // Rounding 2 over 3:1 is 1.5 and 0.5, the tie goes to Ali: -2 and 0.
    const result = charged(thirtyAndTen, 400, 262, -2);
    expect(result.billTotalSen).toBe(4660);
    expect(totals(result)).toEqual([3495, 1165, 0]);
    expect(result.shares[0]).toMatchObject({ serviceChargeSen: 300, sstSen: 197, roundingSen: -2 });
  });

  test('a person with no items bears no charges', () => {
    expect(charged(thirtyAndTen, 400, 264, 2).shares[2]).toMatchObject({
      serviceChargeSen: 0,
      sstSen: 0,
      roundingSen: 0,
      totalSen: 0,
    });
  });

  test('charges with nothing assigned cannot be divided', () => {
    const result = charged(withItems(table, item('Milo', 400, [])), 400);
    expect(result.status).toBe('ChargesUndividable');
    expect(result.shares).toEqual([]);
  });

  test('charges cannot be divided when every assigned subtotal is RM 0.00', () => {
    const result = charged(withItems(table, item('Air Kosong', 0, [ALI])), 400);
    expect(result.status).toBe('ChargesUndividable');
    expect(result.shares).toEqual([]);
  });

  test('a share that would go below RM 0.00 is not shown', () => {
    const result = charged(withItems(table, item('Gula', 1, [ALI])), 0, 0, -2);
    expect(result.status).toBe('ShareBelowZero');
    expect(result.shares).toEqual([]);
  });

  test('a share below RM 0.00 comes before an unassigned item', () => {
    const result = charged(withItems(table, item('Gula', 1, [ALI]), item('Milo', 400, [])), 0, 0, -2);
    expect(result.status).toBe('ShareBelowZero');
  });

  test('undividable charges come before a share below RM 0.00', () => {
    const result = charged(withItems(table, item('Air Kosong', 0, [ALI])), 0, 0, -2);
    expect(result.status).toBe('ChargesUndividable');
  });

  test('with an unassigned item, charges are divided by assigned subtotals only', () => {
    const result = charged(withItems(thirtyAndTen, item('Milo', 500, [])), 400);
    expect(result.status).toBe('Incomplete');
    expect(totals(result)).toEqual([3300, 1100, 0]);
    expect(result.unassignedAmountSen).toBe(500);
    expect(result.billTotalSen).toBe(4900);
  });
});
