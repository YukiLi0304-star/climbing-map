import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { Region } from 'react-native-maps';

import AuroraBackdrop from '../../components/AuroraBackdrop';
import { ClimbingMap } from '../../components/ClimbingMap';
import { SearchPanel } from '../../components/SearchPanel';
import { ui } from '../../constants/ui';
import {
  ClimbingSite,
  useClimbingSites,
} from '../../hooks/use-climbing-sites';

const IRELAND_REGION: Region = {
  latitude: 53.1424,
  longitude: -7.6921,
  latitudeDelta: 4,
  longitudeDelta: 4,
};

const ALL_COUNTIES = 'All Counties';

export default function HomeScreen() {
  const { allSites, loading, countyOptions, difficultyOptions, hasUpdate, syncing, syncData } =
    useClimbingSites();

  const typeOptions = ['Sea Cliff', 'Quarry', 'Mountain', 'Inland', 'Trad', 'Sport', 'Boulder'];
  const hotspotOptions = useMemo(() => {
    const hotspots = new Set<string>();
    allSites.forEach((site) => {
      if (site.cluster_name && site.cluster_name !== 'Isolated') {
        hotspots.add(site.cluster_name);
      }
    });
    return Array.from(hotspots).sort();
  }, [allSites]);

  const [searchText, setSearchText] = useState('');
  const [selectedCounty, setSelectedCounty] = useState<string>(ALL_COUNTIES);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
  const [selectedSite, setSelectedSite] = useState<ClimbingSite | null>(null);
  const [showCountyDropdown, setShowCountyDropdown] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showDifficultyDropdown, setShowDifficultyDropdown] = useState(false);
  const [selectedHotspot, setSelectedHotspot] = useState('all');
  const [showHotspotDropdown, setShowHotspotDropdown] = useState(false);
  const [showHotspotColors, setShowHotspotColors] = useState(false);
  const [focusRegion, setFocusRegion] = useState<Region | null>(IRELAND_REGION);

  const filteredSites = useMemo(() => {
    const q = searchText.trim().toLowerCase();

    return allSites.filter((site) => {
      const routeCount = site.routes_count ?? site.routes?.length ?? 0;
      if (routeCount === 0) {
        return false;
      }

      if (site.coordinates) {
        const { latitude, longitude } = site.coordinates;
        if (latitude < 51.4 || latitude > 55.4 || longitude < -10.5 || longitude > -5.5) {
          return false;
        }
      }

      if (selectedCounty !== ALL_COUNTIES && site.countyName !== selectedCounty) {
        return false;
      }

      if (selectedTypes.length > 0) {
        const hasAllTypes = selectedTypes.every(
          (type) => site.types && site.types.includes(type)
        );
        if (!hasAllTypes) return false;
      }

      if (selectedDifficulty) {
        const hasRouteWithDifficulty = (site.routes || []).some(
          (route) => route.difficulty === selectedDifficulty
        );
        if (!hasRouteWithDifficulty) {
          return false;
        }
      }

      if (selectedHotspot !== 'all') {
        const hotspotName = site.cluster_name;
        if (!hotspotName || hotspotName !== selectedHotspot) return false;
      }

      if (q) {
        const inCounty = (site.countyName || '').toLowerCase().includes(q);
        const inName = site.name.toLowerCase().includes(q);
        const inCluster = (site.cluster_label || '').toLowerCase().includes(q);
        const inRoutes = (site.routes || []).some((route) =>
          route.name.toLowerCase().includes(q)
        );

        if (!inCounty && !inName && !inCluster && !inRoutes) {
          return false;
        }
      }

      return true;
    });
  }, [allSites, searchText, selectedCounty, selectedTypes, selectedDifficulty, selectedHotspot]);

  const suggestedSites = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return [];

    const result: ClimbingSite[] = [];
    for (const site of allSites) {
      if (!site.coordinates) continue;

      const nameMatch = site.name.toLowerCase().includes(q);
      const countyMatch = (site.countyName || '').toLowerCase().includes(q);

      if (nameMatch || countyMatch) {
        result.push(site);
      }

      if (result.length >= 5) break;
    }
    return result;
  }, [searchText, allSites]);

  const computeRegionForSites = (sites: ClimbingSite[]): Region | null => {
    const coords = sites.filter((site) => site.coordinates).map((site) => site.coordinates!);
    if (!coords.length) return null;

    let minLat = coords[0].latitude;
    let maxLat = coords[0].latitude;
    let minLng = coords[0].longitude;
    let maxLng = coords[0].longitude;

    coords.forEach((coord) => {
      minLat = Math.min(minLat, coord.latitude);
      maxLat = Math.max(maxLat, coord.latitude);
      minLng = Math.min(minLng, coord.longitude);
      maxLng = Math.max(maxLng, coord.longitude);
    });

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max((maxLat - minLat) * 1.4, 0.2),
      longitudeDelta: Math.max((maxLng - minLng) * 1.4, 0.2),
    };
  };

  const closeAllDropdowns = () => {
    setShowCountyDropdown(false);
    setShowTypeDropdown(false);
    setShowDifficultyDropdown(false);
    setShowHotspotDropdown(false);
  };

  const focusOnSite = (site: ClimbingSite) => {
    setSelectedSite(site);
    closeAllDropdowns();

    if (site.coordinates) {
      setFocusRegion({
        latitude: site.coordinates.latitude,
        longitude: site.coordinates.longitude,
        latitudeDelta: 0.12,
        longitudeDelta: 0.12,
      });
    }

    setSearchText('');
  };

  const handleSelectCounty = (county: string) => {
    setSelectedCounty(county);
    setShowCountyDropdown(false);

    if (county === ALL_COUNTIES) {
      setFocusRegion(IRELAND_REGION);
      return;
    }

    const sitesInCounty = allSites.filter((site) => {
      if (!site.coordinates || !site.countyName) return false;
      return site.countyName === county;
    });

    const region = computeRegionForSites(sitesInCounty);
    if (region) {
      setFocusRegion(region);
    }
  };

  const handleSelectType = (type: string) => {
    if (type === 'clear') {
      setSelectedTypes([]);
      setShowTypeDropdown(false);
      return;
    }

    setSelectedTypes((current) =>
      current.includes(type) ? current.filter((item) => item !== type) : [...current, type]
    );
  };

  const handleSelectDifficulty = (difficulty: string | null) => {
    setSelectedDifficulty(difficulty);
    setShowDifficultyDropdown(false);
  };

  const toggleCountyDropdown = () => {
    setShowCountyDropdown((current) => !current);
    setShowTypeDropdown(false);
    setShowDifficultyDropdown(false);
    setShowHotspotDropdown(false);
  };

  const toggleTypeDropdown = () => {
    setShowTypeDropdown((current) => !current);
    setShowCountyDropdown(false);
    setShowDifficultyDropdown(false);
    setShowHotspotDropdown(false);
  };

  const toggleDifficultyDropdown = () => {
    setShowDifficultyDropdown((current) => !current);
    setShowCountyDropdown(false);
    setShowTypeDropdown(false);
    setShowHotspotDropdown(false);
  };

  const toggleHotspotDropdown = () => {
    setShowHotspotDropdown((current) => !current);
    setShowCountyDropdown(false);
    setShowTypeDropdown(false);
    setShowDifficultyDropdown(false);
  };

  const handleSelectHotspot = (hotspot: string) => {
    setSelectedHotspot(hotspot);
    setShowHotspotColors(hotspot !== 'all');
    setShowHotspotDropdown(false);

    if (hotspot === 'all') {
      setFocusRegion(IRELAND_REGION);
      return;
    }

    const hotspotSites = allSites.filter((site) => site.cluster_name === hotspot);
    const region = computeRegionForSites(hotspotSites);
    if (region) {
      setFocusRegion(region);
    }
  };

  const handleSync = async () => {
    await syncData();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={ui.colors.accent} />
        <Text style={styles.loadingEyebrow}>Preparing map data</Text>
        <Text style={styles.loadingText}>Loading climbing sites across Ireland.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={ui.colors.surface} />
      <AuroraBackdrop compact />

      <View style={styles.mapContainer}>
        <ClimbingMap
          key={selectedHotspot}
          sites={filteredSites}
          selectedSite={selectedSite}
          onSelectSite={focusOnSite}
          focusRegion={focusRegion}
          showHotspotColors={showHotspotColors}
        />
      </View>

      <View
        style={styles.searchPanelWrapper}
        onStartShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
      >
        <SearchPanel
          searchText={searchText}
          onChangeSearchText={setSearchText}
          selectedCounty={selectedCounty}
          onSelectCounty={handleSelectCounty}
          countyOptions={countyOptions}
          showCountyDropdown={showCountyDropdown}
          onToggleCountyDropdown={toggleCountyDropdown}
          selectedTypes={selectedTypes}
          onSelectType={handleSelectType}
          typeOptions={typeOptions}
          showTypeDropdown={showTypeDropdown}
          onToggleTypeDropdown={toggleTypeDropdown}
          selectedDifficulty={selectedDifficulty}
          onSelectDifficulty={handleSelectDifficulty}
          difficultyOptions={difficultyOptions}
          showDifficultyDropdown={showDifficultyDropdown}
          onToggleDifficultyDropdown={toggleDifficultyDropdown}
          selectedHotspot={selectedHotspot}
          onSelectHotspot={handleSelectHotspot}
          hotspotOptions={hotspotOptions}
          showHotspotDropdown={showHotspotDropdown}
          onToggleHotspotDropdown={toggleHotspotDropdown}
          suggestedSites={suggestedSites}
          onSelectSite={focusOnSite}
        />
      </View>

      <Pressable onPress={handleSync} style={styles.syncButton} disabled={syncing}>
        <Text style={styles.syncEyebrow}>Data</Text>
        <Text style={styles.syncButtonText}>{syncing ? 'Syncing...' : 'Sync updates'}</Text>
        {hasUpdate ? <View style={styles.redDot} /> : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ui.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: ui.colors.background,
    paddingHorizontal: 32,
  },
  loadingEyebrow: {
    marginTop: 16,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: ui.colors.textSoft,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 15,
    color: ui.colors.textMuted,
    textAlign: 'center',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  searchPanelWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: 'transparent',
  },
  syncButton: {
    position: 'absolute',
    bottom: 28,
    left: 16,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: ui.radii.lg,
    backgroundColor: 'rgba(64, 33, 118, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(208, 184, 255, 0.45)',
    zIndex: 20,
    minWidth: 132,
    ...ui.shadows.glow,
  },
  syncEyebrow: {
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#d8c4ff',
    marginBottom: 2,
  },
  syncButtonText: {
    color: ui.colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  redDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ff83b1',
  },
});
