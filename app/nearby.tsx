import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
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
    <View style={styles.container}>
      <Text style={styles.title}>قريبون مني — غرفة {room}</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b1220' },
  title: { color: '#fff', fontSize: 20, fontWeight: '800', textAlign: 'center', marginTop: 20 },
  subtitle: { color: '#94a3b8', textAlign: 'center', marginTop: 6, marginBottom: 10 },
  row: { backgroundColor: '#ffffff0a', borderWidth: 1, borderColor: '#ffffff14', borderRadius: 14, padding: 14, marginBottom: 10 },
  rowText: { color: '#fff', fontSize: 15 },
  empty: { color: '#94a3b8', textAlign: 'center', marginTop: 30 },
});
