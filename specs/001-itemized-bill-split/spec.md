# Feature Specification: Manual Itemized Bill Splitting

**Feature Branch**: `feat/001-itemized-bill-split`

**Created**: 2026-10-12

**Status**: Draft

**Input**: User description: "Manual itemized bill splitting (Feature 1): enter items (name, qty, price), assign items to people (shared items allowed), calculate each person's share. Service charge, SST and rounding adjustment distributed proportionally to item subtotal. Android, MYR, offline, integer-sen money. See .specify/assessments/split-the-bill/decision.md handoff."

**Update (2026-10-12)**: "update the spec of the android development, from kotlin to be React + expo". The app targets Android phones only; iOS is on hold. The stack change itself is recorded in the constitution (v2.0.0), not here.

## Clarifications

### Session 2026-10-12

- Q: While some items are still unassigned, should the app show provisional per-person shares, and how are charges divided? → A: Show provisional shares marked "incomplete"; divide charges by assigned item subtotals only; show the unassigned items' amount separately, without charges.
- Q: When a negative amount is divided and leaves remainder sen, how are they assigned? → A: Divide the absolute amount with the FR-012 rule, then negate each portion.
- Q: Should the rounding adjustment be limited to ±RM 0.02 and out-of-range values rejected? → A: Yes; accept only −RM 0.02 to +RM 0.02, reject others with a message.
- Q: If the app is killed mid-typing, must half-typed, unsaved form text survive? → A: No; every committed change is saved immediately, but uncommitted form text may be lost.
- Q: Should the app enforce a minimum of 2 people, or only the 20-person maximum? → A: No minimum; allow 0–20 people and reject adding a 21st with a message.
- Q: Which platforms does the app target? → A: Android phones only for now. iOS is on hold and out of scope for this feature.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Split a bill by item (Priority: P1)

After a restaurant meal, one diner (the bill entrer) types the receipt's items into the app, adds the people at the table, assigns each item to whoever had it, and sees how much each person owes. No charges are involved yet: each person pays exactly the items they had.

**Why this priority**: This is the app's core job. Without itemized entry and assignment there is nothing to split, and every later story builds on it.

**Independent Test**: Enter 3 items, add 2 people, assign each item to one person, and check that each person's share equals the sum of their items and that the shares add up to the bill total.

**Acceptance Scenarios**:

1. **Given** an empty bill, **When** the user adds "Nasi Lemak", quantity 2, unit price RM 8.50, **Then** the item shows a line amount of RM 17.00 and the item subtotal is RM 17.00.
2. **Given** a bill with people Ali and Mei, and items "Teh Tarik" RM 3.00 (Ali) and "Roti Canai" RM 2.50 (Mei), **When** the user views the split, **Then** Ali owes RM 3.00, Mei owes RM 2.50, and the total shown is RM 5.50.
3. **Given** a bill with one item not yet assigned, **When** the user views the split, **Then** the app shows the unassigned item and its amount (without charges), shows each person's share marked as incomplete, and the shares plus the unassigned amount equal the bill total.
4. **Given** a completed split, **When** the user edits an item's price or reassigns it, **Then** every affected share updates immediately.

---

### User Story 2 - Share an item between people (Priority: P2)

Some dishes are shared, such as a plate of satay for the whole table. The user assigns one item to several people and the item's amount is divided equally among them.

**Why this priority**: Shared dishes are common at Malaysian group meals. Without them, users must fake the split by hand, which defeats the app.

**Independent Test**: Assign one RM 10.00 item to 3 people and check that their portions are RM 3.34, RM 3.33 and RM 3.33 and add up to exactly RM 10.00.

**Acceptance Scenarios**:

1. **Given** an item "Satay" RM 12.00 assigned to Ali, Mei and Raj, **When** the user views the split, **Then** each person's share includes RM 4.00 for it.
2. **Given** an item RM 10.00 assigned to 3 people, **When** the user views the split, **Then** the portions are RM 3.34, RM 3.33 and RM 3.33, with the extra sen going by the rule in FR-012, and they sum to RM 10.00.
3. **Given** a shared item, **When** the user removes one person from it, **Then** the item's amount is re-divided among the remaining people.

