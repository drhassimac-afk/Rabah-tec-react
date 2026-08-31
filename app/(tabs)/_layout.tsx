import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#0b1220',
          borderTopColor: '#1a2332',
          height: Platform.OS === 'ios' ? 85 : 60,
          paddingBottom: Platform.OS === 'ios' ? 20 : 0,
        },
        tabBarActiveTintColor: '#4CAF50',
        tabBarInactiveTintColor: '#666',
        headerStyle: {
          backgroundColor: '#0b1220',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'الرئيسية', tabBarIcon: ({ color, size }) => <Icon name="home" size={size} color={color} /> }} />
      <Tabs.Screen name="walkie" options={{ title: 'توكي-ووكي', tabBarIcon: ({ color, size }) => <Icon name="mic" size={size} color={color} /> }} />
      <Tabs.Screen name="live" options={{ title: 'بث مباشر', tabBarIcon: ({ color, size }) => <Icon name="videocam" size={size} color={color} /> }} />
      <Tabs.Screen name="files" options={{ title: 'ملفات', tabBarIcon: ({ color, size }) => <Icon name="folder" size={size} color={color} /> }} />
      <Tabs.Screen name="games" options={{ title: 'ألعاب', tabBarIcon: ({ color, size }) => <Icon name="game-controller" size={size} color={color} /> }} />
      <Tabs.Screen name="settings" options={{ title: 'إعدادات', tabBarIcon: ({ color, size }) => <Icon name="settings" size={size} color={color} /> }} />
    </Tabs>
  );
}
