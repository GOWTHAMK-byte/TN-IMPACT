import { Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Platform, StyleSheet, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { useData } from '@/contexts/DataContext';

export default function TabLayout() {
  const safeAreaInsets = useSafeAreaInsets();
  const { unreadCount } = useData();
  const isWeb = Platform.OS === 'web';
  const isIOS = Platform.OS === 'ios';
  const isAndroid = Platform.OS === 'android';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.tabInactive,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: isWeb ? 10 : 0 },
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: isIOS ? 'transparent' : Colors.background,
          borderTopWidth: 1,
          borderTopColor: 'rgba(255, 255, 255, 0.05)',
          height: isWeb ? 84 : 64 + safeAreaInsets.bottom,
          paddingTop: 8,
          paddingBottom: isWeb ? 0 : safeAreaInsets.bottom + (isAndroid ? 4 : 0),
          elevation: 0,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.background }]} />
          ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }: any) => <Ionicons name={focused ? 'grid' : 'grid-outline'} size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="hr"
        options={{
          title: 'HR',
          tabBarIcon: ({ color, focused }: any) => <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="tickets"
        options={{
          title: 'IT',
          tabBarIcon: ({ color, focused }: any) => <Ionicons name={focused ? 'construct' : 'construct-outline'} size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: 'Finance',
          tabBarIcon: ({ color, focused }: any) => <Ionicons name={focused ? 'wallet' : 'wallet-outline'} size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'Menu',
          tabBarIcon: ({ color, focused }: any) => <Ionicons name={focused ? 'menu' : 'menu-outline'} size={22} color={color} />,
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: { backgroundColor: Colors.error, fontSize: 10, fontWeight: '900' },
        }}
      />
    </Tabs>
  );
}
