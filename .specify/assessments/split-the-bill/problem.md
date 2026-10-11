# Problem Definition: Getting a long receipt's items into a bill split

- **Slug**: split-the-bill
- **Created**: 2026-10-11
- **Inputs used**: intake.md, research.md

## Problem Statement

When a group splits a restaurant bill on Android by item, someone has to transcribe every line from the paper receipt (name, price, sometimes quantity) before anyone can be assigned anything. On long dinner receipts this transcription is slow, tedious and error-prone, so the itemized split is delayed or abandoned for a less fair even split. It matters now because the app is being defined from scratch and itemized splitting is its core job (intake.md).

## Affected Users & Stakeholders

- **Users**:
  - *Bill entrer*: the diner who records the receipt in the app. They bear the full transcription effort at the table, often under social time pressure. — [source: intake.md stated pain]
  - *Co-diners*: wait for the split and depend on the entered amounts being right. A mistyped price or misplaced decimal charges them the wrong amount. — [research.md: IOU decimal errors show the money-correctness stakes]
  - [NEEDS CLARIFICATION: Typical group size and receipt length (number of line items) for target users — no data]
- **Stakeholders**:
  - *App owner/developer* (the person proposing the idea) decides scope and bears ongoing costs such as any per-receipt service cost. — [research.md: competitors gate this behind paid tiers or credits, suggesting real running cost]
  - *Google Play* (distribution): any handling of receipt images must meet store disclosure rules. — [research.md: not yet researched; NEEDS CLARIFICATION]

## Goals

- Reduce the time and effort for one person to get all items from a long restaurant receipt into the app, ready to assign to people.
- Keep the entered amounts trustworthy: no silent errors in prices, quantities, or totals that would charge someone the wrong amount.
- Make itemized splitting practical enough that groups choose it over an even split for long receipts.

## Non-Goals

- Splitting non-receipt expenses (rent, utilities, recurring shared costs).
- Moving money or processing payments between people. — [research.md: ClearTab precedent tracks payments only]
- Platforms other than Android. — [user input]
- Long-term receipt archiving, expense categorization, or tax/accounting use.
- Handwritten bills. [NEEDS CLARIFICATION: confirm this is out of scope]
- Choosing a business model (free vs paid) here; this is a decide-stage concern, recorded as an open question.

## Success Metrics

- **Time to items-ready**: median time from starting to record a receipt to having all line items entered and checked, for a receipt of about 15+ items. (baseline: unknown; measure current manual entry time) [NEEDS CLARIFICATION: target reduction]
- **Correction effort**: share of line items the user must edit or add by hand before the split is ready. (baseline: 100% today, since every item is typed)
- **Amount correctness**: the sum of entered items, tax, and charges matches the printed receipt total, without the user noticing an error only after settling. (baseline: unknown)
- **Itemized vs even split**: share of multi-person restaurant bills split by item rather than evenly. (baseline: unknown; app not yet built)
- **Qualitative**: users describe recording a long receipt as quick or effortless in feedback or testing.

## Cost of Inaction

Users keep typing every line by hand. For long receipts many will skip itemization and split evenly, so the app fails at its core purpose of fair itemized splitting. Typing errors keep causing wrong charges. The app would lack a capability that most comparable apps advertise (research.md competitor table), making it hard to choose over Splitwise, Tab, or similar. Offsetting this: Tricount succeeds without extracting items, so manual entry alone is not fatal (research.md).

## Open Questions

- [NEEDS CLARIFICATION: Target countries, languages, and currencies of receipts (affects decimal separators, scripts, tax/service-charge conventions)]
- [NEEDS CLARIFICATION: Is sending receipt images off the device acceptable to target users (privacy, offline use at restaurants)?]
- [NEEDS CLARIFICATION: Free or monetized? Competitors often charge for this]
- [NEEDS CLARIFICATION: Will manual item entry and assignment be built first? This problem assumes that baseline exists]
- [NEEDS CLARIFICATION: Typical group size and receipt length for target users]
- [NEEDS CLARIFICATION: Must receipts photographed earlier (gallery) be supported, or only at the table?]
- [NEEDS CLARIFICATION: Realistic recognition accuracy on actual restaurant receipts — needs a small labeled sample]
- [NEEDS CLARIFICATION: Play Store data-safety requirements if receipt images leave the device]
- [NEEDS CLARIFICATION: Handwritten bills in or out of scope]
- [NEEDS CLARIFICATION: Target improvement for the time-to-items-ready metric]
