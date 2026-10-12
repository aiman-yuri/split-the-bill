import { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { type Bill, type Person, type Split, addPerson, formatRm, removePerson, renamePerson } from '@/bill';
import { colors, common } from '@/theme';
import type { Commit } from '../useBill';

export function PeopleTab({ bill, split, commit }: { bill: Bill; split: Split; commit: Commit }) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<{ id: number; text: string; error: string | null } | null>(null);

  const add = () => {
    const rejection = commit(addPerson(bill, name));
    setError(rejection);
    if (rejection === null) setName('');
  };

  const finishRename = () => {
    if (renaming === null) return;
    const rejection = commit(renamePerson(bill, renaming.id, renaming.text));
    setRenaming(rejection === null ? null : { ...renaming, error: rejection });
  };

  const remove = (person: Person) => {
    const removeNow = () => setError(commit(removePerson(bill, person.id)));
    const itemCount = bill.items.filter((item) => item.assignedTo.includes(person.id)).length;
    if (itemCount === 0) return removeNow();
    const items = itemCount === 1 ? '1 item' : `${itemCount} items`;
    Alert.alert(
      'Remove person',
      `Remove ${person.name}? Their ${items} will lose ${person.name}, and items only ${person.name} had become unassigned.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: removeNow },
      ],
    );
  };

  const shareOf = (id: number) => split.shares.find((share) => share.person.id === id);

  return (
    <View style={styles.container}>
      <View style={styles.addRow}>
        <TextInput
          testID="person_name"
          style={[common.input, styles.addInput]}
          placeholder="Name"
          value={name}
          onChangeText={setName}
          onSubmitEditing={add}
          returnKeyType="done"
          autoCapitalize="words"
        />
        <Pressable testID="add_person" accessibilityRole="button" style={common.button} onPress={add}>
          <Text style={common.buttonText}>Add</Text>
        </Pressable>
      </View>
      {error !== null && <Text style={[common.error, styles.gutter]}>{error}</Text>}
      <FlatList
        data={bill.people}
        keyExtractor={(person) => String(person.id)}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={<Text style={common.empty}>No people yet. Add everyone at the table.</Text>}
        renderItem={({ item: person }) => {
          const share = shareOf(person.id);
          return (
            <View style={styles.row}>
              {renaming?.id === person.id ? (
                <View style={styles.main}>
                  <TextInput
                    testID={`person_rename_${person.id}`}
                    style={common.input}
                    value={renaming.text}
                    onChangeText={(text) => setRenaming({ ...renaming, text })}
                    onSubmitEditing={finishRename}
                    onBlur={finishRename}
                    autoFocus
                    returnKeyType="done"
                  />
                  {renaming.error !== null && <Text style={common.error}>{renaming.error}</Text>}
                </View>
              ) : (
                <Pressable
                  testID={`person_${person.id}`}
                  accessibilityRole="button"
                  accessibilityHint="Rename"
                  style={[styles.main, styles.nameRow]}
                  onPress={() => setRenaming({ id: person.id, text: person.name, error: null })}
                >
                  <Text style={styles.name}>{person.name}</Text>
                  {share !== undefined && <Text style={styles.amount}>{formatRm(share.totalSen)}</Text>}
                </Pressable>
              )}
              <Pressable
                testID={`person_remove_${person.id}`}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${person.name}`}
                onPress={() => remove(person)}
                hitSlop={8}
                style={styles.remove}
              >
                <Text style={styles.removeText}>Remove</Text>
              </Pressable>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  addRow: { flexDirection: 'row', gap: 8, padding: 16, paddingBottom: 8 },
  addInput: { flex: 1 },
  gutter: { paddingHorizontal: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  main: { flex: 1 },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between' },
  name: { fontSize: 16, color: colors.text },
  amount: { fontSize: 16, color: colors.text, fontVariant: ['tabular-nums'] },
  remove: { paddingVertical: 4 },
  removeText: { color: colors.danger },
});
