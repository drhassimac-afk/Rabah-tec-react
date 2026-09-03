import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import { connectToResolvedServer, joinRoom } from '../src/api/socket';

export default function RootLayout() {
  useEffect(() => {
    let cancelled = false;

    async function connectBackend() {
      try {
        console.log('[BACKEND] بدء اكتشاف السيرفر...');
        const socket = await connectToResolvedServer();
        console.log('[BACKEND] نتيجة الاتصال:', socket ? 'Socket موجود' : 'لم يتم العثور على السيرفر');

        if (!socket || cancelled) return;

        const join = () => {
          console.log('[BACKEND] Socket متصل، الانضمام إلى general...');
          joinRoom('general', 'مستخدم');
        };

        if (socket.connected) {
          join();
        } else {
          socket.once('connect', join);
        }
      } catch (error) {
        console.warn('تعذر الاتصال بالـ Backend', error);
      }
    }

    connectBackend();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SafeAreaProvider>
      <PaperProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }} />
      </PaperProvider>
    </SafeAreaProvider>
  );
}
