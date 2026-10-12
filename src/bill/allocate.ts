// The one division rule for shared items and charges (data-model.md, "Division rule").
// amount × weight can pass Number.MAX_SAFE_INTEGER, so the arithmetic runs in bigint.
// BigInt(x) instead of literals like 0n: Hermes support for the literal syntax is unverified (research.md R2).
export function allocate(amountSen: number, weights: readonly number[]): number[] {
  if (amountSen < 0) return allocate(-amountSen, weights).map((portion) => (portion === 0 ? 0 : -portion));

  const zero = BigInt(0);
  const one = BigInt(1);
  const amount = BigInt(amountSen);
  const big = weights.map((weight) => BigInt(weight));
  const total = big.reduce((sum, weight) => sum + weight, zero);
  if (total === zero) throw new RangeError(`Cannot divide ${amountSen} sen: the total weight is 0`);

  const portions = big.map((weight) => (amount * weight) / total);
  const remainders = big.map((weight) => (amount * weight) % total);
  let leftover = amount - portions.reduce((sum, portion) => sum + portion, zero);

  // Stable sort keeps array order among equal remainders, which is the tie-break order.
  const byRemainder = remainders
    .map((remainder, index) => ({ remainder, index }))
    .sort((a, b) => (a.remainder > b.remainder ? -1 : a.remainder < b.remainder ? 1 : 0));
  for (const { index } of byRemainder) {
    if (leftover === zero) break;
    portions[index] += one;
    leftover -= one;
  }
  return portions.map((portion) => Number(portion));
}
