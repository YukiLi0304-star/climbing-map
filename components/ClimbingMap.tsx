import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Callout, Marker, Region } from 'react-native-maps';
import { ClimbingSite } from '../hooks/use-climbing-sites';

type Props = {
  sites: ClimbingSite[];           
  selectedSite: ClimbingSite | null;  
  onSelectSite: (site: ClimbingSite) => void;  
  focusRegion: Region | null;
};

const TYPE_COLORS = {
  sea: '#4ECDC4',       
  sport: '#FF6B6B',     
  boulder: '#45B7D1',   
  trad: '#96CEB4',      
  quarry: '#FFE66D',    
  other: '#7DA0CA'      
};

const getPinColorByType = (site: ClimbingSite): string => {
  const type = (site.type || site.climbing_type || '').toLowerCase();
  
  if (type.includes('sea cliff') || type.includes('tidal')) return TYPE_COLORS.sea;
  if (type.includes('sport') || type.includes('bolt')) return TYPE_COLORS.sport;
  if (type.includes('boulder')) return TYPE_COLORS.boulder;
  if (type.includes('quarry')) return TYPE_COLORS.quarry;
  if (type.includes('trad')) return TYPE_COLORS.trad;
  
  return TYPE_COLORS.other; 
};

export const ClimbingMap: React.FC<Props> = ({
  sites = [],           
  selectedSite,    
  onSelectSite,    
  focusRegion,
}) => {
  const mapRef = useRef<MapView | null>(null);
  const router = useRouter();

  const [region, setRegion] = useState<Region>({
    latitude: 53.1424,
    longitude: -7.6921,
    latitudeDelta: 4,
    longitudeDelta: 4,
  });

  useEffect(() => {
    console.log('focusRegion 变化了:', focusRegion);
    
    if (!focusRegion || !mapRef.current) {
      return;
    }
    
    setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.animateToRegion(focusRegion, 500);
        setRegion(focusRegion);
      }
    }, 100);
  }, [focusRegion]);
  
  const handleCalloutPress = (site: ClimbingSite) => {
    console.log('Callout 被点击:', site.name);
    router.push(`/spot-details/${encodeURIComponent(site.name)}`);
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        region={region}
        onRegionChangeComplete={setRegion}
        showsUserLocation={true}
        showsCompass={true}
        showsScale={true} 
      >
        {/* ✅ 添加安全判断 */}
        {Array.isArray(sites) && sites.map((site, index) => {
          if (!site?.coordinates) return null;

          const routesCount = site.routes_count ?? site.routes?.length ?? 0;
          const firstDifficulty = site.routes && site.routes[0]?.difficulty;
          const isSelected = !!selectedSite && selectedSite.id === site.id;

          return (
            <Marker
              key={`${site.id || site.name}_${index}`}
              coordinate={site.coordinates}
              title={site.name}
              description={`${routesCount} 条攀岩线路`}
              pinColor={isSelected ? '#FF5722' : getPinColorByType(site)}
              onPress={() => {
                console.log('Marker 点击:', site.name);
                onSelectSite(site);  
              }}
              tracksViewChanges={false}
            >
              <Callout tooltip onPress={() => handleCalloutPress(site)}>
                <TouchableOpacity style={styles.calloutContainer} activeOpacity={0.7}>
                  <Text style={styles.calloutTitle}>{site.name}</Text>

                  {site.countyName && (
                    <Text style={styles.calloutDescription}>
                      County: {site.countyName}
                    </Text>
                  )}

                  <Text style={styles.calloutDescription}>
                    Routes: {routesCount}
                  </Text>

                  {firstDifficulty && (
                    <Text style={styles.calloutDescription}>
                      Difficulty: {firstDifficulty}
                    </Text>
                  )}

                  {site.cluster_label && (
                    <Text style={styles.calloutDescription}>
                      Style: {site.cluster_label}
                    </Text>
                  )}

                  <Text style={styles.calloutLink}>
                    more details
                  </Text>
                </TouchableOpacity>
              </Callout>
            </Marker>
          );
        })}
      </MapView>
      
      {/* 地图图例 */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Crag Type</Text>
        
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, {backgroundColor: TYPE_COLORS.sea}]} />
            <Text style={styles.legendText}>Sea Cliff</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, {backgroundColor: TYPE_COLORS.trad}]} />
            <Text style={styles.legendText}>Trad</Text>
          </View>
        </View>
        
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, {backgroundColor: TYPE_COLORS.boulder}]} />
            <Text style={styles.legendText}>Boulder</Text>
          </View>
           <View style={styles.legendItem}>
            <View style={[styles.legendColor, {backgroundColor: TYPE_COLORS.sport}]} />
            <Text style={styles.legendText}>Sport</Text>
          </View>
        </View>

        <View style={styles.legendRow}>
           <View style={styles.legendItem}>
            <View style={[styles.legendColor, {backgroundColor: TYPE_COLORS.quarry}]} />
            <Text style={styles.legendText}>Quarry</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, {backgroundColor: TYPE_COLORS.other}]} />
            <Text style={styles.legendText}>Other</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  calloutContainer: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    maxWidth: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  calloutTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 4,
    color: '#333',
  },
  calloutDescription: {
    fontSize: 12,
    color: '#555',
    marginBottom: 2,
  },
  calloutLink: {
    marginTop: 8,
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
    textAlign: 'center',
  },
  legend: {
    position: 'absolute',
    bottom: 40,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    maxWidth: 180,
    zIndex: 1,
  },
  legendTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#333',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 4,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 4,
  },
  legendText: {
    fontSize: 10,
    color: '#333',
  },
});