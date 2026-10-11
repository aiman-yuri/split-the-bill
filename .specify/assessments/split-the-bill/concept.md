# Concept: Getting receipt items into a split from a photo

- **Slug**: split-the-bill
- **Created**: 2026-10-11
- **Recommended option**: Option B — Photo suggests items, user confirms (on the phone)

## Options

### Option A — Faster manual entry with the receipt photo alongside (smallest thing that could work)
- **Sketch**: The user photographs the receipt, and the photo stays visible, zoomable, while they type items into a fast entry flow. That flow keeps the keyboard up, moves from one item to the next quickly, sets quantity in one tap and reminds them about tax and service charge lines. Nothing is read from the photo automatically. The app compares the entered sum with the receipt total the user types in and flags any mismatch. This is the Tricount precedent in research.md, plus entry speed-ups.
- **Appetite**: small (days, assuming manual item entry exists)
- **Trade-offs**:
  - Wins: no accuracy risk and no image ever leaves the phone. Works offline, costs nothing to run and needs no store data-safety work. The total check addresses the *amount correctness* goal directly.
  - Sacrifices: correction effort stays at 100% of items. It only shortens the time-to-items-ready metric and does not solve the stated pain ("can we just take a photo and have the items filled in?"). The app also stays behind competitors that advertise scanning.
- **Rabbit holes**: few. Trying to perfect the entry keyboard flow is the main one.

### Option B — Photo suggests items, user confirms (on the phone)
- **Sketch**: The user takes a photo of the receipt (or picks one from the gallery, if in scope). The app reads it on the phone and proposes a list of line items with prices. The user sees the proposed items next to the photo, fixes misreads, deletes non-item lines and adds anything missed. The list does not count as ready until the user confirms it, and the app shows whether the items add up to the printed total. The confirmed items then enter the normal assign-to-people flow. Manual entry (Option A) is always available as the fallback. The image never leaves the device, matching the ML Kit on-device precedent in research.md.
- **Appetite**: medium (weeks). The budget is a firm ceiling: if acceptable suggestions cannot be reached within it, ship Option A and stop.
- **Trade-offs**:
  - Wins: addresses the stated pain directly and cuts correction effort below 100%. No per-scan cost, no privacy disclosure for images and it works offline at the table. It also matches the dominant competitor flow: scan, then review, then assign.
  - Sacrifices: accuracy is unproven. The only Android data in research.md is old and poor. On-device reading returns raw text, so turning it into items is the hard part, and some receipt languages or scripts may not be supported. On hard receipts, fixing the suggestions may be slower than typing.
- **Rabbit holes**:
  - Parsing the endless variety of receipt layouts: multi-line item names, quantity × price formats, modifiers, discounts, voids.
  - Tax, service charge and tip lines, and inclusive vs exclusive tax.
  - Decimal and thousands separators across locales, and currencies.
  - Chasing accuracy on poor photos (crumpled, thermal fade, low light).
  - Adding more locales than the target set.

### Option C — Cloud AI reads the receipt
- **Sketch**: Same user experience as B: photo, suggested items, confirm, assign. The difference is that the photo is sent to a cloud vision/AI service that returns structured items. This is the BillSplit and Splitwise Pro precedent in research.md.
- **Appetite**: medium–large (weeks to months), because it adds a service relationship, cost control and privacy compliance on top of B's user experience.
- **Trade-offs**:
  - Wins: likely better on messy receipts and across languages (research.md, low–medium confidence), with less custom layout parsing.
  - Sacrifices: recurring per-scan cost, which is why competitors charge for it, and receipt images leave the phone, requiring Play data-safety disclosure and user consent. It needs a network at the restaurant. AI can invent plausible numbers on smudged areas, an error that is harder to notice than a visible misread (research.md). It also likely forces a monetization decision.
- **Rabbit holes**:
  - Protecting API keys on a client-only app, which probably means a backend.
  - Abuse and cost caps.
  - Consent and data-retention terms.
  - Building monetization to pay for scans.
  - Prompt and format tuning.

### Do nothing
Users keep typing every item. See problem.md *Cost of Inaction*: groups fall back to even splits and the app lacks a feature competitors commonly advertise. It is not recommended, but Option A is a near-zero-cost improvement over it.

## Recommendation

**Option B, with Option A's pieces as its foundation.** The photo-alongside view, the total-match check and fast manual correction are needed by B anyway, for reviewing and fixing items, so A ships first as B's first slice and its fallback.

Rationale against the problem's goals and metrics:
- **Time to items-ready / correction effort**: only B and C can push correction effort below 100%. A cannot.
- **Amount correctness**: B's mandatory confirmation plus the total-match check addresses silent errors. B's errors are visible misreads rather than plausible guesses from AI (C).
- **Constraints**: B avoids C's recurring cost, image privacy exposure, network dependence and forced monetization. All of these are open questions in problem.md, and B does not depend on resolving them in a particular direction.
- **Escape hatch**: if a small labeled sample of real target-locale receipts shows suggestions are too poor to beat typing, stop at A. C stays a later option if users accept images leaving the phone and someone is willing to fund running costs.

## Out of Scope (for the recommended option)

- Splitting non-receipt expenses; payments or moving money; platforms other than Android (from problem.md).
- Receipt archiving, expense categorization, accounting or tax use.
- Handwritten bills (pending confirmation).
- Sending receipt images off the device, including any cloud AI or recognition service.
- Locales, languages or scripts outside the agreed target set.
- Multi-page or very long continuous receipts beyond one capture. [NEEDS CLARIFICATION: confirm]
- Auto-assigning items to people; assignment stays manual after the items are confirmed.
- Monetizing or paywalling the feature.

## Assumptions to Validate

- Manual item entry and assignment exist, or are built first. B builds on them.
- On-device recognition, followed by parsing into items, produces suggestions accurate enough that confirming and correcting is faster than typing on typical target receipts. **Validate with a small labeled sample before committing past Option A.**
- Target receipts use scripts that on-device recognition supports. Research.md lists Latin, Chinese, Devanagari, Japanese and Korean.
- Most receipts print a total the user can check against.
- Users will accept a confirm step before splitting; competitors use the same review step, so this is likely.
- Users prefer images to stay on the phone, or at least do not need cloud-level accuracy.
- A medium appetite (weeks) is acceptable to the app owner for this capability.
