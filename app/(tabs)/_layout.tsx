import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { ui } from '../../constants/ui';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: ui.colors.white,
        tabBarInactiveTintColor: '#d0c1ff',
        tabBarStyle: {
          height: 74,
          paddingTop: 10,
          paddingBottom: 12,
          backgroundColor: 'rgba(50, 24, 95, 0.92)',
          borderTopColor: 'rgba(208, 193, 255, 0.24)',
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Map',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'map' : 'map-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: 'Community',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
