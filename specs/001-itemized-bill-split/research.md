# Research: Manual Itemized Bill Splitting

Phase 0 of the plan. Each entry: decision, rationale, alternatives. Version and API facts were looked up on 2026-10-12 from the primary pages linked (Expo docs, expo/expo source at the `sdk-57` tag, npm registry, Hermes and React Native sources). Anything those pages did not confirm is marked **unverified**.

Scope: Android phones only. iOS is on hold (spec Assumptions, constitution v2.0.0), so no decision below is made for iOS, though none of them rules it out.

## R1. Toolchain and versions

**Decision**: New Expo project from the `blank-typescript` template at Expo SDK 57, the latest stable SDK. Versions are the ones the template and `npx expo install` pin:

| Piece | Version | Note |
|---|---|---|
| Expo SDK | 57 (`expo` 57.0.28) | npm `latest`. SDK 58 is in beta (`next` 58.0.7). Use ≥ 57.0.9, which fixes a Hermes V1 memory regression. |
| React Native | 0.86.3 | New Architecture is always on from SDK 55; Hermes V1 is the default engine. |
| React | 19.2.3 | |
| TypeScript | ~6.0.3 | Template default; `strict: true` (constitution). |
| Node | ≥ 22.13 | Local machine has 24.7.0. |
| Android | 7.0+ (minSdk 24), compileSdk and targetSdk 36 | Set by React Native 0.86 and SDK 57. Target 36 is what Google Play currently requires. |
| Application id | `com.aimanyuri.splitthebill` | `android.package` in `app.json`. Unique and stable once published; free to change before the first release. |
| Backup and network | `android.allowBackup: false`, `android.blockedPermissions: ["android.permission.INTERNET"]` | `allowBackup` "Defaults to the Android default, which is true", which would copy the saved bill to Google Drive (Constitution II). Blocking `INTERNET` makes "no network" a property of the build. Expo Go has its own permissions, so development is unaffected; a future development build would need the block lifted for Metro. Source: docs.expo.dev/versions/latest/config/app |

**Rationale**: The constitution fixes TypeScript, React Native and Expo. `blank-typescript` brings only `expo`, `expo-status-bar`, `react` and `react-native`, so every other dependency is a choice recorded here (Constitution IV). The default template pulls in Expo Router, Reanimated, gesture handler, web support and more for screens this app does not have.

**Alternatives**: The default template (Expo Router `NativeTabs`): a router and a dozen packages for three tabs with no back stack and no deep links. Rejected. SDK 54, so the App Store Expo Go runs it on an iPhone: only matters for iOS, which is on hold. Rejected.

**Running on a phone**: Expo CLI installs Expo Go for SDK 57 on Android devices and emulators, so development needs no Expo account and no native build. A standalone APK (EAS Build or `npx expo run:android` with the Android SDK) is only needed for the release check in quickstart.md.

Sources: docs.expo.dev/versions/latest · registry.npmjs.org/expo · expo.dev/changelog/sdk-57 · expo.dev/changelog/sdk-58-beta · github.com/expo/expo/blob/sdk-57/templates/expo-template-blank-typescript/package.json · github.com/facebook/react-native/blob/0.86-stable/packages/react-native/gradle/libs.versions.toml · docs.expo.dev/guides/new-architecture · docs.expo.dev/more/create-expo

## R2. Money representation and division

**Decision**: Every stored amount is integer sen in a `number` that is always a safe integer. The one calculation that can leave the safe range, `amount × weight` inside the division rule, runs in `bigint`. One internal function `allocate(amountSen, weights)` does all division with the largest-remainder rule (data-model.md): it converts to `bigint` with `BigInt(x)`, computes quotient and remainder, and converts each portion back with `Number(x)`.

