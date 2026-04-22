import { ui } from '@/constants/ui';
import { ClimbingLog, useClimbingLog } from '@/hooks/use-climbing-log';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const getStyleColor = (style: string) => {
  switch (style) {
    case 'Onsight':
      return '#5f7c64';
    case 'Redpoint':
      return '#62758d';
    case 'Flash':
      return '#b48c50';
    case 'Attempt':
      return '#a36058';
    default:
      return '#7a7065';
  }
};

const getStyleIcon = (style: string) => {
  switch (style) {
    case 'Onsight':
      return 'flash';
    case 'Redpoint':
      return 'repeat';
    case 'Flash':
      return 'eye';
    case 'Attempt':
      return 'close-circle';
    default:
      return 'help-circle';
  }
};

export default function ClimbingLogList() {
  const router = useRouter();
  const { logs, loadLogs, removeLog } = useClimbingLog();
  const lastRefreshTime = useRef<number>(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      const now = Date.now();
      if (now - lastRefreshTime.current > 2000) {
        setIsRefreshing(true);
        loadLogs().finally(() => {
          setIsRefreshing(false);
        });
        lastRefreshTime.current = now;
      }
    } else {
      setIsRefreshing(false);
    }
  }, [isFocused, loadLogs]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadLogs().finally(() => {
      setIsRefreshing(false);
    });
    lastRefreshTime.current = Date.now();
  }, [loadLogs]);

  const handleDeleteLog = useCallback(
    (log: ClimbingLog) => {
      Alert.alert('Delete log', `Delete the log for "${log.routeName}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => removeLog(log.id),
        },
      ]);
    },
    [removeLog]
  );

  const navigateToRouteDetails = useCallback(
    (siteName: string) => {
      router.push(`/spot-details/${encodeURIComponent(siteName)}`);
    },
    [router]
  );

  const renderLogItem = useCallback(
    ({ item }: { item: ClimbingLog }) => {
      const date = new Date(item.date);
      const formattedDate = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      return (
        <TouchableOpacity
          style={styles.logItem}
          onPress={() => navigateToRouteDetails(item.siteName)}
          activeOpacity={0.85}
        >
          <View style={styles.logHeader}>
            <View style={styles.dateContainer}>
              <Ionicons name="calendar-outline" size={14} color={ui.colors.textSoft} />
              <Text style={styles.dateText}>{formattedDate}</Text>
            </View>

            <View style={[styles.styleBadge, { backgroundColor: getStyleColor(item.climbingStyle) }]}>
              <Ionicons name={getStyleIcon(item.climbingStyle) as any} size={12} color={ui.colors.white} />
              <Text style={styles.styleText}>{item.climbingStyle}</Text>
            </View>
          </View>

          <View style={styles.routeInfo}>
            <Text style={styles.routeName} numberOfLines={1}>
              {item.routeName}
            </Text>
            {item.routeGrade ? (
              <View style={styles.gradeBadge}>
                <Text style={styles.gradeText}>{item.routeGrade}</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.siteName} numberOfLines={1}>
            {item.siteName}
          </Text>

          <View style={styles.ratingContainer}>
            {[1, 2, 3].map((star) => (
              <Ionicons
                key={star}
                name={star <= item.rating ? 'star' : 'star-outline'}
                size={16}
                color={star <= item.rating ? ui.colors.gold : '#cfc8bd'}
                style={styles.starIcon}
              />
            ))}
          </View>

          <View style={styles.detailsContainer}>
            {item.partner ? (
              <View style={styles.partnerContainer}>
                <Ionicons name="people-outline" size={14} color={ui.colors.textSoft} />
                <Text style={styles.partnerText} numberOfLines={1}>
                  {item.partner}
                </Text>
              </View>
            ) : null}

            {item.notes ? (
              <Text style={styles.notesText} numberOfLines={2}>
                {item.notes}
              </Text>
            ) : null}
          </View>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={(e) => {
              e.stopPropagation();
              handleDeleteLog(item);
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={18} color={ui.colors.danger} />
          </TouchableOpacity>
        </TouchableOpacity>
      );
    },
    [navigateToRouteDetails, handleDeleteLog]
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <Ionicons name="book-outline" size={26} color={ui.colors.textSoft} />
      </View>
      <Text style={styles.emptyTitle}>No climbing logs yet</Text>
      <Text style={styles.emptyDescription}>Use the route detail screen to record your climbing days.</Text>
      <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
        <Ionicons name="refresh" size={18} color={ui.colors.text} />
        <Text style={styles.refreshButtonText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <FlatList
      data={logs}
      renderItem={renderLogItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          colors={[ui.colors.accent]}
          tintColor={ui.colors.accent}
        />
      }
      ListEmptyComponent={renderEmptyState}
    />
  );
}

const styles = StyleSheet.create({
  listContainer: {
    padding: 18,
    flexGrow: 1,
  },
  logItem: {
    backgroundColor: ui.colors.surface,
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: ui.colors.border,
    position: 'relative',
    ...ui.shadows.card,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 13,
    color: ui.colors.textSoft,
    fontWeight: '600',
  },
  styleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: ui.radii.pill,
  },
  styleText: {
    color: ui.colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  routeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  routeName: {
    fontSize: 21,
    fontWeight: '800',
    color: ui.colors.text,
    flex: 1,
    marginRight: 12,
  },
  gradeBadge: {
    backgroundColor: ui.colors.surfaceMuted,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: ui.radii.pill,
    borderWidth: 1,
    borderColor: ui.colors.border,
  },
  gradeText: {
    color: ui.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  siteName: {
    fontSize: 14,
    color: ui.colors.textMuted,
    marginBottom: 10,
    fontWeight: '600',
  },
  ratingContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  starIcon: {
    marginRight: 4,
  },
  detailsContainer: {
    gap: 8,
    paddingRight: 28,
  },
  partnerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  partnerText: {
    fontSize: 14,
    color: ui.colors.textMuted,
    flex: 1,
  },
  notesText: {
    fontSize: 14,
    color: ui.colors.textMuted,
    lineHeight: 22,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: ui.colors.border,
  },
  deleteButton: {
    position: 'absolute',
    bottom: 18,
    right: 16,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ui.colors.dangerSoft,
    borderWidth: 1,
    borderColor: '#e6c5c0',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    minHeight: 420,
  },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: ui.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: ui.colors.border,
  },
  emptyTitle: {
    fontSize: 18,
    color: ui.colors.text,
    marginTop: 20,
    marginBottom: 8,
    fontWeight: '800',
  },
  emptyDescription: {
    fontSize: 14,
    color: ui.colors.textSoft,
    textAlign: 'center',
    lineHeight: 22,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
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
    fontSize: 14,
  },
});
