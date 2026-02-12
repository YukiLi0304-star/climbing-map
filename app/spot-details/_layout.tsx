import { Stack } from 'expo-router';

export default function SpotDetailsLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="[name]" 
        options={{ 
          headerShown: false, 
        }} 
      />
    </Stack>
  );
}