**Rationale**:
- Constitution I allows a safe-integer `number` or a `bigint` and requires `bigint` wherever intermediates can exceed `Number.MAX_SAFE_INTEGER` (≈ 9.007 × 10¹⁵).
- Stored values stay far inside that range: a line amount is at most 9,989,999,001 sen (≈ 10¹⁰), so even 10,000 such lines sum to ≈ 10¹⁴. Keeping them as `number` means plain JSON, plain React state and plain test literals.
- The product is not safe: a charge of up to 9,999,999 sen times an assigned subtotal of 10¹⁰ or more passes 10¹⁷. `bigint` makes it exact with no cap on item count.
- Hermes lists `BigInt` (ES2020) as supported and has tests for bigint division and remainder. `allocate` only divides non-negative operands (negative amounts are handled by sign first, R3), so the unverified rounding of negative bigint division never comes up. It also builds bigints with `BigInt(x)` rather than `123n` literals, because no Hermes test for the literal syntax was found (**unverified**, and avoided).
- One allocation function for shared items and charges means one rule and one set of edge-case tests.

**Alternatives**: `bigint` for every amount: exact but breaks `JSON.stringify` and makes every UI value a conversion. Rejected. Capping inputs until the product fits in a safe `number`: a fragile, hidden limit on item count. Rejected. A decimal library (decimal.js, dinero.js): a dependency for what 20 lines of integer code do, and it invites rounding modes. Rejected.

Sources: github.com/facebook/hermes/blob/static_h/doc/Features.md · github.com/facebook/hermes/tree/static_h/test/hermes (`bigint-binary-division.js`, `bigint-binary-remainder.js`) · github.com/facebook/hermes/releases/tag/v0.12.0

## R3. Edge cases in the division rule

**Decision**:
- Negative amounts: allocate the absolute value, then negate (clarified FR-012).
- Charges with no assigned subtotal: status `ChargesUndividable`, no shares (FR-013).
- A share below zero: status `ShareBelowZero`, no shares. With the rounding adjustment limited to ±2 sen, a person's rounding portion is at most `ceil(2s/S)`, which is ≤ `s` whenever the assigned subtotals total `S ≥ 2`. So the case only happens when the whole assigned subtotal is 1 sen, but the guard makes the spec's "no share below RM 0.00" a checked invariant instead of a proof in a comment.

**Rationale**: Each spec edge case maps to one status, so the UI has a fixed set of states to render and the tests a fixed set to cover. Unchanged from the Kotlin plan: the rule is about money, not the stack.

## R4. Saving the bill

**Decision**: `expo-sqlite/kv-store`, one key `bill` holding the JSON document (contracts/bill-file.md). Every committed edit calls `Storage.setItemSync('bill', encodeBill(bill))` immediately, in the same handler that commits the edit. On launch, `getItemSync('bill')` is read once before the first render.

**Rationale**:
- Each `setItemSync` is a single `INSERT … ON CONFLICT(key) DO UPDATE` statement, and SQLite runs every statement in an implicit transaction. A kill mid-write leaves the previous complete bill, never a half-written one (SC-005).
- A committed SQLite transaction survives the app process being killed, because the data has reached the OS. Surviving a sudden power loss also depends on the `synchronous` and journal settings expo-sqlite opens with, which were not confirmed (**unverified**). FR-019's "phone restarting" means a normal restart, which flushes; a battery pull in the millisecond after an edit is accepted.
- The write is synchronous on the JS thread. A bill is a few kilobytes, so it costs well under a frame, and it closes the window the Kotlin plan had, where a kill just after an edit could lose it. Edits are saved in order by construction: there is no queue.
- One small document (≤ 20 people, a few dozen items) has no queries or relations, so a key-value store is enough; using SQLite's own tables would add a schema and migrations for nothing.
- `expo-sqlite` is part of the Expo SDK, is included in Expo Go, and is pinned by `npx expo install`.

