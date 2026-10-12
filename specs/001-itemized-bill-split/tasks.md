---

description: "Task list for Manual Itemized Bill Splitting (Expo SDK 57, Android)"
---

# Tasks: Manual Itemized Bill Splitting

**Input**: Design documents from `specs/001-itemized-bill-split/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Required. Constitution III makes money logic test-first (NON-NEGOTIABLE). Every test task is followed by the task that makes it pass, one behaviour per pair (red → green). Expected values come from the spec's worked examples or are worked by hand from the rule in data-model.md, never recomputed the way the code does.

**Seams** (plan.md, Structure Decision). Tests cross only these:

| Seam | Where | Test project |
|---|---|---|
| `bill` module | `src/bill/index.ts` (contracts/bill-module.md) | Jest `node` |
| `allocate` (internal) | `src/bill/allocate.ts`, only for its own edge cases | Jest `node` |
| `BillStore` | `createBillStore(kv)` in `src/storage/billStore.ts`, with an in-memory kv | Jest `node` |
| `BillScreen` | rendered with an in-memory store, driven by the `testID`s in contracts/ui.md | Jest `android` |

**Organization**: Tasks are grouped by user story so each story can be built and tested on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: The user story the task belongs to (US1, US2, US3)

## Path Conventions

One Expo project at the repository root: `src/bill`, `src/storage`, `src/screens` (plan.md). Tests sit next to the code as `*.test.ts(x)`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: An Expo SDK 57 TypeScript project at the repository root with test, lint and type-check commands working.

- [X] T001 Scaffold the project: the repository root is not empty, so run `npx create-expo-app@latest split-the-bill --template blank-typescript` in a scratch folder outside the repo, then copy `package.json`, `package-lock.json`, `app.json`, `tsconfig.json`, `index.ts`, `App.tsx` and `assets/` into the repository root. Merge the template's `.gitignore` into `.gitignore` at the root (create it if missing); it must cover `node_modules/`, `.expo/`, `dist/`, `*.apk`, `.env*`. Confirm `package.json` has `expo` ≥ 57.0.9 (research.md R1: 57.0.28 is current) and `react-native` 0.86.x.
- [X] T002 Configure `app.json` (`name` "Split the Bill", `slug` "split-the-bill", `android.package` "com.aimanyuri.splitthebill", `android.allowBackup` false so Android Auto Backup never copies the bill to Google Drive (Constitution II), and `android.blockedPermissions` ["android.permission.INTERNET"] (research.md R1)) and `tsconfig.json` (extends `expo/tsconfig.base`, `"strict": true`). Do no iOS-specific configuration (iOS is on hold).
- [X] T003 Move `App.tsx` to `src/App.tsx` and update the import in `index.ts` (`registerRootComponent`).
- [X] T004 Install runtime dependencies with SDK-matched versions: `npx expo install expo-sqlite react-native-safe-area-context` (research.md R7). Updates `package.json`.
- [X] T005 Install test dependencies: `npx expo install jest-expo jest@^29 @types/jest -- --dev` and `npm install --save-dev @testing-library/react-native@14.1.0 test-renderer@^1`. Create `jest.config.js` with two `projects`: `node` (preset `jest-expo/node`, `testMatch` `src/bill/**/*.test.ts` and `src/storage/**/*.test.ts`) and `android` (preset `jest-expo/android`, `testMatch` `src/screens/**/*.test.tsx`). If `npx expo install` rejects the `jest@^29` range, install it with `npm install --save-dev jest@^29` instead. Add `package.json` scripts: `"test": "jest"`, `"typecheck": "tsc --noEmit"`, `"lint": "expo lint"`.
- [X] T006 [P] Run `npx expo lint` to create `eslint.config.js` (flat config extending `eslint-config-expo`). Add a `no-restricted-imports` rule for files `src/bill/**` that forbids `react`, `react-native`, `react-native/*`, `expo`, `expo-*` and `@expo/*` (Constitution III).
- [X] T007 Prove the RNTL 14 / jest-expo 57 pairing (research.md R6, **unverified**): write `src/ui/smoke.test.tsx` that does `await render(<Text testID="smoke">ok</Text>)` and expects `screen.getByTestId('smoke')` to have text `ok`. If it fails because of the pairing, switch to `@testing-library/react-native@^13` with `react-test-renderer@19.2.3` instead of `test-renderer`, and record the switch in research.md R6. That fallback is unverified too (Expo's docs call `react-test-renderer` deprecated for React 19); if both setups fail, stop and ask the developer before going on.
- [X] T008 Check the setup: `npm test`, `npm run typecheck`, `npm run lint` and `npx expo install --check` all pass.

**Checkpoint**: A blank app that type-checks, lints and runs tests in both Jest projects.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Money text, the division rule, the `Bill` value and its saved form, the store, and the screen shell with tabs. Every story needs all of them.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Money text (seam: `bill` module)

- [X] T009 [P] Write failing tests for `formatRm` in `src/bill/money.test.ts`, importing from `src/bill`: `1230` → `"RM 12.30"`, `0` → `"RM 0.00"`, `-2` → `"-RM 0.02"`, `123450` → `"RM 1,234.50"`, `9999999` → `"RM 99,999.99"`, `9989999001` → `"RM 99,899,990.01"`.
- [X] T010 Implement `formatRm(sen)` in `src/bill/money.ts` with integer `/` and `%` on sen, no `Intl`, `toFixed` or floats (contracts/bill-module.md), and export it from `src/bill/index.ts`. T009 passes.
- [X] T011 Write failing tests for `parseRm` in `src/bill/money.test.ts`: `"8.5"` → `850`, `"8.50"` → `850`, `"RM 8.50"` → `850`, `" 1,234.50 "` → `123450`, `"0.29"` → `29`, `"12"` → `1200`; `null` for `"8.505"`, `"abc"`, `""`, `"1.2.3"`, `"-1"` (no `allowNegative`); with `{ allowNegative: true }`: `"-0.02"` → `-2`, `"0.02"` → `2`.
- [X] T012 Implement `parseRm` in `src/bill/money.ts` by validating the digit string and building sen from the whole and fraction digits as integers, never through `parseFloat` or `Number(text)` on a decimal (FR-004; "accepts at most 2 decimal places and rejects anything else with `null`"). Export it. T011 passes.

### Division rule (seam: `allocate`, internal)

- [X] T013 [P] Write failing tests for `allocate(amountSen, weights)` in `src/bill/allocate.test.ts` (data-model.md, "Division rule"): `1000` over `[1, 1, 1]` → `[334, 333, 333]` (spec US2 scenario 2: the extra sen goes to the first-added person); `400` over `[3000, 1000]` → `[300, 100]` (US3 scenario 1); `264` over `[3000, 1000]` → `[198, 66]`; `1` over `[1, 1]` → `[1, 0]` (tie broken by order); `5` over `[0, 2, 3]` → `[0, 2, 3]` (weight 0 gets 0); `-2` over `[3000, 1000]` → `[-2, 0]` (allocate 2: starting portions 1 and 0 with equal remainders, so the leftover sen goes to the first; then negate: clarified FR-012. Corrected during implementation from `[-1, -1]`, which contradicted the division rule); `9999999` over `[9989999001, 9989999001]` → `[5000000, 4999999]` with every result a safe integer; all-zero weights throw a `RangeError` whose message says the total weight is 0.
- [X] T014 Implement `allocate` in `src/bill/allocate.ts`: handle the sign first, compute `amount × weightᵢ` quotient and remainder in `bigint` built with `BigInt(x)` (no `123n` literals: research.md R2), hand the leftover sen one each to the largest remainders with ties by array order, and convert portions back with `Number(x)`. Do not re-export it from `src/bill/index.ts`. T013 passes.

### Bill value and saved form (seam: `bill` module)

- [X] T015 [P] Write failing tests in `src/bill/codec.test.ts`: `emptyBill` has no items, no people, all three charges `0` and `nextId` `1`; `decodeBill(encodeBill(b))` deep-equals `b` for the example bill in contracts/bill-file.md; `encodeBill` output contains `"version":1` and stores no line amounts. `decodeBill` returns `null` for: invalid JSON; `version` 2; `quantity` 0 or 1000 ("1 to 999"); `unitPriceSen` 10000000 ("0 to 9,999,999"); `serviceChargeSen` or `sstSen` −1 or 10000000; `roundingSen` 3 ("−2 to +2"); any fractional amount such as `850.5`; a blank name; two people named `Ali` and `ali` ("unique on the bill ignoring case"); 21 people ("0–20 entries"); an `assignedTo` id that is not a person on the bill; an id ≥ `nextId`; duplicate ids; an `assignedTo` with a repeated id or not in people order.
- [X] T016 Implement the `Bill`, `Item`, `Person` types, `emptyBill` and `lineAmountSen` in `src/bill/bill.ts`, and `encodeBill` / `decodeBill` in `src/bill/codec.ts`, checking every data-model.md rule on decode. Export them from `src/bill/index.ts`. T015 passes.

### Store (seam: `BillStore`)

- [X] T017 [P] Write failing tests in `src/storage/billStore.test.ts` against an in-memory kv object with `getItemSync`, `setItemSync` and `removeItemSync`: an empty kv loads `{ bill: emptyBill, recovered: false }`; `save(b)` then `load()` returns `b`; a stored value `"{"` loads `emptyBill` with `recovered: true`, leaves `"{"` under key `bill.unreadable` and removes key `bill`; `clear()` removes `bill` and leaves `bill.unreadable`; when the kv's `setItemSync` throws, `save` throws the same error (contracts/bill-file.md).
- [X] T018 Implement `createBillStore(kv)` in `src/storage/billStore.ts` using `encodeBill` / `decodeBill` from `src/bill`. T017 passes.

### Screen shell (seam: `BillScreen`)

- [X] T019 Write failing tests in `src/screens/bill/BillScreen.test.tsx` that render `<BillScreen store={…} />` with an in-memory store inside `SafeAreaProvider` (with `initialMetrics`): the Items tab shows "No items yet. Add the first line from the receipt."; pressing `tab_people` and `tab_split` switches content; pressing `new_bill` shows "Start a new bill? The current bill will be deleted." through `Alert.alert` (spy on it) and confirming clears the store's `bill` key (FR-020); a store holding an unreadable value shows "Your saved bill couldn't be opened, so a new bill was started." once on launch.
- [X] T020 Implement `src/screens/bill/useBill.ts` (`useState<Bill>` from `store.load()`; `commit(edit)` saves through `store.save` and then sets state on `ok`, returns the rejection otherwise, and on a save error keeps the state and returns "Couldn't save this change: <error message>"; `split` via `useMemo`), `src/screens/bill/components/TabBar.tsx`, `src/screens/bill/BillScreen.tsx` (header with `new_bill`, active tab, tab bar, safe-area insets) and `src/App.tsx` (`SafeAreaProvider`, `createBillStore` with the default export of `expo-sqlite/kv-store`). Delete `src/ui/smoke.test.tsx`. T019 passes.

**Checkpoint**: The app opens on an empty bill with three tabs. Money text, division, saving and loading are proven by tests.

---

## Phase 3: User Story 1 - Split a bill by item (Priority: P1) 🎯 MVP

**Goal**: Enter items, add people, assign each item and read each person's share, with every committed change saved.

**Independent Test**: Enter 3 items, add 2 people, assign each item to one person; each share equals the sum of that person's items and the shares add up to the bill total (spec US1).

### Item edits (seam: `bill` module)

- [X] T021 [P] [US1] Write failing tests in `src/bill/bill.test.ts` for `addItem`, `updateItem`, `removeItem`: adding "Nasi Lemak", quantity 2, `unitPriceSen` 850 gives `lineAmountSen` 1700 and item subtotal 1700 (US1 scenario 1); the new item takes `id` = `nextId` and `nextId` goes up by 1; the name is trimmed; rejections leave the input bill unchanged: `BlankName` for `"  "`, `QuantityOutOfRange` for 0, 1000 and 1.5 ("1 to 999"), `PriceOutOfRange` for −1, 10000000 and 850.5 ("0 to 9,999,999"), `UnknownPerson` for an `assignedTo` id not on the bill, `UnknownId` for updating or removing a missing id. Duplicate item names are allowed. With Ali (added first) and Mei on the bill, `assignedTo` `[MeiId, AliId, AliId]` is stored as `[AliId, MeiId]` (data-model.md: "Edit functions remove duplicate ids and reorder the rest to people order").
- [X] T022 [US1] Implement `addItem`, `updateItem` and `removeItem` in `src/bill/bill.ts` and export them. T021 passes.

### People edits (seam: `bill` module)

- [X] T023 [P] [US1] Write failing tests in `src/bill/bill.test.ts` for `addPerson`, `renamePerson`, `removePerson`: names are trimmed; `BlankName` for `""`; `DuplicatePersonName` for `"ali"` when `"Ali"` exists (FR-006); the 20th person is accepted and the 21st gets `TooManyPeople` (FR-007); renaming keeps id and position, and renaming `"Ali"` to `"ALI"` is allowed; removing a person removes their id from every item's `assignedTo`, so items only they had become unassigned; a removed then re-added name gets a new id at the end of the order ("Never reused"); `UnknownId` for a missing id.
- [X] T024 [US1] Implement `addPerson`, `renamePerson` and `removePerson` in `src/bill/bill.ts` and export them. T023 passes.

### Split without charges (seam: `bill` module)

- [X] T025 [P] [US1] Write failing tests in `src/bill/split.test.ts`: Ali with "Teh Tarik" 300 and Mei with "Roti Canai" 250 gives shares 300 and 250, `billTotalSen` 550, status `Complete` (US1 scenario 2); adding an unassigned item of 400 gives status `Incomplete`, that item in `unassignedItems`, `unassignedAmountSen` 400, and shares plus 400 equal `billTotalSen` 950 (US1 scenario 3, FR-010); a person with no items has a share of 0; with no people every item is unassigned and `shares` is empty. Shared items (spec US2): "Satay" 1200 assigned to Ali, Mei and Raj gives each an item portion of 400 (US2 scenario 1); an item of 1000 assigned to 3 gives portions 334, 333, 333, with the 334 going to the first-added person, summing to 1000 (US2 scenario 2); quantity 2 × 500 shared by 3 divides the line amount 1000, not the unit price (spec edge case); removing Raj from the Satay with `updateItem` gives Ali and Mei 600 each (US2 scenario 3); portions follow people order, not `assignedTo` order.
- [X] T026 [US1] Implement `split` in `src/bill/split.ts` for item portions (each item's line amount divided over its `assignedTo` in people order with `allocate` and equal weights, each `Share.itemPortions` listing that person's portion of every item they share), totals, unassigned items and the `Complete` / `Incomplete` statuses; charge portions are 0 for now. Export `split` and its types. T025 passes.

### Screens (seam: `BillScreen`)

- [X] T027 [US1] Add failing tests to `src/screens/bill/BillScreen.test.tsx` for the People tab: typing in `person_name` and pressing `add_person` lists the person as `person_<personId>`; adding `ali` after `Ali` shows the `DuplicatePersonName` message and adds no one; with 20 people, adding a 21st shows the `TooManyPeople` message and adds no one (FR-007); each row shows the person's current share (seed the in-memory store with a saved bill where Ali has a RM 3.00 "Teh Tarik": Ali's row shows "RM 3.00"); pressing `person_<personId>` and submitting a new name in `person_rename_<personId>` renames them; pressing `person_remove_<personId>` for a person who has items asks "Remove Ali? Their N items will lose Ali, and items only Ali had become unassigned." and removes them when the test presses the dialog's Remove button through the `Alert.alert` spy; after each committed change the in-memory kv's `bill` value decodes to the bill on screen (FR-019).
- [X] T028 [US1] Implement `src/screens/bill/messages.ts` (one message per `Rejection` in contracts/bill-module.md, plus "Enter an amount like 12.50" for a `null` from `parseRm`) and `src/screens/bill/components/PeopleTab.tsx` (list in added order with each current share, add, rename in place, remove with confirmation, testIDs from contracts/ui.md). T027 passes.
- [X] T029 [US1] Add failing tests to `src/screens/bill/BillScreen.test.tsx` for the Items tab and editor: `add_item` opens `item_editor`; filling `item_name` "Nasi Lemak", `item_quantity` "2", `item_price` "8.50" and pressing `item_save` lists the item with line amount "RM 17.00"; `item_price` "8.505" or "abc" shows "Enter an amount like 12.50" and keeps the editor open; toggling `assign_<personId>` assigns the item; with no people the chip row reads "Add people in the People tab to assign this item."; pressing `item_<itemId>` and then `item_delete` removes it; closing without saving changes nothing.
- [X] T030 [US1] Implement `src/screens/bill/components/ItemsTab.tsx` (item list with name, `qty × RM unit price`, line amount, assigned names or **Unassigned**, empty state, `add_item`) and `src/screens/bill/components/ItemEditor.tsx` (core `Modal` with `animationType="slide"`, `transparent`, bottom panel, `onRequestClose`, `KeyboardAvoidingView`, decimal keyboard for quantity and price, chips per person selecting one person per item (multi-select arrives in T034), `item_save`, `item_delete`, Cancel). T029 passes.
- [X] T031 [US1] Add failing tests to `src/screens/bill/BillScreen.test.tsx` for the Split tab, US1 scenarios 2–4: with Ali's "Teh Tarik" RM 3.00 and Mei's "Roti Canai" RM 2.50, `share_<AliId>` shows "RM 3.00", `share_<MeiId>` "RM 2.50", and `bill_total` "RM 5.50"; with one RM 4.00 item unassigned `split_banner` reads "1 item unassigned (RM 4.00). Shares are incomplete.", with two unassigned it reads "2 items unassigned (…)", the cards are marked incomplete and the unassigned items are listed; editing an item's price on the Items tab updates the Split tab at once (FR-018).
- [X] T032 [US1] Implement `src/screens/bill/components/SplitTab.tsx` (`split_banner` for `Incomplete` with singular and plural text, totals block per FR-015 with `bill_total`, one card per person with `share_<personId>`, unassigned items and amount), with every amount through `formatRm`. T031 passes.

**Checkpoint**: US1 works end to end and is the MVP: run quickstart.md §3 step 1 on an Android device.

---

## Phase 4: User Story 2 - Share an item between people (Priority: P2)

**Goal**: One item assigned to several people is divided equally among them, to the sen.

**Independent Test**: Assign one RM 10.00 item to 3 people; portions are RM 3.34, RM 3.33 and RM 3.33 and add up to RM 10.00 (spec US2).

The money behaviour is test-first in T025–T026 (Constitution III: shared-item division is built there, so its failing tests must come first). This phase adds the screen behaviour.

- [X] T033 [US2] Add failing tests to `src/screens/bill/BillScreen.test.tsx`: in `item_editor` toggling `assign_<AliId>`, `assign_<MeiId>` and `assign_<RajId>` on a RM 12.00 item gives each share RM 4.00; toggling Raj off again gives Ali and Mei RM 6.00 each; the item row lists all assigned names.
- [X] T034 [US2] Make T033 pass in `src/screens/bill/components/ItemEditor.tsx` and `src/screens/bill/components/ItemsTab.tsx`: chips are multi-select with `accessibilityState.selected`, and the row lists the names in people order.

**Checkpoint**: US1 and US2 both work on their own; run quickstart.md §3 step 2.

---

## Phase 5: User Story 3 - Include service charge, SST and rounding (Priority: P3)

**Goal**: The printed service charge, SST and rounding adjustment are divided in proportion to assigned subtotals, and shares add up to the amount actually paid.

**Independent Test**: With assigned subtotals Ali RM 30.00 and Mei RM 10.00, service charge RM 4.00 and SST RM 2.64, Ali owes RM 34.98 and Mei RM 11.66, totalling RM 46.64 (spec US3).

- [X] T035 [P] [US3] Write failing tests in `src/bill/bill.test.ts` for `setCharges`: accepts service charge and SST from 0 to 9999999 ("0 to 9,999,999") and the rounding adjustment from −2 to 2 ("−2 to +2"); `ChargeOutOfRange` for service charge or SST of −1, 10000000 or 1.5; `RoundingOutOfRange` for 3, −3 or 0.5 (FR-011); the input bill is unchanged on rejection.
- [X] T036 [US3] Implement `setCharges` in `src/bill/bill.ts` and export it. T035 passes.
- [X] T037 [P] [US3] Write failing tests in `src/bill/split.test.ts`: assigned subtotals Ali 3000 and Mei 1000 with service charge 400 give service portions 300 and 100 (US3 scenario 1); adding SST 264 gives totals 3498 and 1166 and `billTotalSen` 4664 (US3 scenario 2); service charge 400 and SST 262 give a total of 4662 before rounding, and a rounding adjustment of −2 makes `billTotalSen` 4660 with shares summing to 4660 (US3 scenario 3); a person with an assigned subtotal of 0 bears no charges; service charge 400 with every item unassigned gives status `ChargesUndividable` and no shares (FR-013); so does service charge 400 with one RM 0.00 item assigned to Ali (spec edge case: every assigned subtotal is RM 0.00); a single 1-sen item assigned to Ali with a rounding adjustment of −2 gives status `ShareBelowZero` and no shares (research.md R3); status order is `ChargesUndividable`, then `ShareBelowZero`, then `Incomplete`, then `Complete`. With an unassigned item, charges are divided by assigned subtotals only and shares plus the unassigned amount equal the bill total (FR-010).
- [X] T038 [US3] Implement the charges in `src/bill/split.ts`: each charge divided with `allocate` weighted by assigned subtotals, `billTotalSen` per FR-015, and the four statuses in data-model.md order. T037 passes.
- [X] T039 [US3] Add failing tests to `src/screens/bill/BillScreen.test.tsx`: entering "4.00" in `charge_service` and "2.64" in `charge_sst` and committing (blur or Done) shows Ali "RM 34.98", Mei "RM 11.66" and a bill total of "RM 46.64"; entering "0.02" in `charge_rounding` and pressing `charge_rounding_sign` shows the rounding adjustment as "-RM 0.02"; "0.05" in `charge_rounding` shows the `RoundingOutOfRange` message and changes nothing; a blank charge field counts as RM 0.00; pressing `share_<AliId>` expands the breakdown: each item portion, service charge, SST, rounding adjustment and total (US3 scenario 4, FR-014); with a charge and nothing assigned `split_banner` reads "Assign at least one item before charges can be divided." and no cards are shown.
- [X] T040 [US3] Implement `src/screens/bill/components/ChargesCard.tsx` (three fields, commit on blur and on submit, decimal keyboard, `charge_rounding_sign` ± toggle) under the item list in `src/screens/bill/components/ItemsTab.tsx`, and extend `src/screens/bill/components/SplitTab.tsx` with expandable breakdowns and the `ChargesUndividable` and `ShareBelowZero` banners from contracts/ui.md. T039 passes.

**Checkpoint**: All three stories work; run quickstart.md §3 steps 3 and 4.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T041 [P] Write the property test in `src/bill/splitProperty.test.ts`: a small seeded PRNG (mulberry32, inside the test file), a fixed list of seeds, and at least 5,000 generated valid bills (0–20 people, 0–50 items, random assignments, charges within their ranges). For every bill check the data-model.md invariants: "`sum(shares.map(s => s.totalSen)) + unassignedAmountSen === billTotalSen` whenever shares are shown"; each item's portions sum to its line amount; each charge's portions sum to the charge; equal-weight portions of one amount differ by at most 1 sen; a person with an assigned subtotal of 0 has a share of 0; every money value is a safe integer (SC-001). Also check plan.md's performance goal: the median of 100 `split` calls on a fixed 50-item, 20-person bill is under 1 ms. Any failure is first pinned as an example test in `src/bill/split.test.ts`, then fixed (Constitution III).
- [X] T042 [P] Confirm the money module holds Constitution I: no `parseFloat`, `toFixed`, `Math.round`, `Intl` or non-integer literal in `src/bill/*.ts` outside tests, and the `no-restricted-imports` rule reports a test import of `react-native` in a file under `src/bill` (then remove the test import).
- [X] T043 Run quickstart.md §1–2 (`npx jest`, `npx tsc --noEmit`, `npx expo lint`, `npx expo install --check`, `npx expo export --platform android`); all pass.
- [ ] T044 Run the manual device checks in quickstart.md §3 on an Android phone or emulator through Expo Go, including the kill (SC-005), restart (FR-019), edge-to-edge and timed 15-item receipt (SC-002) checks. Record any failure as a new task.
- [ ] T045 Build a standalone release APK and repeat the kill, restart and offline checks without a dev server (quickstart.md §4, FR-021). Confirm with `adb shell dumpsys package com.aimanyuri.splitthebill` that backup is disabled (no `ALLOW_BACKUP` flag) and `android.permission.INTERNET` is not requested (Constitution II).

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (Phase 1)**: none.
- **Foundational (Phase 2)**: after Setup; blocks every story.
- **US1 (Phase 3)**: after Foundational. No dependency on other stories.
- **US2 (Phase 4)**: its money behaviour is built test-first in T025–T026; its screen tasks (T033–T034) need the item editor from T030.
- **US3 (Phase 5)**: after Foundational. Its domain tasks (T035–T038) need `split` from T026; its screen tasks (T039–T040) need the Items and Split tabs from T030 and T032.
- **Polish (Phase 6)**: after the stories you intend to ship.

### Within each phase

- Each test task comes before the task that makes it pass; the pair is done when the test is green.
- `src/bill/bill.test.ts`, `src/bill/split.test.ts` and `src/screens/bill/BillScreen.test.tsx` are shared by several pairs, so their pairs run one after another, not in parallel.

### Parallel opportunities

- Setup: T006 alongside T005 once T004 is done.
- Foundational: the four domain test files (T009, T013, T015, T017) touch different files and can be written at the same time; each implementation follows its own test.
- After T026: the US3 domain pairs (T035–T038) can run in parallel with the US1 screen tasks (T027–T032).
- Polish: T041 and T042.

## Parallel Example: after Foundational

```text
Developer A: T021 → T022 → T023 → T024 → T025 → T026   (US1 domain)
Developer B: T027 → T028 → T029 → T030                  (US1 screens, once T024 lands)
After T026:  T035 → T036 → T037 → T038                  (US3 domain)
```

---

## Implementation Strategy

### MVP first (US1 only)

1. Phase 1 Setup, then Phase 2 Foundational.
2. Phase 3 (US1).
3. **Stop and validate**: `npm test`, then quickstart.md §3 step 1 on a device.

### Incremental delivery

1. Setup + Foundational: an empty app with tabs, persistence and the money core.
2. Add US1: the MVP, a usable split for bills with no shared dishes or charges (the money module already divides shared items; the editor gains multi-select in US2).
3. Add US2: shared dishes.
4. Add US3: service charge, SST and rounding, so shares match what is actually paid.
5. Polish: property tests, the quickstart run and the release APK check.

## Notes

- iOS is on hold: no task configures, builds or tests iOS.
- Do not commit; the developer does all git writes.
