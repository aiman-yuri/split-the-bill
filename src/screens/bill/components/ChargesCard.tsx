import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { type Bill, formatRm, parseRm, setCharges } from '@/bill';
import { notAnAmount } from '../messages';
import { colors, common } from '@/theme';
import type { Commit } from '../useBill';

type Charge = 'serviceChargeSen' | 'sstSen' | 'roundingSen';

// Editable text for a charge already on the bill: 0 is blank, -2 is "-0.02".
const chargeText = (sen: number) => (sen === 0 ? '' : formatRm(sen).replace('RM ', ''));

// Remount it (key) whenever the bill's charges change so the fields show the saved values.
export function ChargesCard({ bill, commit }: { bill: Bill; commit: Commit }) {
  const [text, setText] = useState<Record<Charge, string>>({
    serviceChargeSen: chargeText(bill.serviceChargeSen),
    sstSen: chargeText(bill.sstSen),
    roundingSen: chargeText(bill.roundingSen),
  });
  const [errors, setErrors] = useState<Partial<Record<Charge, string>>>({});

  const commitCharge = (charge: Charge, value: string) => {
    // Untouched text keeps the stored sen, so display text is never parsed back (Constitution I).
    if (value === chargeText(bill[charge])) return setErrors({ ...errors, [charge]: undefined });
    const sen = value.trim() === '' ? 0 : parseRm(value, { allowNegative: charge === 'roundingSen' });
    if (sen === null) return setErrors({ ...errors, [charge]: notAnAmount });
    const { serviceChargeSen, sstSen, roundingSen } = bill;
    const failure = commit(setCharges(bill, { serviceChargeSen, sstSen, roundingSen, [charge]: sen }));
    setErrors({ ...errors, [charge]: failure ?? undefined });
  };

  // Many decimal keyboards have no minus key, so the rounding adjustment gets its own sign toggle.
  const toggleSign = () => {
    const current = text.roundingSen.trim();
    const flipped = current.startsWith('-') ? current.slice(1) : `-${current}`;
    setText({ ...text, roundingSen: flipped });
    // A bare sign is not an amount yet; wait for the digits.
    if (flipped !== '-' && flipped !== '') commitCharge('roundingSen', flipped);
  };

  const field = (charge: Charge, label: string, testID: string, sign?: boolean) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        {sign && (
          <Pressable
            testID="charge_rounding_sign"
            accessibilityRole="button"
            accessibilityLabel="Change sign"
            onPress={toggleSign}
            style={styles.sign}
          >
            <Text style={styles.signText}>±</Text>
          </Pressable>
        )}
        <TextInput
          testID={testID}
          style={[common.input, styles.input]}
          value={text[charge]}
          onChangeText={(value) => setText({ ...text, [charge]: value })}
          onBlur={() => commitCharge(charge, text[charge])}
          onSubmitEditing={() => commitCharge(charge, text[charge])}
          keyboardType="decimal-pad"
          returnKeyType="done"
          placeholder="0.00"
        />
      </View>
      {errors[charge] !== undefined && <Text style={common.error}>{errors[charge]}</Text>}
    </View>
  );

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Charges (RM)</Text>
      {field('serviceChargeSen', 'Service charge', 'charge_service')}
      {field('sstSen', 'SST', 'charge_sst')}
      {field('roundingSen', 'Rounding adjustment', 'charge_rounding', true)}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { margin: 16, padding: 12, borderRadius: 8, backgroundColor: colors.surface, gap: 8 },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  field: { gap: 4 },
  label: { color: colors.muted },
  inputRow: { flexDirection: 'row', gap: 8 },
  input: { flex: 1 },
  sign: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  signText: { fontSize: 18, color: colors.text },
});
