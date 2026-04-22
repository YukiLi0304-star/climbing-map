import LogClimbingModal from '@/components/LogClimbingModal';
import { ui } from '@/constants/ui';
import { useClimbingLog } from '@/hooks/use-climbing-log';
import { useClimbingSites } from '@/hooks/use-climbing-sites';
import { useOpenMap } from '@/hooks/use-open-map';
import { useRouteFavorites } from '@/hooks/use-route-favorites';
import { getFirebaseAuth } from '@/lib/firebase';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function SpotDetails() {
  const { name } = useLocalSearchParams();
  const router = useRouter();
  const { allSites } = useClimbingSites();
  const { openMap } = useOpenMap();
  const decodedName = typeof name === 'string' ? decodeURIComponent(name) : '';
  const site = allSites.find((item) => item.name === decodedName);
  const { isFavorite, toggleFavorite } = useRouteFavorites();
  const { hasClimbedRoute, loadLogs } = useClimbingLog();
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<{
    siteName: string;
    routeName: string;
    routeGrade?: string;
  } | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleLogSaved = useCallback(() => {
    loadLogs();
    setRefreshTrigger((current) => current + 1);
  }, [loadLogs]);

  const handleToggleFavorite = async (
    siteName: string,
    routeName: string,
    difficulty?: string,
    siteUrl?: string
  ) => {
    try {
      await toggleFavorite(siteName, routeName, difficulty, siteUrl);
    } catch (error: any) {
      if (error.message === '请先登录') {
        Alert.alert('Login Required', 'Please log in to favorite routes', [
          { text: 'Login', onPress: () => router.push('/auth/login') },
          { text: 'Cancel' },
        ]);
      }
    }
  };

  const handleEdit = async (route: any) => {
    if (!site) {
      Alert.alert('Error', 'Crag not found');
      return;
    }

    const auth = await getFirebaseAuth();
    const user = auth.currentUser;

    if (!user) {
      Alert.alert('Login Required', 'Please log in to edit this route', [
        { text: 'Login', onPress: () => router.push('/auth/login') },
        { text: 'Cancel' },
      ]);
      return;
    }

    router.push({
      pathname: `../edit-site/new`,
      params: {
        cragName: site.name,
        countyName: site.countyName || '',
        routeName: route.name,
        difficulty: route.difficulty || '',
        height: route.height?.toString() || '',
        hasStar: route.has_star ? 'true' : 'false',
        description: route.description || '',
        firstAscent: route.first_ascent || '',
      },
    });
  };

  useFocusEffect(
    useCallback(() => {
      loadLogs();
      return undefined;
    }, [loadLogs])
  );

  React.useEffect(() => {
    if (site) {
      site.routes?.forEach((route) => {
        hasClimbedRoute(site.name, route.name);
      });
    }
  }, [site, hasClimbedRoute, refreshTrigger]);

  const handleOpenWiki = () => {
    if (site?.url) {
      Linking.openURL(site.url);
    }
  };

  if (!site) {
    return (
      <View style={styles.missingContainer}>
        <Text style={styles.missingTitle}>Crag not found</Text>
        <Text style={styles.missingText}>{decodedName}</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.topBarBack} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={ui.colors.text} />
          <Text style={styles.topBarBackText}>Back</Text>
        </TouchableOpacity>

        <View style={styles.topBarActions}>
          {site.coordinates ? (
            <TouchableOpacity style={styles.topBarButton} onPress={() => openMap(site.coordinates!, site.name)}>
              <Ionicons name="navigate-outline" size={18} color={ui.colors.text} />
              <Text style={styles.topBarButtonText}>Navigate</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity style={styles.topBarButton} onPress={handleEdit as any}>
            <Ionicons name="create-outline" size={18} color={ui.colors.text} />
            <Text style={styles.topBarButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>Crag details</Text>
          <Text style={styles.title}>{site.name}</Text>
          {site.countyName ? <Text style={styles.county}>County: {site.countyName}</Text> : null}
          <Text style={styles.routesCount}>{site.routes_count || site.routes?.length || 0} routes listed</Text>

          {site.url ? (
            <TouchableOpacity style={styles.wikiButton} onPress={handleOpenWiki}>
              <Text style={styles.wikiButtonText}>Open wiki page</Text>
              <Ionicons name="open-outline" size={16} color={ui.colors.white} />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.routesSection}>
          <Text style={styles.sectionTitle}>Routes</Text>

          {(site.routes || []).map((route, index) => {
            const hasClimbed = hasClimbedRoute(site.name, route.name);
            const favorite = isFavorite(site.name, route.name);

            return (
              <View key={index} style={styles.routeCard}>
                <View style={styles.routeHeader}>
                  <View style={styles.routeHeaderText}>
                    <Text style={styles.routeName}>{route.name}</Text>
                    {route.difficulty ? (
                      <View
                        style={[
                          styles.difficultyBadge,
                          { backgroundColor: getDifficultyColor(route.difficulty) },
                        ]}
                      >
                        <Text style={styles.difficultyText}>{route.difficulty}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                <View style={styles.routeMeta}>
                  {route.height ? <Text style={styles.metaText}>Height: {route.height}m</Text> : null}
                  {route.technical_grade ? (
                    <Text style={styles.metaText}>Technical grade: {route.technical_grade}</Text>
                  ) : null}
                  {route.overall_grade && route.overall_grade !== route.difficulty ? (
                    <Text style={styles.metaText}>Overall grade: {route.overall_grade}</Text>
                  ) : null}
                  {route.first_ascent ? (
                    <Text style={styles.metaText}>First ascent: {route.first_ascent}</Text>
                  ) : null}
                </View>

                {route.description ? <Text style={styles.description}>{route.description}</Text> : null}

                {route.sub_routes && route.sub_routes.length > 0 ? (
                  <View style={styles.subRoutes}>
                    <Text style={styles.subRoutesTitle}>Sub-routes</Text>
                    {route.sub_routes.map((subRoute, subIndex) => (
                      <View key={subIndex} style={styles.subRoute}>
                        <Text style={styles.subRouteName}>{subRoute.name}</Text>
                        {subRoute.difficulty ? (
                          <Text style={styles.subRouteDifficulty}>{subRoute.difficulty}</Text>
                        ) : null}
                      </View>
                    ))}
                  </View>
                ) : null}

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedRoute({
                        siteName: site.name,
                        routeName: route.name,
                        routeGrade: route.difficulty,
                      });
                      setShowLogModal(true);
                    }}
                    style={[
                      styles.actionButton,
                      hasClimbed && styles.actionButtonSuccess,
                    ]}
                  >
                    <Ionicons
                      name={hasClimbed ? 'checkmark-circle' : 'bookmark-outline'}
                      size={16}
                      color={hasClimbed ? ui.colors.success : ui.colors.text}
                    />
                    <Text style={styles.actionButtonText}>{hasClimbed ? 'Logged' : 'Log climb'}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() =>
                      handleToggleFavorite(site.name, route.name, route.difficulty, site.url)
                    }
                    style={[styles.actionButton, favorite && styles.actionButtonFavorite]}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons
                      name={favorite ? 'star' : 'star-outline'}
                      size={16}
                      color={favorite ? ui.colors.gold : ui.colors.text}
                    />
                    <Text style={styles.actionButtonText}>{favorite ? 'Saved' : 'Save route'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {showLogModal && selectedRoute ? (
        <LogClimbingModal
          visible={showLogModal}
          onClose={() => {
            setShowLogModal(false);
            setSelectedRoute(null);
          }}
          route={selectedRoute}
          onLogSaved={handleLogSaved}
        />
      ) : null}
    </View>
  );
}

const getDifficultyColor = (difficulty: string): string => {
  const diff = difficulty.toLowerCase();

  if (diff.includes('hvs')) return '#b4526a';
  if (diff.includes('vs')) return '#bf6a41';
  if (diff.includes('hs')) return '#c08a42';
  if (diff.includes('e3')) return '#5d658f';
  if (diff.includes('e2')) return '#6d5f96';
  if (diff.includes('e1')) return '#7b6397';
  if (diff.includes('vd')) return '#7d9862';
  if (diff.includes('d')) return '#61825c';

  if (/^s\b/.test(diff) || /\bs\b/.test(diff)) {
    return '#b89557';
  }

  return '#77706a';
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: ui.colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: ui.colors.background,
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 28,
  },
  topBar: {
    paddingTop: 52,
    paddingHorizontal: 18,
    paddingBottom: 14,
    backgroundColor: ui.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: ui.colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topBarBack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  topBarBackText: {
    fontSize: 14,
    fontWeight: '700',
    color: ui.colors.text,
  },
  topBarActions: {
    flexDirection: 'row',
    gap: 8,
  },
  topBarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: ui.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: ui.colors.border,
  },
  topBarButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: ui.colors.text,
  },
  heroCard: {
    marginTop: 16,
    backgroundColor: ui.colors.surface,
    borderRadius: 28,
    padding: 22,
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
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: ui.colors.text,
    letterSpacing: -0.8,
  },
  county: {
    fontSize: 15,
    color: ui.colors.textMuted,
    marginTop: 10,
  },
  routesCount: {
    fontSize: 14,
    color: ui.colors.textSoft,
    marginTop: 4,
  },
  wikiButton: {
    marginTop: 16,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: ui.colors.text,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 18,
  },
  wikiButtonText: {
    color: ui.colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
  routesSection: {
    marginTop: 18,
  },
  sectionTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: ui.colors.text,
    marginBottom: 12,
  },
  routeCard: {
    backgroundColor: ui.colors.surface,
    borderRadius: 24,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: ui.colors.border,
    ...ui.shadows.soft,
  },
  routeHeader: {
    marginBottom: 12,
  },
  routeHeaderText: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  routeName: {
    fontSize: 19,
    fontWeight: '800',
    color: ui.colors.text,
    marginRight: 10,
    marginBottom: 8,
  },
  difficultyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: ui.radii.pill,
    marginBottom: 8,
  },
  difficultyText: {
    color: ui.colors.white,
    fontWeight: '700',
    fontSize: 12,
  },
  routeMeta: {
    marginBottom: 8,
  },
  metaText: {
    fontSize: 13,
    color: ui.colors.textMuted,
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: ui.colors.textMuted,
    lineHeight: 22,
    marginTop: 8,
  },
  subRoutes: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: ui.colors.border,
  },
  subRoutesTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
    color: ui.colors.text,
  },
  subRoute: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: ui.colors.surfaceMuted,
    borderRadius: 16,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: ui.colors.border,
  },
  subRouteName: {
    fontSize: 13,
    color: ui.colors.text,
    flex: 1,
  },
  subRouteDifficulty: {
    fontSize: 12,
    color: ui.colors.textSoft,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 18,
    backgroundColor: ui.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: ui.colors.border,
  },
  actionButtonSuccess: {
    backgroundColor: '#e7eee7',
    borderColor: '#ccd8cc',
  },
  actionButtonFavorite: {
    backgroundColor: '#f6efdf',
    borderColor: '#ead9b0',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: ui.colors.text,
  },
  missingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ui.colors.background,
    paddingHorizontal: 24,
  },
  missingTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: ui.colors.text,
  },
  missingText: {
    fontSize: 15,
    color: ui.colors.textMuted,
    marginTop: 8,
    textAlign: 'center',
  },
});
