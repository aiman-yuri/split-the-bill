// Keeps the bill in progress on the device (contracts/bill-file.md). Owns the key names and
// the recovery of an unreadable value; the bill module owns the format.
import { type Bill, decodeBill, emptyBill, encodeBill } from '@/bill';

export type KeyValue = {
  getItemSync(key: string): string | null;
  setItemSync(key: string, value: string): void;
  removeItemSync(key: string): void;
};

export type BillStore = ReturnType<typeof createBillStore>;

const BILL = 'bill';
const UNREADABLE = 'bill.unreadable';

export function createBillStore(kv: KeyValue) {
  return {
    // recovered: the saved bill was unreadable and was moved aside, so nothing is silently lost.
    load(): { bill: Bill; recovered: boolean } {
      const text = kv.getItemSync(BILL);
      if (text === null) return { bill: emptyBill, recovered: false };
      const bill = decodeBill(text);
      if (bill !== null) return { bill, recovered: false };
      kv.setItemSync(UNREADABLE, text);
      kv.removeItemSync(BILL);
      return { bill: emptyBill, recovered: true };
    },
    save(bill: Bill): void {
      kv.setItemSync(BILL, encodeBill(bill));
    },
    clear(): void {
      kv.removeItemSync(BILL);
    },
  };
}
