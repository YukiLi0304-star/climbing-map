import { ui } from '@/constants/ui';
import { getFirebaseAuth, getFirebaseFirestore } from '@/lib/firebase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection } from 'firebase/firestore';
import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function AddRoutePage() {
  const { cragName, countyName } = useLocalSearchParams();
  const router = useRouter();

  const [routeName, setRouteName] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [height, setHeight] = useState('');
  const [hasStar, setHasStar] = useState(false);
  const [description, setDescription] = useState('');
  const [firstAscent, setFirstAscent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const auth = await getFirebaseAuth();
    if (!auth.currentUser) {
      Alert.alert('Login Required', 'Please login to add a route');
      router.push('/auth/login');
      return;
    }

    if (!routeName.trim()) {
      Alert.alert('Error', 'Route name is required');
      return;
    }

    setSubmitting(true);
    try {
      const firestore = await getFirebaseFirestore();

      await addDoc(collection(firestore, 'pending_route_edits'), {
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        cragName,
        countyName,
        action: 'add',
        data: {
          name: routeName,
          difficulty,
          height: height ? parseInt(height, 10) : null,
          has_star: hasStar,
          description,
          first_ascent: firstAscent,
        },
        status: 'pending',
        submittedAt: new Date().toISOString(),
      });

      Alert.alert('Submitted', 'Your new route has been submitted for review.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Submit failed:', error);
      Alert.alert('Error', 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Text style={styles.headerButtonText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Add route</Text>
        <TouchableOpacity
          onPress={handleSubmit}
          style={[styles.saveButton, submitting && styles.saveButtonDisabled]}
          disabled={submitting}
        >
          <Text style={styles.saveButtonText}>{submitting ? '...' : 'Save'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.locationCard}>
          <Text style={styles.locationEyebrow}>Location</Text>
          <Text style={styles.cragName}>{cragName}</Text>
          <Text style={styles.countyName}>{countyName}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Route name *</Text>
          <TextInput
            style={styles.input}
            value={routeName}
            onChangeText={setRouteName}
            placeholder="Enter route name"
            placeholderTextColor={ui.colors.textSoft}
          />

          <Text style={styles.label}>Difficulty</Text>
          <TextInput
            style={styles.input}
            value={difficulty}
            onChangeText={setDifficulty}
            placeholder="e.g. VS, HVS, E1"
            placeholderTextColor={ui.colors.textSoft}
          />

          <Text style={styles.label}>Height (meters)</Text>
          <TextInput
            style={styles.input}
            value={height}
            onChangeText={setHeight}
            placeholder="Height in meters"
            placeholderTextColor={ui.colors.textSoft}
            keyboardType="numeric"
          />

          <View style={styles.switchRow}>
            <View>
              <Text style={styles.label}>Star route</Text>
              <Text style={styles.switchHint}>Highlight this route as notable.</Text>
            </View>
            <Switch
              value={hasStar}
              onValueChange={setHasStar}
              trackColor={{ false: '#d9d2c7', true: '#8aa89b' }}
              thumbColor={hasStar ? ui.colors.accentStrong : ui.colors.white}
            />
          </View>

          <Text style={styles.label}>First ascent</Text>
          <TextInput
            style={styles.input}
            value={firstAscent}
            onChangeText={setFirstAscent}
            placeholder="e.g. T. Ryan, 1977"
            placeholderTextColor={ui.colors.textSoft}
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the line, rock quality, and gear notes"
            placeholderTextColor={ui.colors.textSoft}
            multiline
            numberOfLines={5}
          />
        </View>

        <View style={styles.noteCard}>
          <Text style={styles.noteTitle}>Review process</Text>
          <Text style={styles.noteText}>
            Newly submitted routes stay private until an admin reviews and approves them.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ui.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 18,
    backgroundColor: ui.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: ui.colors.border,
  },
  headerButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: ui.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: ui.colors.border,
  },
  headerButtonText: {
    fontSize: 14,
    color: ui.colors.textMuted,
    fontWeight: '700',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: ui.colors.text,
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: ui.colors.text,
    borderRadius: 16,
  },
  saveButtonDisabled: {
    opacity: 0.65,
  },
  saveButtonText: {
    color: ui.colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 18,
    paddingBottom: 28,
  },
  locationCard: {
    backgroundColor: ui.colors.accentSoft,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#c8d7d1',
    marginBottom: 14,
  },
  locationEyebrow: {
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: ui.colors.accentStrong,
    marginBottom: 8,
  },
  cragName: {
    fontSize: 20,
    fontWeight: '800',
    color: ui.colors.text,
  },
  countyName: {
    fontSize: 14,
    color: ui.colors.textMuted,
    marginTop: 4,
  },
  card: {
    backgroundColor: ui.colors.surface,
    borderRadius: 26,
    padding: 18,
    borderWidth: 1,
    borderColor: ui.colors.border,
    ...ui.shadows.card,
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
    backgroundColor: ui.colors.white,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 15,
    color: ui.colors.text,
    borderWidth: 1,
    borderColor: ui.colors.border,
    marginBottom: 18,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
    padding: 16,
    borderRadius: 18,
    backgroundColor: ui.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: ui.colors.border,
  },
  switchHint: {
    fontSize: 13,
    color: ui.colors.textMuted,
    marginTop: 4,
  },
  noteCard: {
    marginTop: 14,
    backgroundColor: ui.colors.surfaceMuted,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: ui.colors.border,
  },
  noteTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: ui.colors.text,
    marginBottom: 8,
  },
  noteText: {
    fontSize: 14,
    lineHeight: 22,
    color: ui.colors.textMuted,
  },
});
