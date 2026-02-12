
import ClimbingLogList from '@/components/ClimbingLogList';
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
            <TouchableOpacity 
              onPress={() => router.back()} 
              style={{ marginLeft: 16 }}
            >
              <Ionicons name="arrow-back" size={24} color="#007AFF" />
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
    backgroundColor: '#f5f5f5',
  },
});