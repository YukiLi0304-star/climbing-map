import AuroraBackdrop from '@/components/AuroraBackdrop';
import { ui } from '@/constants/ui';
import { useAuth } from '@/context/AuthContext';
import { useClimbingLog } from '@/hooks/use-climbing-log';
import { useRouteFavorites } from '@/hooks/use-route-favorites';
import { getFirebaseAuth, getFirebaseFirestore } from '@/lib/firebase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, getDocs, query, where } from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function ProfileHome() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  const { favorites } = useRouteFavorites();
  const { logs } = useClimbingLog();

  const favoriteCount = favorites?.length || 0;
  const logCount = logs?.length || 0;
  const spotsCount = logs ? new Set(logs.map((log) => log.siteName)).size : 0;
  const daysCount = logs ? new Set(logs.map((log) => log.date)).size : 0;

  const checkAdminStatus = useCallback(async () => {
    if (!user) {
      setIsAdmin(false);
      return;
    }

    try {
      const auth = await getFirebaseAuth();
      const currentUser = auth.currentUser;
      if (currentUser) {
        const firestore = await getFirebaseFirestore();
        const userQuery = query(collection(firestore, 'user'), where('uid', '==', currentUser.uid));
        const snapshot = await getDocs(userQuery);
        if (!snapshot.empty) {
          const data = snapshot.docs[0].data();
          if (data.isAdmin === true) {
            setIsAdmin(true);
          }
        }
      }
    } catch (error) {
      console.error('Check admin failed:', error);
    }
  }, [user]);

  useEffect(() => {
    checkAdminStatus();
  }, [checkAdminStatus]);

  const functionCards = [
    {
      id: 'favorites',
      title: 'My Favorites',
      description: 'Saved routes you want to revisit quickly.',
      icon: 'star-outline' as const,
      route: '/profile/favorites',
    },
    {
      id: 'climbing-log',
      title: 'Climbing Log',
      description: 'Personal records, partners, ratings, and notes.',
      icon: 'book-outline' as const,
      route: '/profile/climbing-log',
    },
  ];

  const handleCardPress = (route: string) => {
    if (!user) {
      alert('Please sign in to access this feature');
      return;
    }
    router.push(route as any);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
      alert('Failed to sign out. Please try again.');
    }
  };

  const handleSignIn = () => {
    router.push('/auth/login' as any);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <AuroraBackdrop compact />
      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View style={styles.avatar}>
            <Ionicons
              name={user ? 'person' : 'person-outline'}
              size={28}
              color={user ? ui.colors.text : ui.colors.textSoft}
            />
          </View>
          <View style={styles.heroMeta}>
            <Text style={styles.eyebrow}>Profile</Text>
            <Text style={styles.userName}>
              {user ? user.email?.split('@')[0] || 'Climber' : 'Guest climber'}
            </Text>
            <Text style={styles.userBio}>
              {user ? 'Keep your routes, notes, and progress close.' : 'Sign in to unlock your saved routes and climbing history.'}
            </Text>
          </View>
        </View>

        {user ? (
          <>
            <Text style={styles.userEmail}>{user.email}</Text>
            <TouchableOpacity style={styles.ghostButton} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={16} color={ui.colors.danger} />
              <Text style={styles.ghostButtonDangerText}>Sign out</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={styles.primaryButton} onPress={handleSignIn}>
            <Ionicons name="log-in-outline" size={16} color={ui.colors.white} />
            <Text style={styles.primaryButtonText}>Sign in or create an account</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your tools</Text>
        {functionCards.map((card) => (
          <TouchableOpacity
            key={card.id}
            style={[styles.rowCard, !user && styles.rowCardDisabled]}
            onPress={() => handleCardPress(card.route)}
            activeOpacity={user ? 0.8 : 1}
            disabled={!user}
          >
            <View style={styles.rowIcon}>
              <Ionicons name={card.icon} size={20} color={ui.colors.text} />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>{card.title}</Text>
              <Text style={styles.rowDescription}>
                {user ? card.description : 'Sign in to access this feature.'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={ui.colors.textSoft} />
          </TouchableOpacity>
        ))}
      </View>

      {isAdmin ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Admin</Text>
          <TouchableOpacity style={styles.rowCard} onPress={() => router.push('/admin/review')}>
            <View style={styles.rowIcon}>
              <Ionicons name="shield-checkmark-outline" size={20} color={ui.colors.text} />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>Review edits</Text>
              <Text style={styles.rowDescription}>Approve or reject submitted route changes.</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={ui.colors.textSoft} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.rowCard} onPress={() => router.push('/admin/approved')}>
            <View style={styles.rowIcon}>
              <Ionicons name="checkmark-done-circle-outline" size={20} color={ui.colors.text} />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>Approved routes</Text>
              <Text style={styles.rowDescription}>View approved entries and remove outdated ones.</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={ui.colors.textSoft} />
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Climbing stats</Text>
        {user ? (
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{favoriteCount}</Text>
              <Text style={styles.statLabel}>Favorites</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{logCount}</Text>
              <Text style={styles.statLabel}>Logs</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{spotsCount}</Text>
              <Text style={styles.statLabel}>Spots</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{daysCount}</Text>
              <Text style={styles.statLabel}>Days out</Text>
            </View>
          </View>
        ) : (
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle-outline" size={18} color={ui.colors.accent} />
            <Text style={styles.infoBannerText}>Sign in to start building your personal climbing stats.</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.aboutText}>
          Climbing Map is a student project focused on making Irish climbing data easier to browse, save, and update on mobile.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ui.colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 58,
    paddingBottom: 28,
  },
  heroCard: {
    backgroundColor: ui.colors.surfaceGlassStrong,
    borderRadius: 30,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.34)',
    ...ui.shadows.card,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: ui.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: ui.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroMeta: {
    flex: 1,
    marginLeft: 14,
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: ui.colors.textSoft,
    marginBottom: 6,
  },
  userName: {
    fontSize: 28,
    fontWeight: '800',
    color: ui.colors.text,
    letterSpacing: -0.7,
  },
  userBio: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: ui.colors.textMuted,
  },
  userEmail: {
    marginTop: 14,
    fontSize: 13,
    color: ui.colors.textSoft,
  },
  primaryButton: {
    marginTop: 20,
    backgroundColor: ui.colors.accentStrong,
    borderRadius: 18,
    paddingVertical: 15,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: ui.colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  ghostButton: {
    marginTop: 18,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 228, 239, 0.82)',
    borderWidth: 1,
    borderColor: '#e6c5c0',
  },
  ghostButtonDangerText: {
    color: ui.colors.danger,
    fontSize: 14,
    fontWeight: '700',
  },
  section: {
    marginTop: 18,
    backgroundColor: ui.colors.surfaceGlass,
    borderRadius: 26,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.32)',
    ...ui.shadows.soft,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: ui.colors.text,
    marginBottom: 14,
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.46)',
    borderRadius: 20,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: ui.colors.border,
  },
  rowCardDisabled: {
    opacity: 0.6,
  },
  rowIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.76)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: ui.colors.border,
  },
  rowContent: {
    flex: 1,
    marginHorizontal: 12,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: ui.colors.text,
  },
  rowDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: ui.colors.textMuted,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.46)',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: ui.colors.border,
    marginBottom: 10,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: ui.colors.text,
  },
  statLabel: {
    fontSize: 13,
    color: ui.colors.textSoft,
    marginTop: 4,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(156, 99, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(188, 163, 255, 0.42)',
  },
  infoBannerText: {
    flex: 1,
    color: ui.colors.accentStrong,
    fontSize: 13,
    lineHeight: 20,
  },
  aboutText: {
    fontSize: 14,
    lineHeight: 22,
    color: ui.colors.textMuted,
  },
});
