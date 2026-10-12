import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme';

export type Tab = 'items' | 'people' | 'split';

const tabs: readonly { tab: Tab; label: string }[] = [
  { tab: 'items', label: 'Items' },
  { tab: 'people', label: 'People' },
  { tab: 'split', label: 'Split' },
];

export function TabBar({ active, onSelect, bottomInset }: { active: Tab; onSelect: (tab: Tab) => void; bottomInset: number }) {
  return (
    <View style={[styles.bar, { paddingBottom: bottomInset }]} accessibilityRole="tablist">
      {tabs.map(({ tab, label }) => (
        <Pressable
          key={tab}
          testID={`tab_${tab}`}
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === active }}
          onPress={() => onSelect(tab)}
          style={styles.tab}
        >
          <Text style={[styles.label, tab === active && styles.active]}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  label: { fontSize: 15, color: colors.muted },
  active: { color: colors.accent, fontWeight: '700' },
});
