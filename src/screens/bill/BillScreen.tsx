import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { BillStore } from '@/storage/billStore';
import { ItemsTab } from './components/ItemsTab';
import { PeopleTab } from './components/PeopleTab';
import { SplitTab } from './components/SplitTab';
import { type Tab, TabBar } from './components/TabBar';
import { colors } from '@/theme';
import { useBill } from './useBill';

export function BillScreen({ store }: { store: BillStore }) {
  const insets = useSafeAreaInsets();
  const { bill, split, recovered, commit, newBill } = useBill(store);
  const [tab, setTab] = useState<Tab>('items');

  useEffect(() => {
    if (recovered) Alert.alert('Saved bill', "Your saved bill couldn't be opened, so a new bill was started.");
  }, [recovered]);

  const confirmNewBill = () =>
    Alert.alert('New bill', 'Start a new bill? The current bill will be deleted.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Start new bill',
        style: 'destructive',
        onPress: () => {
          const error = newBill();
          if (error !== null) Alert.alert('New bill', error);
        },
      },
    ]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }]}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          Split the Bill
        </Text>
        <Pressable testID="new_bill" accessibilityRole="button" onPress={confirmNewBill} hitSlop={8}>
          <Text style={styles.headerAction}>New bill</Text>
        </Pressable>
      </View>
      <View style={styles.content}>
        {tab === 'items' && <ItemsTab bill={bill} commit={commit} />}
        {tab === 'people' && <PeopleTab bill={bill} split={split} commit={commit} />}
        {tab === 'split' && <SplitTab bill={bill} split={split} />}
      </View>
      <TabBar active={tab} onSelect={setTab} bottomInset={insets.bottom} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  headerAction: { fontSize: 16, color: colors.accent, fontWeight: '600' },
  content: { flex: 1 },
});
