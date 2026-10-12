import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Alert, type AlertButton } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { type Bill, decodeBill, emptyBill, encodeBill } from '@/bill';
import { createBillStore } from '@/storage/billStore';
import { BillScreen } from './BillScreen';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 24, left: 0, right: 0, bottom: 16 },
};

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

async function open(kv = memoryKv()) {
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <BillScreen store={createBillStore(kv)} />
    </SafeAreaProvider>,
  );
  return kv;
}

let alert: jest.SpyInstance;
beforeEach(() => {
  alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(() => {
  alert.mockRestore();
});

function lastAlertMessage(): string | undefined {
  return alert.mock.calls.at(-1)?.[1];
}

async function pressAlertButton(text: string) {
  const buttons: AlertButton[] = alert.mock.calls.at(-1)?.[2] ?? [];
  const button = buttons.find((b) => b.text === text);
  if (button === undefined) throw new Error(`The last dialog has no "${text}" button`);
  await act(async () => button.onPress?.());
}

const saved = (bill: Bill) => ({ bill: encodeBill(bill) });

const tehTarik: Bill = {
  ...emptyBill,
  people: [{ id: 1, name: 'Ali' }],
  items: [{ id: 2, name: 'Teh Tarik', quantity: 1, unitPriceSen: 300, assignedTo: [1] }],
  nextId: 3,
};

function savedBill(kv: ReturnType<typeof memoryKv>): Bill | null {
  const text = kv.values.get('bill');
  return text === undefined ? null : decodeBill(text);
}

async function addPerson(name: string) {
  await fireEvent.changeText(screen.getByTestId('person_name'), name);
  await fireEvent.press(screen.getByTestId('add_person'));
}

describe('screen shell', () => {
  test('an empty bill opens on the Items tab', async () => {
    await open();
    expect(screen.getByText('No items yet. Add the first line from the receipt.')).toBeOnTheScreen();
  });

  test('the tab bar switches between Items, People and Split', async () => {
    await open();
    await fireEvent.press(screen.getByTestId('tab_people'));
    expect(screen.getByTestId('person_name')).toBeOnTheScreen();
    expect(screen.queryByText('No items yet. Add the first line from the receipt.')).not.toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('tab_split'));
    expect(screen.queryByTestId('person_name')).not.toBeOnTheScreen();
    expect(screen.queryByText('No items yet. Add the first line from the receipt.')).not.toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('tab_items'));
    expect(screen.getByText('No items yet. Add the first line from the receipt.')).toBeOnTheScreen();
  });

  test('New bill asks first, then deletes the saved bill', async () => {
    const kv = await open(memoryKv(saved(tehTarik)));
    expect(screen.queryByText('No items yet. Add the first line from the receipt.')).not.toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('new_bill'));
    expect(lastAlertMessage()).toBe('Start a new bill? The current bill will be deleted.');
    await pressAlertButton('Start new bill');
    expect(kv.values.has('bill')).toBe(false);
    expect(screen.getByText('No items yet. Add the first line from the receipt.')).toBeOnTheScreen();
  });

  test('an unreadable saved bill is reported once on launch', async () => {
    await open(memoryKv({ bill: '{' }));
    expect(alert).toHaveBeenCalledTimes(1);
    expect(lastAlertMessage()).toBe("Your saved bill couldn't be opened, so a new bill was started.");
  });
});

