import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { type Bill, type Share, type Split, formatRm, lineAmountSen } from '../bill';
import { colors } from './theme';

function bannerText(split: Split): string | null {
  switch (split.status) {
    case 'ChargesUndividable':
      return 'Assign at least one item before charges can be divided.';
    case 'ShareBelowZero':
      return 'A share would go below RM 0.00. Check the rounding adjustment.';
    case 'Incomplete': {
      const count = split.unassignedItems.length;
      const items = count === 1 ? '1 item' : `${count} items`;
      return `${items} unassigned (${formatRm(split.unassignedAmountSen)}). Shares are incomplete.`;
    }
    case 'Complete':
      return null;
  }
}

function Row({ label, sen, strong, testID }: { label: string; sen: number; strong?: boolean; testID?: string }) {
  return (
    <View testID={testID} style={styles.line}>
      <Text style={[styles.lineLabel, strong && styles.strong]}>{label}</Text>
      <Text style={[styles.lineAmount, strong && styles.strong]}>{formatRm(sen)}</Text>
    </View>
  );
}

function ShareCard({ share, incomplete }: { share: Share; incomplete: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <Pressable
      testID={`share_${share.person.id}`}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      onPress={() => setOpen(!open)}
      style={styles.card}
    >
      <Row label={share.person.name} sen={share.totalSen} strong />
      {incomplete && <Text style={styles.incomplete}>incomplete</Text>}
      {open && (
        <View style={styles.breakdown}>
          {share.itemPortions.map((portion) => (
            <Row key={portion.item.id} label={portion.item.name} sen={portion.amountSen} />
          ))}
          <Row label="Service charge" sen={share.serviceChargeSen} />
          <Row label="SST" sen={share.sstSen} />
          <Row label="Rounding adjustment" sen={share.roundingSen} />
          <Row label="Total" sen={share.totalSen} strong />
        </View>
      )}
    </Pressable>
  );
}

export function SplitTab({ bill, split }: { bill: Bill; split: Split }) {
  const banner = bannerText(split);
  const incomplete = split.status === 'Incomplete';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {banner !== null && (
        <View testID="split_banner" style={styles.banner}>
          <Text style={styles.bannerText}>{banner}</Text>
        </View>
      )}

      <View style={styles.card}>
        <Row label="Item subtotal" sen={split.itemSubtotalSen} />
        <Row label="Service charge" sen={bill.serviceChargeSen} />
        <Row label="SST" sen={bill.sstSen} />
        <Row label="Rounding adjustment" sen={bill.roundingSen} />
        <Row label="Bill total" sen={split.billTotalSen} strong testID="bill_total" />
      </View>

      {split.shares.map((share) => (
        <ShareCard key={share.person.id} share={share} incomplete={incomplete} />
      ))}

      {split.unassignedItems.length > 0 && (
        <View style={styles.card}>
          <Text style={[styles.lineLabel, styles.strong]}>Unassigned</Text>
          {split.unassignedItems.map((item) => (
            <Row key={item.id} label={item.name} sen={lineAmountSen(item)} />
          ))}
          <Row label="Unassigned amount" sen={split.unassignedAmountSen} strong />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  banner: { backgroundColor: colors.warning, borderRadius: 8, padding: 12 },
  bannerText: { color: colors.text },
  card: { backgroundColor: colors.surface, borderRadius: 8, padding: 12, gap: 4 },
  breakdown: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border, gap: 4 },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  lineLabel: { flex: 1, color: colors.text, fontSize: 15 },
  lineAmount: { color: colors.text, fontSize: 15, fontVariant: ['tabular-nums'] },
  strong: { fontWeight: '700' },
  incomplete: { color: colors.muted, fontStyle: 'italic' },
});
