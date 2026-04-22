import ClimbingLogList from '@/components/ClimbingLogList';
import { ui } from '@/constants/ui';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

export default function ClimbingLogScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Climbing Log',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={20} color={ui.colors.text} />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.container}>
        <ClimbingLogList />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ui.colors.background,
  },
  backButton: {
    marginLeft: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ui.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: ui.colors.border,
  },
});
