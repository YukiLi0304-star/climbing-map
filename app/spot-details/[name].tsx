
import LogClimbingModal from '@/components/LogClimbingModal';
import { useClimbingLog } from '@/hooks/use-climbing-log';
import { useClimbingSites } from '@/hooks/use-climbing-sites';
import { useRouteFavorites } from '@/hooks/use-route-favorites';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function SpotDetails() {
  const { name } = useLocalSearchParams();
  const router = useRouter();
  const { allSites } = useClimbingSites();
  const decodedName = typeof name === 'string' ? decodeURIComponent(name) : '';
  const site = allSites.find(s => s.name === decodedName);
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
    console.log('SpotDetails: Log saved, refreshing data...');
    
    loadLogs();
    
    setRefreshTrigger(prev => prev + 1);
  }, [loadLogs]);

  
  useFocusEffect(
    useCallback(() => {
      console.log('SpotDetails: Page focused, checking logs');
      
      loadLogs();
      
      return () => {
        console.log('SpotDetails: Page unfocused');
      };
    }, [loadLogs])
  );

  
  React.useEffect(() => {
    console.log(`SpotDetails render #${refreshTrigger}`);
    if (site) {
      console.log(`Checking ${site.routes?.length || 0} routes:`);
      site.routes?.forEach((route, index) => {
        const hasClimbed = hasClimbedRoute(site.name, route.name);
        console.log(`  ${index + 1}. ${route.name}: ${hasClimbed ? 'YES' : 'NO'}`);
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
      <View style={styles.container}>
        <Text>Climbing spot not found: {decodedName}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.customNavBar}>
        <TouchableOpacity 
          style={styles.navBackButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
          <Text style={styles.navBackText}>Back</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{site.name}</Text>
          
          {site.countyName && (
            <Text style={styles.county}>County: {site.countyName}</Text>
          )}
          
          <Text style={styles.routesCount}>
            {site.routes_count || site.routes?.length || 0} climbing routes
          </Text>
          
          {site.url && (
            <TouchableOpacity style={styles.wikiButton} onPress={handleOpenWiki}>
              <Text style={styles.wikiButtonText}>View the Wiki page</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.routesSection}>
          <Text style={styles.sectionTitle}>Climbing Routes</Text>
          
          {(site.routes || []).map((route, index) => {
            
            const hasClimbed = hasClimbedRoute(site.name, route.name);
            
            return (
              <View key={index} style={styles.routeCard}>
                <View style={styles.routeHeader}>
                  <Text style={styles.routeName}>{route.name}</Text>
                  {route.difficulty && (
                    <View style={[
                      styles.difficultyBadge,
                      { backgroundColor: getDifficultyColor(route.difficulty) }
                    ]}>
                      <Text style={styles.difficultyText}>{route.difficulty}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.routeDetails}>
                  {route.height && (
                    <Text style={styles.detail}>Height: {route.height}m</Text>
                  )}
                  
                  {route.technical_grade && (
                    <Text style={styles.detail}>technical grade: {route.technical_grade}</Text>
                  )}
                  
                  {route.overall_grade && route.overall_grade !== route.difficulty && (
                    <Text style={styles.detail}>overall grade: {route.overall_grade}</Text>
                  )}

                  {route.first_ascent && (
                    <Text style={styles.firstAscent}>recorder: {route.first_ascent}</Text>
                  )}
                </View>

                {route.description && (
                  <Text style={styles.description}>{route.description}</Text>
                )}

                {route.sub_routes && route.sub_routes.length > 0 && (
                  <View style={styles.subRoutes}>
                    <Text style={styles.subRoutesTitle}>sub-routes:</Text>
                    {route.sub_routes.map((subRoute, subIndex) => (
                      <View key={subIndex} style={styles.subRoute}>
                        <Text style={styles.subRouteName}>{subRoute.name}</Text>
                        {subRoute.difficulty && (
                          <Text style={styles.subRouteDifficulty}>{subRoute.difficulty}</Text>
                        )}
                      </View>
                    ))}
                  </View>
                )}
                
                <TouchableOpacity 
                  onPress={() => {
                    console.log(`Opening log form for ${route.name}`);
                    setSelectedRoute({
                      siteName: site.name,
                      routeName: route.name,
                      routeGrade: route.difficulty,
                    });
                    setShowLogModal(true);
                  }}
                  style={styles.logButtonRight}
                >
                  <Ionicons 
                    name={hasClimbed ? "checkmark-circle" : "bookmark-outline"} 
                    size={20} 
                    color={hasClimbed ? "#4CAF50" : "#666"} 
                  />
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={() => toggleFavorite(
                    site.name, 
                    route.name, 
                    route.difficulty,
                    site.url
                  )}
                  style={styles.favoriteButtonRight}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons 
                    name={isFavorite(site.name, route.name) ? "star" : "star-outline"} 
                    size={20} 
                    color={isFavorite(site.name, route.name) ? "#FFD700" : "#C0C0C0"} 
                  />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {showLogModal && selectedRoute && (
        <LogClimbingModal
          visible={showLogModal}
          onClose={() => {
            setShowLogModal(false);
            setSelectedRoute(null);
          }}
          route={selectedRoute}
          onLogSaved={handleLogSaved} 
        />
      )}
    </View>
  );
}


const getPinColor = (climbingType?: string): string => {
  const colorMap: { [key: string]: string } = {
    'sea cliff': '#4ECDC4',      
    'sport climbing': '#FF6B6B', 
    'bouldering': '#45B7D1',     
    'trad climbing': '#96CEB4',  
    'quarry': '#FFE66D',         
    'indoor climbing': '#6A0572', 
    'other': '#999999'           
  };
  
  return colorMap[climbingType || 'other'] || colorMap.other;
};

const getDifficultyColor = (difficulty: string): string => {
  const diff = difficulty.toLowerCase();

  if (diff.includes('hvs')) return '#E91E63';
  if (diff.includes('vs')) return '#FF5722';
  if (diff.includes('hs')) return '#FF9800';
  
  if (diff.includes('e3')) return '#3F51B5';
  if (diff.includes('e2')) return '#673AB7';
  if (diff.includes('e1')) return '#9C27B0';
  if (diff.includes('vd')) return '#8BC34A';
  if (diff.includes('d')) return '#4CAF50';
  
  if (/^s\b/.test(diff) || /\bs\b/.test(diff)) {
    return '#FFC107';
  }
  
  return '#757575';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  customNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  navBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
  },
  navBackText: {
    marginLeft: 4,
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  county: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 8,
  },
  typeText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  routesCount: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
    marginBottom: 4,
  },
  clusterLabel: {
    fontSize: 14,
    color: '#888',
    marginBottom: 12,
  },
  wikiButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  wikiButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  routesSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  routeCard: {
    backgroundColor: 'white',
    padding: 16,
    paddingBottom: 40,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  routeName: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
    color: '#333',
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 40,
    alignItems: 'center',
  },
  difficultyText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  routeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  favoriteButton: {
    padding: 4,
  },
  favoriteButtonRight: {
    position: 'absolute',
    bottom: 8,
    right: 12,
    padding: 8,
  },
  routeDetails: {
    marginBottom: 12,
  },
  detail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  firstAscent: {
    fontSize: 14,
    color: '#888',
    fontStyle: 'italic',
    marginTop: 4,
  },
  description: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginTop: 8,
  },
  subRoutes: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  subRoutesTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  subRoute: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    marginBottom: 4,
  },
  subRouteName: {
    fontSize: 14,
    color: '#555',
    flex: 1,
  },
  subRouteDifficulty: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },
  logButtonRight: {
    position: 'absolute',
    bottom: 8,
    right: 50,
    padding: 8,
  },
    refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f7ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  refreshButtonText: {
    marginLeft: 6,
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
});