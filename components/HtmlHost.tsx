import React, { useEffect, useRef } from 'react';
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
  const configuredRef = useRef(false);

  const injectConnectionConfig = async () => {
    try {
      const serverUrl = await resolveServerUrl();
      if (!serverUrl) {
        console.log('[HtmlHost] لم يتم العثور على السيرفر بعد');
        return;
      }
      const match = serverUrl.match(/^https?:\/\/([^:/]+):?(\d+)?/);
      if (!match) return;
      const host = match[1];
      const port = match[2] || '4000';
      const js = `
        (function(){
          try {
            localStorage.setItem('rabahdj_connection', JSON.stringify({ enabled: true, ip: '${host}', port: '${port}' }));
            console.log('rabahdj_connection injected: ${host}:${port}');
          } catch(e) {}
        })();
        true;
      `;
      webViewRef.current?.injectJavaScript(js);
      configuredRef.current = true;
    } catch (e) {
      console.log('[HtmlHost] server discovery failed', e);
    }
  };

  useEffect(() => {
    injectConnectionConfig();
    // إعادة محاولة الحقن دوريًا لأول 20 ثانية في حال تأخر اكتشاف السيرفر أو تأخر تحميل الصفحة
    const interval = setInterval(() => {
      if (!configuredRef.current) injectConnectionConfig();
    }, 3000);
    const timeout = setTimeout(() => clearInterval(interval), 20000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
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
        onLoadEnd={() => injectConnectionConfig()}
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
