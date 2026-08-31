import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import Icon from 'react-native-vector-icons/Ionicons';

const features = [
  { id: 'walkie', title: '🎙️ توكي-ووكي', icon: 'mic', color: '#4CAF50', route: '/walkie' },
  { id: 'live', title: '📡 بث مباشر', icon: 'videocam', color: '#f44336', route: '/live' },
  { id: 'files', title: '📁 ملفات', icon: 'folder', color: '#7c1fd9', route: '/files' },
  { id: 'games', title: '🎮 ألعاب', icon: 'game-controller', color: '#f59e0b', route: '/games' },
  { id: 'cinema', title: '🎬 سينما', icon: 'film', color: '#0d9e3f', route: '/cinema/1' },
];

export default function HomeScreen() {
  const router = useRouter();
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🏠 RabahTec</Text>
        <Text style={styles.subtitle}>شبكتك الاجتماعية المحلية</Text>
      </View>
      <View style={styles.grid}>
        {features.map((feature) => (
          <TouchableOpacity key={feature.id} style={[styles.card, { borderColor: feature.color }]} onPress={() => router.push(feature.route as any)}>
            <View style={[styles.iconContainer, { backgroundColor: feature.color }]}>
              <Icon name={feature.icon} size={30} color="#fff" />
            </View>
            <Text style={styles.cardTitle}>{feature.title}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b1220', padding: 16 },
  header: { marginTop: 20, marginBottom: 30 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#fff', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#4CAF50', textAlign: 'center', marginTop: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { width: '48%', backgroundColor: '#1a2332', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#333', alignItems: 'center' },
  iconContainer: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
});
