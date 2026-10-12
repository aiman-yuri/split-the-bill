import { formatRm, parseRm } from '.';

describe('formatRm', () => {
  test.each([
    [1230, 'RM 12.30'],
    [0, 'RM 0.00'],
    [-2, '-RM 0.02'],
    [123450, 'RM 1,234.50'],
    [9999999, 'RM 99,999.99'],
    [9989999001, 'RM 99,899,990.01'],
  ])('%i sen is shown as %s', (sen, text) => {
    expect(formatRm(sen)).toBe(text);
  });
});

describe('parseRm', () => {
  test.each([
    ['8.5', 850],
    ['8.50', 850],
    ['RM 8.50', 850],
    [' 1,234.50 ', 123450],
    ['0.29', 29],
    ['12', 1200],
  ])('%j is %i sen', (text, sen) => {
    expect(parseRm(text)).toBe(sen);
  });

  test.each(['8.505', 'abc', '', '1.2.3', '-1'])('%j is not an amount', (text) => {
    expect(parseRm(text)).toBeNull();
  });

  test('accepts a minus sign only when negatives are allowed', () => {
    expect(parseRm('-0.02', { allowNegative: true })).toBe(-2);
    expect(parseRm('0.02', { allowNegative: true })).toBe(2);
  });
});
