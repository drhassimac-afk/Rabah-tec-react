import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import {
  RTCPeerConnection,
  RTCView,
  mediaDevices,
  RTCIceCandidate,
  RTCSessionDescription,
  MediaStream,
} from 'react-native-webrtc';
import {
  getSocket,
  onSignal,
  onPresence,
  requestPresence,
  sendSignal,
  PresenceMember,
} from '../../src/api/socket';

const PC_CONFIG = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

export default function LiveScreen() {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [members, setMembers] = useState<PresenceMember[]>([]);
  const [live, setLive] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [facing, setFacing] = useState<'user' | 'environment'>('user');
  const [connected, setConnected] = useState(false);

  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const liveRef = useRef(false);

  useEffect(() => {
    setConnected(!!getSocket()?.connected);
    requestPresence();

    const offSignal = onSignal(async ({ from, data }) => {
      if (data.type === 'offer') {
        const pc = getOrCreatePeerConnection(from);
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current!));
        }
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignal(from, { type: 'answer', sdp: answer });
      } else if (data.type === 'answer') {
        await pcsRef.current.get(from)?.setRemoteDescription(new RTCSessionDescription(data.sdp));
      } else if (data.type === 'candidate') {
        try {
          await pcsRef.current.get(from)?.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
          console.warn('تعذرت إضافة ICE candidate', e);
        }
      }
    });

    // أي تغيير بالحاضرين (انضمام/مغادرة) نزامن معه اتصالاتنا إذا كنا نبث حالياً
    const offPresence = onPresence((list) => {
      const myId = getSocket()?.id;
      const others = list.filter((m) => m.id !== myId);
      setMembers(others);

      if (!liveRef.current) return;

      // اتصل بأي عضو جديد ما عندناش اتصال معه
      others.forEach((m) => {
        if (!pcsRef.current.has(m.id)) placeCall(m.id);
      });

      // اقطع اتصال أي عضو غادر
      pcsRef.current.forEach((pc, peerId) => {
        if (!others.find((m) => m.id === peerId)) {
          pc.close();
          pcsRef.current.delete(peerId);
          setRemoteStreams((prev) => {
            const copy = { ...prev };
            delete copy[peerId];
            return copy;
          });
        }
      });
    });

    return () => {
      offSignal?.();
      offPresence?.();
      stopLive();
    };
  }, []);

  function getOrCreatePeerConnection(peerId: string) {
    const existing = pcsRef.current.get(peerId);
    if (existing) return existing;

    const pc = new RTCPeerConnection(PC_CONFIG);
    pcsRef.current.set(peerId, pc);

    // @ts-ignore
    pc.onicecandidate = (event: any) => {
      if (event.candidate) sendSignal(peerId, { type: 'candidate', candidate: event.candidate });
    };
    // @ts-ignore
    pc.ontrack = (event: any) => {
      if (event.streams && event.streams[0]) {
        setRemoteStreams((prev) => ({ ...prev, [peerId]: event.streams[0] }));
      }
    };
    return pc;
  }

  async function placeCall(peerId: string) {
    if (!localStreamRef.current) return;
    const pc = getOrCreatePeerConnection(peerId);
    localStreamRef.current.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current!));
    const offer = await pc.createOffer({});
    await pc.setLocalDescription(offer);
    sendSignal(peerId, { type: 'offer', sdp: offer });
  }

  async function startLive() {
    try {
      const stream = (await mediaDevices.getUserMedia({
        audio: true,
        video: { facingMode: facing },
      })) as unknown as MediaStream;
      setLocalStream(stream);
      localStreamRef.current = stream;
      setLive(true);
      liveRef.current = true;

      requestPresence();
      members.forEach((m) => placeCall(m.id));
    } catch (e) {
      console.warn('تعذر فتح الكاميرا', e);
    }
  }

  function stopLive() {
    pcsRef.current.forEach((pc) => pc.close());
    pcsRef.current.clear();
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    liveRef.current = false;
    setLocalStream(null);
    setRemoteStreams({});
    setLive(false);
  }

  function toggleMic() {
    const track = localStream?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicOn(track.enabled);
  }

  async function switchCamera() {
    const nextFacing = facing === 'user' ? 'environment' : 'user';
    // @ts-ignore - _switchCamera متوفر في react-native-webrtc للتبديل السريع
    localStream?.getVideoTracks()[0]?._switchCamera?.();
    setFacing(nextFacing);
  }

  const remoteEntries = Object.entries(remoteStreams);
  const isSingleCall = remoteEntries.length === 1;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📡 بث مباشر</Text>
      {!connected && <Text style={styles.warn}>اتصل بالغرفة أولاً من الشاشة الرئيسية</Text>}
      {live && <Text style={styles.viewerCount}>👥 {remoteEntries.length + 1} في المكالمة</Text>}

      <View style={styles.stage}>
        {remoteEntries.length === 0 && live && (
          <Text style={styles.waitingText}>بانتظار انضمام أعضاء آخرين للغرفة...</Text>
        )}

        {isSingleCall ? (
          // مكالمة ثنائية: فيديو الطرف الآخر يملأ الشاشة
          <View style={styles.fullRemoteBox}>
            {/* @ts-ignore */}
            <RTCView streamURL={remoteEntries[0][1].toURL()} style={styles.remoteVideo} objectFit="cover" />
            <Text style={styles.remoteName}>{members.find((m) => m.id === remoteEntries[0][0])?.name || 'مشارك'}</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.grid}>
            {remoteEntries.map(([peerId, stream]) => {
              const memberName = members.find((m) => m.id === peerId)?.name || 'مشارك';
              return (
                <View key={peerId} style={styles.remoteBox}>
                  {/* @ts-ignore */}
                  <RTCView streamURL={stream.toURL()} style={styles.remoteVideo} objectFit="cover" />
                  <Text style={styles.remoteName}>{memberName}</Text>
                </View>
              );
            })}
          </ScrollView>
        )}

        {localStream && (
          // @ts-ignore
          <RTCView streamURL={localStream.toURL()} style={styles.localVideo} objectFit="cover" mirror={facing === 'user'} />
        )}
      </View>

      {!live ? (
        <TouchableOpacity style={styles.startBtn} onPress={startLive} disabled={!connected}>
          <Text style={styles.btnText}>بدء البث بالكاميرا</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.controls}>
          <TouchableOpacity style={styles.ctrlBtn} onPress={toggleMic}>
            <Text style={styles.btnText}>{micOn ? '🎤 كتم المايك' : '🔇 المايك مكتوم'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ctrlBtn} onPress={switchCamera}>
            <Text style={styles.btnText}>🔄 تبديل الكاميرا</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.ctrlBtn, styles.stopBtn]} onPress={stopLive}>
            <Text style={styles.btnText}>إيقاف البث</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b1220', alignItems: 'center', paddingTop: 30, paddingHorizontal: 16 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 6 },
  warn: { color: '#f59e0b', marginBottom: 10, textAlign: 'center' },
  viewerCount: { color: '#4ade80', marginBottom: 8 },
  stage: { flex: 1, width: '100%', position: 'relative' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, width: '100%', paddingBottom: 10 },
  waitingText: { color: '#94a3b8', textAlign: 'center', marginTop: 30 },
  fullRemoteBox: { flex: 1, width: '100%', backgroundColor: '#000', borderRadius: 12, overflow: 'hidden', position: 'relative' },
  remoteBox: { width: '47%', aspectRatio: 3 / 4, backgroundColor: '#000', borderRadius: 12, overflow: 'hidden', position: 'relative' },
  remoteVideo: { width: '100%', height: '100%' },
  remoteName: { position: 'absolute', bottom: 6, left: 6, color: '#fff', fontSize: 12, backgroundColor: '#0009', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  localVideo: { position: 'absolute', top: 10, right: 10, width: 90, height: 120, borderRadius: 10, borderWidth: 2, borderColor: '#fff' },
  startBtn: { backgroundColor: '#dc2626', padding: 16, borderRadius: 12, width: '100%', alignItems: 'center', marginTop: 10 },
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', width: '100%', marginTop: 10 },
  ctrlBtn: { backgroundColor: '#2563eb', padding: 12, borderRadius: 10, marginHorizontal: 4, marginBottom: 8 },
  stopBtn: { backgroundColor: '#dc2626' },
  btnText: { color: '#fff', fontWeight: 'bold' },
});
