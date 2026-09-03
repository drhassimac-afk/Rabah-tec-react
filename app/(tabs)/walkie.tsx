import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import {
  useAudioRecorder,
  RecordingPresets,
  AudioModule,
  setAudioModeAsync,
  createAudioPlayer,
} from 'expo-audio';
import { getSocket, onBroadcast, sendBroadcast } from '../../src/api/socket';

export default function WalkieScreen() {
  const [recording, setRecording] = useState(false);
  const [lastSpeaker, setLastSpeaker] = useState('ما فيه رسائل بعد');
  const [muteIncoming, setMuteIncoming] = useState(false);
  const [connected, setConnected] = useState(false);
  const muteRef = useRef(muteIncoming);
  muteRef.current = muteIncoming;

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  useEffect(() => {
    (async () => {
      await AudioModule.requestRecordingPermissionsAsync();
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    })();

    const socket = getSocket();
    setConnected(!!socket?.connected);

    const off = onBroadcast(async (payload) => {
      if (payload?.type !== 'walkie') return;
      setLastSpeaker(`آخر متحدث: ${payload.name}`);
      if (muteRef.current) return;
      try {
        const uri = FileSystem.cacheDirectory + `walkie_${Date.now()}.m4a`;
        await FileSystem.writeAsStringAsync(uri, payload.audio, { encoding: FileSystem.EncodingType.Base64 });
        const player = createAudioPlayer(uri);
        player.play();
      } catch (e) {
        console.warn('تعذر تشغيل الرسالة الصوتية', e);
      }
    });

    return () => { off?.(); };
  }, []);

  const startRecording = async () => {
    if (!getSocket()?.connected) return;
    try {
      await recorder.prepareToRecordAsync();
      recorder.record();
      setRecording(true);
    } catch (e) {
      console.warn('تعذر بدء التسجيل', e);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    setRecording(false);
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) return;
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      sendBroadcast({ type: 'walkie', audio: base64 });
      setLastSpeaker('آخر متحدث: أنت');
    } catch (e) {
      console.warn('تعذر إرسال الرسالة الصوتية', e);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎙️ تخاطب لاسلكي</Text>
      {!connected && <Text style={styles.warn}>اتصل بالغرفة أولاً من الشاشة الرئيسية</Text>}
      <Text style={styles.desc}>اضغط مع الاستمرار للتحدث، وأفلت للإرسال</Text>

      <Pressable
        style={[styles.ptt, recording && styles.pttOn]}
        onPressIn={startRecording}
        onPressOut={stopRecording}
        disabled={!connected}
      >
        <Text style={styles.pttText}>{recording ? 'جارٍ التسجيل' : 'اضغط\nوتحدث'}</Text>
      </Pressable>

      <Text style={styles.lastSpeaker}>{lastSpeaker}</Text>

      <TouchableOpacity style={styles.muteRow} onPress={() => setMuteIncoming((v) => !v)}>
        <Text style={styles.muteText}>{muteIncoming ? '🔇 الرسائل الواردة مكتومة' : '🔊 كتم الرسائل الصوتية الواردة'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b1220', alignItems: 'center', paddingTop: 40, paddingHorizontal: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  warn: { color: '#f59e0b', marginTop: 12, textAlign: 'center' },
  desc: { color: '#94a3b8', marginTop: 14, textAlign: 'center' },
  ptt: {
    width: 160, height: 160, borderRadius: 80, backgroundColor: '#16a34a',
    borderWidth: 6, borderColor: '#16a34a55', justifyContent: 'center', alignItems: 'center', marginVertical: 40,
  },
  pttOn: { backgroundColor: '#dc2626', borderColor: '#dc262655' },
  pttText: { color: '#fff', fontWeight: 'bold', fontSize: 16, textAlign: 'center' },
  lastSpeaker: { color: '#94a3b8', fontSize: 14, marginBottom: 20 },
  muteRow: { backgroundColor: '#1a2332', padding: 14, borderRadius: 12, width: '100%', alignItems: 'center' },
  muteText: { color: '#fff' },
});
