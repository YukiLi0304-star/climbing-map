
import { Stack } from 'expo-router';

export default function ProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: 'Back',
        headerTintColor: '#007AFF',
      }}
    >
      <Stack.Screen 
        name="index" 
        options={{ 
          title: 'Profile',
          
          headerLeft: () => null,
        }} 
      />
      <Stack.Screen 
        name="favorites/index" 
        options={{ 
          title: 'My Favorites',
          
          headerBackVisible: true,
        }} 
      />
      <Stack.Screen 
        name="climbing-log/index" 
        options={{ 
          title: 'Climbing Log',
          headerBackVisible: true,
        }} 
      />
    </Stack>
  );
}