---

### User Story 3 - Include service charge, SST and rounding (Priority: P3)

The receipt shows a service charge, SST and a rounding adjustment on top of the items. The user enters these amounts as printed, and each one is divided among people in proportion to what they ordered, so the shares add up to the amount actually paid.

**Why this priority**: Real Malaysian restaurant bills include these charges. Without them the shares do not match what the group pays. It depends on Stories 1 and 2 being in place.

**Independent Test**: With assigned subtotals of RM 30.00 (Ali) and RM 10.00 (Mei), enter service charge RM 4.00 and SST RM 2.64, and check that Ali's share is RM 34.98, Mei's is RM 11.66, and they sum to RM 46.64.

**Acceptance Scenarios**:

1. **Given** assigned subtotals Ali RM 30.00 and Mei RM 10.00, and service charge RM 4.00, **When** the user views the split, **Then** Ali bears RM 3.00 and Mei RM 1.00 of the service charge.
2. **Given** assigned subtotals Ali RM 30.00 and Mei RM 10.00, service charge RM 4.00 and SST RM 2.64, **When** the user views the split, **Then** Ali owes RM 34.98 and Mei owes RM 11.66, totalling RM 46.64.
3. **Given** a bill total of RM 46.62 before rounding and a rounding adjustment of −RM 0.02, **When** the user views the split, **Then** the shares sum to exactly RM 46.60.
4. **Given** each person's breakdown, **When** the user opens a person's share, **Then** it shows their items, their portion of each charge, and their total.

---

### Edge Cases

- A person has no items assigned: their share is RM 0.00 and they bear no charges.
- Every assigned subtotal is RM 0.00 but a charge is entered: the charge cannot be divided proportionally, so the app tells the user and does not show final shares.
- A charge's proportional division leaves remainder sen: they are assigned by the rule in FR-012, and the shares still sum exactly to the total.
- The user enters a rounding adjustment outside −RM 0.02 to +RM 0.02: the input is rejected with a message.
- Rounding adjustment is negative (bill rounded down): it reduces shares proportionally, and no share goes below RM 0.00.
- An item with quantity greater than 1 is shared: the line amount (quantity × unit price) is divided, not the unit price.
- The user deletes a person who has items: the app asks for confirmation, and those items become unassigned (or lose that person if shared).
- The user enters a price with more than 2 decimal places or a non-numeric value: the input is rejected with a message.
- The user tries to add a 21st person: the app rejects it with a message.
- Two people are given the same name: the app rejects the duplicate so assignments stay unambiguous.
- The app is closed or killed in the middle of entering a bill: the bill, with every committed change, is still there when the app reopens. Text typed into a form but not yet saved may be lost.

## Requirements *(mandatory)*

### Functional Requirements

**Items**

- **FR-001**: Users MUST be able to add an item with a name, a quantity (whole number, at least 1) and a unit price in RM.
- **FR-002**: The system MUST compute each item's line amount as quantity × unit price, exactly to the sen.
- **FR-003**: Users MUST be able to edit and delete any item at any time.
- **FR-004**: The system MUST accept unit prices from RM 0.00 to RM 99,999.99 with at most 2 decimal places, and reject other input with a clear message.

**People**

- **FR-005**: Users MUST be able to add people to the bill by name only, and rename or remove them.
- **FR-006**: The system MUST require person names on the same bill to be unique, ignoring case.
- **FR-007**: The system MUST allow from 0 to 20 people on a bill. Adding a 21st person MUST be rejected with a clear message. There is no minimum: with no people, all items are unassigned (FR-010).

**Assignment**

- **FR-008**: Users MUST be able to assign each item to one or more people.
- **FR-009**: An item assigned to several people MUST have its line amount divided equally among them.
- **FR-010**: The system MUST show which items are unassigned and their total amount (without charges). While any item is unassigned, the system MUST still show each person's share, clearly marked as incomplete, with charges divided in proportion to assigned subtotals only (each person's total of their item portions); the shares plus the unassigned amount MUST equal the bill total.

**Charges**

