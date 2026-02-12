import { useClimbingLog } from '@/hooks/use-climbing-log';
import { Ionicons } from '@expo/vector-icons';
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
  3: 'Excellent!'
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
  
  
  const [date, setDate] = useState(() => {
    
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [climbingStyle, setClimbingStyle] = useState<typeof CLIMBING_STYLES[number]['value']>('Onsight');
  const [rating, setRating] = useState<1 | 2 | 3>(3);
  const [partner, setPartner] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleSubmit = async () => {
    if (!date) {
      Alert.alert('Info', 'Please select a climb date');
      return;
    }

    
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      Alert.alert('Info', 'Please use correct date format: YYYY-MM-DD');
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
      {/* Custom navigation bar */}
      <View style={styles.customNavBar}>
        <TouchableOpacity 
          style={styles.navBackButton}
          onPress={onClose}
          disabled={isSubmitting}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
          <Text style={styles.navBackText}>Back</Text>
        </TouchableOpacity>
        
        <Text style={styles.navTitle} numberOfLines={1}>
          Log Climb
        </Text>
        <View style={{ width: 60, height: 1 }} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Route info card */}
        <View style={styles.routeCard}>
          <View style={styles.routeHeader}>
            <Text style={styles.routeName} numberOfLines={2}>
              {route.routeName}
            </Text>
            {route.routeGrade && (
              <View style={styles.gradeBadge}>
                <Text style={styles.gradeText}>{route.routeGrade}</Text>
              </View>
            )}
          </View>
          <Text style={styles.siteName} numberOfLines={1}>
            {route.siteName}
          </Text>
          <View style={styles.routeDivider} />
          <Text style={styles.routeHint}>
            Log your ascent of this route
          </Text>
        </View>

        {/* Form area */}
        <View style={styles.formCard}>
          {/* Date selection */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Climb Date <Text style={styles.required}>*</Text>
            </Text>
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
                  weekday: 'long'
                })}
              </Text>
              <Ionicons name="calendar-outline" size={20} color="#666" />
            </TouchableOpacity>
            
            {/* Simple date input (hidden) */}
            {showDatePicker && (
              <View style={styles.dateInputContainer}>
                <Text style={styles.dateInputLabel}>Enter date (YYYY-MM-DD):</Text>
                <TextInput
                  style={styles.dateInput}
                  value={date}
                  onChangeText={setDate}
                  placeholder="2024-01-20"
                  placeholderTextColor="#999"
                  keyboardType="numbers-and-punctuation"
                  editable={!isSubmitting}
                />
                <TouchableOpacity
                  style={styles.dateInputButton}
                  onPress={() => setShowDatePicker(false)}
                  disabled={isSubmitting}
                >
                  <Text style={styles.dateInputButtonText}>OK</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Climbing style */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Climbing Style</Text>
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

          {/* Rating */}
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
                    name={star <= rating ? "star" : "star-outline"}
                    size={36}
                    color={star <= rating ? "#FFD700" : "#DDDDDD"}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.ratingHint}>
              {RATING_LABELS[rating]}
            </Text>
          </View>

          {/* Partner */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Partner (optional)</Text>
            <TextInput
              style={[styles.input, isSubmitting && styles.disabledInput]}
              value={partner}
              onChangeText={setPartner}
              placeholder="Who did you climb with?"
              placeholderTextColor="#999"
              editable={!isSubmitting}
            />
          </View>

          {/* Notes */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea, isSubmitting && styles.disabledInput]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Share your experience, challenges, fun facts..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!isSubmitting}
            />
            <Text style={styles.notesHint}>
              Max 500 characters ({notes.length}/500)
            </Text>
          </View>
        </View>

        {/* Submit button */}
        <TouchableOpacity 
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Text style={styles.submitButtonText}>Saving...</Text>
          ) : (
            <Text style={styles.submitButtonText}>Save Log</Text>
          )}
        </TouchableOpacity>

        <View style={styles.spacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  customNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50, 
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 4,
  },
  navBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
  },
  navBackText: {
    marginLeft: 4,
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 12,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  routeCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  routeName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 12,
    lineHeight: 24,
  },
  gradeBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 50,
    alignItems: 'center',
  },
  gradeText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  siteName: {
    fontSize: 15,
    color: '#666',
    marginBottom: 16,
  },
  routeDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginBottom: 12,
  },
  routeHint: {
    fontSize: 14,
    color: '#888',
    fontStyle: 'italic',
  },
  formCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  required: {
    color: '#FF3B30',
  },
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
  },
  dateText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  dateInputContainer: {
    marginTop: 12,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
  },
  dateInputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  dateInput: {
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  dateInputButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  dateInputButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  styleOptions: {
    gap: 10,
  },
  styleOption: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
  },
  styleOptionSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  styleOptionText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  styleOptionTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
  disabledOption: {
    opacity: 0.6,
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginVertical: 12,
  },
  starButton: {
    padding: 8,
  },
  ratingHint: {
    textAlign: 'center',
    fontSize: 15,
    color: '#666',
    marginTop: 4,
    fontWeight: '500',
  },
  input: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    fontSize: 16,
    color: '#333',
  },
  disabledInput: {
    opacity: 0.6,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
    lineHeight: 22,
  },
  notesHint: {
    fontSize: 13,
    color: '#999',
    marginTop: 6,
    textAlign: 'right',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonDisabled: {
    backgroundColor: '#8E8E93',
    shadowOpacity: 0.1,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  spacer: {
    height: 40,
  },
});