import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import WebView, { WebViewMessageEvent } from 'react-native-webview';
import { useRouter } from 'expo-router';
import { RABAHDJ_HTML } from '../_migration/htmlContent';
import { resolveServerUrl } from '../src/api/serverDiscovery';

const SCREEN_ROUTES: Record<string, string> = {
  walkie: '/walkie',
  live: '/live',
  files: '/files',
  games: '/games',
  settings: '/settings',
  cinema: '/cinema/1',
  chat: '/chat',
  nearby: '/nearby',
  profile: '/profile',
};

export default function HtmlHost() {
  const webViewRef = useRef<WebView>(null);
  const router = useRouter();
  const [injectedJS, setInjectedJS] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const serverUrl = await resolveServerUrl();
        if (!serverUrl) return;
        const match = serverUrl.match(/^https?:\/\/([^:/]+):?(\d+)?/);
        if (!match) return;
        const host = match[1];
        const port = match[2] || '4000';
        const js = `
          try {
            localStorage.setItem('rabahdj_connection', JSON.stringify({ enabled: true, ip: '${host}', port: '${port}' }));
          } catch(e) {}
          true;
        `;
        setInjectedJS(js);
      } catch (e) {
        console.log('[HtmlHost] server discovery failed', e);
      }
    })();
  }, []);

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
        injectedJavaScriptBeforeContentLoaded={injectedJS || undefined}
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
