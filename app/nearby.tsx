import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { onPresence, onPeerJoined, onPeerLeft, requestPresence, PresenceMember } from '../src/api/socket';
import { useRoom } from '../src/hooks/useRoom';

export default function NearbyScreen() {
  const { name, room, status } = useRoom();
  const [members, setMembers] = useState<PresenceMember[]>([]);

  useEffect(() => {
    const offPresence = onPresence((list) => setMembers(list));
    const offJoined = onPeerJoined((m) =>
      setMembers((prev) => (prev.find((p) => p.id === m.id) ? prev : [...prev, m]))
    );
    const offLeft = onPeerLeft(({ id }) => setMembers((prev) => prev.filter((p) => p.id !== id)));
    if (status === 'connected') requestPresence();
    return () => {
      offPresence();
      offJoined();
      offLeft();
    };
  }, [status]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-forward" size={24} color="#94A3B8" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>قريبون مني — غرفة {room}</Text>
        <View style={{ width: 24 }} />
      </View>
      <Text style={styles.subtitle}>الأشخاص المتصلين معك حاليًا</Text>
      <FlatList
        data={members}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.rowText}>
              👤 {item.name}
              {item.name === name ? ' (أنت)' : ''}
            </Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>ما فيه أشخاص متصلين حاليًا</Text>}
        contentContainerStyle={{ padding: 16 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0b1220' },
  header: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#243044' },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  subtitle: { color: '#94a3b8', textAlign: 'center', marginTop: 10, marginBottom: 4 },
  row: { backgroundColor: '#ffffff0a', borderWidth: 1, borderColor: '#ffffff14', borderRadius: 14, padding: 14, marginBottom: 10 },
  rowText: { color: '#fff', fontSize: 15 },
  empty: { color: '#94a3b8', textAlign: 'center', marginTop: 30 },
});
