import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import { ConnectionProvider } from '../src/api/ConnectionService';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <PaperProvider>
        <ConnectionProvider>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false }} />
        </ConnectionProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
