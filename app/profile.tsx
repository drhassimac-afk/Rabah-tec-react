import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NAME_KEY, ROOM_KEY } from '../src/hooks/useRoom';

export default function ProfileScreen() {
  const [name, setName] = useState('');
  const [room, setRoom] = useState('');

  useEffect(() => {
    (async () => {
      setName((await AsyncStorage.getItem(NAME_KEY)) || '');
      setRoom((await AsyncStorage.getItem(ROOM_KEY)) || '100');
    })();
  }, []);

  const handleSave = async () => {
    const trimmedName = name.trim();
    const trimmedRoom = room.trim() || '100';
    if (!trimmedName) {
      Alert.alert('اكتب اسمك أولاً');
      return;
    }
    await AsyncStorage.setItem(NAME_KEY, trimmedName);
    await AsyncStorage.setItem(ROOM_KEY, trimmedRoom);
    Alert.alert('تم الحفظ', 'أعد فتح شاشات الشات أو "قريبون مني" لتفعيل الاسم والغرفة الجديدين.');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-forward" size={24} color="#94A3B8" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ملفي</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.body}>
        <Text style={styles.label}>الاسم</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="اسمك" placeholderTextColor="#64748b" />
        <Text style={styles.label}>رمز الغرفة</Text>
        <TextInput style={styles.input} value={room} onChangeText={setRoom} placeholder="مثلاً: 100" placeholderTextColor="#64748b" keyboardType="number-pad" />
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>حفظ</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0b1220' },
  header: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#243044' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  body: { flex: 1, padding: 20 },
  label: { color: '#94a3b8', fontSize: 13, marginBottom: 6, marginTop: 14, textAlign: 'right' },
  input: { backgroundColor: '#0f172a', borderRadius: 12, borderWidth: 1, borderColor: '#ffffff22', color: '#fff', padding: 14, fontSize: 16, textAlign: 'right' },
  saveBtn: { backgroundColor: '#2563eb', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 24 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
