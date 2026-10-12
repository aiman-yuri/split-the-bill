# Contract: screens and states

One screen with three tabs in a bottom tab bar. The header has a **New bill** action (`new_bill`, FR-020). Content stays inside the safe area (status bar, display cutout, navigation bar), since Android draws edge-to-edge. Names in `code` are the `testID`s used by the UI tests.

## Items tab (`tab_items`)

- List of items: name, `qty × RM unit price`, line amount, and the names assigned (or an **Unassigned** label).
- Each row is `item_<itemId>`. Tap a row to edit it; the **Add item** button (`add_item`) opens the same editor empty.
- **Charges** card below the list: service charge, SST and rounding adjustment fields (`charge_service`, `charge_sst`, `charge_rounding`), each blank = RM 0.00. A value is committed when the field loses focus or the user presses Done. Service charge and SST use the decimal keyboard. The rounding adjustment needs a minus sign, which many decimal keyboards lack, so it offers a **±** toggle (`charge_rounding_sign`) beside the field instead of relying on the keyboard.
- Empty state: "No items yet. Add the first line from the receipt."

### Item editor (modal sheet, `item_editor`)

- A modal that slides up from the bottom. Fields: name (`item_name`), quantity (`item_quantity`, default 1), unit price (`item_price`). Toggle chips, one per person (`assign_<personId>`), for assignment (FR-008). Numeric fields use the decimal keyboard.
- **Save** (`item_save`) commits the item; **Delete** (`item_delete`, edit only) removes it (FR-003). Closing the sheet another way (Android back, **Cancel**) discards the form.
- Invalid input shows the message under the field and keeps the sheet open: not a number or more than 2 decimals (FR-004), price over RM 99,999.99, quantity outside 1–999, blank name.
- With no people yet, the chip row reads "Add people in the People tab to assign this item."

## People tab (`tab_people`)

- List of people in the order added (`person_<personId>`), each with their current share.
- Add field (`person_name`) and button (`add_person`). Rejected names show a message: blank, duplicate ignoring case (FR-006), or a 21st person (FR-007).
- Tap a name to rename it in place (`person_rename_<personId>`, committed on submit or blur). Each row has a remove button (`person_remove_<personId>`). Remove asks for confirmation when the person has items (spec edge case), saying those items will become unassigned or lose this person.

## Split tab (`tab_split`)

Top to bottom:

1. A status banner (`split_banner`) when the split is not final:
   - `Incomplete`: "1 item unassigned (RM x.xx). Shares are incomplete." or "N items unassigned (RM x.xx). Shares are incomplete." for N > 1.
   - `ChargesUndividable`: "Assign at least one item before charges can be divided." No shares are listed.
   - `ShareBelowZero`: "A share would go below RM 0.00. Check the rounding adjustment." No shares are listed.
2. Totals: item subtotal, service charge, SST, rounding adjustment, **bill total** (`bill_total`, FR-015).
3. One card per person (`share_<personId>`): name and total; tap to expand the breakdown of item portions, each charge portion and the total (FR-014). Cards are marked "incomplete" when the status is `Incomplete`.
4. The unassigned items and their amount, if any (FR-010).

Every change on another tab is reflected here at once (FR-018). All amounts use `formatRm` (FR-017).

## Dialogs

Shown with the native Android alert dialog (`Alert.alert`). Tests spy on `Alert.alert` and press its buttons by their text.

| Trigger | Message | Confirm action |
|---|---|---|
| New bill | "Start a new bill? The current bill will be deleted." | Clears the bill |
| Remove a person who has items | "Remove Ali? Their N items will lose Ali, and items only Ali had become unassigned." | Removes the person |
| Saved bill unreadable on launch | "Your saved bill couldn't be opened, so a new bill was started." | OK only |

## Rejection messages

Each `Rejection` (contracts/bill-module.md) maps to one message, shown under the field that caused it. `parseRm` returning `null` shows "Enter an amount like 12.50".
