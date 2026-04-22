import { ui } from '@/constants/ui';
import { useClimbingLog } from '@/hooks/use-climbing-log';
import { getFirebaseAuth } from '@/lib/firebase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const CLIMBING_STYLES = [
  { label: 'Onsight', value: 'Onsight' },
  { label: 'Redpoint', value: 'Redpoint' },
  { label: 'Flash', value: 'Flash' },
  { label: 'Attempt', value: 'Attempt' },
] as const;

const RATING_LABELS = {
  1: 'Not good',
  2: 'Good',
  3: 'Excellent',
};

interface LogClimbingFormProps {
  route: {
    siteName: string;
    routeName: string;
    routeGrade?: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export default function LogClimbingForm({ route, onClose, onSuccess }: LogClimbingFormProps) {
  const { addLog } = useClimbingLog();
  const router = useRouter();

  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [climbingStyle, setClimbingStyle] = useState<typeof CLIMBING_STYLES[number]['value']>('Onsight');
  const [rating, setRating] = useState<1 | 2 | 3>(3);
  const [partner, setPartner] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleSubmit = async () => {
    const auth = await getFirebaseAuth();
    if (!auth.currentUser) {
      Alert.alert('Login Required', 'Please log in to record your climb', [
        {
          text: 'Login',
          onPress: () => {
            onClose();
            setTimeout(() => {
              router.push('/auth/login');
            }, 300);
          },
        },
        { text: 'Cancel' },
      ]);
      return;
    }

    if (!date) {
      Alert.alert('Info', 'Please select a climb date');
      return;
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      Alert.alert('Info', 'Please use the format YYYY-MM-DD');
      return;
    }

    setIsSubmitting(true);
    try {
      await addLog({
        siteName: route.siteName,
        routeName: route.routeName,
        routeGrade: route.routeGrade,
        cragName: route.siteName,
        routeId: `${route.siteName}_${route.routeName}_${Date.now()}`,
        date,
        climbingStyle,
        rating,
        partner: partner.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      Alert.alert('Success', 'Climb log saved successfully', [
        {
          text: 'OK',
          onPress: () => {
            onSuccess();
            onClose();
          },
        },
      ]);
    } catch (error) {
      console.error('Failed to save log:', error);
      Alert.alert('Error', 'Failed to save log, please try again');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.customNavBar}>
        <TouchableOpacity style={styles.navBackButton} onPress={onClose} disabled={isSubmitting}>
          <Ionicons name="arrow-back" size={20} color={ui.colors.text} />
          <Text style={styles.navBackText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.navTitle} numberOfLines={1}>
          Log climb
        </Text>
        <View style={styles.navSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.routeCard}>
          <Text style={styles.eyebrow}>Selected route</Text>
          <View style={styles.routeHeader}>
            <Text style={styles.routeName} numberOfLines={2}>
              {route.routeName}
            </Text>
            {route.routeGrade ? (
              <View style={styles.gradeBadge}>
                <Text style={styles.gradeText}>{route.routeGrade}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.siteName} numberOfLines={1}>
            {route.siteName}
          </Text>
          <Text style={styles.routeHint}>Capture the day while the details are still fresh.</Text>
        </View>

        <View style={styles.formCard}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Climb date *</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
              disabled={isSubmitting}
            >
              <Text style={styles.dateText}>
                {new Date(date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'long',
                })}
              </Text>
              <Ionicons name="calendar-outline" size={18} color={ui.colors.textMuted} />
            </TouchableOpacity>

            {showDatePicker ? (
              <View style={styles.dateInputContainer}>
                <Text style={styles.dateInputLabel}>Enter date as YYYY-MM-DD</Text>
                <TextInput
                  style={styles.dateInput}
                  value={date}
                  onChangeText={setDate}
                  placeholder="2024-01-20"
                  placeholderTextColor={ui.colors.textSoft}
                  keyboardType="numbers-and-punctuation"
                  editable={!isSubmitting}
                />
                <TouchableOpacity
                  style={styles.dateInputButton}
                  onPress={() => setShowDatePicker(false)}
                  disabled={isSubmitting}
                >
                  <Text style={styles.dateInputButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Climbing style</Text>
            <View style={styles.styleOptions}>
              {CLIMBING_STYLES.map((style) => (
                <TouchableOpacity
                  key={style.value}
                  style={[
                    styles.styleOption,
                    climbingStyle === style.value && styles.styleOptionSelected,
                    isSubmitting && styles.disabledOption,
                  ]}
                  onPress={() => !isSubmitting && setClimbingStyle(style.value)}
                  disabled={isSubmitting}
                >
                  <Text
                    style={[
                      styles.styleOptionText,
                      climbingStyle === style.value && styles.styleOptionTextSelected,
                    ]}
                  >
                    {style.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Rating</Text>
            <View style={styles.ratingContainer}>
              {[1, 2, 3].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => !isSubmitting && setRating(star as 1 | 2 | 3)}
                  style={styles.starButton}
                  disabled={isSubmitting}
                >
                  <Ionicons
                    name={star <= rating ? 'star' : 'star-outline'}
                    size={34}
                    color={star <= rating ? ui.colors.gold : '#cfc8bd'}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.ratingHint}>{RATING_LABELS[rating]}</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Partner</Text>
            <TextInput
              style={[styles.input, isSubmitting && styles.disabledInput]}
              value={partner}
              onChangeText={setPartner}
              placeholder="Who were you climbing with?"
              placeholderTextColor={ui.colors.textSoft}
              editable={!isSubmitting}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea, isSubmitting && styles.disabledInput]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Conditions, beta, gear notes, or a quick memory from the day"
              placeholderTextColor={ui.colors.textSoft}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              editable={!isSubmitting}
            />
            <Text style={styles.notesHint}>Max 500 characters ({notes.length}/500)</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Text style={styles.submitButtonText}>{isSubmitting ? 'Saving...' : 'Save log'}</Text>
        </TouchableOpacity>

        <View style={styles.spacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ui.colors.background,
  },
  customNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 52,
    paddingBottom: 16,
    paddingHorizontal: 18,
    backgroundColor: ui.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: ui.colors.border,
  },
  navBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  navBackText: {
    fontSize: 14,
    color: ui.colors.text,
    fontWeight: '700',
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: ui.colors.text,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 12,
  },
  navSpacer: {
    width: 56,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 18,
  },
  routeCard: {
    backgroundColor: ui.colors.surface,
    borderRadius: 26,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: ui.colors.border,
    ...ui.shadows.card,
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: ui.colors.textSoft,
    marginBottom: 8,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  routeName: {
    fontSize: 22,
    fontWeight: '800',
    color: ui.colors.text,
    flex: 1,
    marginRight: 12,
    lineHeight: 28,
  },
  gradeBadge: {
    backgroundColor: ui.colors.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: ui.radii.pill,
    minWidth: 50,
    alignItems: 'center',
  },
  gradeText: {
    color: ui.colors.accent,
    fontWeight: '800',
    fontSize: 13,
  },
  siteName: {
    fontSize: 14,
    color: ui.colors.textMuted,
    marginBottom: 12,
  },
  routeHint: {
    fontSize: 14,
    color: ui.colors.textSoft,
    lineHeight: 21,
  },
  formCard: {
    backgroundColor: ui.colors.surface,
    borderRadius: 26,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: ui.colors.border,
    ...ui.shadows.soft,
  },
  formGroup: {
    marginBottom: 22,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: ui.colors.textSoft,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
    backgroundColor: ui.colors.surfaceMuted,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: ui.colors.border,
  },
  dateText: {
    fontSize: 15,
    color: ui.colors.text,
    fontWeight: '600',
    flex: 1,
    marginRight: 10,
  },
  dateInputContainer: {
    marginTop: 12,
    padding: 14,
    backgroundColor: ui.colors.surfaceMuted,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: ui.colors.border,
  },
  dateInputLabel: {
    fontSize: 13,
    color: ui.colors.textMuted,
    marginBottom: 8,
    fontWeight: '600',
  },
  dateInput: {
    padding: 14,
    backgroundColor: ui.colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: ui.colors.border,
    fontSize: 15,
    color: ui.colors.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  dateInputButton: {
    backgroundColor: ui.colors.text,
    padding: 12,
    borderRadius: 16,
    alignItems: 'center',
  },
  dateInputButtonText: {
    color: ui.colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  styleOptions: {
    gap: 10,
  },
  styleOption: {
    padding: 15,
    backgroundColor: ui.colors.surfaceMuted,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: ui.colors.border,
  },
  styleOptionSelected: {
    backgroundColor: ui.colors.text,
    borderColor: ui.colors.text,
  },
  styleOptionText: {
    fontSize: 14,
    color: ui.colors.textMuted,
    textAlign: 'center',
    fontWeight: '600',
  },
  styleOptionTextSelected: {
    color: ui.colors.white,
  },
  disabledOption: {
    opacity: 0.65,
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 18,
    marginVertical: 8,
  },
  starButton: {
    padding: 8,
  },
  ratingHint: {
    textAlign: 'center',
    fontSize: 14,
    color: ui.colors.textMuted,
    marginTop: 4,
    fontWeight: '600',
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 15,
    backgroundColor: ui.colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: ui.colors.border,
    fontSize: 15,
    color: ui.colors.text,
  },
  disabledInput: {
    opacity: 0.65,
  },
  textArea: {
    minHeight: 120,
    lineHeight: 22,
  },
  notesHint: {
    fontSize: 12,
    color: ui.colors.textSoft,
    marginTop: 8,
    textAlign: 'right',
  },
  submitButton: {
    backgroundColor: ui.colors.text,
    paddingVertical: 17,
    borderRadius: 20,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: ui.colors.white,
    fontSize: 16,
    fontWeight: '800',
  },
  spacer: {
    height: 32,
  },
});
