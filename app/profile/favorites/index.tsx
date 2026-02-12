
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
      console.log('FavoritesScreen focused');
      
      
      const now = Date.now();
      if (now - lastRefreshTime.current > 2000) { 
        console.log('Refreshing favorites data...');
        loadFavorites();
        lastRefreshTime.current = now;
      } else {
        console.log('Skipping refresh - too soon');
      }

      
      return () => {
        console.log('FavoritesScreen unfocused');
      };
    }, [loadFavorites])
  );

  
  const handleRefresh = useCallback(() => {
    console.log('Manual refresh triggered');
    loadFavorites();
    lastRefreshTime.current = Date.now();
  }, [loadFavorites]);

  const navigateToSpotDetails = (siteName: string) => {
    router.push(`/spot-details/${encodeURIComponent(siteName)}`);
  };

  if (loading && favorites.length === 0) {
    return (
      <>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </>
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
        refreshControl={
          <RefreshControl
            refreshing={loading && favorites.length > 0} 
            onRefresh={handleRefresh}
            colors={['#007AFF']}
            tintColor="#007AFF"
          />
        }
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Favorites</Text>
          
          {favorites.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="star-outline" size={48} color="#CCCCCC" />
              <Text style={styles.emptyText}>No favorite routes yet</Text>
              <Text style={styles.emptyHint}>
                Tap the icon on route details to save favorites
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
          ) : (
            <View style={styles.favoritesList}>
              {/* 添加刷新指示器 */}
              {loading && (
                <View style={styles.refreshingIndicator}>
                  <ActivityIndicator size="small" color="#007AFF" />
                  <Text style={styles.refreshingText}>Loading...</Text>
                </View>
              )}
              
              {favorites.map((fav) => {
                
                const site = allSites.find(s => s.name === fav.siteName);
                const route = site?.routes?.find(r => r.name === fav.routeName);
                
                return (
                  <TouchableOpacity
                    key={fav.id}
                    style={styles.favoriteItem}
                    onPress={() => navigateToSpotDetails(fav.siteName)}
                  >
                    <View style={styles.favoriteInfo}>
                      <Text style={styles.siteName}>{fav.siteName}</Text>
                      <Text style={styles.routeName}>{fav.routeName}</Text>
                      <View style={styles.routeMeta}>
                        {fav.difficulty && (
                          <Text style={styles.difficulty}>{fav.difficulty}</Text>
                        )}
                        <Text style={styles.date}>
                          Bookmarked on: {new Date(fav.dateAdded).toLocaleDateString('en-US')} {/* 改为 en-US */}
                        </Text>
                      </View>
                    </View>
                    
                    <TouchableOpacity 
                      onPress={(e) => {
                        e.stopPropagation();
                        console.log('Removing favorite:', fav.siteName, fav.routeName);
                        removeFavorite(fav.siteName, fav.routeName);
                      }}
                      style={styles.favoriteButton}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="star" size={20} color="#FFD700" />
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
    backgroundColor: '#f5f5f5' 
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  section: { 
    marginTop: 16, 
    backgroundColor: 'white', 
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16,
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: '600', 
    marginBottom: 12 
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: { 
    color: '#999', 
    textAlign: 'center', 
    padding: 20,
    fontSize: 16,
  },
  emptyHint: {
    fontSize: 14,
    color: '#CCC',
    textAlign: 'center',
    lineHeight: 20,
  },
  favoritesList: {
    gap: 8,
  },
  favoriteItem: { 
    padding: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 8,
  },
  favoriteInfo: {
    flex: 1,
    marginRight: 16,
  },
  favoriteButton: {
    padding: 4,
  },
  siteName: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
    marginBottom: 4,
  },
  routeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  routeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  difficulty: {
    fontSize: 13,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  date: {
    fontSize: 12,
    color: '#888',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    padding: 10,
    backgroundColor: '#f0f7ff',
    borderRadius: 20,
    paddingHorizontal: 20,
  },
  refreshButtonText: {
    marginLeft: 8,
    color: '#007AFF',
    fontWeight: '500',
  },
  refreshingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
  },
  refreshingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
});