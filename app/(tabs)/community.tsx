import AuroraBackdrop from '@/components/AuroraBackdrop';
import { ui } from '@/constants/ui';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useCommunityFeed } from '../../hooks/use-community-feed';

export default function CommunityScreen() {
  const router = useRouter();
  const { activities, loading, needLogin, refresh } = useCommunityFeed();

  useEffect(() => {
    if (!needLogin) {
      refresh();
    }
  }, [needLogin, refresh]);

  if (needLogin) {
    return (
      <View style={styles.container}>
        <View style={styles.lockedCard}>
          <View style={styles.lockedIcon}>
            <Ionicons name="people-outline" size={34} color={ui.colors.text} />
          </View>
          <Text style={styles.lockedTitle}>Community feed is private</Text>
          <Text style={styles.lockedMessage}>
            Sign in to see recent favorites, sends, and notes from other climbers.
          </Text>
          <TouchableOpacity style={styles.loginButton} onPress={() => router.push('/auth/login')}>
            <Text style={styles.loginButtonText}>Go to login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 30) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const renderActivity = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Ionicons name="person-outline" size={18} color={ui.colors.text} />
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userEmail}>{item.userEmail}</Text>
          <Text style={styles.time}>{formatTime(item.timestamp)}</Text>
        </View>
        <View
          style={[
            styles.typeBadge,
            item.type === 'favorite' ? styles.favoriteBadge : styles.completedBadge,
          ]}
        >
          <Ionicons
            name={item.type === 'favorite' ? 'star' : 'checkmark-circle'}
            size={14}
            color={item.type === 'favorite' ? ui.colors.gold : ui.colors.success}
          />
          <Text style={styles.typeBadgeText}>
            {item.type === 'favorite' ? 'Favorited' : 'Completed'}
          </Text>
        </View>
      </View>

      <View style={styles.routeBox}>
        <Text style={styles.routeName}>{item.routeName}</Text>
        {item.difficulty ? (
          <View style={styles.difficultyBadge}>
            <Text style={styles.difficultyText}>{item.difficulty}</Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.siteName}>{item.siteName}</Text>

      {item.notes ? (
        <View style={styles.notesBox}>
          <Text style={styles.notesText}>{item.notes}</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={styles.container}>
      <AuroraBackdrop compact />
      <View style={styles.titleBar}>
        <Text style={styles.eyebrow}>Community</Text>
        <Text style={styles.title}>Recent activity</Text>
        <Text style={styles.subtitle}>A live look at what climbers are saving and sending.</Text>
      </View>

      <FlatList
        data={activities}
        renderItem={renderActivity}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={ui.colors.accent} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons name="sparkles-outline" size={26} color={ui.colors.textSoft} />
            </View>
            <Text style={styles.emptyTitle}>No community updates yet</Text>
            <Text style={styles.emptyText}>Fresh activity will appear here once climbers start sharing.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ui.colors.background,
  },
  titleBar: {
    paddingHorizontal: 20,
    paddingTop: 64,
    paddingBottom: 18,
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: ui.colors.textSoft,
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: ui.colors.text,
    letterSpacing: -0.9,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: ui.colors.textMuted,
    marginTop: 8,
    maxWidth: 320,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    flexGrow: 1,
  },
  card: {
    backgroundColor: ui.colors.surfaceGlassStrong,
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.34)',
    ...ui.shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: ui.colors.border,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userEmail: {
    fontSize: 15,
    fontWeight: '700',
    color: ui.colors.text,
  },
  time: {
    fontSize: 12,
    color: ui.colors.textSoft,
    marginTop: 2,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: ui.radii.pill,
    borderWidth: 1,
  },
  favoriteBadge: {
    backgroundColor: 'rgba(255, 209, 102, 0.16)',
    borderColor: 'rgba(255, 209, 102, 0.28)',
  },
  completedBadge: {
    backgroundColor: 'rgba(90, 165, 154, 0.14)',
    borderColor: 'rgba(90, 165, 154, 0.24)',
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: ui.colors.textMuted,
  },
  routeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  routeName: {
    fontSize: 22,
    fontWeight: '800',
    color: ui.colors.text,
    marginRight: 10,
  },
  difficultyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: ui.radii.pill,
    backgroundColor: ui.colors.accentSoft,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '700',
    color: ui.colors.accent,
  },
  siteName: {
    fontSize: 14,
    color: ui.colors.textMuted,
    marginBottom: 10,
  },
  notesBox: {
    backgroundColor: 'rgba(255,255,255,0.34)',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: ui.colors.border,
  },
  notesText: {
    fontSize: 14,
    lineHeight: 22,
    color: ui.colors.textMuted,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 88,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: ui.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: ui.colors.border,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
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
  lockedCard: {
    marginHorizontal: 20,
    marginTop: 120,
    padding: 24,
    borderRadius: 28,
    backgroundColor: ui.colors.surfaceGlassStrong,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.34)',
    alignItems: 'center',
    ...ui.shadows.card,
  },
  lockedIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(255,255,255,0.42)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: ui.colors.border,
  },
  lockedTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: ui.colors.text,
    marginTop: 16,
  },
  lockedMessage: {
    fontSize: 15,
    lineHeight: 24,
    color: ui.colors.textMuted,
    textAlign: 'center',
    marginTop: 10,
  },
  loginButton: {
    marginTop: 18,
    backgroundColor: ui.colors.accentStrong,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  loginButtonText: {
    color: ui.colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
});
