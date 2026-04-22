import { ui } from '@/constants/ui';
import { useClimbingSites } from '@/hooks/use-climbing-sites';
import { useRouteFavorites } from '@/hooks/use-route-favorites';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function FavoritesScreen() {
  const router = useRouter();
  const { favorites, loading, removeFavorite, loadFavorites } = useRouteFavorites();
  const { allSites } = useClimbingSites();
  const lastRefreshTime = useRef<number>(0);

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      if (now - lastRefreshTime.current > 2000) {
        loadFavorites();
        lastRefreshTime.current = now;
      }
      return undefined;
    }, [loadFavorites])
  );

  const handleRefresh = useCallback(() => {
    loadFavorites();
    lastRefreshTime.current = Date.now();
  }, [loadFavorites]);

  const navigateToSpotDetails = (siteName: string) => {
    router.push(`/spot-details/${encodeURIComponent(siteName)}`);
  };

  if (loading && favorites.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={ui.colors.accent} />
        <Text style={styles.loadingText}>Loading your saved routes...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'My Favorites',
          headerBackTitle: 'Back',
        }}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={loading && favorites.length > 0}
            onRefresh={handleRefresh}
            colors={[ui.colors.accent]}
            tintColor={ui.colors.accent}
          />
        }
      >
        <View style={styles.section}>
          <Text style={styles.eyebrow}>Saved routes</Text>
          <Text style={styles.sectionTitle}>Favorites</Text>

          {favorites.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIcon}>
                <Ionicons name="star-outline" size={24} color={ui.colors.textSoft} />
              </View>
              <Text style={styles.emptyText}>No favorite routes yet</Text>
              <Text style={styles.emptyHint}>Use the save action on a route detail page to build your shortlist.</Text>
              <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
                <Ionicons name="refresh" size={18} color={ui.colors.text} />
                <Text style={styles.refreshButtonText}>Refresh</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.favoritesList}>
              {loading ? (
                <View style={styles.refreshingIndicator}>
                  <ActivityIndicator size="small" color={ui.colors.accent} />
                  <Text style={styles.refreshingText}>Refreshing...</Text>
                </View>
              ) : null}

              {favorites.map((favorite) => {
                const site = allSites.find((item) => item.name === favorite.siteName);
                const route = site?.routes?.find((item) => item.name === favorite.routeName);

                return (
                  <TouchableOpacity
                    key={favorite.id}
                    style={styles.favoriteItem}
                    onPress={() => navigateToSpotDetails(favorite.siteName)}
                  >
                    <View style={styles.favoriteInfo}>
                      <Text style={styles.siteName}>{favorite.siteName}</Text>
                      <Text style={styles.routeName}>{favorite.routeName}</Text>
                      <View style={styles.routeMeta}>
                        {favorite.difficulty ? (
                          <Text style={styles.difficulty}>{favorite.difficulty}</Text>
                        ) : null}
                        {route?.height ? (
                          <Text style={styles.metaText}>{route.height}m</Text>
                        ) : null}
                        <Text style={styles.metaText}>
                          Saved {new Date(favorite.dateAdded).toLocaleDateString('en-US')}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        removeFavorite(favorite.siteName, favorite.routeName);
                      }}
                      style={styles.favoriteButton}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="star" size={18} color={ui.colors.gold} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ui.colors.background,
  },
  content: {
    padding: 18,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: ui.colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: ui.colors.textMuted,
  },
  section: {
    backgroundColor: ui.colors.surface,
    padding: 18,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: ui.colors.border,
    ...ui.shadows.card,
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: ui.colors.textSoft,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: ui.colors.text,
    marginBottom: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 24,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: ui.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: ui.colors.border,
  },
  emptyText: {
    color: ui.colors.text,
    textAlign: 'center',
    paddingTop: 18,
    fontSize: 18,
    fontWeight: '800',
  },
  emptyHint: {
    fontSize: 14,
    color: ui.colors.textSoft,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 8,
  },
  favoritesList: {
    gap: 10,
  },
  favoriteItem: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: ui.colors.surfaceMuted,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: ui.colors.border,
  },
  favoriteInfo: {
    flex: 1,
    marginRight: 14,
  },
  favoriteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f6efdf',
    borderWidth: 1,
    borderColor: '#ead9b0',
  },
  siteName: {
    fontSize: 12,
    color: ui.colors.textSoft,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  routeName: {
    fontSize: 17,
    fontWeight: '800',
    color: ui.colors.text,
    marginBottom: 10,
  },
  routeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  difficulty: {
    fontSize: 12,
    color: ui.colors.accent,
    backgroundColor: ui.colors.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: ui.radii.pill,
    fontWeight: '700',
  },
  metaText: {
    fontSize: 12,
    color: ui.colors.textSoft,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    paddingVertical: 12,
    paddingHorizontal: 18,
    backgroundColor: ui.colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: ui.colors.border,
  },
  refreshButtonText: {
    marginLeft: 8,
    color: ui.colors.text,
    fontWeight: '700',
  },
  refreshingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: ui.colors.surfaceMuted,
    borderRadius: 18,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: ui.colors.border,
  },
  refreshingText: {
    marginLeft: 8,
    fontSize: 14,
    color: ui.colors.textMuted,
  },
});
