# Implementation Plan: Manual Itemized Bill Splitting

**Branch**: `feat/001-itemized-bill-split` | **Date**: 2026-10-12 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-itemized-bill-split/spec.md`

## Summary

Build the first version of the Android app in TypeScript with React Native and Expo: type in a receipt's items, add people, assign items (shared items allowed), enter the printed service charge, SST and rounding adjustment, and read each person's share. iOS is on hold. All money logic is a pure-TypeScript `bill` module: an immutable `Bill`, edit functions that return the new bill or a rejection, and one `split(bill)` function that divides every amount with a single largest-remainder rule so the shares always add up to the bill total to the sen. Amounts are integer sen; the one product that can exceed the safe-integer range is computed in `bigint`. The bill is saved synchronously to `expo-sqlite/kv-store` on every committed edit. The UI is one screen with three tabs.

## Technical Context

**Language/Version**: TypeScript ~6.0 (strict), React 19.2, React Native 0.86 on Expo SDK 57; Node ≥ 22.13 for tooling (research.md R1)

**Primary Dependencies**: `expo`, `expo-status-bar` (template), plus `expo-sqlite` (kv-store) and `react-native-safe-area-context`. No navigation, state or UI library (R5, R7).

**Storage**: One JSON document under key `bill` in `expo-sqlite/kv-store`, written with `setItemSync` on every committed edit (R4, contracts/bill-file.md)

**Testing**: Jest 29 with `jest-expo` 57: a `node` project for `src/bill` and `src/storage`, an `android` project for `src/ui` component journeys with `@testing-library/react-native` 14 (R6). Manual device checks in quickstart.md.

**Target Platform**: Android 7.0+ (minSdk 24), targetSdk and compileSdk 36. iOS on hold.

**Project Type**: Mobile app, single Expo project

**Performance Goals**: Shares update within one frame of an edit (FR-018); `split` on a 50-item, 20-person bill well under 1 ms; each save a single small SQLite write

**Constraints**: Fully offline, no account (FR-021); integer sen only, always safe integers, `bigint` inside division (Constitution I); every committed edit saved before it is shown (FR-019); `src/bill` imports nothing from React, React Native or Expo (Constitution III); Android Auto Backup off (`android.allowBackup: false`) and the `INTERNET` permission blocked, so bill data cannot leave the device (Constitution II)

**Scale/Scope**: One bill at a time, ≤ 20 people, typically ≤ 50 items; three tabs, one modal editor, three confirmation dialogs

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Status |
|---|---|---|
| I. Money Is Exact | All amounts integer sen in safe-integer `number`s; edit functions reject non-integers; `allocate` computes the `amount × weight` product in `bigint` (R2); one documented largest-remainder rule; charges proportional to assigned subtotals; `formatRm` display-only and never parsed back; sum invariant property-tested. | Pass |
| II. Offline & On-Device | No network use, no account, no backend. Bill stored in the app's private SQLite database. Expo enables Android Auto Backup to Google Drive by default, so `app.json` sets `android.allowBackup: false`; it also blocks `android.permission.INTERNET`. Development runs in Expo Go, which is unaffected. No photos in this feature. | Pass |
| III. Test-First Money Logic | `src/bill` is pure TypeScript, enforced by a lint rule; its tests run in the Jest `node` project with no device. Tasks must order tests first. | Pass |
| IV. Simplicity | One Expo project, folders for separation. No navigation, state, UI, decimal or property-testing library. `BillStore` takes its key-value store as a parameter because it has two real adapters (kv-store and the test's in-memory object). Two runtime and five dev dependencies added, each justified in R7. | Pass |
| Tech & Locale | TypeScript strict, React Native + Expo, single project, Android phones only (iOS on hold), MYR, rounding adjustment limited to ±2 sen. The ±5 sen total-match check is Feature 2, not this one. Done gate: type check, lint, unit tests, Android build (quickstart.md §1–2). | Pass |

**Post-design re-check (after Phase 1)**: Pass. The design added no layers beyond the three folders below; Complexity Tracking stays empty.

## Project Structure

### Documentation (this feature)

```text
specs/001-itemized-bill-split/
├── plan.md              # This file
├── research.md          # Phase 0: decisions R1–R8
├── data-model.md        # Phase 1: entities, rules, division rule, invariants
├── quickstart.md        # Phase 1: how to validate
├── contracts/
│   ├── bill-module.md   # TypeScript interface of the pure money module
│   ├── bill-file.md     # Saved format, BillStore, read/write behaviour
│   └── ui.md            # Screens, states, dialogs, test IDs
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
package.json             # scripts: start, android, test, lint, typecheck
app.json                 # name, slug, android.package com.aimanyuri.splitthebill
tsconfig.json            # extends expo/tsconfig.base, strict
eslint.config.js         # eslint-config-expo + no-restricted-imports for src/bill/**
jest.config.js           # projects: node (src/bill, src/storage), android (src/ui)
index.ts                 # registerRootComponent(App)
src/
├── bill/                # pure TypeScript, no react / react-native / expo imports
│   ├── index.ts         # the module's public interface (contracts/bill-module.md)
│   ├── bill.ts          # Bill, Item, Person, Edit, Rejection, edit functions
│   ├── split.ts         # split(), Split, Share, ItemPortion, SplitStatus
│   ├── allocate.ts      # largest-remainder division in bigint (not re-exported)
│   ├── money.ts         # parseRm, formatRm
│   ├── codec.ts         # encodeBill, decodeBill
│   └── *.test.ts        # bill, split, allocate, money, codec, splitProperty (seeded PRNG)
├── storage/
│   ├── billStore.ts     # createBillStore(kv): load, save, clear
│   └── billStore.test.ts
└── ui/
    ├── App.tsx          # SafeAreaProvider, createBillStore(Storage), <BillScreen store>
    ├── useBill.ts       # bill state, commit(edit) saves then sets, split via useMemo
    ├── BillScreen.tsx   # takes the store; header with New bill, active tab, TabBar
    ├── TabBar.tsx
    ├── ItemsTab.tsx     # item list, ChargesCard
    ├── ChargesCard.tsx
    ├── ItemEditor.tsx   # core Modal
    ├── PeopleTab.tsx
    ├── SplitTab.tsx
    ├── messages.ts      # Rejection → message text
    └── BillJourney.test.tsx
```

**Structure Decision**: One Expo project (constitution), separated into three folders. The template's root `App.tsx` moves to `src/ui/App.tsx`.

- **`src/bill`** is the deep module and the main seam. Its interface is small: the `Bill` value, seven edit functions, `split`, `parseRm`, `formatRm`, `encodeBill` and `decodeBill` (contracts/bill-module.md). Behind it sit validation, the division rule, `bigint` arithmetic, charge proportioning, status rules, the sum invariant and the saved format. All money tests cross this seam. `allocate` is an internal seam tested directly only for its own edge cases.
- **`src/storage`** has one function, `createBillStore(kv)`, with `load`, `save` and `clear`. It is the persistence seam: it owns the key names and the unreadable-value recovery, and knows nothing of the JSON shape. Its two adapters are kv-store in the app and an in-memory object in tests.
- **`src/ui`** holds the screens and `useBill`. `useBill` turns user intents into `bill` edits, saves through the store before showing the result, and keeps the last rejection for the form to show. It has no money logic of its own; amounts reach it only through `parseRm`, `formatRm` and `split`. The journey test renders `BillScreen` with an in-memory store and crosses the same seam a user does: `testID`s from contracts/ui.md.

## Complexity Tracking

No violations to justify.
