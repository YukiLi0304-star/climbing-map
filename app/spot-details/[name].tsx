
import { Stack, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useClimbingSites } from '../../hooks/use-climbing-sites';

export default function SpotDetails() {
  const { name } = useLocalSearchParams();
  const { allSites } = useClimbingSites();
  
  
  const decodedName = typeof name === 'string' ? decodeURIComponent(name) : '';
  const site = allSites.find(s => s.name === decodedName);

  const handleOpenWiki = () => {
    if (site?.url) {
      Linking.openURL(site.url);
    }
  };

  if (!site) {
    return (
      <View style={styles.container}>
        <Text>攀岩点未找到: {decodedName}</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: decodedName.length > 20 ? `${decodedName.substring(0, 20)}...` : decodedName
        }} 
      />
      
      <ScrollView style={styles.container}>
        {/* 头部信息 */}
        <View style={styles.header}>
          <Text style={styles.title}>{site.name}</Text>
          
          {site.countyName && (
            <Text style={styles.county}>County: {site.countyName}</Text>
          )}
          {/*
          {site.climbing_type && (
            <View style={[
              styles.typeBadge,
              { backgroundColor: getPinColor(site.climbing_type) }
            ]}>
              <Text style={styles.typeText}>{site.climbing_type}</Text>
            </View>
          )}
          */}
          <Text style={styles.routesCount}>
            {site.routes_count || site.routes?.length || 0} climbing routes
          </Text>
          {/*
          {site.cluster_label && (
            <Text style={styles.clusterLabel}>Style: {site.cluster_label}</Text>
          )}
            */}
          {site.url && (
            <TouchableOpacity style={styles.wikiButton} onPress={handleOpenWiki}>
              <Text style={styles.wikiButtonText}>View the Wiki page</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 线路列表 */}
        <View style={styles.routesSection}>
          <Text style={styles.sectionTitle}>Climbing Routes</Text>
          
          {(site.routes || []).map((route, index) => (
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

              {/* 子路线 */}
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
            </View>
          ))}
        </View>
      </ScrollView>
    </>
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
  const colors: { [key: string]: string } = {
    'D': '#4CAF50',    
    'VD': '#8BC34A',   
    'S': '#FFC107',    
    'HS': '#FF9800',   
    'VS': '#FF5722',   
    'HVS': '#E91E63',  
    'E1': '#9C27B0',   
    'E2': '#673AB7',   
    'E3': '#3F51B5',   
  };
  
  return colors[difficulty] || '#757575'; 
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
});