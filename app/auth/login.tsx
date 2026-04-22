import AuroraBackdrop from '@/components/AuroraBackdrop';
import { ui } from '@/constants/ui';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export default function LoginScreen() {
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('password123');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const { user, signIn, signUp } = useAuth();

  useEffect(() => {
    if (user) {
      router.replace('/(tabs)');
    }
  }, [user, router]);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setIsLoading(true);
    try {
      if (isSignUp) {
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
    } catch {
      Alert.alert('Error', 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const fillTestCredentials = () => {
    setEmail('test@example.com');
    setPassword('password123');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <AuroraBackdrop />
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Irish Climbing Guide</Text>
        <Text style={styles.title}>IClimbing</Text>
        <Text style={styles.subtitle}>
          A quieter, cleaner way to explore routes, save favorites, and track your days on rock.
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.segment}>
          <Pressable
            style={[styles.segmentButton, !isSignUp && styles.segmentButtonActive]}
            onPress={() => setIsSignUp(false)}
            disabled={isLoading}
          >
            <Text style={[styles.segmentLabel, !isSignUp && styles.segmentLabelActive]}>Sign in</Text>
          </Pressable>
          <Pressable
            style={[styles.segmentButton, isSignUp && styles.segmentButtonActive]}
            onPress={() => setIsSignUp(true)}
            disabled={isLoading}
          >
            <Text style={[styles.segmentLabel, isSignUp && styles.segmentLabelActive]}>Create account</Text>
          </Pressable>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="name@example.com"
            placeholderTextColor={ui.colors.textSoft}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!isLoading}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your password"
            placeholderTextColor={ui.colors.textSoft}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!isLoading}
          />
        </View>

        <Pressable
          style={[styles.primaryButton, isLoading && styles.primaryButtonDisabled]}
          onPress={handleAuth}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={ui.colors.white} />
          ) : (
            <>
              <Text style={styles.primaryButtonText}>
                {isSignUp ? 'Create account' : 'Continue'}
              </Text>
              <Ionicons name="arrow-forward" size={18} color={ui.colors.white} />
            </>
          )}
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={fillTestCredentials} disabled={isLoading}>
          <Text style={styles.secondaryButtonText}>Use test credentials</Text>
        </Pressable>

        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>Current status</Text>
          <Text style={styles.statusText}>
            {user ? `Signed in as ${user.email}` : 'Not signed in'}
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ui.colors.background,
    paddingHorizontal: 22,
    paddingTop: 72,
    paddingBottom: 28,
  },
  hero: {
    marginBottom: 28,
    paddingHorizontal: 4,
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: ui.colors.textSoft,
    marginBottom: 10,
  },
  title: {
    fontSize: 44,
    fontWeight: '800',
    color: ui.colors.text,
    letterSpacing: -1.5,
  },
  subtitle: {
    marginTop: 12,
    fontSize: 16,
    lineHeight: 24,
    color: ui.colors.textMuted,
    maxWidth: 340,
  },
  card: {
    backgroundColor: ui.colors.surfaceGlassStrong,
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.36)',
    ...ui.shadows.card,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: 'rgba(104, 64, 178, 0.14)',
    borderRadius: ui.radii.pill,
    padding: 4,
    marginBottom: 20,
  },
  segmentButton: {
    flex: 1,
    borderRadius: ui.radii.pill,
    paddingVertical: 12,
    alignItems: 'center',
  },
  segmentButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    ...ui.shadows.soft,
  },
  segmentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: ui.colors.textSoft,
  },
  segmentLabelActive: {
    color: ui.colors.text,
  },
  formGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: ui.colors.textSoft,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(188, 163, 255, 0.46)',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 15,
    color: ui.colors.text,
    backgroundColor: 'rgba(255,255,255,0.74)',
  },
  primaryButton: {
    marginTop: 8,
    backgroundColor: ui.colors.accentStrong,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: ui.colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    marginTop: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(188, 163, 255, 0.46)',
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  secondaryButtonText: {
    color: ui.colors.accentStrong,
    fontSize: 14,
    fontWeight: '700',
  },
  statusCard: {
    marginTop: 18,
    padding: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(109, 57, 219, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(188, 163, 255, 0.4)',
  },
  statusLabel: {
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: ui.colors.textSoft,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 13,
    color: ui.colors.textMuted,
  },
});
