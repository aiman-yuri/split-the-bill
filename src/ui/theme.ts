import { StyleSheet } from 'react-native';

export const colors = {
  background: '#ffffff',
  surface: '#f4f5f7',
  text: '#1b1d21',
  muted: '#5f6670',
  border: '#d9dce1',
  accent: '#0b6e4f',
  onAccent: '#ffffff',
  danger: '#b3261e',
  warning: '#fff4d6',
};

export const common = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.background,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: { color: colors.onAccent, fontSize: 16, fontWeight: '600' },
  error: { color: colors.danger, marginTop: 4 },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 32, paddingHorizontal: 24 },
});
