import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { sendChat, onChat, ChatPayload } from '../src/api/socket';
import { useRoom } from '../src/hooks/useRoom';

export default function ChatScreen() {
  const { name, room, status } = useRoom();
  const [messages, setMessages] = useState<ChatPayload[]>([]);
  const [text, setText] = useState('');
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    const off = onChat((payload) => {
      setMessages((prev) => [...prev, payload]);
    });
    return off;
  }, []);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    sendChat(trimmed);
    setMessages((prev) => [...prev, { name, text: trimmed, from: 'me', time: Date.now() }]);
    setText('');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-forward" size={24} color="#94A3B8" />
          </TouchableOpacity>
          <Text style={styles.headerText}>محادثات فورية — غرفة {room}</Text>
          <Text style={styles.statusText}>{status === 'connected' ? 'متصل' : 'غير متصل'}</Text>
        </View>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(_, i) => String(i)}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => (
            <View style={[styles.msg, item.from === 'me' && styles.msgMe]}>
              <Text style={styles.msgName}>{item.name}</Text>
              <Text style={styles.msgText}>{item.text}</Text>
            </View>
          )}
          contentContainerStyle={{ padding: 12 }}
        />
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="اكتب رسالة..."
            placeholderTextColor="#64748b"
          />
          <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
            <Text style={styles.sendBtnText}>إرسال</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0b1220' },
  container: { flex: 1 },
  header: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#243044' },
  headerText: { color: '#fff', fontSize: 15, fontWeight: '700', flex: 1, textAlign: 'center' },
  statusText: { color: '#4ade80', fontSize: 12 },
  msg: { backgroundColor: '#ffffff12', padding: 10, borderRadius: 14, marginBottom: 8, alignSelf: 'flex-start', maxWidth: '85%' },
  msgMe: { alignSelf: 'flex-end', backgroundColor: '#2563eb33' },
  msgName: { color: '#93c5fd', fontSize: 11, marginBottom: 4 },
  msgText: { color: '#fff', fontSize: 15 },
  inputRow: { flexDirection: 'row-reverse', padding: 10, gap: 8 },
  input: { flex: 1, backgroundColor: '#0f172a', borderRadius: 12, borderWidth: 1, borderColor: '#ffffff22', color: '#fff', padding: 12 },
  sendBtn: { backgroundColor: '#2563eb', borderRadius: 12, paddingHorizontal: 18, justifyContent: 'center' },
  sendBtnText: { color: '#fff', fontWeight: '700' },
});
