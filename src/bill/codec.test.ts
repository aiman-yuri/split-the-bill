import { type Bill, decodeBill, emptyBill, encodeBill } from '.';

// The example document in contracts/bill-file.md.
const example: Bill = {
  nextId: 6,
  serviceChargeSen: 400,
  sstSen: 264,
  roundingSen: -2,
  people: [
    { id: 1, name: 'Ali' },
    { id: 2, name: 'Mei' },
  ],
  items: [
    { id: 3, name: 'Teh Tarik', quantity: 1, unitPriceSen: 300, assignedTo: [1] },
    { id: 4, name: 'Satay', quantity: 1, unitPriceSen: 1200, assignedTo: [1, 2] },
    { id: 5, name: 'Roti Canai', quantity: 2, unitPriceSen: 250, assignedTo: [] },
  ],
};

type Doc = {
  version: number;
  nextId: number;
  serviceChargeSen: number;
  sstSen: number;
  roundingSen: number;
  people: { id: number; name: string }[];
  items: { id: number; name: string; quantity: number; unitPriceSen: number; assignedTo: number[] }[];
};

// A valid saved document, changed by `edit` so each test breaks one rule.
function savedWith(edit: (doc: Doc) => void): string {
  const doc: Doc = JSON.parse(encodeBill(example));
  edit(doc);
  return JSON.stringify(doc);
}

test('the empty bill has nothing on it and hands out id 1 first', () => {
  expect(emptyBill).toEqual({
    items: [],
    people: [],
    serviceChargeSen: 0,
    sstSen: 0,
    roundingSen: 0,
    nextId: 1,
  });
});

test('a saved bill reads back unchanged', () => {
  expect(decodeBill(encodeBill(example))).toEqual(example);
  expect(decodeBill(encodeBill(emptyBill))).toEqual(emptyBill);
});

test('the saved form is version 1 and holds no line amounts', () => {
  const text = encodeBill(example);
  expect(text).toContain('"version":1');
  expect(text).not.toContain('lineAmount');
});

test.each<[string, string]>([
  ['invalid JSON', '{'],
  ['a JSON value that is not a bill', '[]'],
  ['version 2', savedWith((d) => { d.version = 2; })],
  ['quantity 0', savedWith((d) => { d.items[0].quantity = 0; })],
  ['quantity 1000', savedWith((d) => { d.items[0].quantity = 1000; })],
  ['unit price 10000000', savedWith((d) => { d.items[0].unitPriceSen = 10000000; })],
  ['service charge -1', savedWith((d) => { d.serviceChargeSen = -1; })],
  ['service charge 10000000', savedWith((d) => { d.serviceChargeSen = 10000000; })],
  ['SST -1', savedWith((d) => { d.sstSen = -1; })],
  ['SST 10000000', savedWith((d) => { d.sstSen = 10000000; })],
  ['rounding adjustment 3', savedWith((d) => { d.roundingSen = 3; })],
  ['a fractional amount', savedWith((d) => { d.items[0].unitPriceSen = 850.5; })],
  ['a blank item name', savedWith((d) => { d.items[0].name = '  '; })],
  ['a blank person name', savedWith((d) => { d.people[0].name = ''; })],
  ['person names equal ignoring case', savedWith((d) => { d.people[1].name = 'ali'; })],
  ['21 people', savedWith((d) => {
    d.people = Array.from({ length: 21 }, (_, i) => ({ id: 10 + i, name: `P${i}` }));
    d.items = [];
    d.nextId = 31;
  })],
  ['an assignment to someone not on the bill', savedWith((d) => { d.items[0].assignedTo = [9]; })],
  ['an id not below nextId', savedWith((d) => { d.nextId = 5; })],
  ['duplicate ids', savedWith((d) => { d.items[1].id = 3; })],
  ['an assignment with a repeated id', savedWith((d) => { d.items[1].assignedTo = [1, 1]; })],
  ['an assignment not in people order', savedWith((d) => { d.items[1].assignedTo = [2, 1]; })],
])('%s is unreadable', (_, text) => {
  expect(decodeBill(text)).toBeNull();
});
