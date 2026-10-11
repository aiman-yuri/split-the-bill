# Decision: Getting receipt items into a split from a photo

- **Slug**: split-the-bill
- **Decided**: 2026-10-11 (revised same day; supersedes the earlier needs-clarification verdict after the owner interview)
- **Verdict**: go — scoped to manual item entry plus Option A. Option B (on-device scanning) is held until the receipt test passes.
- **Artifacts reviewed**: intake.md | research.md (incl. Clarifications) | problem.md | concept.md

## Scorecard

| Criterion | Rating | Justification |
|-----------|--------|---------------|
| Problem validity | adequate | Typing out long receipts is a concrete pain, and itemized splitting is the app's core job. Many competitors build the same flow. The only first-party signal is the owner's stated pain, which is acceptable for a personal or portfolio app (research.md Clarifications). |
| Evidence strength | adequate (for the go scope) / weak (for Option B) | The go scope (manual entry plus photo alongside plus total check) depends on no unproven accuracy assumption. Prior art is adequate, and the Malaysian tax conventions are now sourced (6% F&B SST; 10% service charge). Option B still rests on weak, outdated accuracy evidence, so it stays gated. |
| Value vs. inaction | adequate | Without itemized entry the app has no core function. Option A also adds the total check, which addresses the amount-correctness goal, at small cost (problem.md, concept.md). |
| Feasibility / appetite | strong (go scope) / adequate (Option B) | Manual entry plus Option A is small to medium. B is medium, with a defined exit to A if the receipt test fails (concept.md). |
| Strategic fit | adequate | The owner defined the purpose (a personal or portfolio app) and five constitution principles: exact money, offline and on the device, test-first money logic, simplicity, Kotlin + Compose. The concept fits all of them. |
| Risk posture | strong | Silent amount errors are addressed by integer-sen money, proportional charge splitting, the total check (±5 sen) and a confirm step. Cost and privacy risks are removed because images stay on the device. Accuracy risk is isolated behind the receipt test. |

## Verdict & Rationale

**Go, scoped.** The owner interview resolved every blocker for the foundation: target locale (Malaysia, MYR, Latin script), build order (manual entry first), image handling (on the device only) and project goals. The scorecard clears the go bar for manual item entry plus Option A, which carries no unproven technical assumption. Option B still depends on on-device accuracy that no evidence supports for Malaysian receipts. It is therefore **held behind an explicit test** rather than killed: run the 20-receipt test, then re-run `/speckit-assess-decide` for B alone. If B fails the test, the feature permanently ends at Option A.

## If needs-clarification

Not applicable to the go scope. Pending for Option B only:
- **Gate**: the 20-receipt test in research.md (≥80% of line items with the correct price, and median check-and-fix time below median typing time).
- **Revisit stage**: research (record the test results), then decide.

## If go — Handoff to `/speckit-specify`

- **Problem**: on Android, a group splitting a Malaysian restaurant bill by item must transcribe every receipt line by hand. This is slow and error-prone, so groups fall back to unfair even splits.
- **Chosen approach**: Feature 1, manual itemized bill splitting: enter items (name, quantity, price), assign items to people (shared items allowed), and calculate each person's share. Service charge, SST and rounding adjustment are distributed in proportion to each person's item subtotal. Feature 2, Option A: attach a receipt photo shown alongside entry, plus a check that the entered items and charges match the printed total within ±5 sen. Feature 1 may be specified first and Feature 2 as a follow-up.
- **In scope**: Android only; Malaysia, MYR; offline; no account or backend; exact integer-sen money; receipt photo kept on the device.
- **Out of scope**: automatic reading of receipts (Option B, gated); cloud services; payments or money movement; non-receipt expenses; other countries or currencies; archiving or accounting; monetization.
- **Success metrics**: median time to have all items of a 15+ item receipt entered and checked (baseline to be measured); share of receipts where the entered total matches the printed total within ±5 sen; every per-person split sums exactly to the bill total (a hard requirement, not a metric).
- **Carried-forward open questions**: whether bills and history are saved; group size limits; how people are added (names only?); editing a split after settling; minimum Android version. Resolve these in `/speckit-specify` and `/speckit-clarify`.
