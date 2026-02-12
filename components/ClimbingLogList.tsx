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
    case 'Onsight': return '#4CAF50';
    case 'Redpoint': return '#2196F3';
    case 'Flash': return '#FF9800';
    case 'Attempt': return '#F44336';
    default: return '#757575';
  }
};

const getStyleIcon = (style: string) => {
  switch (style) {
    case 'Onsight': return 'flash';
    case 'Redpoint': return 'repeat';
    case 'Flash': return 'eye';
    case 'Attempt': return 'close-circle';
    default: return 'help-circle';
  }
};

export default function ClimbingLogList() {
  const router = useRouter();
  const { logs, loading, loadLogs, removeLog } = useClimbingLog();
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
      } else {
        console.log('ClimbingLogList: Skipping refresh');
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

  
  const handleDeleteLog = useCallback((log: ClimbingLog) => {
    Alert.alert(
      'Delete Log',
      `Are you sure you want to delete the log for "${log.routeName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => removeLog(log.id)
        },
      ]
    );
  }, [removeLog]);

  
  const navigateToRouteDetails = useCallback((siteName: string) => {
    console.log('ClimbingLogList: Navigating to spot details:', siteName);
    router.push(`/spot-details/${encodeURIComponent(siteName)}`);
  }, [router]);

  
  const renderLogItem = useCallback(({ item }: { item: ClimbingLog }) => {
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
        activeOpacity={0.7}
      >
        {/* 顶部信息行 */}
        <View style={styles.logHeader}>
          <View style={styles.dateContainer}>
            <Ionicons name="calendar-outline" size={16} color="#666" />
            <Text style={styles.dateText}>{formattedDate}</Text>
          </View>
          
          <View style={[styles.styleBadge, { backgroundColor: getStyleColor(item.climbingStyle) }]}>
            <Ionicons 
              name={getStyleIcon(item.climbingStyle) as any} 
              size={12} 
              color="white" 
            />
            <Text style={styles.styleText}>{item.climbingStyle}</Text>
          </View>
        </View>

        {/* 路线信息 */}
        <View style={styles.routeInfo}>
          <Text style={styles.routeName} numberOfLines={1}>
            {item.routeName}
          </Text>
          {item.routeGrade && (
            <View style={styles.gradeBadge}>
              <Text style={styles.gradeText}>{item.routeGrade}</Text>
            </View>
          )}
        </View>
        
        <Text style={styles.siteName} numberOfLines={1}>
          {item.siteName}
        </Text>

        {/* 评分 */}
        <View style={styles.ratingContainer}>
          {[1, 2, 3].map((star) => (
            <Ionicons
              key={star}
              name={star <= item.rating ? "star" : "star-outline"}
              size={16}
              color={star <= item.rating ? "#FFD700" : "#DDDDDD"}
              style={styles.starIcon}
            />
          ))}
        </View>

        {/* 同伴和备注 */}
        <View style={styles.detailsContainer}>
          {item.partner && (
            <View style={styles.partnerContainer}>
              <Ionicons name="people-outline" size={14} color="#666" />
              <Text style={styles.partnerText} numberOfLines={1}>
                {item.partner}
              </Text>
            </View>
          )}
          
          {item.notes && (
            <Text style={styles.notesText} numberOfLines={2}>
              {item.notes}
            </Text>
          )}
        </View>

        {/* 删除按钮 */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={(e) => {
            e.stopPropagation();
            handleDeleteLog(item);
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="trash-outline" size={18} color="#FF3B30" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }, [navigateToRouteDetails, handleDeleteLog]);

  
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="book-outline" size={64} color="#CCCCCC" />
      <Text style={styles.emptyTitle}>No climbing logs yet</Text>
      <Text style={styles.emptyDescription}>
        Tap the button on route details
      </Text>
      <Text style={styles.emptyDescription}>
        to record your climbing experience
      </Text>
      {/* 添加手动刷新按钮 */}
      <TouchableOpacity 
        style={styles.refreshButton}
        onPress={handleRefresh}
      >
        <Ionicons name="refresh" size={20} color="#007AFF" />
        <Text style={styles.refreshButtonText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );

  
  console.log('ClimbingLogList Debug:', {
    isFocused,
    isRefreshing,
    loading,
    logsCount: logs.length,
    lastRefreshTime: lastRefreshTime.current
  });

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
          colors={['#007AFF']}
          tintColor="#007AFF"
        />
      }
      ListEmptyComponent={renderEmptyState}
    />
  );
}

const styles = StyleSheet.create({
  listContainer: {
    padding: 16,
    flexGrow: 1,
  },
  logItem: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    position: 'relative',
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
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  styleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  styleText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  routeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  routeName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 12,
  },
  gradeBadge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 50,
    alignItems: 'center',
  },
  gradeText: {
    color: '#666',
    fontSize: 14,
    fontWeight: 'bold',
  },
  siteName: {
    fontSize: 15,
    color: '#007AFF',
    marginBottom: 12,
    fontWeight: '500',
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
  },
  partnerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  partnerText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  notesText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  deleteButton: {
    position: 'absolute',
    bottom: 25,
    right: 16,
    padding: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    minHeight: 400,
  },
  emptyTitle: {
    fontSize: 18,
    color: '#999',
    marginTop: 24,
    marginBottom: 8,
    fontWeight: '600',
  },
  emptyDescription: {
    fontSize: 15,
    color: '#CCC',
    textAlign: 'center',
    lineHeight: 22,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    padding: 12,
    backgroundColor: '#f0f7ff',
    borderRadius: 24,
    paddingHorizontal: 24,
  },
  refreshButtonText: {
    marginLeft: 8,
    color: '#007AFF',
    fontWeight: '500',
    fontSize: 16,
  },
});