# Quickstart: validating Manual Itemized Bill Splitting

How to prove the feature works once it is built. Android only; iOS is on hold. Data rules: [data-model.md](data-model.md). Screens and test IDs: [contracts/ui.md](contracts/ui.md). Saved form: [contracts/bill-file.md](contracts/bill-file.md).

## Prerequisites

- Node 22.13 or newer, and npm.
- For the device checks: an Android 7.0+ phone with USB debugging, or an Android emulator (Android Studio). Expo CLI installs Expo Go for SDK 57 on it.
- Commands run from the repository root, in Git Bash or PowerShell.

```bash
npm ci
```

## 1. Money logic, storage and screens (Node, no device)

```bash
npx jest
```

Expected: all tests pass in both Jest projects (`node` for `src/bill` and `src/storage`, `android` for `src/screens`). They cover every acceptance scenario and edge case in spec.md and the invariants in data-model.md. In particular:

| Check | Expected |
|---|---|
| RM 10.00 shared by 3 | 334, 333, 333 sen, first-added person gets the extra sen |
| Ali 3000 / Mei 1000 sen, service charge 400, SST 264 | Ali 3498, Mei 1166, total 4664 |
| Rounding −2 sen | Shares sum to bill total; no share below 0 |
| Charge entered, nothing assigned | `ChargesUndividable`, no shares |
| One item unassigned | `Incomplete`; shares + unassigned amount = bill total |
| Line amounts near the 9,989,999,001 sen maximum with a large charge | Exact portions; every value a safe integer |
| Seeded random bills (thousands) | Shares + unassigned amount = bill total for every bill |
| `parseRm`: `"8.505"`, `"abc"`, `"0.29"`, `"RM 1,234.50"` | `null`, `null`, 29, 123450 |
| Store round trip, missing key, unreadable value | Same bill back; empty bill; value moved to `bill.unreadable` |
| Journey tests (Stories 1–3) | Shares on the Split tab match the scenarios |

## 2. Static checks and build

```bash
npx tsc --noEmit
npx expo lint
npx expo install --check
npx expo export --platform android
```

Expected: no type errors; no lint errors (including no `react`, `react-native` or `expo*` import under `src/bill`); all packages match SDK 57; the Android bundle builds.

## 3. Manual checks on an Android device

Start the app with `npx expo start --android`, which opens it in Expo Go on the connected device or running emulator.

1. **Story 1**: add Teh Tarik RM 3.00 for Ali and Roti Canai RM 2.50 for Mei. The Split tab shows Ali RM 3.00, Mei RM 2.50, bill total RM 5.50.
2. **Story 2**: add Satay RM 12.00 for Ali, Mei and Raj. Each share includes RM 4.00 for it. Remove Raj from the satay: Ali and Mei get RM 6.00 each.
3. **Story 3**: with assigned subtotals Ali RM 30.00 and Mei RM 10.00, enter service charge 4.00 and SST 2.64. Ali RM 34.98, Mei RM 11.66, total RM 46.64. Open Ali's card to see the breakdown. Set rounding to −0.02 with the ± toggle: total RM 46.62.
4. **Rejections**: price `8.505`, price `abc`, rounding `0.05`, a 21st person and a duplicate name like `ali` each show a message and change nothing.
5. **Survives a kill (SC-005)**: enter a few items, send the app to the background and run `adb shell am kill host.exp.exponent` (Expo Go's package), or swipe it away from recents. Reopen: every committed item, person, assignment and charge is back.
6. **Survives a restart (FR-019)**: restart the phone and reopen the app. The bill is unchanged.
7. **Edge-to-edge**: the header, tab bar and item editor are not covered by the status bar, cutout or navigation bar, in both gesture and three-button navigation.
8. **Offline (FR-021)**: turn on airplane mode and repeat step 1. (Expo Go needs the dev server for the first load; use a release build for this check, or load the app first and then go offline.)
9. **Speed (SC-002)**: time entering a real 15-item receipt for 4 people; target under 5 minutes.

## 4. Release build check (before calling the feature done)

Build a standalone APK, either in the cloud with `eas build --platform android --profile preview` (needs a free Expo account and an `eas.json` from `eas build:configure` whose `preview` profile builds an APK) or locally with `npx expo run:android --variant release` (needs the Android SDK and JDK). Install it and repeat checks 5, 6 and 8 without Expo Go and with no dev server. Then run `adb shell dumpsys package com.aimanyuri.splitthebill` and confirm the flags do not include `ALLOW_BACKUP` (bill data is never backed up off the device, Constitution II) and that `android.permission.INTERNET` is not among the requested permissions.
