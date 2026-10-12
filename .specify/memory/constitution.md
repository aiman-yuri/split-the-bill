<!--
Sync Impact Report
- Version change: 1.0.0 → 2.0.0 (MAJOR: Principle III and the technology stack redefined)
- Modified principles:
  I. Money Is Exact: integer sen expressed in TypeScript terms (safe-integer `number` or
     `bigint`) instead of Kotlin `Long`; `Float`/`Double` ban restated as "no fractional values"
  III. Test-First for Money Logic: money logic is plain TypeScript with no React, React Native
     or Expo imports, tested in Node, instead of plain Kotlin tested on the JVM
- Modified sections: Technology & Locale Constraints (Kotlin + Jetpack Compose → TypeScript +
  React Native + Expo; Android only kept, iOS on hold; Gradle module → single Expo project); Development Workflow (type check added to the done gate)
- Added/removed principles: none
- Templates: none modified (dependent templates read the constitution at runtime)
- Follow-up: specs/001-itemized-bill-split plan.md, research.md, data-model.md, quickstart.md
  and contracts/ were written for Kotlin and are stale; rerun /speckit-plan
- Deferred TODOs: none
-->

# Split the Bill Constitution

Split the Bill is a personal and portfolio Android app, possibly published free later and never
monetized, for splitting Malaysian restaurant bills fairly by item.

## Core Principles

### I. Money Is Exact

- Monetary amounts MUST be stored and computed as integer sen: a `number` that is always a
  safe integer (`Number.isSafeInteger`) or a `bigint`. Fractional values MUST NOT represent
  money anywhere, including intermediate calculations; division MUST be integer division
  with an explicit remainder. Any calculation whose intermediate values can exceed
  `Number.MAX_SAFE_INTEGER` MUST use `bigint`.
- The per-person shares of a bill MUST sum exactly to the bill total. Any remainder sen left
  over from proportional division MUST be assigned by a deterministic, documented rule.
- Service charge, SST and rounding adjustment MUST be distributed in proportion to each
  person's item subtotal, not split equally.
- Money MUST be displayed in MYR format (`RM 12.30`). Display formatting MUST NOT feed back
  into calculations.

Rationale: the app's core promise is a fair split. A single lost or invented sen breaks trust
and is a correctness bug, not a cosmetic issue.

### II. Offline & On-Device

- The app MUST work fully offline. It MUST NOT require an account, a backend or network
  access for any feature.
- Bill data and receipt photos MUST stay on the device. Features that would send them off the
  device (cloud recognition, sync, analytics with user content) require a constitution
  amendment first.
- Receipt photos MUST be stored in app-private storage.

Rationale: bills are split at the table, often with poor connectivity. Keeping data local also
removes running costs, credential management and privacy disclosures.

### III. Test-First for Money Logic (NON-NEGOTIABLE)

- Every calculation involving money (item totals, splitting, shared items, service charge,
  SST, rounding adjustment, remainder distribution, total-match tolerance) MUST have failing
  tests written before its implementation, then pass (red–green–refactor).
- Money logic MUST live in plain TypeScript with no React, React Native or Expo imports, so it
  runs as fast unit tests in Node without a device or emulator.
- Every bug in money logic MUST first be reproduced by a failing test.

Rationale: money errors are silent and costly. Pure, test-first calculation code is the
cheapest way to guarantee Principle I.

### IV. Simplicity

- Build only what the current feature's spec requires. Speculative abstractions,
  single-implementation interfaces, configuration for fixed values and unused extension points
  MUST NOT be added.
- Adding a dependency MUST be justified in the feature's plan by a need the platform or
  existing dependencies cannot meet.
- Complexity that violates this principle MUST be recorded and justified in the plan's
  Complexity Tracking section.

Rationale: this is a small, single-developer app. Every extra layer is maintenance cost with
no team to share it.

## Technology & Locale Constraints

- **Language & UI**: TypeScript in strict mode, React Native with Expo.
- **Structure**: a single Expo app project. Separation (e.g. pure-TypeScript money logic) is
  done by folder, not by additional packages or a monorepo, unless a plan justifies otherwise
  under Principle IV.
- **Platform**: Android phones only. iOS is on hold: Expo keeps it reachable later, but iOS
  builds, testing and platform-specific work are out of scope until amended. Tablet layouts,
  web and desktop are also out of scope.
- **Locale (v1)**: Malaysia, MYR, Latin-script receipts. Expected receipt conventions are 6% SST
  on food and beverage, an optional 10% service charge, and a rounding adjustment to the
  nearest 5 sen. The total-match check MUST tolerate ±5 sen.
- **Out of scope until amended**: other countries and currencies, payments or money movement,
  cloud services and monetization.

## Development Workflow

- Features follow Spec Kit: assess → specify → clarify → plan → tasks → implement.
- Ideas with unproven feasibility pass an explicit evidence gate in `.specify/assessments/`
  before they are specified. Example: on-device receipt scanning is gated on a 20-receipt
  accuracy test.
- Each plan MUST include a Constitution Check confirming compliance with Principles I–IV.
- Type check, lint and all unit tests MUST pass, and the Android app MUST build,
  before a change is considered done.

## Governance

- This constitution supersedes conflicting practices, templates and plans.
- **Amendments**: proposed by editing this file through `/speckit-constitution`, with a Sync
  Impact Report. Amendments that relax Principle I or III, or that let data leave the device
  (Principle II), require an explicit written rationale in the amendment.
- **Versioning**: semantic. MAJOR for removing or redefining a principle; MINOR for adding a
  principle or section, or materially expanding guidance; PATCH for clarifications and
  wording.
- **Compliance**: every plan's Constitution Check and every code review verifies adherence.
  Violations MUST be fixed or justified in Complexity Tracking.

**Version**: 2.0.0 | **Ratified**: 2026-10-11 | **Last Amended**: 2026-10-12
