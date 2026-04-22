import { ui } from '@/constants/ui';
import { Link } from 'expo-router';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function ModalScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Modal</ThemedText>
      <ThemedText style={styles.copy}>
        This screen is still available, now with the same quieter visual language as the rest of the app.
      </ThemedText>
      <Link href="/" dismissTo style={styles.link}>
        <ThemedText type="link">Return to home</ThemedText>
      </Link>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: ui.colors.background,
  },
  copy: {
    marginTop: 10,
    textAlign: 'center',
    color: ui.colors.textMuted,
  },
  link: {
    marginTop: 18,
    paddingVertical: 14,
  },
});
