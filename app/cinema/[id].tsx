import { View, Text, StyleSheet } from 'react-native';
export default function CinemaScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎬 سينما</Text>
      <Text style={styles.info}>قيد التطوير...</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b1220', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  info: { color: '#888', marginTop: 10 },
});
