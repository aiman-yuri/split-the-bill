// Display only: never parse this text back into a calculation (Constitution I).
// Built from integer division so the output does not depend on the device locale.
export function formatRm(sen: number): string {
  const sign = sen < 0 ? '-' : '';
  const abs = Math.abs(sen);
  const senPart = abs % 100;
  const ringgit = (abs - senPart) / 100;
  const grouped = String(ringgit).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}RM ${grouped}.${String(senPart).padStart(2, '0')}`;
}

const AMOUNT = /^(-)?(?:RM\s*)?(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?$/i;

// Converts on the digit strings so no float ever holds the amount (FR-004).
// Range checks belong to the edit functions; this only says whether the text is an amount.
export function parseRm(text: string, options?: { allowNegative?: boolean }): number | null {
  const match = AMOUNT.exec(text.trim());
  if (match === null) return null;
  const [, minus, whole, fraction = ''] = match;
  if (minus !== undefined && !options?.allowNegative) return null;
  const sen = Number(whole.replace(/,/g, '')) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(sen)) return null;
  return minus !== undefined && sen !== 0 ? -sen : sen;
}