describe('People tab', () => {
  test('an added person is listed and saved', async () => {
    const kv = await open();
    await fireEvent.press(screen.getByTestId('tab_people'));
    await addPerson('Ali');
    expect(screen.getByTestId('person_1')).toHaveTextContent('Ali', { exact: false });
    expect(savedBill(kv)?.people).toEqual([{ id: 1, name: 'Ali' }]);
  });

  test('a name already on the bill, ignoring case, is refused', async () => {
    const kv = await open();
    await fireEvent.press(screen.getByTestId('tab_people'));
    await addPerson('Ali');
    await addPerson('ali');
    expect(screen.getByText('Someone on this bill already has that name.')).toBeOnTheScreen();
    expect(screen.queryByTestId('person_2')).not.toBeOnTheScreen();
    expect(savedBill(kv)?.people).toHaveLength(1);
  });

  test('a 21st person is refused', async () => {
    const people = Array.from({ length: 20 }, (_, i) => ({ id: i + 1, name: `Person ${i + 1}` }));
    await open(memoryKv(saved({ ...emptyBill, people, nextId: 21 })));
    await fireEvent.press(screen.getByTestId('tab_people'));
    await addPerson('Raj');
    expect(screen.getByText('A bill can have at most 20 people.')).toBeOnTheScreen();
    expect(screen.queryByTestId('person_21')).not.toBeOnTheScreen();
  });

  test("each person's current share is shown", async () => {
    await open(memoryKv(saved(tehTarik)));
    await fireEvent.press(screen.getByTestId('tab_people'));
    expect(screen.getByTestId('person_1')).toHaveTextContent('RM 3.00', { exact: false });
  });

  test('a person can be renamed in place', async () => {
    const kv = await open(memoryKv(saved(tehTarik)));
    await fireEvent.press(screen.getByTestId('tab_people'));
    await fireEvent.press(screen.getByTestId('person_1'));
    await fireEvent.changeText(screen.getByTestId('person_rename_1'), 'Aliyah');
    await fireEvent(screen.getByTestId('person_rename_1'), 'submitEditing');
    expect(screen.getByTestId('person_1')).toHaveTextContent('Aliyah', { exact: false });
    expect(savedBill(kv)?.people).toEqual([{ id: 1, name: 'Aliyah' }]);
  });

  test('removing a person who has items asks first', async () => {
    const twoItems: Bill = {
      ...tehTarik,
      items: [...tehTarik.items, { id: 3, name: 'Roti Canai', quantity: 1, unitPriceSen: 250, assignedTo: [1] }],
      nextId: 4,
    };
    const kv = await open(memoryKv(saved(twoItems)));
    await fireEvent.press(screen.getByTestId('tab_people'));
    await fireEvent.press(screen.getByTestId('person_remove_1'));
    expect(lastAlertMessage()).toBe(
      'Remove Ali? Their 2 items will lose Ali, and items only Ali had become unassigned.',
    );
    expect(screen.getByTestId('person_1')).toBeOnTheScreen();
    await pressAlertButton('Remove');
    expect(screen.queryByTestId('person_1')).not.toBeOnTheScreen();
    expect(savedBill(kv)?.items.map((item) => item.assignedTo)).toEqual([[], []]);
  });

  test('removing a person with no items needs no confirmation', async () => {
    const kv = await open();
    await fireEvent.press(screen.getByTestId('tab_people'));
    await addPerson('Mei');
    await fireEvent.press(screen.getByTestId('person_remove_1'));
    expect(alert).not.toHaveBeenCalled();
    expect(screen.queryByTestId('person_1')).not.toBeOnTheScreen();
    expect(savedBill(kv)?.people).toEqual([]);
  });
});

async function fillItem(name: string, quantity: string, price: string) {
  await fireEvent.changeText(screen.getByTestId('item_name'), name);
  await fireEvent.changeText(screen.getByTestId('item_quantity'), quantity);
  await fireEvent.changeText(screen.getByTestId('item_price'), price);
}

