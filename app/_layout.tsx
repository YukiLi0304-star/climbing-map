import { AuthProvider, useAuth } from '@/context/AuthContext';
import { Stack } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';

function LoadingScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
      <Text>Loading...</Text>
    </View>
  );
}


function RootLayoutContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {!user ? (
        <Stack.Screen name="auth/login" />
      ) : (
        <>
          {/* tabs 页面继续隐藏 header */}
          <Stack.Screen name="(tabs)" />
          
          {/* 为 profile 下的页面显示 header */}
          {/* 注意：这里需要指定完整的路由路径 */}
          <Stack.Screen 
            name="profile/favorites/index" 
            options={{ 
              headerShown: true,
              title: 'My Favorites',
              headerBackTitle: 'Back',
              headerTintColor: '#007AFF',
            }} 
          />
          <Stack.Screen 
            name="profile/climbing-log/index" 
            options={{ 
              headerShown: true,
              title: 'Climbing Log',
              headerBackTitle: 'Back',
              headerTintColor: '#007AFF',
            }} 
          />
        </>
      )}
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutContent />
    </AuthProvider>
  );
}