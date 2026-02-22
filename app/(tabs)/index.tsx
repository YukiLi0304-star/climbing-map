import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { Region } from 'react-native-maps';
import { ClimbingMap } from '../../components/ClimbingMap';
import { SearchPanel } from '../../components/SearchPanel';
import {
  ClimbingSite,
  useClimbingSites,
} from '../../hooks/use-climbing-sites';

export default function HomeScreen() {
  const router = useRouter();

  const { allSites, loading, countyOptions, difficultyOptions } =
    useClimbingSites();

  const typeOptions = ['Sea Cliff', 'Quarry', 'Mountain', 'Inland', 'Trad', 'Sport', 'Boulder'];
  const [searchText, setSearchText] = useState('');
  const [selectedCounty, setSelectedCounty] = useState<string>('全部');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
  

  const [selectedSite, setSelectedSite] = useState<ClimbingSite | null>(null);
  

  const [showCountyDropdown, setShowCountyDropdown] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showDifficultyDropdown, setShowDifficultyDropdown] = useState(false);
  

  const [focusRegion, setFocusRegion] = useState<Region | null>({
    latitude: 53.1424,
    longitude: -7.6921,
    latitudeDelta: 4,
    longitudeDelta: 4,
  });


  const filteredSites = useMemo(() => {
    const q = searchText.trim().toLowerCase();

    return allSites.filter((site) => {
      
      if (selectedCounty !== '全部' && site.countyName !== selectedCounty) {
        return false;
      }
      
      if (selectedTypes.length > 0) {
        console.log('检查站点:', site.name);
        console.log('  站点类型:', site.types);
        console.log('  需要包含:', selectedTypes);
        const hasAllTypes = selectedTypes.every(type => 
          site.types && site.types.includes(type)
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

      
      if (q) {
        const inCounty = (site.countyName || '').toLowerCase().includes(q);
        const inName = site.name.toLowerCase().includes(q);
        const inCluster = (site.cluster_label || '').toLowerCase().includes(q);
        const inRoutes = (site.routes || []).some((r) =>
          r.name.toLowerCase().includes(q)
        );

        if (!inCounty && !inName && !inCluster && !inRoutes) {
          return false;
        }
      }

      return true;
    });
  }, [allSites, searchText, selectedCounty, selectedTypes, selectedDifficulty]);

  
  const suggestedSites = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q || q.length < 1) return [];

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
    const coords = sites
      .filter((s) => s.coordinates)
      .map((s) => s.coordinates!);

    if (!coords.length) return null;

    let minLat = coords[0].latitude;
    let maxLat = coords[0].latitude;
    let minLng = coords[0].longitude;
    let maxLng = coords[0].longitude;

    coords.forEach((c) => {
      minLat = Math.min(minLat, c.latitude);
      maxLat = Math.max(maxLat, c.latitude);
      minLng = Math.min(minLng, c.longitude);
      maxLng = Math.max(maxLng, c.longitude);
    });

    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    const spanLat = maxLat - minLat;
    const spanLng = maxLng - minLng;

    const latitudeDelta = Math.max(spanLat * 1.4, 0.2);
    const longitudeDelta = Math.max(spanLng * 1.4, 0.2);

    return {
      latitude: centerLat,
      longitude: centerLng,
      latitudeDelta,
      longitudeDelta,
    };
  };

  
  const closeAllDropdowns = () => {
    setShowCountyDropdown(false);
    setShowTypeDropdown(false);
    setShowDifficultyDropdown(false);
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
    console.log('选择了郡:', county);
    
    setSelectedCounty(county);
    setShowCountyDropdown(false);

    if (county === '全部') {
      setFocusRegion({
        latitude: 53.1424,
        longitude: -7.6921,
        latitudeDelta: 4,
        longitudeDelta: 4,
      });
      return;
    }

    const sitesInCounty = allSites.filter(s => {
      if (!s.coordinates || !s.countyName) return false;
      return s.countyName === county;
    });

    if (sitesInCounty.length > 0) {
      const region = computeRegionForSites(sitesInCounty);
      if (region) {
        setFocusRegion(region);
      }
    }
  };

  
  const handleSelectType = (type: string) => {
    if (type === 'clear') {
      setSelectedTypes([]);
      setShowTypeDropdown(false);
    } else {
      if (selectedTypes.includes(type)) {
        setSelectedTypes(selectedTypes.filter(t => t !== type));
      } else {
        setSelectedTypes([...selectedTypes, type]);
      }
      
    }
  };

  
  const handleSelectDifficulty = (difficulty: string | null) => {
    setSelectedDifficulty(difficulty);
    setShowDifficultyDropdown(false);
  };

  
  const toggleCountyDropdown = () => {
    setShowCountyDropdown(!showCountyDropdown);
    setShowTypeDropdown(false);
    setShowDifficultyDropdown(false);
  };

  
  const toggleTypeDropdown = () => {
    setShowTypeDropdown(!showTypeDropdown);
    setShowCountyDropdown(false);
    setShowDifficultyDropdown(false);
  };

  
  const toggleDifficultyDropdown = () => {
    setShowDifficultyDropdown(!showDifficultyDropdown);
    setShowCountyDropdown(false);
    setShowTypeDropdown(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading climbing point data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* 地图 - 全屏 */}
      <View style={styles.mapContainer}>
        <ClimbingMap
          sites={filteredSites}
          selectedSite={selectedSite}
          onSelectSite={focusOnSite}
          focusRegion={focusRegion}
        />
      </View>

      {/* 搜索面板 - 浮动在顶部 */}
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
          
          
          suggestedSites={suggestedSites}
          onSelectSite={focusOnSite}
        />
      </View>

      {/* 底部信息条 */}
      <View style={styles.infoBar}>
        <Text style={styles.infoText}>
          Currently showing {filteredSites.length} climbing points (A total of{' '}
          {allSites.length})
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
  infoBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  infoText: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
  },
});