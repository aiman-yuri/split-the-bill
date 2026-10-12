import { type Bill, emptyBill } from '../bill';
import { createBillStore } from './billStore';

function memoryKv(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItemSync: (key: string) => values.get(key) ?? null,
    setItemSync: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItemSync: (key: string) => {
      values.delete(key);
    },
  };
}

const bill: Bill = {
  ...emptyBill,
  people: [{ id: 1, name: 'Ali' }],
  items: [{ id: 2, name: 'Teh Tarik', quantity: 1, unitPriceSen: 300, assignedTo: [1] }],
  nextId: 3,
};

test('nothing saved loads an empty bill', () => {
  expect(createBillStore(memoryKv()).load()).toEqual({ bill: emptyBill, recovered: false });
});

test('a saved bill loads back', () => {
  const kv = memoryKv();
  createBillStore(kv).save(bill);
  expect(createBillStore(kv).load()).toEqual({ bill, recovered: false });
});

test('an unreadable bill is moved aside and an empty bill is started', () => {
  const kv = memoryKv({ bill: '{' });
  expect(createBillStore(kv).load()).toEqual({ bill: emptyBill, recovered: true });
  expect(kv.values.get('bill.unreadable')).toBe('{');
  expect(kv.values.has('bill')).toBe(false);
});

test('clearing removes the bill and keeps a moved-aside one', () => {
  const kv = memoryKv({ 'bill.unreadable': '{' });
  const store = createBillStore(kv);
  store.save(bill);
  store.clear();
  expect(kv.values.has('bill')).toBe(false);
  expect(kv.values.get('bill.unreadable')).toBe('{');
});

test('a failed write is reported to the caller', () => {
  const failure = new Error('disk full');
  const kv = {
    ...memoryKv(),
    setItemSync: () => {
      throw failure;
    },
  };
  expect(() => createBillStore(kv).save(bill)).toThrow(failure);
});