describe('Items tab', () => {
  test('a new item shows its line amount and is saved', async () => {
    const kv = await open();
    await fireEvent.press(screen.getByTestId('add_item'));
    expect(screen.getByTestId('item_editor')).toBeOnTheScreen();
    await fillItem('Nasi Lemak', '2', '8.50');
    await fireEvent.press(screen.getByTestId('item_save'));
    expect(screen.queryByTestId('item_editor')).not.toBeOnTheScreen();
    expect(screen.getByTestId('item_1')).toHaveTextContent('Nasi Lemak', { exact: false });
    expect(screen.getByTestId('item_1')).toHaveTextContent('RM 17.00', { exact: false });
    expect(screen.getByTestId('item_1')).toHaveTextContent('Unassigned', { exact: false });
    expect(savedBill(kv)?.items).toEqual([{ id: 1, name: 'Nasi Lemak', quantity: 2, unitPriceSen: 850, assignedTo: [] }]);
  });

  test.each(['8.505', 'abc'])('price %j is refused and the editor stays open', async (price) => {
    const kv = await open();
    await fireEvent.press(screen.getByTestId('add_item'));
    await fillItem('Nasi Lemak', '1', price);
    await fireEvent.press(screen.getByTestId('item_save'));
    expect(screen.getByText('Enter an amount like 12.50')).toBeOnTheScreen();
    expect(screen.getByTestId('item_editor')).toBeOnTheScreen();
    expect(savedBill(kv)).toBeNull();
  });

  test('a quantity out of range is refused', async () => {
    await open();
    await fireEvent.press(screen.getByTestId('add_item'));
    await fillItem('Nasi Lemak', '0', '8.50');
    await fireEvent.press(screen.getByTestId('item_save'));
    expect(screen.getByText('Enter a quantity from 1 to 999.')).toBeOnTheScreen();
    expect(screen.getByTestId('item_editor')).toBeOnTheScreen();
  });

  test('an item is assigned with the person chips', async () => {
    const kv = await open(memoryKv(saved({ ...emptyBill, people: [{ id: 1, name: 'Ali' }], nextId: 2 })));
    await fireEvent.press(screen.getByTestId('add_item'));
    await fillItem('Teh Tarik', '1', '3');
    await fireEvent.press(screen.getByTestId('assign_1'));
    await fireEvent.press(screen.getByTestId('item_save'));
    expect(screen.getByTestId('item_2')).toHaveTextContent('Ali', { exact: false });
    expect(savedBill(kv)?.items[0].assignedTo).toEqual([1]);
  });

  test('with no people the editor says where to add them', async () => {
    await open();
    await fireEvent.press(screen.getByTestId('add_item'));
    expect(screen.getByText('Add people in the People tab to assign this item.')).toBeOnTheScreen();
  });

  test('an item can be deleted', async () => {
    const kv = await open(memoryKv(saved(tehTarik)));
    await fireEvent.press(screen.getByTestId('item_2'));
    await fireEvent.press(screen.getByTestId('item_delete'));
    expect(screen.queryByTestId('item_2')).not.toBeOnTheScreen();
    expect(savedBill(kv)?.items).toEqual([]);
  });

  test('closing the editor without saving changes nothing', async () => {
    const kv = await open(memoryKv(saved(tehTarik)));
    await fireEvent.press(screen.getByTestId('item_2'));
    await fireEvent.changeText(screen.getByTestId('item_price'), '9.00');
    await fireEvent.press(screen.getByText('Cancel'));
    expect(screen.queryByTestId('item_editor')).not.toBeOnTheScreen();
    expect(screen.getByTestId('item_2')).toHaveTextContent('RM 3.00', { exact: false });
    expect(savedBill(kv)).toEqual(tehTarik);
  });
});

// Ali's Teh Tarik RM 3.00 and Mei's Roti Canai RM 2.50 (spec US1 scenario 2).
const aliAndMei: Bill = {
  ...emptyBill,
  people: [
    { id: 1, name: 'Ali' },
    { id: 2, name: 'Mei' },
  ],
  items: [
    { id: 3, name: 'Teh Tarik', quantity: 1, unitPriceSen: 300, assignedTo: [1] },
    { id: 4, name: 'Roti Canai', quantity: 1, unitPriceSen: 250, assignedTo: [2] },
  ],
  nextId: 5,
};

const unassigned = (id: number, name: string, unitPriceSen: number) => ({
  id,
  name,
  quantity: 1,
  unitPriceSen,
  assignedTo: [],
});

describe('Split tab', () => {
  test('each person owes their own items', async () => {
    await open(memoryKv(saved(aliAndMei)));
    await fireEvent.press(screen.getByTestId('tab_split'));
    expect(screen.getByTestId('share_1')).toHaveTextContent('RM 3.00', { exact: false });
    expect(screen.getByTestId('share_2')).toHaveTextContent('RM 2.50', { exact: false });
    expect(screen.getByTestId('bill_total')).toHaveTextContent('RM 5.50', { exact: false });
    expect(screen.queryByTestId('split_banner')).not.toBeOnTheScreen();
  });

  test('one unassigned item marks the shares incomplete', async () => {
    await open(memoryKv(saved({ ...aliAndMei, items: [...aliAndMei.items, unassigned(5, 'Milo', 400)], nextId: 6 })));
    await fireEvent.press(screen.getByTestId('tab_split'));
    expect(screen.getByTestId('split_banner')).toHaveTextContent('1 item unassigned (RM 4.00). Shares are incomplete.');
    expect(screen.getByTestId('share_1')).toHaveTextContent('incomplete', { exact: false });
    expect(screen.getByText('Milo')).toBeOnTheScreen();
    expect(screen.getByTestId('bill_total')).toHaveTextContent('RM 9.50', { exact: false });
  });

  test('several unassigned items are counted together', async () => {
    const items = [...aliAndMei.items, unassigned(5, 'Milo', 400), unassigned(6, 'Kopi', 100)];
    await open(memoryKv(saved({ ...aliAndMei, items, nextId: 7 })));
    await fireEvent.press(screen.getByTestId('tab_split'));
    expect(screen.getByTestId('split_banner')).toHaveTextContent('2 items unassigned (RM 5.00). Shares are incomplete.');
  });

  test('editing a price on the Items tab updates the split at once', async () => {
    await open(memoryKv(saved(aliAndMei)));
    await fireEvent.press(screen.getByTestId('item_3'));
    await fireEvent.changeText(screen.getByTestId('item_price'), '3.50');
    await fireEvent.press(screen.getByTestId('item_save'));
    await fireEvent.press(screen.getByTestId('tab_split'));
    expect(screen.getByTestId('share_1')).toHaveTextContent('RM 3.50', { exact: false });
    expect(screen.getByTestId('bill_total')).toHaveTextContent('RM 6.00', { exact: false });
  });
});

