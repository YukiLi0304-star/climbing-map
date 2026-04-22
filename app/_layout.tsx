import { ui } from '@/constants/ui';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

function LoadingScreen() {
  return (
    <View style={styles.loadingScreen}>
      <ActivityIndicator size="large" color={ui.colors.accent} />
      <Text style={styles.loadingEyebrow}>Preparing session</Text>
      <Text style={styles.loadingText}>Checking your climbing profile.</Text>
    </View>
  );
}

function RootLayoutContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: ui.colors.surface },
        headerShadowVisible: false,
        headerTintColor: ui.colors.text,
        headerTitleStyle: {
          color: ui.colors.text,
          fontWeight: '700',
        },
        contentStyle: {
          backgroundColor: ui.colors.background,
        },
      }}
    >
      {!user ? (
        <Stack.Screen name="auth/login" />
      ) : (
        <>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="profile/favorites/index"
            options={{
              headerShown: true,
              title: 'My Favorites',
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen
            name="profile/climbing-log/index"
            options={{
              headerShown: true,
              title: 'Climbing Log',
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen name="edit-site/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="admin/review" options={{ headerShown: false }} />
          <Stack.Screen name="admin/approved" options={{ headerShown: false }} />
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

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: ui.colors.background,
    paddingHorizontal: 32,
  },
  loadingEyebrow: {
    marginTop: 16,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: ui.colors.textSoft,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 15,
    color: ui.colors.textMuted,
    textAlign: 'center',
  },
});
