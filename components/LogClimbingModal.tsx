import LogClimbingForm from '@/components/LogClimbingForm';
import React from 'react';
import { Modal, StyleSheet, View } from 'react-native';

interface LogClimbingModalProps {
  visible: boolean;
  onClose: () => void;
  route: {
    siteName: string;
    routeName: string;
    routeGrade?: string;
  };
  onLogSaved?: () => void; 
}

export default function LogClimbingModal({ visible, onClose, route, onLogSaved }: LogClimbingModalProps) {
  const handleSuccess = () => {
    console.log('Log saved successfully, notifying parent');
    if (onLogSaved) {
      onLogSaved(); 
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <LogClimbingForm 
          route={route}
          onClose={onClose}
          onSuccess={handleSuccess}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});