describe('shared items', () => {
  const table: Bill = {
    ...emptyBill,
    people: [
      { id: 1, name: 'Ali' },
      { id: 2, name: 'Mei' },
      { id: 3, name: 'Raj' },
    ],
    items: [{ id: 4, name: 'Satay', quantity: 1, unitPriceSen: 1200, assignedTo: [] }],
    nextId: 5,
  };

  async function assign(...ids: number[]) {
    await fireEvent.press(screen.getByTestId('item_4'));
    for (const id of ids) await fireEvent.press(screen.getByTestId(`assign_${id}`));
    await fireEvent.press(screen.getByTestId('item_save'));
  }

  test('an item shared by three is divided equally', async () => {
    await open(memoryKv(saved(table)));
    await assign(1, 2, 3);
    expect(screen.getByTestId('item_4')).toHaveTextContent('Ali, Mei, Raj', { exact: false });
    await fireEvent.press(screen.getByTestId('tab_split'));
    for (const id of [1, 2, 3]) expect(screen.getByTestId(`share_${id}`)).toHaveTextContent('RM 4.00', { exact: false });
  });

  test('taking one person off divides the item among the rest', async () => {
    await open(memoryKv(saved(table)));
    await assign(3, 1, 2);
    await assign(3);
    expect(screen.getByTestId('item_4')).toHaveTextContent('Ali, Mei', { exact: false });
    await fireEvent.press(screen.getByTestId('tab_split'));
    expect(screen.getByTestId('share_1')).toHaveTextContent('RM 6.00', { exact: false });
    expect(screen.getByTestId('share_2')).toHaveTextContent('RM 6.00', { exact: false });
    expect(screen.getByTestId('share_3')).toHaveTextContent('RM 0.00', { exact: false });
  });

  test('a chip shows whether its person is selected', async () => {
    await open(memoryKv(saved(table)));
    await fireEvent.press(screen.getByTestId('item_4'));
    await fireEvent.press(screen.getByTestId('assign_1'));
    await fireEvent.press(screen.getByTestId('assign_2'));
    expect(screen.getByTestId('assign_1')).toBeSelected();
    expect(screen.getByTestId('assign_2')).toBeSelected();
    expect(screen.getByTestId('assign_3')).not.toBeSelected();
  });
});

