import { Stack } from 'expo-router';

export default function SpotDetailsLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="[id]" 
        options={{ 
          headerTitle: '攀岩点详情',
          headerBackTitle: '返回'
        }} 
      />
    </Stack>
  );
}