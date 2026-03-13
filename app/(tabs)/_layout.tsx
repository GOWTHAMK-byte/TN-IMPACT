import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { useData } from '@/contexts/DataContext';

const TabIcon = ({ name, focused, title }: { name: any, focused: boolean, title: string }) => {
  return (
    <View style={[
      styles.tabIconContainer,
      focused && styles.tabIconContainerFocused
    ]}>
      <Ionicons
        name={name}
        size={22}
        color={focused ? Colors.accent : Colors.tabInactive}
      />
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[
          styles.tabIconText,
          focused && styles.tabIconTextFocused
        ]}>
        {title}
      </Text>
    </View>
  );
};

export default function TabLayout() {
  const safeAreaInsets = useSafeAreaInsets();
  const { unreadCount } = useData();
  const isWeb = Platform.OS === 'web';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: isWeb ? 20 : Math.max(safeAreaInsets.bottom, 10) + 10,
          left: isWeb ? 20 : 12,
          right: isWeb ? 20 : 12,
          backgroundColor: Colors.surface, // Used Elevate Navy for the floating bar
          borderRadius: 40,
          height: 65,
          paddingTop: isWeb ? 0 : 10,
          paddingBottom: 0,
          borderTopWidth: 1,
          borderTopColor: Colors.cardBorder,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3, // slightly stronger shadow for dark mode
          shadowRadius: 10,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }: any) => <TabIcon name={focused ? 'grid' : 'grid-outline'} focused={focused} title="Home" />,
        }}
      />
      <Tabs.Screen
        name="hr"
        options={{
          tabBarIcon: ({ focused }: any) => <TabIcon name={focused ? 'calendar' : 'calendar-outline'} focused={focused} title="HR" />,
        }}
      />
      <Tabs.Screen
        name="tickets"
        options={{
          tabBarIcon: ({ focused }: any) => <TabIcon name={focused ? 'construct' : 'construct-outline'} focused={focused} title="IT" />,
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          tabBarIcon: ({ focused }: any) => <TabIcon name={focused ? 'wallet' : 'wallet-outline'} focused={focused} title="Finance" />,
        }}
      />
      <Tabs.Screen
        name="todos"
        options={{
          href: null,
          tabBarIcon: ({ focused }: any) => <TabIcon name={focused ? 'checkmark-circle' : 'checkmark-circle-outline'} focused={focused} title="Tasks" />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          tabBarIcon: ({ focused }: any) => (
            <View>
              <TabIcon name={focused ? 'menu' : 'menu-outline'} focused={focused} title="Menu" />
              {unreadCount > 0 && (
                <View style={[styles.badgeContainer, focused && { right: 0 }]}>
                  <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                </View>
              )}
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderRadius: 16,
    width: 68,
    height: 58,
  },
  tabIconContainerFocused: {
    backgroundColor: Colors.accentLight,
  },
  tabIconText: {
    color: Colors.tabInactive,
    fontSize: 10,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
  tabIconTextFocused: {
    color: Colors.accent,
    fontWeight: '700',
  },
  badgeContainer: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.error,
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '900',
    textAlign: 'center',
  },
});
