import { ui } from '@/constants/ui';
import { getFirebaseAuth, getFirebaseFirestore } from '@/lib/firebase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
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

interface ApprovedRoute {
  id: string;
  cragName: string;
  countyName: string;
  route: {
    name: string;
    difficulty: string;
    height: number;
    has_star: boolean;
    description: string;
    first_ascent: string;
  };
  approvedAt: string;
  approvedBy: string;
}

export default function ApprovedRoutesScreen() {
  const router = useRouter();
  const [approvedRoutes, setApprovedRoutes] = useState<ApprovedRoute[]>([]);
  const [loading, setLoading] = useState(true);

  const loadApprovedRoutes = useCallback(async () => {
    try {
      setLoading(true);
      const firestore = await getFirebaseFirestore();
      const snapshot = await getDocs(collection(firestore, 'approved_routes'));

      const routes: ApprovedRoute[] = [];
      snapshot.forEach((entry) => {
        routes.push({ id: entry.id, ...entry.data() } as ApprovedRoute);
      });

      routes.sort((a, b) => new Date(b.approvedAt).getTime() - new Date(a.approvedAt).getTime());
      setApprovedRoutes(routes);
    } catch (error) {
      console.error('Load approved routes failed:', error);
      Alert.alert('Error', 'Failed to load approved routes');
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

      await loadApprovedRoutes();
    } catch (error) {
      console.error('Check admin failed:', error);
      Alert.alert('Error', 'Failed to verify admin status');
      router.back();
    }
  }, [loadApprovedRoutes, router]);

  useEffect(() => {
    checkAdminAndLoad();
  }, [checkAdminAndLoad]);

  const deleteRoute = async (route: ApprovedRoute) => {
    Alert.alert(
      'Delete route',
      `Delete "${route.route.name}" from ${route.cragName}? This cannot be undone.`,
      [
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const firestore = await getFirebaseFirestore();

              await deleteDoc(doc(firestore, 'approved_routes', route.id));

              const versionRef = doc(firestore, 'metadata', 'version');
              const versionDoc = await getDoc(versionRef);
              const newVersion = (versionDoc.data()?.version || 0) + 1;
              await setDoc(versionRef, { version: newVersion, lastUpdated: new Date().toISOString() });

              Alert.alert('Success', 'Route deleted');
              loadApprovedRoutes();
            } catch (error) {
              console.error('Delete failed:', error);
              Alert.alert('Error', 'Failed to delete route');
            }
          },
        },
        { text: 'Cancel' },
      ]
    );
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
          <Text style={styles.title}>Approved routes</Text>
        </View>
        <TouchableOpacity onPress={loadApprovedRoutes} style={styles.iconButton}>
          <Ionicons name="refresh" size={20} color={ui.colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {approvedRoutes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons name="albums-outline" size={28} color={ui.colors.textSoft} />
            </View>
            <Text style={styles.emptyTitle}>No approved routes</Text>
            <Text style={styles.emptyText}>Routes you approve will appear here for quick review.</Text>
          </View>
        ) : (
          approvedRoutes.map((route) => (
            <View key={route.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderText}>
                  <View style={styles.titleRow}>
                    <Text style={styles.routeName}>{route.route.name}</Text>
                    {route.route.has_star ? (
                      <Ionicons name="star" size={16} color={ui.colors.gold} />
                    ) : null}
                  </View>
                  <Text style={styles.locationText}>{route.cragName}</Text>
                  <Text style={styles.locationSubtext}>{route.countyName}</Text>
                </View>
                <TouchableOpacity style={styles.deleteButton} onPress={() => deleteRoute(route)}>
                  <Ionicons name="trash-outline" size={18} color={ui.colors.danger} />
                </TouchableOpacity>
              </View>

              <View style={styles.detailsContainer}>
                <Text style={styles.detailText}>Difficulty: {route.route.difficulty || 'Not specified'}</Text>
                <Text style={styles.detailText}>
                  Height: {route.route.height ? `${route.route.height}m` : 'Not specified'}
                </Text>
                <Text style={styles.detailText}>
                  First ascent: {route.route.first_ascent || 'Not specified'}
                </Text>
              </View>

              <Text style={styles.approvedAt}>
                Approved {new Date(route.approvedAt).toLocaleString()}
              </Text>
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  cardHeaderText: {
    flex: 1,
    marginRight: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  routeName: {
    fontSize: 20,
    fontWeight: '800',
    color: ui.colors.text,
    flex: 1,
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
  deleteButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ui.colors.dangerSoft,
    borderWidth: 1,
    borderColor: '#e6c5c0',
  },
  detailsContainer: {
    backgroundColor: ui.colors.surfaceMuted,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: ui.colors.border,
  },
  detailText: {
    fontSize: 14,
    color: ui.colors.textMuted,
    marginBottom: 6,
  },
  approvedAt: {
    fontSize: 12,
    color: ui.colors.textSoft,
    marginTop: 14,
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
