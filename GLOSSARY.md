# Split the Bill

Splitting one Malaysian restaurant bill fairly among the people at the table, by what each person ordered.

## Bill and its contents

**Bill**:
The single receipt being split right now, with its items, people and charges. There is only ever one.
_Avoid_: Receipt (the paper), expense, tab, session

**Item**:
One line of the receipt: a name, a quantity and a unit price.
_Avoid_: Dish, product, entry, line item

**Line amount**:
An item's quantity times its unit price.
_Avoid_: Item total, item price

**Person**:
Someone at the table who may owe part of the bill, identified on the bill by a unique name.
_Avoid_: Member, participant, diner, user

**Bill entrer**:
The one person using the app to type in the bill. They are usually also a Person on the bill.
_Avoid_: User, owner, payer

## Assigning

**Assignment**:
The set of people an item belongs to. An empty assignment means the item is unassigned.
_Avoid_: Claim, allocation

**Shared item**:
An item assigned to more than one person, whose line amount is divided equally among them.
_Avoid_: Split item, group item

**Unassigned amount**:
The sum of the line amounts of all unassigned items, without charges.

## Charges

**Charge**:
An amount printed on the receipt below the items: the service charge, SST or rounding adjustment. It is entered as printed, never computed from a rate.
_Avoid_: Fee, tax (for the group as a whole), extra

**Service charge**:
The restaurant's service charge as printed on the receipt.
_Avoid_: Tip, service fee

**SST**:
The Sales and Service Tax as printed on the receipt.
_Avoid_: GST, VAT, tax

**Rounding adjustment**:
The receipt's adjustment that rounds the total to the nearest 5 sen, between −RM 0.02 and +RM 0.02.
_Avoid_: Rounding, round-off

## Results

**Item subtotal**:
The sum of all items' line amounts on the bill.
_Avoid_: Subtotal (unqualified), net

**Assigned subtotal**:
A person's total of their item portions. Charges are divided in proportion to it.
_Avoid_: Personal subtotal

**Bill total**:
Item subtotal plus service charge, SST and rounding adjustment. It should match the receipt's printed total.
_Avoid_: Grand total, amount due

**Portion**:
One person's piece of one divided amount: of a shared item or of a charge.
_Avoid_: Cut, part

**Share**:
Everything one person owes: their item portions plus their portion of each charge. Always derived, never entered.
_Avoid_: Amount owed, debt, balance

**Incomplete split**:
The shares shown while at least one item is unassigned. They are provisional, and they plus the unassigned amount equal the bill total.
_Avoid_: Draft, partial split

**Remainder sen**:
The sen left over when an amount is divided into whole sen. They go one at a time to the people with the largest fractional remainders, ties broken by the order people were added.
_Avoid_: Leftover, rounding error

**Sen**:
One hundredth of a ringgit; the unit every amount is counted in.
_Avoid_: Cents
