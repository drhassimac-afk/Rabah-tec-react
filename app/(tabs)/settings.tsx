import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Ionicons';

interface Settings {
  enabled: boolean;
  host: string;
  port: number;
  peerId: string;
}

const DEFAULT_SETTINGS: Settings = {
  enabled: false,
  host: '0.peerjs.com',
  port: 9000,
  peerId: `rabah-${Math.random().toString(36).slice(2, 8)}`,
};

export default function SettingsScreen() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem('rabah_settings');
      if (stored) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
    } catch (error) { console.log('خطأ في تحميل الإعدادات', error); }
    finally { setLoading(false); }
  };

  const saveSettings = async (newSettings: Settings) => {
    try {
      await AsyncStorage.setItem('rabah_settings', JSON.stringify(newSettings));
      setSettings(newSettings);
      Alert.alert('✅', 'تم حفظ الإعدادات');
    } catch (error) { Alert.alert('❌', 'خطأ في حفظ الإعدادات'); }
  };

  if (loading) return <View style={styles.container}><Text style={styles.loadingText}>جاري التحميل...</Text></View>;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>⚙️ الإعدادات</Text>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔌 الاتصال</Text>
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>استخدام سيرفر محلي</Text>
          <Switch value={settings.enabled} onValueChange={(value) => setSettings(prev => ({ ...prev, enabled: value }))} trackColor={{ false: '#333', true: '#4CAF50' }} thumbColor="#fff" />
        </View>
        {settings.enabled && (
          <>
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>عنوان IP</Text>
              <TextInput style={styles.input} value={settings.host} onChangeText={(text) => setSettings(prev => ({ ...prev, host: text }))} placeholder="مثال: 192.168.1.5" placeholderTextColor="#666" />
            </View>
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>المنفذ</Text>
              <TextInput style={styles.input} value={String(settings.port)} onChangeText={(text) => setSettings(prev => ({ ...prev, port: parseInt(text) || 9000 }))} placeholder="9000" placeholderTextColor="#666" keyboardType="numeric" />
            </View>
          </>
        )}
        <TouchableOpacity style={styles.saveButton} onPress={() => saveSettings(settings)}>
          <Icon name="save" size={20} color="#fff" />
          <Text style={styles.saveButtonText}>حفظ الإعدادات</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🆔 المعرف</Text>
        <View style={styles.peerIdBox}>
          <Text style={styles.peerIdText}>{settings.peerId}</Text>
        </View>
        <Text style={styles.infoText}>استخدم هذا المعرف للاتصال بك</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b1220', padding: 16 },
  loadingText: { color: '#fff', textAlign: 'center', marginTop: 50, fontSize: 18 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 24, marginTop: 10 },
  section: { backgroundColor: '#1a2332', borderRadius: 12, padding: 16, marginBottom: 16 },
  sectionTitle: { color: '#4CAF50', fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  settingItem: { marginBottom: 16 },
  settingLabel: { color: '#fff', fontSize: 16, marginBottom: 8 },
  input: { backgroundColor: '#0b1220', color: '#fff', borderRadius: 8, padding: 12, fontSize: 16, borderWidth: 1, borderColor: '#333' },
  saveButton: { backgroundColor: '#4CAF50', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, borderRadius: 8, gap: 8 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  peerIdBox: { backgroundColor: '#0b1220', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#333' },
  peerIdText: { color: '#4CAF50', fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
  infoText: { color: '#888', fontSize: 14, marginTop: 8, textAlign: 'center' },
});
