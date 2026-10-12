# Data Model: Manual Itemized Bill Splitting

Terms follow [GLOSSARY.md](../../GLOSSARY.md). All amounts are integer sen held in a `number` that is always a safe integer (`Number.isSafeInteger`); no fractional value ever represents money (Constitution I). Every bound below keeps stored amounts and sums far inside the safe range; the one calculation that can exceed it, the product inside the division rule, uses `bigint` (research.md R2). Types are TypeScript; all objects are `readonly`.

## Entered state

The entered state is one immutable value, `Bill`. Every edit returns a new `Bill` or a rejection; the split is always derived from it (FR-018).

### Bill

| Field | Type | Rules |
|---|---|---|
| `items` | `readonly Item[]` | In entry order. Any length. |
| `people` | `readonly Person[]` | In the order added. List position is the tie-break order for remainder sen (FR-012). 0–20 entries (FR-007). |
| `serviceChargeSen` | `number` (integer) | 0 to 9,999,999 (RM 0.00–99,999.99). Default 0. |
| `sstSen` | `number` (integer) | 0 to 9,999,999. Default 0. |
| `roundingSen` | `number` (integer) | −2 to +2 (FR-011, clarified). Default 0. |
| `nextId` | `number` (integer) | Next id to hand out to a new item or person. Starts at 1, only increases. |

### Item

| Field | Type | Rules |
|---|---|---|
| `id` | `number` (integer) | Unique within the bill. Never reused. |
| `name` | `string` | Trimmed, not blank. Duplicates allowed (two "Teh Tarik" lines are normal). |
| `quantity` | `number` (integer) | 1 to 999 (FR-001; upper bound is a plan default that catches typos). |
| `unitPriceSen` | `number` (integer) | 0 to 9,999,999 (FR-004). |
| `assignedTo` | `readonly number[]` | Person ids, no duplicates, in people order. Edit functions remove duplicate ids and reorder the rest to people order; `decodeBill` rejects a saved list that is not already so. Every id refers to a person on the bill. Empty = unassigned (FR-010). |
| `lineAmountSen` | `number` (derived, not stored) | `quantity × unitPriceSen` (FR-002). Max 9,989,999,001, a safe integer. |

### Person

| Field | Type | Rules |
|---|---|---|
| `id` | `number` (integer) | Unique within the bill. Never reused, so a removed and re-added person is a new person at the end of the order. |
| `name` | `string` | Trimmed, not blank, unique on the bill ignoring case (FR-006). |

### Validation (edit rejections)

Each edit operation checks only what it changes and returns `{ ok: false, reason }` without changing the bill. Reasons are a string union.

| Reason | Raised by | Source |
|---|---|---|
| `BlankName` | add/update item, add/rename person | plan default |
| `DuplicatePersonName` | add/rename person | FR-006 |
| `TooManyPeople` | add person when 20 exist | FR-007 |
| `QuantityOutOfRange` | add/update item | FR-001 |
| `PriceOutOfRange` | add/update item | FR-004 |
| `ChargeOutOfRange` | set charges (service charge, SST) | plan default |
| `RoundingOutOfRange` | set charges (rounding adjustment) | FR-011 |
| `UnknownPerson` | add/update item with an id not on the bill | integrity |
| `UnknownId` | update/remove an item or person that does not exist | integrity |

Text that is not an amount at all (`"abc"`, `"8.505"`, `"-1"`) never reaches the bill: `parseRm` returns `null` and the form shows the message (FR-004).

### Transitions

- **Remove person**: the person's id is removed from every item's `assignedTo`. Items left with an empty set become unassigned (spec edge case). The UI confirms first when the person has items.
- **Rename person**: same id, same position.
- **New bill**: replaces the bill with `emptyBill` after the user confirms (FR-020). `nextId` restarts; nothing references old ids.
- There is no settled or locked state; every edit is allowed at any time.

## Derived state: Split

`split(bill)` is a pure function. Nothing in it is stored.

| Field | Meaning |
|---|---|
| `itemSubtotalSen` | Sum of all line amounts. |
| `billTotalSen` | `itemSubtotalSen + serviceChargeSen + sstSen + roundingSen` (FR-015). |
| `unassignedItems`, `unassignedAmountSen` | Items with an empty assignment and the sum of their line amounts (FR-010). |
| `shares` | One `Share` per person, in people order. Empty when `status` is `ChargesUndividable` or `ShareBelowZero`. |
| `status` | See below. |

### Share

| Field | Meaning |
|---|---|
| `person` | The person. |
| `itemPortions` | `(item, amountSen)` for each item assigned to the person (FR-014). |
| `assignedSubtotalSen` | Sum of `itemPortions`. |
| `serviceChargeSen`, `sstSen`, `roundingSen` | This person's portion of each charge (FR-012). |
| `totalSen` | Assigned subtotal plus the three charge portions. |

### Status (first matching row wins)

| Status | When | Shares shown? |
|---|---|---|
| `ChargesUndividable` | Some charge ≠ 0 and every assigned subtotal is 0 (FR-013). | No; the app explains why. |
| `ShareBelowZero` | Some share's total < 0. Only possible when the rounding adjustment exceeds a 1-sen assigned subtotal (spec edge case "no share below RM 0.00"). | No; the app asks the user to check the amounts. |
| `Incomplete` | At least one item is unassigned (FR-010). | Yes, marked incomplete. |
| `Complete` | Otherwise. | Yes, final. |

### Division rule (`allocate`)

Used for both shared items (equal weights) and charges (weights = assigned subtotals).

1. If the amount is negative, allocate its absolute value and negate every portion (clarified FR-012).
2. With total weight `W > 0`: each portion starts at `floor(amount × weightᵢ / W)`, and its remainder is `amount × weightᵢ mod W`. The product and both results are computed in `bigint`, then the portion is converted back to `number` (always a safe integer, since it is at most `amount`).
3. The leftover sen (amount minus the sum of the starting portions) go one each to the largest remainders, ties broken by people order.
4. A weight of 0 always gets 0, because its remainder is 0 and the leftover is always smaller than the number of non-zero remainders.

### Invariants (property-tested)

- `sum(shares.map(s => s.totalSen)) + unassignedAmountSen === billTotalSen` whenever shares are shown (FR-016, SC-001, FR-010).
- Each item's portions sum to its line amount; each charge's portions sum to the charge.
- No two portions of one divided amount differ by more than 1 sen when the weights are equal.
- A person with an assigned subtotal of 0 has a share of 0.
- Every money value in a `Split` is a safe integer.

## Persisted form

One JSON document per device, described in [contracts/bill-file.md](contracts/bill-file.md).