describe('charges', () => {
  // Assigned subtotals Ali RM 30.00 and Mei RM 10.00 (spec US3).
  const thirtyAndTen: Bill = {
    ...emptyBill,
    people: [
      { id: 1, name: 'Ali' },
      { id: 2, name: 'Mei' },
    ],
    items: [
      { id: 3, name: 'Nasi Kandar', quantity: 1, unitPriceSen: 3000, assignedTo: [1] },
      { id: 4, name: 'Roti Canai', quantity: 1, unitPriceSen: 1000, assignedTo: [2] },
    ],
    nextId: 5,
  };

  async function enterCharge(testID: string, text: string) {
    await fireEvent.changeText(screen.getByTestId(testID), text);
    await fireEvent(screen.getByTestId(testID), 'blur');
  }

  test('service charge and SST are divided by what each person had', async () => {
    const kv = await open(memoryKv(saved(thirtyAndTen)));
    await enterCharge('charge_service', '4.00');
    await enterCharge('charge_sst', '2.64');
    expect(savedBill(kv)).toMatchObject({ serviceChargeSen: 400, sstSen: 264 });
    await fireEvent.press(screen.getByTestId('tab_split'));
    expect(screen.getByTestId('share_1')).toHaveTextContent('RM 34.98', { exact: false });
    expect(screen.getByTestId('share_2')).toHaveTextContent('RM 11.66', { exact: false });
    expect(screen.getByTestId('bill_total')).toHaveTextContent('RM 46.64', { exact: false });
  });

  test('the ± toggle makes the rounding adjustment negative', async () => {
    const kv = await open(memoryKv(saved({ ...thirtyAndTen, serviceChargeSen: 400, sstSen: 264 })));
    await enterCharge('charge_rounding', '0.02');
    await fireEvent.press(screen.getByTestId('charge_rounding_sign'));
    expect(savedBill(kv)?.roundingSen).toBe(-2);
    await fireEvent.press(screen.getByTestId('tab_split'));
    expect(screen.getByText('-RM 0.02')).toBeOnTheScreen();
    expect(screen.getByTestId('bill_total')).toHaveTextContent('RM 46.62', { exact: false });
  });

  test('a rounding adjustment over 2 sen is refused', async () => {
    const kv = await open(memoryKv(saved(thirtyAndTen)));
    await enterCharge('charge_rounding', '0.05');
    expect(screen.getByText('Enter a rounding adjustment from -RM 0.02 to RM 0.02.')).toBeOnTheScreen();
    expect(savedBill(kv)).toEqual(thirtyAndTen);
  });

  test('a charge that is not an amount is refused', async () => {
    const kv = await open(memoryKv(saved(thirtyAndTen)));
    await enterCharge('charge_service', 'abc');
    expect(screen.getByText('Enter an amount like 12.50')).toBeOnTheScreen();
    expect(savedBill(kv)).toEqual(thirtyAndTen);
  });

  test('a blank charge counts as RM 0.00', async () => {
    const kv = await open(memoryKv(saved({ ...thirtyAndTen, serviceChargeSen: 400 })));
    await enterCharge('charge_service', '');
    expect(savedBill(kv)?.serviceChargeSen).toBe(0);
  });

  test("a person's card opens to show their breakdown", async () => {
    await open(memoryKv(saved({ ...thirtyAndTen, serviceChargeSen: 400, sstSen: 264, roundingSen: -2 })));
    await fireEvent.press(screen.getByTestId('tab_split'));
    expect(screen.getByTestId('share_1')).not.toHaveTextContent('Nasi Kandar', { exact: false });
    await fireEvent.press(screen.getByTestId('share_1'));
    const card = screen.getByTestId('share_1');
    // Ali: item RM 30.00, service charge RM 3.00, SST RM 1.98, rounding -RM 0.02 (tie to the first-added).
    for (const text of ['Nasi Kandar', 'RM 30.00', 'Service charge', 'RM 3.00', 'SST', 'RM 1.98', 'Rounding adjustment', '-RM 0.02', 'Total', 'RM 34.96']) {
      expect(card).toHaveTextContent(text, { exact: false });
    }
  });

  test('charges with nothing assigned cannot be divided', async () => {
    const nothingAssigned = { ...thirtyAndTen, items: thirtyAndTen.items.map((i) => ({ ...i, assignedTo: [] })) };
    await open(memoryKv(saved({ ...nothingAssigned, serviceChargeSen: 400 })));
    await fireEvent.press(screen.getByTestId('tab_split'));
    expect(screen.getByTestId('split_banner')).toHaveTextContent('Assign at least one item before charges can be divided.');
    expect(screen.queryByTestId('share_1')).not.toBeOnTheScreen();
  });

  test('a share that would go below RM 0.00 is not shown', async () => {
    const oneSen: Bill = {
      ...emptyBill,
      people: [{ id: 1, name: 'Ali' }],
      items: [{ id: 2, name: 'Gula', quantity: 1, unitPriceSen: 1, assignedTo: [1] }],
      roundingSen: -2,
      nextId: 3,
    };
    await open(memoryKv(saved(oneSen)));
    await fireEvent.press(screen.getByTestId('tab_split'));
    expect(screen.getByTestId('split_banner')).toHaveTextContent('A share would go below RM 0.00. Check the rounding adjustment.');
    expect(screen.queryByTestId('share_1')).not.toBeOnTheScreen();
  });
});