- **FR-011**: Users MUST be able to enter, as printed on the receipt, a service charge amount, an SST amount and a rounding adjustment amount (which may be negative). Each is optional and defaults to RM 0.00. The rounding adjustment MUST be between −RM 0.02 and +RM 0.02 inclusive; other values MUST be rejected with a clear message.
- **FR-012**: The system MUST divide each charge among people in proportion to their assigned subtotals. Wherever an amount is divided (a shared item or a charge), remainder sen MUST go one at a time to the people with the largest fractional remainders, with ties broken by the order in which people were added. A negative amount (e.g. a negative rounding adjustment) MUST be divided by applying this rule to its absolute value and then negating each portion.
- **FR-013**: When there is a non-zero charge but every assigned subtotal is RM 0.00, the system MUST tell the user the charge cannot be divided and MUST NOT show final shares.

**Results**

- **FR-014**: The system MUST show each person's total share, and on request their breakdown: their portion of each item, of each charge, and their total.
- **FR-015**: The system MUST show the bill total as item subtotal + service charge + SST + rounding adjustment.
- **FR-016**: The sum of all people's shares MUST equal the bill total exactly, to the sen, for every bill.
- **FR-017**: The system MUST display all amounts in MYR format, e.g. `RM 12.30`.
- **FR-018**: Any change to items, people, assignments or charges MUST update all shares immediately.

**Bill lifecycle**

- **FR-019**: The bill in progress MUST be kept on the device and survive the app being closed, killed or the phone restarting. Every committed change (adding, editing or deleting an item or person, changing an assignment or a charge) MUST be saved immediately. Uncommitted form input need not be saved.
- **FR-020**: Users MUST be able to start a new bill, which discards the current one after the user confirms.
- **FR-021**: All features MUST work with no network connection and no account.

### Key Entities

- **Bill**: the single bill being split. Holds its items, people, the three charge amounts, and the derived subtotal and total.
- **Item**: a receipt line. Name, quantity, unit price, line amount, and the set of people it is assigned to (empty means unassigned).
- **Person**: someone at the table. Name (unique on the bill) and the order in which they were added, which breaks ties in remainder distribution.
- **Charge**: service charge, SST or rounding adjustment. An amount in sen as printed on the receipt; rounding may be negative.
- **Share**: what one person owes. Derived, never entered: their item portions plus their portion of each charge.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For every bill, the people's shares sum exactly to the bill total, with zero sen difference. This is a hard requirement, verified across the whole calculation test suite.
- **SC-002**: A user can enter a 15-item receipt for 4 people, assign all items and read every share in under 5 minutes.
- **SC-003**: For a bill entered correctly from the receipt, the bill total shown matches the receipt's printed total exactly.
- **SC-004**: In usability testing, at least 9 of 10 users split a bill containing a shared item and a service charge correctly on their first attempt without help.
- **SC-005**: No committed change is lost when the app is closed or killed at any point during entry.

## Assumptions

- Charges are entered as the amounts printed on the receipt, not computed from rates. This matches the receipt exactly and avoids guessing whether service charge is taxed. A rate-based helper is out of scope.
- Shared items divide equally among their people. Unequal splits of one item (e.g. 2 of 5 drinks to one person) are out of scope; users can enter the drinks as separate items.
- Discounts, vouchers and voided lines are out of scope for this feature.
- Only one bill exists at a time. Saved bill history, browsing past bills and exporting or sending shares to others are out of scope.
- There is no "settled" state: a bill can be edited at any time until a new bill is started.
- People are added by typed name only; no contacts integration.
- Receipt photo and the printed-total check (Feature 2, Option A) are a separate follow-up feature. Automatic receipt reading (Option B) is gated and out of scope.
- Locale is Malaysia, MYR, Latin script, per the constitution. The minimum Android version is a planning decision.
- Android phones only. iOS is on hold: no iOS build, testing or platform-specific work is part of this feature. Tablet-specific layouts, web and desktop are out of scope. Publishing to the app stores is not part of this feature.
- A bill saved on one phone stays on that phone; moving a bill between devices is out of scope (Constitution II).
