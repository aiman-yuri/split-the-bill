import { allocate } from './allocate';

describe('allocate', () => {
  test('gives the extra sen of an equal split to the first-added person', () => {
    expect(allocate(1000, [1, 1, 1])).toEqual([334, 333, 333]);
  });

  test('divides in proportion to the weights', () => {
    expect(allocate(400, [3000, 1000])).toEqual([300, 100]);
    expect(allocate(264, [3000, 1000])).toEqual([198, 66]);
  });

  test('breaks a tie between equal remainders by order', () => {
    expect(allocate(1, [1, 1])).toEqual([1, 0]);
  });

  test('gives nothing to a weight of 0', () => {
    expect(allocate(5, [0, 2, 3])).toEqual([0, 2, 3]);
  });

  test('divides a negative amount by its absolute value, then negates', () => {
    // 2 over [3000, 1000]: starting portions 1 and 0, equal remainders, so the leftover sen goes to the first.
    expect(allocate(-2, [3000, 1000])).toEqual([-2, 0]);
  });

  test('stays exact when amount times weight passes the safe-integer range', () => {
    const portions = allocate(9999999, [9989999001, 9989999001]);
    expect(portions).toEqual([5000000, 4999999]);
    expect(portions.every(Number.isSafeInteger)).toBe(true);
  });

  test('refuses weights that are all 0', () => {
    expect(() => allocate(5, [0, 0])).toThrow(RangeError);
    expect(() => allocate(5, [0, 0])).toThrow(/total weight is 0/);
  });
});
