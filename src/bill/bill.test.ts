import {
  type Bill,
  type Edit,
  type ItemInput,
  addItem,
  addPerson,
  emptyBill,
  lineAmountSen,
  removeItem,
  removePerson,
  renamePerson,
  setCharges,
  updateItem,
} from '.';

function billOf(edit: Edit): Bill {
  if (!edit.ok) throw new Error(`Edit refused: ${edit.reason}`);
  return edit.bill;
}

const nasiLemak: ItemInput = { name: 'Nasi Lemak', quantity: 2, unitPriceSen: 850, assignedTo: [] };

// Ali (id 1) added before Mei (id 2).
const aliAndMei: Bill = {
  ...emptyBill,
  people: [
    { id: 1, name: 'Ali' },
    { id: 2, name: 'Mei' },
  ],
  nextId: 3,
};

describe('items', () => {
  test('an added item has a line amount of quantity times unit price', () => {
    const bill = billOf(addItem(emptyBill, nasiLemak));
    expect(lineAmountSen(bill.items[0])).toBe(1700);
  });

  test('a new item takes the next id', () => {
    const bill = billOf(addItem(aliAndMei, nasiLemak));
    expect(bill.items[0].id).toBe(3);
    expect(bill.nextId).toBe(4);
  });

  test('the name is trimmed', () => {
    expect(billOf(addItem(emptyBill, { ...nasiLemak, name: '  Teh Tarik ' })).items[0].name).toBe('Teh Tarik');
  });

  test('two items may share a name', () => {
    const once = billOf(addItem(emptyBill, nasiLemak));
    expect(billOf(addItem(once, nasiLemak)).items).toHaveLength(2);
  });

  test.each<[string, Partial<ItemInput>, string]>([
    ['a blank name', { name: '  ' }, 'BlankName'],
    ['quantity 0', { quantity: 0 }, 'QuantityOutOfRange'],
    ['quantity 1000', { quantity: 1000 }, 'QuantityOutOfRange'],
    ['quantity 1.5', { quantity: 1.5 }, 'QuantityOutOfRange'],
    ['price -1', { unitPriceSen: -1 }, 'PriceOutOfRange'],
    ['price 10000000', { unitPriceSen: 10000000 }, 'PriceOutOfRange'],
    ['price 850.5', { unitPriceSen: 850.5 }, 'PriceOutOfRange'],
    ['an assignment to someone not on the bill', { assignedTo: [9] }, 'UnknownPerson'],
  ])('%s is refused and the bill is unchanged', (_, change, reason) => {
    const before = structuredClone(aliAndMei);
    expect(addItem(aliAndMei, { ...nasiLemak, ...change })).toEqual({ ok: false, reason });
    expect(aliAndMei).toEqual(before);
    const withItem = billOf(addItem(aliAndMei, nasiLemak));
    expect(updateItem(withItem, 3, { ...nasiLemak, ...change })).toEqual({ ok: false, reason });
  });

  test('the assignment drops repeats and follows people order', () => {
    const bill = billOf(addItem(aliAndMei, { ...nasiLemak, assignedTo: [2, 1, 1] }));
    expect(bill.items[0].assignedTo).toEqual([1, 2]);
  });

  test('an item can be updated in place', () => {
    const bill = billOf(addItem(aliAndMei, nasiLemak));
    const updated = billOf(updateItem(bill, 3, { name: 'Satay', quantity: 1, unitPriceSen: 1200, assignedTo: [1] }));
    expect(updated.items).toEqual([{ id: 3, name: 'Satay', quantity: 1, unitPriceSen: 1200, assignedTo: [1] }]);
    expect(updated.nextId).toBe(4);
  });

  test('an item can be removed', () => {
    const bill = billOf(addItem(aliAndMei, nasiLemak));
    expect(billOf(removeItem(bill, 3)).items).toEqual([]);
  });

  test('updating or removing a missing item is refused', () => {
    expect(updateItem(aliAndMei, 7, nasiLemak)).toEqual({ ok: false, reason: 'UnknownId' });
    expect(removeItem(aliAndMei, 7)).toEqual({ ok: false, reason: 'UnknownId' });
  });
});

