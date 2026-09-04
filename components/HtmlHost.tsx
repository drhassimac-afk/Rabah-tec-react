import React, { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import WebView, { WebViewMessageEvent } from 'react-native-webview';
import { useRouter } from 'expo-router';
import { RABAHDJ_HTML } from '../_migration/htmlContent';

// أسماء الشاشات كما ترسلها htmlContent.ts (cmd:'openNative', screen:'...')
// وتُطابق المسارات الفعلية في مجلد app/
const SCREEN_ROUTES: Record<string, string> = {
  walkie: '/walkie',
  live: '/live',
  files: '/files',
  games: '/games',
  settings: '/settings',
  chat: '/chat',
  nearby: '/nearby',
  profile: '/profile',
  cinema: '/cinema/1', // مؤقتًا id ثابت — عدّله لاحقًا حسب منطق الغرفة
  // chat, nearby, profile: لا توجد بعد شاشات React Native لها
  // ستبقى تعمل داخل WebView نفسه حتى تُبنى لاحقًا
};

export default function HtmlHost() {
  const webViewRef = useRef<WebView>(null);
  const router = useRouter();

  const handleMessage = (event: WebViewMessageEvent) => {
    let message: any;
    try {
      message = JSON.parse(event.nativeEvent.data);
    } catch {
      console.log('[HTML]', event.nativeEvent.data);
      return;
    }

    console.log('[HTML BRIDGE]', message);

    if (message.cmd === 'openNative' && message.screen) {
      const route = SCREEN_ROUTES[message.screen];
      if (route) {
        router.push(route as any);
      } else {
        console.log(`[HTML BRIDGE] لا يوجد مسار RN بعد للشاشة: ${message.screen}`);
      }
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: RABAHDJ_HTML }}
        style={styles.webview}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        onMessage={handleMessage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1220',
  },
  webview: {
    flex: 1,
    backgroundColor: '#0b1220',
  },
});
