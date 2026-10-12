# Split the Bill

An Android app for splitting a Malaysian restaurant bill fairly by item. Type in the receipt's items, add the people at the table, assign each item (shared items allowed), enter the service charge, SST and rounding adjustment as printed, and read what each person owes. Shares always add up to the bill total to the sen.

Works fully offline, with no account. The bill stays on the phone.

## Run it

Requires Node 22.13 or newer, and an Android phone with USB debugging or an Android emulator.

```bash
npm ci
npm run android    # opens the app in Expo Go on the connected device or emulator
```

## Check it

```bash
npm test                      # Jest: money logic and storage in Node, screens with Testing Library
npm run typecheck
npm run lint
npx expo install --check      # dependency versions match the Expo SDK
```

## Layout

```text
src/
  App.tsx           root component
  bill/             money logic: pure TypeScript, no React or Expo imports (enforced by lint)
  storage/          saves the bill on the device
  screens/bill/     the bill screen, its hook, messages and components
specs/              feature spec, plan, contracts and tasks (Spec Kit)
GLOSSARY.md         domain terms
```

How the code is organised and why: [specs/001-itemized-bill-split/plan.md](specs/001-itemized-bill-split/plan.md). Project rules: [.specify/memory/constitution.md](.specify/memory/constitution.md).