describe('people', () => {
  test('a name is trimmed and the person goes to the end of the order', () => {
    const bill = billOf(addPerson(aliAndMei, '  Raj '));
    expect(bill.people.at(-1)).toEqual({ id: 3, name: 'Raj' });
    expect(bill.nextId).toBe(4);
  });

  test('a blank name is refused', () => {
    expect(addPerson(aliAndMei, '')).toEqual({ ok: false, reason: 'BlankName' });
    expect(renamePerson(aliAndMei, 1, '  ')).toEqual({ ok: false, reason: 'BlankName' });
  });

  test('a name already on the bill, ignoring case, is refused', () => {
    expect(addPerson(aliAndMei, 'ali')).toEqual({ ok: false, reason: 'DuplicatePersonName' });
    expect(renamePerson(aliAndMei, 2, 'ALI')).toEqual({ ok: false, reason: 'DuplicatePersonName' });
  });

  test('the 20th person is accepted and the 21st refused', () => {
    let bill = emptyBill;
    for (let i = 1; i <= 20; i++) bill = billOf(addPerson(bill, `Person ${i}`));
    expect(bill.people).toHaveLength(20);
    expect(addPerson(bill, 'Person 21')).toEqual({ ok: false, reason: 'TooManyPeople' });
  });

  test('renaming keeps the id and the place in the order', () => {
    expect(billOf(renamePerson(aliAndMei, 1, 'Aliyah')).people).toEqual([
      { id: 1, name: 'Aliyah' },
      { id: 2, name: 'Mei' },
    ]);
  });

  test('a person can be renamed to a different case of their own name', () => {
    expect(billOf(renamePerson(aliAndMei, 1, 'ALI')).people[0]).toEqual({ id: 1, name: 'ALI' });
  });

  test('removing a person takes them off every item', () => {
    let bill = billOf(addItem(aliAndMei, { ...nasiLemak, assignedTo: [1] }));
    bill = billOf(addItem(bill, { ...nasiLemak, assignedTo: [1, 2] }));
    const after = billOf(removePerson(bill, 1));
    expect(after.people).toEqual([{ id: 2, name: 'Mei' }]);
    expect(after.items.map((item) => item.assignedTo)).toEqual([[], [2]]);
  });

  test('a removed then re-added name is a new person at the end', () => {
    const bill = billOf(addPerson(billOf(removePerson(aliAndMei, 1)), 'Ali'));
    expect(bill.people).toEqual([
      { id: 2, name: 'Mei' },
      { id: 3, name: 'Ali' },
    ]);
  });

  test('renaming or removing a missing person is refused', () => {
    expect(renamePerson(aliAndMei, 7, 'Raj')).toEqual({ ok: false, reason: 'UnknownId' });
    expect(removePerson(aliAndMei, 7)).toEqual({ ok: false, reason: 'UnknownId' });
  });
});

describe('charges', () => {
  const none = { serviceChargeSen: 0, sstSen: 0, roundingSen: 0 };

  test('charges within their ranges are accepted', () => {
    const top = billOf(setCharges(aliAndMei, { serviceChargeSen: 9999999, sstSen: 9999999, roundingSen: 2 }));
    expect([top.serviceChargeSen, top.sstSen, top.roundingSen]).toEqual([9999999, 9999999, 2]);
    expect(billOf(setCharges(aliAndMei, { ...none, roundingSen: -2 })).roundingSen).toBe(-2);
    expect(billOf(setCharges(top, none))).toEqual(aliAndMei);
  });

  test.each<[string, Partial<typeof none>, string]>([
    ['service charge -1', { serviceChargeSen: -1 }, 'ChargeOutOfRange'],
    ['service charge 10000000', { serviceChargeSen: 10000000 }, 'ChargeOutOfRange'],
    ['service charge 1.5', { serviceChargeSen: 1.5 }, 'ChargeOutOfRange'],
    ['SST -1', { sstSen: -1 }, 'ChargeOutOfRange'],
    ['SST 10000000', { sstSen: 10000000 }, 'ChargeOutOfRange'],
    ['SST 1.5', { sstSen: 1.5 }, 'ChargeOutOfRange'],
    ['rounding adjustment 3', { roundingSen: 3 }, 'RoundingOutOfRange'],
    ['rounding adjustment -3', { roundingSen: -3 }, 'RoundingOutOfRange'],
    ['rounding adjustment 0.5', { roundingSen: 0.5 }, 'RoundingOutOfRange'],
  ])('%s is refused and the bill is unchanged', (_, change, reason) => {
    const before = structuredClone(aliAndMei);
    expect(setCharges(aliAndMei, { ...none, ...change })).toEqual({ ok: false, reason });
    expect(aliAndMei).toEqual(before);
  });
});