**Alternatives**:
- `expo-file-system` with write-to-temp then move: on SDK 57 neither `write` nor `move(…, { overwrite: true })` replaces a file atomically. Both platforms delete the destination first and then rename, and nothing is fsynced. It would need recovery logic on load (main file missing, `.tmp` present), and `File.write()` becomes async in SDK 58. Rejected.
- `@react-native-async-storage/async-storage`: still documented, but async only, so an edit's save can be lost to a kill before it runs. kv-store is documented as its drop-in replacement and adds sync calls. Rejected.
- Expo SQLite tables: a schema and migrations for one document. Rejected.

Sources: docs.expo.dev/versions/latest/sdk/sqlite · github.com/expo/expo/blob/sdk-57/packages/expo-sqlite/src/Storage.ts · sqlite.org/lang_transaction.html · docs.expo.dev/versions/latest/sdk/filesystem · github.com/expo/expo/tree/sdk-57/packages/expo-file-system (android `fsops/CopyMoveStrategy.kt`, `FileSystemFile.kt`) · docs.expo.dev/versions/latest/sdk/async-storage

## R5. Screen state and structure

**Decision**:
- No navigation library. One `BillScreen` with a header, the active tab's content and a hand-built bottom tab bar of three buttons. The active tab is plain component state.
- One hook, `useBill(store)`, owns the bill: `useState<Bill>` initialised from `store.load()`. Its `commit(edit)` takes a `bill`-module `Edit`; on `ok` it saves through the store and sets the new state, otherwise it returns the rejection for the form to show. `split(bill)` is derived with `useMemo`.
- Forms keep their own text in local state; only committed values reach the `Bill` (clarified FR-019).
- The item editor is React Native's core `Modal` (`animationType="slide"`, `transparent`, a bottom-anchored panel, `onRequestClose` for the Android back button). Confirmations use core `Alert`. Keyboard handling uses core `KeyboardAvoidingView`.
- `react-native-safe-area-context` (`SafeAreaProvider`, `useSafeAreaInsets`) keeps content clear of the status bar, cutout and navigation bar.

**Rationale**:
- Three tabs with no back stack and no deep links do not need Expo Router or React Navigation.
- Saving inside `commit`, instead of in a `useEffect` on bill changes, keeps the save in the same synchronous step as the edit and needs no effect ordering.
- Core React Native's `SafeAreaView` is deprecated since 0.81 and was iOS-only; Android runs edge-to-edge, so insets must come from somewhere. `react-native-safe-area-context` is the replacement React Native names, is part of the Expo SDK and is in Expo Go.
- `Modal`, `Alert` and `KeyboardAvoidingView` are core, so the editor and dialogs add no dependency.

**Alternatives**: Expo Router tabs (see R1). A bottom-sheet library (`@gorhom/bottom-sheet`): needs Reanimated and gesture handler for a form a `Modal` shows fine. Rejected. A state library (Zustand, Redux): one piece of state with one owner. Rejected. A single long scrolling screen: too long on a phone for 15 items plus people plus results. Rejected.

Sources: reactnative.dev/blog/2025/08/12/react-native-0.81 · reactnative.dev/docs/safeareaview · reactnative.dev/docs/modal · docs.expo.dev/versions/latest/sdk/safe-area-context

## R6. Tests and checks

**Decision**:
- Jest 29 with the `jest-expo` preset (57.0.6), split into two Jest `projects`:
  - `jest-expo/node` for `src/bill/**` and `src/storage/**`: pure logic, no React Native.
  - `jest-expo/android` for `src/screens/**`: component tests that render the screen.
- `bill` module, written test first: example tests for every acceptance scenario and edge case in the spec; property-style tests for the invariants in data-model.md over thousands of bills generated by a small seeded PRNG in the test folder, so no property-testing dependency is needed.
- `BillStore`: tests against an in-memory object with the same three methods as kv-store (`getItemSync`, `setItemSync`, `removeItemSync`): round trip, missing key, unreadable value moved aside.
- UI: one journey test per user story (P1 required, P2 and P3 if cheap) with `@testing-library/react-native` 14.1.0 and its peer `test-renderer` 1.x, selecting by the `testID`s in contracts/ui.md. RNTL 14 makes `render`, `fireEvent` and `act` async, so tests `await` them. Process kill and the real kv-store are checked by hand on a device (quickstart.md).
- Static checks: `tsc --noEmit`; `npx expo lint` (ESLint flat config extending `eslint-config-expo`) with a `no-restricted-imports` rule that forbids `react`, `react-native` and `expo*` imports under `src/bill/**` (Constitution III); `npx expo install --check` for SDK-compatible versions.

