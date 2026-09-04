import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useVideoPlayer, VideoView } from 'expo-video';
import { onBroadcast, sendBroadcast } from '../../src/api/socket';
import { useRoom } from '../../src/hooks/useRoom';

const C = {
  bg: '#0B1120',
  surface: '#161F2E',
  border: '#243044',
  primary: '#3B82F6',
  text: '#FFFFFF',
  sub: '#94A3B8',
  danger: '#EF4444',
  success: '#22C55E',
};

function extractYoutubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|v=)([\w-]{11})/);
  return match ? match[1] : null;
}

export default function CinemaScreen() {
  const { name, room, status } = useRoom();
  const [inputUrl, setInputUrl] = useState('');
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [sharedBy, setSharedBy] = useState<string | null>(null);
  const isSharerRef = useRef(false);

  const youtubeId = activeUrl ? extractYoutubeId(activeUrl) : null;
  const isMp4 = !!activeUrl && !youtubeId;

  const player = useVideoPlayer(isMp4 ? activeUrl! : '', (p) => {
    p.loop = false;
  });

  useEffect(() => {
    const off = onBroadcast((payload) => {
      if (payload.type === 'cinema') {
        isSharerRef.current = false;
        setActiveUrl(payload.url);
        setSharedBy(payload.name || 'شخص');
      }
      if (payload.type === 'cinema-ctrl' && isMp4) {
        if (payload.action === 'play') {
          player.currentTime = payload.time || 0;
          player.play();
        }
        if (payload.action === 'pause') {
          player.currentTime = payload.time || 0;
          player.pause();
        }
        if (payload.action === 'seek') {
          player.currentTime = payload.time || 0;
        }
      }
    });
    return () => { off?.(); };
  }, [isMp4, player]);

  const shareVideo = () => {
    const url = inputUrl.trim();
    if (!url) return;
    isSharerRef.current = true;
    setActiveUrl(url);
    setSharedBy(name || 'أنت');
    sendBroadcast({ type: 'cinema', url, name });
  };

  const handlePlay = () => {
    player.play();
    if (isSharerRef.current) {
      sendBroadcast({ type: 'cinema-ctrl', action: 'play', time: player.currentTime });
    }
  };

  const handlePause = () => {
    player.pause();
    if (isSharerRef.current) {
      sendBroadcast({ type: 'cinema-ctrl', action: 'pause', time: player.currentTime });
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-forward" size={24} color={C.sub} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>سينما وتلفاز</Text>
        <Text style={styles.roomText}>غرفة {room}</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={inputUrl}
            onChangeText={setInputUrl}
            placeholder="رابط فيديو mp4 أو YouTube"
            placeholderTextColor="#64748b"
          />
          <TouchableOpacity style={styles.shareButton} onPress={shareVideo} activeOpacity={0.8}>
            <Text style={styles.shareButtonText}>عرض للجميع</Text>
          </TouchableOpacity>
        </View>

        {sharedBy && <Text style={styles.sharedByText}>يعرضه الآن: {sharedBy}</Text>}

        {!activeUrl && (
          <View style={styles.emptyBox}>
            <Ionicons name="film-outline" size={40} color="#64748B" />
            <Text style={styles.emptyText}>لا يوجد فيديو معروض حاليًا</Text>
          </View>
        )}

        {youtubeId && (
          <View style={styles.videoBox}>
            <WebView
              source={{ uri: `https://www.youtube.com/embed/${youtubeId}?autoplay=1` }}
              style={styles.webview}
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
            />
            <Text style={styles.syncHint}>ملاحظة: مزامنة التشغيل/الإيقاف غير مدعومة لروابط YouTube حاليًا</Text>
          </View>
        )}

        {isMp4 && (
          <View style={styles.videoBox}>
            <VideoView player={player} style={styles.video} contentFit="contain" nativeControls={false} />
            <View style={styles.controlsRow}>
              <TouchableOpacity style={[styles.controlButton, { backgroundColor: C.success }]} onPress={handlePlay}>
                <Ionicons name="play" size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.controlButton, { backgroundColor: C.danger }]} onPress={handlePause}>
                <Ionicons name="pause" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerTitle: { color: C.text, fontSize: 18, fontWeight: '800' },
  roomText: { color: C.sub, fontSize: 12 },
  body: { flex: 1, padding: 16 },
  inputRow: { flexDirection: 'row-reverse', gap: 8, marginBottom: 10 },
  input: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    color: C.text,
    padding: 12,
  },
  shareButton: {
    backgroundColor: C.success,
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  shareButtonText: { color: '#fff', fontWeight: '700' },
  sharedByText: { color: C.sub, fontSize: 13, marginBottom: 10, textAlign: 'right' },
  emptyBox: { alignItems: 'center', justifyContent: 'center', marginTop: 60, gap: 10 },
  emptyText: { color: C.sub, fontSize: 14 },
  videoBox: { marginTop: 10 },
  video: { width: '100%', height: 220, backgroundColor: '#000', borderRadius: 12 },
  webview: { width: '100%', height: 220, borderRadius: 12 },
  syncHint: { color: '#64748B', fontSize: 11, marginTop: 6, textAlign: 'center' },
  controlsRow: { flexDirection: 'row', justifyContent: 'center', gap: 14, marginTop: 12 },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
