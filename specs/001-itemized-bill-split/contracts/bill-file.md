# Contract: saved bill

The bill in progress is kept on the device, in the app's private storage (Constitution II): one entry with key `bill` in the `expo-sqlite/kv-store` database (research.md R4).

## Format (version 1)

The value is one JSON document:

```json
{
  "version": 1,
  "nextId": 6,
  "serviceChargeSen": 400,
  "sstSen": 264,
  "roundingSen": -2,
  "people": [
    { "id": 1, "name": "Ali" },
    { "id": 2, "name": "Mei" }
  ],
  "items": [
    { "id": 3, "name": "Teh Tarik", "quantity": 1, "unitPriceSen": 300, "assignedTo": [1] },
    { "id": 4, "name": "Satay", "quantity": 1, "unitPriceSen": 1200, "assignedTo": [1, 2] },
    { "id": 5, "name": "Roti Canai", "quantity": 2, "unitPriceSen": 250, "assignedTo": [] }
  ]
}
```

- All amounts are JSON integers in sen. Line amounts and anything from `split` are not stored.
- `people` and `items` keep their array order; people order is the tie-break order.
- `assignedTo` holds person ids.
- `encodeBill` and `decodeBill` in the `bill` module own this format (contracts/bill-module.md); the store only moves strings.

## `BillStore`

`src/storage/billStore.ts`:

```ts
type KeyValue = { getItemSync(key: string): string | null; setItemSync(key: string, value: string): void; removeItemSync(key: string): void };

export function createBillStore(kv: KeyValue): {
  load(): { bill: Bill; recovered: boolean }; // recovered = the saved bill was unreadable and was moved aside
  save(bill: Bill): void;
  clear(): void;
};
```

The app passes the kv-store default export; tests pass an in-memory object with the same three methods.

## Reading (once, on launch)

| Stored state | Result |
|---|---|
| No `bill` key | An empty bill. Normal on first launch and after "New bill". |
| Valid, `version` 1 | That bill. |
| Unreadable: bad JSON, unknown `version`, or a value that breaks a data-model rule | The raw value is copied to key `bill.unreadable` and `bill` is removed, the app starts with an empty bill, and it tells the user once that the saved bill could not be opened (`recovered: true`). Nothing is silently discarded. |

## Writing

- After every committed edit (FR-019), the whole bill is written with one `setItemSync('bill', …)`, synchronously, before the new state is shown. SQLite makes each write atomic: a kill during it leaves the previous complete bill.
- "New bill" calls `clear()`, which removes the `bill` key. `bill.unreadable`, if any, is left alone.
- If a write throws, the edit is not applied: the bill on screen stays equal to the bill on disk, and the form shows "Couldn't save this change: <error message>".
