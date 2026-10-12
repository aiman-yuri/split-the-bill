import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { type Bill, type Item, formatRm, lineAmountSen } from '../bill';
import { ChargesCard } from './ChargesCard';
import { ItemEditor } from './ItemEditor';
import { colors, common } from './theme';
import type { Commit } from './useBill';

export function ItemsTab({ bill, commit }: { bill: Bill; commit: Commit }) {
  // 'new' opens the editor empty; an item opens it on that item.
  const [editing, setEditing] = useState<Item | 'new' | null>(null);

  const assignedNames = (item: Item) =>
    bill.people
      .filter((person) => item.assignedTo.includes(person.id))
      .map((person) => person.name)
      .join(', ');

  return (
    <View style={styles.container}>
      <FlatList
        data={bill.items}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={<Text style={common.empty}>No items yet. Add the first line from the receipt.</Text>}
        ListFooterComponent={
          <ChargesCard key={`${bill.serviceChargeSen}/${bill.sstSen}/${bill.roundingSen}`} bill={bill} commit={commit} />
        }
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <Pressable testID={`item_${item.id}`} accessibilityRole="button" style={styles.row} onPress={() => setEditing(item)}>
            <View style={styles.main}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.detail}>
                {item.quantity} × {formatRm(item.unitPriceSen)}
              </Text>
              {item.assignedTo.length === 0 ? (
                <Text style={styles.unassigned}>Unassigned</Text>
              ) : (
                <Text style={styles.detail}>{assignedNames(item)}</Text>
              )}
            </View>
            <Text style={styles.amount}>{formatRm(lineAmountSen(item))}</Text>
          </Pressable>
        )}
      />
      <View style={styles.footer}>
        <Pressable testID="add_item" accessibilityRole="button" style={common.button} onPress={() => setEditing('new')}>
          <Text style={common.buttonText}>Add item</Text>
        </Pressable>
      </View>
      {editing !== null && (
        <ItemEditor
          bill={bill}
          item={editing === 'new' ? undefined : editing}
          commit={commit}
          onClose={() => setEditing(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  row: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  main: { flex: 1, gap: 2 },
  name: { fontSize: 16, color: colors.text },
  detail: { color: colors.muted },
  unassigned: { color: colors.danger, fontWeight: '600' },
  amount: { fontSize: 16, color: colors.text, fontVariant: ['tabular-nums'] },
  footer: { padding: 16 },
});
