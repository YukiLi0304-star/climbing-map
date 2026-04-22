import { ui } from '@/constants/ui';
import { getFirebaseAuth, getFirebaseFirestore } from '@/lib/firebase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface PendingRouteEdit {
  id: string;
  userId: string;
  userEmail: string;
  cragName: string;
  countyName: string;
  action: string;
  data: {
    name: string;
    difficulty: string;
    height: number;
    has_star: boolean;
    description: string;
    first_ascent: string;
  };
  status: string;
  submittedAt: string;
}

export default function ReviewScreen() {
  const router = useRouter();
  const [pendingEdits, setPendingEdits] = useState<PendingRouteEdit[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPendingEdits = useCallback(async () => {
    try {
      setLoading(true);
      const firestore = await getFirebaseFirestore();
      const reviewQuery = query(
        collection(firestore, 'pending_route_edits'),
        where('status', '==', 'pending')
      );
      const snapshot = await getDocs(reviewQuery);

      const edits: PendingRouteEdit[] = [];
      snapshot.forEach((entry) => {
        edits.push({ id: entry.id, ...entry.data() } as PendingRouteEdit);
      });

      edits.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
      setPendingEdits(edits);
    } catch (error) {
      console.error('Load pending edits failed:', error);
      Alert.alert('Error', 'Failed to load pending edits');
    } finally {
      setLoading(false);
    }
  }, []);

  const checkAdminAndLoad = useCallback(async () => {
    try {
      const auth = await getFirebaseAuth();
      const user = auth.currentUser;

      if (!user) {
        Alert.alert('Error', 'Please login first');
        router.back();
        return;
      }

      const firestore = await getFirebaseFirestore();
      const userQuery = query(collection(firestore, 'user'), where('uid', '==', user.uid));
      const userSnapshot = await getDocs(userQuery);

      let isAdminUser = false;
      userSnapshot.forEach((entry) => {
        if (entry.data().isAdmin === true) {
          isAdminUser = true;
        }
      });

      if (!isAdminUser) {
        Alert.alert('Access Denied', 'You do not have admin privileges');
        router.back();
        return;
      }

      await loadPendingEdits();
    } catch (error) {
      console.error('Check admin failed:', error);
      Alert.alert('Error', 'Failed to verify admin status');
      router.back();
    }
  }, [loadPendingEdits, router]);

  useEffect(() => {
    checkAdminAndLoad();
  }, [checkAdminAndLoad]);

  const approveEdit = async (edit: PendingRouteEdit) => {
    Alert.alert('Approve route', `Approve "${edit.data.name}" at ${edit.cragName}?`, [
      {
        text: 'Approve',
        onPress: async () => {
          try {
            const firestore = await getFirebaseFirestore();

            await setDoc(doc(firestore, 'approved_routes', `${edit.cragName}_${edit.data.name}`), {
              cragName: edit.cragName,
              countyName: edit.countyName,
              route: {
                name: edit.data.name,
                difficulty: edit.data.difficulty,
                height: edit.data.height,
                has_star: edit.data.has_star,
                description: edit.data.description,
                first_ascent: edit.data.first_ascent,
              },
              approvedAt: new Date().toISOString(),
              approvedBy: 'admin',
            });

            await updateDoc(doc(firestore, 'pending_route_edits', edit.id), {
              status: 'approved',
              reviewedAt: new Date().toISOString(),
              reviewedBy: 'admin',
            });

            const versionRef = doc(firestore, 'metadata', 'version');
            const versionDoc = await getDoc(versionRef);
            const newVersion = (versionDoc.data()?.version || 0) + 1;
            await setDoc(versionRef, { version: newVersion, lastUpdated: new Date().toISOString() });

            Alert.alert('Success', 'Route approved and synced');
            loadPendingEdits();
          } catch (error) {
            console.error('Approve failed:', error);
            Alert.alert('Error', 'Failed to approve route');
          }
        },
      },
      { text: 'Cancel' },
    ]);
  };

  const rejectEdit = async (editId: string, routeName: string) => {
    Alert.alert('Reject route', `Reject "${routeName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          try {
            const firestore = await getFirebaseFirestore();
            await updateDoc(doc(firestore, 'pending_route_edits', editId), {
              status: 'rejected',
              reviewedAt: new Date().toISOString(),
              reviewedBy: 'admin',
            });

            Alert.alert('Success', 'Route rejected');
            loadPendingEdits();
          } catch (error) {
            console.error('Reject failed:', error);
            Alert.alert('Error', 'Failed to reject route');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={ui.colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={20} color={ui.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerEyebrow}>Admin</Text>
          <Text style={styles.title}>Pending routes</Text>
        </View>
        <TouchableOpacity onPress={loadPendingEdits} style={styles.iconButton}>
          <Ionicons name="refresh" size={20} color={ui.colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {pendingEdits.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons name="checkmark-circle-outline" size={28} color={ui.colors.success} />
            </View>
            <Text style={styles.emptyTitle}>All clear</Text>
            <Text style={styles.emptyText}>There are no pending routes to review right now.</Text>
          </View>
        ) : (
          pendingEdits.map((edit) => (
            <View key={edit.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderText}>
                  <Text style={styles.routeName}>{edit.data.name}</Text>
                  <Text style={styles.locationText}>{edit.cragName}</Text>
                  <Text style={styles.locationSubtext}>{edit.countyName}</Text>
                </View>
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingText}>Pending</Text>
                </View>
              </View>

              <Text style={styles.userEmail}>Submitted by {edit.userEmail}</Text>
              <Text style={styles.submittedAt}>
                {new Date(edit.submittedAt).toLocaleString()}
              </Text>

              <View style={styles.detailsContainer}>
                <Text style={styles.detailsTitle}>Route details</Text>
                <Text style={styles.detailsText}>Difficulty: {edit.data.difficulty || 'Not specified'}</Text>
                <Text style={styles.detailsText}>
                  Height: {edit.data.height ? `${edit.data.height}m` : 'Not specified'}
                </Text>
                <Text style={styles.detailsText}>Star route: {edit.data.has_star ? 'Yes' : 'No'}</Text>
                <Text style={styles.detailsText}>
                  First ascent: {edit.data.first_ascent || 'Not specified'}
                </Text>
                {edit.data.description ? (
                  <Text style={styles.description}>{edit.data.description}</Text>
                ) : null}
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.button, styles.rejectButton]}
                  onPress={() => rejectEdit(edit.id, edit.data.name)}
                >
                  <Text style={styles.rejectButtonText}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.approveButton]}
                  onPress={() => approveEdit(edit)}
                >
                  <Text style={styles.approveButtonText}>Approve</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ui.colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: ui.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 18,
    backgroundColor: ui.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: ui.colors.border,
  },
  headerText: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerEyebrow: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: ui.colors.textSoft,
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: ui.colors.text,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ui.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: ui.colors.border,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 18,
    paddingBottom: 28,
  },
  card: {
    backgroundColor: ui.colors.surface,
    borderRadius: 26,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: ui.colors.border,
    ...ui.shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardHeaderText: {
    flex: 1,
    marginRight: 12,
  },
  routeName: {
    fontSize: 20,
    fontWeight: '800',
    color: ui.colors.text,
  },
  locationText: {
    fontSize: 14,
    color: ui.colors.textMuted,
    marginTop: 6,
  },
  locationSubtext: {
    fontSize: 13,
    color: ui.colors.textSoft,
    marginTop: 2,
  },
  userEmail: {
    fontSize: 13,
    color: ui.colors.textMuted,
  },
  submittedAt: {
    fontSize: 12,
    color: ui.colors.textSoft,
    marginTop: 4,
    marginBottom: 14,
  },
  pendingBadge: {
    backgroundColor: '#f4ead9',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: ui.radii.pill,
    borderWidth: 1,
    borderColor: '#e4cfab',
  },
  pendingText: {
    color: ui.colors.warning,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  detailsContainer: {
    backgroundColor: ui.colors.surfaceMuted,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: ui.colors.border,
  },
  detailsTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: ui.colors.text,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  detailsText: {
    fontSize: 14,
    color: ui.colors.textMuted,
    marginBottom: 6,
  },
  description: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
    color: ui.colors.textMuted,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: 'center',
  },
  approveButton: {
    backgroundColor: ui.colors.text,
  },
  rejectButton: {
    backgroundColor: ui.colors.dangerSoft,
    borderWidth: 1,
    borderColor: '#e6c5c0',
  },
  approveButtonText: {
    color: ui.colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
  rejectButtonText: {
    color: ui.colors.danger,
    fontWeight: '700',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: ui.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: ui.colors.border,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: ui.colors.text,
    marginTop: 18,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 22,
    color: ui.colors.textSoft,
    marginTop: 8,
    textAlign: 'center',
  },
});
