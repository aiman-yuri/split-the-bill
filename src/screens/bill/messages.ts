import type { Rejection } from '@/bill';

export const rejectionMessages: Record<Rejection, string> = {
  BlankName: 'Enter a name.',
  DuplicatePersonName: 'Someone on this bill already has that name.',
  TooManyPeople: 'A bill can have at most 20 people.',
  QuantityOutOfRange: 'Enter a quantity from 1 to 999.',
  PriceOutOfRange: 'Enter a price from RM 0.00 to RM 99,999.99.',
  ChargeOutOfRange: 'Enter an amount from RM 0.00 to RM 99,999.99.',
  RoundingOutOfRange: 'Enter a rounding adjustment from -RM 0.02 to RM 0.02.',
  UnknownPerson: 'That person is no longer on the bill.',
  UnknownId: 'That entry is no longer on the bill.',
};

// parseRm returned null: the text is not an amount at all (FR-004).
export const notAnAmount = 'Enter an amount like 12.50';
