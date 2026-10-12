import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type Bill, type Item, type Rejection, addItem, formatRm, parseRm, removeItem, updateItem } from '@/bill';
import { notAnAmount, rejectionMessages } from '../messages';
import { colors, common } from '@/theme';
import type { Commit } from '../useBill';

type Field = 'name' | 'quantity' | 'price' | 'form';

const fieldOf: Partial<Record<Rejection, Field>> = {
  BlankName: 'name',
  QuantityOutOfRange: 'quantity',
  PriceOutOfRange: 'price',
};

// Editable text for an amount already on the bill, e.g. 300 → "3.00".
const amountText = (sen: number) => formatRm(sen).replace('RM ', '');

// item undefined: the editor adds a new item.
export function ItemEditor({ bill, item, commit, onClose }: { bill: Bill; item?: Item; commit: Commit; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(item?.name ?? '');
  const [quantity, setQuantity] = useState(String(item?.quantity ?? 1));
  const [price, setPrice] = useState(item === undefined ? '' : amountText(item.unitPriceSen));
  const [assignedTo, setAssignedTo] = useState<readonly number[]>(item?.assignedTo ?? []);
  const [error, setError] = useState<{ field: Field; message: string } | null>(null);

  const save = () => {
    // An untouched price keeps the stored sen, so display text is never parsed back (Constitution I).
    const unitPriceSen = item !== undefined && price === amountText(item.unitPriceSen) ? item.unitPriceSen : parseRm(price);
    if (unitPriceSen === null) return setError({ field: 'price', message: notAnAmount });
    const wholeQuantity = /^\d+$/.test(quantity.trim()) ? Number(quantity.trim()) : NaN;
    const input = { name, quantity: wholeQuantity, unitPriceSen, assignedTo };
    const edit = item === undefined ? addItem(bill, input) : updateItem(bill, item.id, input);
    if (!edit.ok) return setError({ field: fieldOf[edit.reason] ?? 'form', message: rejectionMessages[edit.reason] });
    const failure = commit(edit);
    if (failure !== null) return setError({ field: 'form', message: failure });
    onClose();
  };

  const remove = () => {
    if (item === undefined) return;
    const failure = commit(removeItem(bill, item.id));
    if (failure !== null) return setError({ field: 'form', message: failure });
    onClose();
  };

  const toggle = (id: number) =>
    setAssignedTo(assignedTo.includes(id) ? assignedTo.filter((other) => other !== id) : [...assignedTo, id]);

  const errorFor = (field: Field) => (error?.field === field ? <Text style={common.error}>{error.message}</Text> : null);

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.backdrop} behavior="height">
        <View testID="item_editor" style={[styles.panel, { paddingBottom: insets.bottom + 16 }]}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>
            <Text style={styles.title}>{item === undefined ? 'Add item' : 'Edit item'}</Text>
            <Text style={styles.label}>Name</Text>
            <TextInput testID="item_name" style={common.input} value={name} onChangeText={setName} autoFocus={item === undefined} />
            {errorFor('name')}
            <View style={styles.numbers}>
              <View style={styles.quantity}>
                <Text style={styles.label}>Quantity</Text>
                <TextInput testID="item_quantity" style={common.input} value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" />
              </View>
              <View style={styles.price}>
                <Text style={styles.label}>Unit price (RM)</Text>
                <TextInput
                  testID="item_price"
                  style={common.input}
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                />
              </View>
            </View>
            {errorFor('quantity')}
            {errorFor('price')}
            <Text style={styles.label}>Who had it</Text>
            {bill.people.length === 0 ? (
              <Text style={styles.hint}>Add people in the People tab to assign this item.</Text>
            ) : (
              <View style={styles.chips}>
                {bill.people.map((person) => {
                  const selected = assignedTo.includes(person.id);
                  return (
                    <Pressable
                      key={person.id}
                      testID={`assign_${person.id}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => toggle(person.id)}
                      style={[styles.chip, selected && styles.chipSelected]}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{person.name}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
            {errorFor('form')}
            <View style={styles.actions}>
              {item !== undefined && (
                <Pressable testID="item_delete" accessibilityRole="button" onPress={remove} style={styles.secondary}>
                  <Text style={styles.deleteText}>Delete</Text>
                </Pressable>
              )}
              <View style={styles.spacer} />
              <Pressable accessibilityRole="button" onPress={onClose} style={styles.secondary}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable testID="item_save" accessibilityRole="button" onPress={save} style={common.button}>
                <Text style={common.buttonText}>Save</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  panel: { backgroundColor: colors.background, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '90%' },
  form: { padding: 16, gap: 4 },
  title: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 8 },
  label: { color: colors.muted, marginTop: 8, marginBottom: 4 },
  hint: { color: colors.muted },
  numbers: { flexDirection: 'row', gap: 12 },
  quantity: { flex: 1 },
  price: { flex: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  chipSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.text },
  chipTextSelected: { color: colors.onAccent },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
  spacer: { flex: 1 },
  secondary: { paddingHorizontal: 12, paddingVertical: 12 },
  deleteText: { color: colors.danger, fontSize: 16 },
  cancelText: { color: colors.muted, fontSize: 16 },
});
