import { StatusBar } from 'expo-status-bar';
import Storage from 'expo-sqlite/kv-store';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { createBillStore } from '@/storage/billStore';
import { BillScreen } from '@/screens/bill/BillScreen';

const store = createBillStore(Storage);

export default function App() {
  return (
    <SafeAreaProvider>
      <BillScreen store={store} />
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}