**Rationale**:
- Constitution III requires money logic tested in Node with no device; the node project does exactly that.
- `jest-expo` is Expo's documented unit-test setup, and its `android` preset resolves `.android.tsx` files and mocks native modules the way the device would.
- `react-test-renderer` does not support React 19; RNTL 14 replaced it with `test-renderer`.
- `jest-expo` 57 depends on Jest 29 packages while npm `latest` for `jest` is 30, so `jest` is pinned to `^29` to match.
- RNTL 14 with `jest-expo` 57 together is not confirmed by either project (**unverified**). The first scaffold task runs one trivial render test to prove the pairing; if it fails, fall back to RNTL 13.

**Setup findings (2026-10-13, implementation)**: the RNTL 14 / `jest-expo` 57 pairing works (smoke render test passed), so no fallback to RNTL 13 was needed. Two additions the plan did not foresee: `jest-expo/android` passes no Babel preset of its own, so the project needs a `babel.config.js` with `babel-preset-expo` (created by `npx expo customize babel.config.js`, which also adds `babel-preset-expo` as a dev dependency); and TypeScript 6 no longer includes `@types/*` packages automatically, so `tsconfig.json` sets `"types": ["jest"]`.

**Alternatives**: Maestro end-to-end tests: real-device journeys, but a separate CLI whose Windows support is **unverified**, and Expo's documented route for it runs in EAS Workflows. Rejected for now; the manual device checks cover what component tests cannot. `fast-check` for property tests: a dependency for what a seeded loop does. Rejected. Node's built-in test runner for `src/bill`: no dependency, but two runners for one project. Rejected.

Sources: docs.expo.dev/develop/unit-testing · github.com/expo/expo/blob/sdk-57/packages/jest-expo/README.md · github.com/expo/expo/blob/sdk-57/packages/jest-expo/package.json · registry.npmjs.org/jest-expo · registry.npmjs.org/@testing-library/react-native · oss.callstack.com/react-native-testing-library/docs/start/migration-v14 · docs.expo.dev/guides/using-eslint · docs.expo.dev/more/expo-cli

## R7. Dependencies beyond the template

| Package | Kind | Why the platform or existing dependencies cannot do it |
|---|---|---|
| `expo-sqlite` | runtime | Atomic, synchronous save of the bill (R4). Core React Native has no persistent storage. |
| `react-native-safe-area-context` | runtime | Safe-area insets on edge-to-edge Android; the core component is deprecated (R5). |
| `jest`, `jest-expo`, `@types/jest` | dev | Test runner (R6). |
| `@testing-library/react-native`, `test-renderer` | dev | Rendering and querying components in tests (R6). |
| `eslint`, `eslint-config-expo` | dev | Lint, including the import boundary on `src/bill` (R6). Added by `npx expo lint`. |

All runtime packages are installed with `npx expo install` so their versions match SDK 57.

## R8. Later: iOS and SDK 58

Not part of this feature; recorded so the choices above do not block it.

- iOS: none of the choices above is Android-specific apart from the `jest-expo/android` test project. On SDK 55–57, running on a real iPhone without a Mac needs a paid Apple Developer Program membership (`eas go` or EAS device builds), because the App Store Expo Go only supports SDK 54. Source: expo.dev/changelog/expo-go-and-app-store-may-2026 · docs.expo.dev/get-started/expo-go
- SDK 58: its breaking change to `expo-file-system` (`File.write()` becomes async) does not touch this design, since storage uses kv-store.
