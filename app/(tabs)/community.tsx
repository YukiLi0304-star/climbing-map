import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useCommunityFeed } from '../../hooks/use-community-feed';

export default function CommunityScreen() {
  const { activities, loading, refresh } = useCommunityFeed();

  useEffect(() => {
    console.log('社区页面加载，当前数据条数:', activities.length);
    refresh();
  }, []);

  useEffect(() => {
    console.log('社区数据已更新:', activities.length, '条');
  }, [activities]);

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
      <View style={styles.header}>
        <Ionicons name="person-circle" size={44} color="#007AFF" />
        <View style={styles.userInfo}>
          <Text style={styles.userEmail}>{item.userEmail}</Text>
          <Text style={styles.time}>{formatTime(item.timestamp)}</Text>
        </View>
      </View>
      
      <View style={styles.content}>
        <View style={styles.actionRow}>
          {item.type === 'favorite' ? (
            <Ionicons name="star" size={18} color="#FFD700" />
          ) : (
            <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
          )}
          <Text style={styles.actionText}>
            {item.type === 'favorite' ? ' favorited' : ' completed'}
          </Text>
        </View>
        
        <View style={styles.routeBox}>
          <Text style={styles.routeName}>{item.routeName}</Text>
          {item.difficulty && (
            <View style={styles.difficultyBadge}>
              <Text style={styles.difficultyText}>{item.difficulty}</Text>
            </View>
          )}
        </View>
        
        <Text style={styles.siteName}>📍 {item.siteName}</Text>
        
        {item.notes && (
          <View style={styles.notesBox}>
            <Text style={styles.notesText}>📝 {item.notes}</Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.titleBar}>
        <Text style={styles.title}>Community Updates</Text>
        <Text style={styles.subtitle}>What Are Climbers Climbing Lately？</Text>
      </View> 
      
      <FlatList
        data={activities}
        renderItem={renderActivity}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No Community Updates Yet</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  titleBar: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  userInfo: {
    marginLeft: 12,
    flex: 1,
  },
  userEmail: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  time: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  content: {
    marginLeft: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 15,
    color: '#555',
    marginLeft: 4,
  },
  routeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 6,
  },
  routeName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#007AFF',
    marginRight: 8,
  },
  difficultyBadge: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
  },
  siteName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  notesBox: {
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});