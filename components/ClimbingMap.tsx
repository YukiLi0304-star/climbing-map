import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Callout, Marker, Region } from 'react-native-maps';

import { ui } from '@/constants/ui';
import { ClimbingSite } from '../hooks/use-climbing-sites';

type Props = {
  sites: ClimbingSite[];
  selectedSite: ClimbingSite | null;
  onSelectSite: (site: ClimbingSite) => void;
  focusRegion: Region | null;
  showHotspotColors?: boolean;
};

const TYPE_COLORS = {
  'Sea Cliff': '#85b8ec',
  Quarry: '#f6e04d',
  Mountain: '#91d9a6',
  Inland: '#c6bce9',
};

const HOTSPOT_COLORS: { [key: number]: string } = {
  0: '#f5f364',
  1: '#82dfc6',
  2: '#78bef7',
  3: '#45d258',
  4: '#f5bc4a',
};

const getPinColor = (site: ClimbingSite, showHotspotColors: boolean): string => {
  if (showHotspotColors && site.cluster_id !== undefined && site.cluster_id !== null && site.cluster_id !== -1) {
    return HOTSPOT_COLORS[site.cluster_id] || '#7a8795';
  }

  if (site.types) {
    if (site.types.includes('Sea Cliff')) return TYPE_COLORS['Sea Cliff'];
    if (site.types.includes('Quarry')) return TYPE_COLORS.Quarry;
    if (site.types.includes('Mountain')) return TYPE_COLORS.Mountain;
    if (site.types.includes('Inland')) return TYPE_COLORS.Inland;
  }

  return TYPE_COLORS.Inland;
};

export const ClimbingMap: React.FC<Props> = ({
  sites = [],
  selectedSite,
  onSelectSite,
  focusRegion,
  showHotspotColors = false,
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
    if (!focusRegion || !mapRef.current) {
      return;
    }

    const timer = setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.animateToRegion(focusRegion, 450);
        setRegion(focusRegion);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [focusRegion]);

  const handleCalloutPress = (site: ClimbingSite) => {
    router.push(`/spot-details/${encodeURIComponent(site.name)}`);
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        region={region}
        onRegionChangeComplete={setRegion}
        showsUserLocation
        showsCompass
        showsScale
      >
        {Array.isArray(sites) &&
          sites.map((site, index) => {
            if (!site?.coordinates) return null;

            const routesCount = site.routes_count ?? site.routes?.length ?? 0;
            const firstDifficulty = site.routes && site.routes[0]?.difficulty;
            const isSelected = !!selectedSite && selectedSite.id === site.id;

            return (
              <Marker
                key={`${site.id || site.name}_${index}`}
                coordinate={site.coordinates}
                title={site.name}
                description={`${routesCount} routes`}
                pinColor={isSelected ? ui.colors.accentStrong : getPinColor(site, showHotspotColors)}
                onPress={() => onSelectSite(site)}
                tracksViewChanges={false}
                style={styles.marker}
              >
                <Callout tooltip onPress={() => handleCalloutPress(site)}>
                  <TouchableOpacity style={styles.calloutContainer} activeOpacity={0.88}>
                    <Text style={styles.calloutTitle}>{site.name}</Text>
                    {site.countyName ? (
                      <Text style={styles.calloutMeta}>County: {site.countyName}</Text>
                    ) : null}
                    <Text style={styles.calloutMeta}>Routes: {routesCount}</Text>
                    {firstDifficulty ? (
                      <Text style={styles.calloutMeta}>Grade: {firstDifficulty}</Text>
                    ) : null}
                    {site.cluster_label ? (
                      <Text style={styles.calloutMeta}>Style: {site.cluster_label}</Text>
                    ) : null}
                    <Text style={styles.calloutLink}>Open details</Text>
                  </TouchableOpacity>
                </Callout>
              </Marker>
            );
          })}
      </MapView>

      <View style={styles.legend}>
        <Text style={styles.legendEyebrow}>Map key</Text>
        <Text style={styles.legendTitle}>Crag Types</Text>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: TYPE_COLORS['Sea Cliff'] }]} />
            <Text style={styles.legendText}>Sea Cliff</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: TYPE_COLORS.Quarry }]} />
            <Text style={styles.legendText}>Quarry</Text>
          </View>
        </View>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: TYPE_COLORS.Mountain }]} />
            <Text style={styles.legendText}>Mountain</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: TYPE_COLORS.Inland }]} />
            <Text style={styles.legendText}>Inland</Text>
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
  marker: {
    zIndex: 1,
  },
  calloutContainer: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    padding: 14,
    borderRadius: 18,
    maxWidth: 240,
    borderWidth: 1,
    borderColor: ui.colors.border,
    ...ui.shadows.card,
  },
  calloutTitle: {
    fontWeight: '700',
    fontSize: 15,
    marginBottom: 6,
    color: ui.colors.text,
  },
  calloutMeta: {
    fontSize: 12,
    color: ui.colors.textMuted,
    marginBottom: 3,
  },
  calloutLink: {
    marginTop: 10,
    fontSize: 12,
    color: ui.colors.accent,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  legend: {
    position: 'absolute',
    bottom: 26,
    right: 16,
    backgroundColor: 'rgba(255,255,255,0.22)',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.34)',
    minWidth: 176,
    ...ui.shadows.glow,
  },
  legendEyebrow: {
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: ui.colors.textSoft,
    marginBottom: 4,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
    color: ui.colors.text,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 74,
  },
  legendColor: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendText: {
    fontSize: 11,
    color: ui.colors.textMuted,
  },
});
