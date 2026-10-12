import { useMemo, useState } from 'react';

import { type Bill, type Edit, emptyBill, split } from '../bill';
import type { BillStore } from '../storage/billStore';
import { rejectionMessages } from './messages';

export type Commit = (edit: Edit) => string | null;

// Owns the bill on screen. Every committed edit is saved before it is shown (FR-019), so the
// bill on screen never differs from the bill on disk.
export function useBill(store: BillStore) {
  const [loaded] = useState(() => store.load());
  const [bill, setBill] = useState<Bill>(loaded.bill);
  const result = useMemo(() => split(bill), [bill]);

  // Returns the message to show when the edit was refused or could not be saved, else null.
  const commit: Commit = (edit) => {
    if (!edit.ok) return rejectionMessages[edit.reason];
    try {
      store.save(edit.bill);
    } catch (error) {
      return `Couldn't save this change: ${describe(error)}`;
    }
    setBill(edit.bill);
    return null;
  };

  const newBill = (): string | null => {
    try {
      store.clear();
    } catch (error) {
      return `Couldn't start a new bill: ${describe(error)}`;
    }
    setBill(emptyBill);
    return null;
  };

  return { bill, split: result, recovered: loaded.recovered, commit, newBill };
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
