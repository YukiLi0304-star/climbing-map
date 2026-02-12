
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
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

  const [searchText, setSearchText] = useState('');
  const [selectedCounty, setSelectedCounty] = useState<string>('ALL');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
  
  const [selectedSite, setSelectedSite] =
    useState<ClimbingSite | null>(null);
  const [showCountyDropdown, setShowCountyDropdown] = useState(false);

  
  const [focusRegion, setFocusRegion] = useState<Region | null>({
    latitude: 53.1424,
    longitude: -7.6921,
    latitudeDelta: 4,
    longitudeDelta: 4,
  });

  
  const filteredSites = useMemo(() => {
    const q = searchText.trim().toLowerCase();

    return allSites.filter((site) => {
      if (selectedCounty !== 'ALL' && site.countyName !== selectedCounty) {
        return false;
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
        const inCounty =
          (site.countyName || '').toLowerCase().includes(q);
        const inName = site.name.toLowerCase().includes(q);
        const inCluster =
          (site.cluster_label || '').toLowerCase().includes(q);
        const inRoutes = (site.routes || []).some((r) =>
          r.name.toLowerCase().includes(q)
        );

        if (!inCounty && !inName && !inCluster && !inRoutes) {
          return false;
        }
      }

      return true;
    });
  }, [allSites, searchText, selectedCounty, selectedDifficulty]);

  
   
  const suggestedSites = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return [];

    const result: ClimbingSite[] = [];
    for (const site of allSites) {
      if (!site.coordinates) continue;

      const nameMatch = site.name.toLowerCase().includes(q);
      const countyMatch =
        (site.countyName || '').toLowerCase().includes(q);

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

  
  const focusOnSite = (site: ClimbingSite) => {
    setSelectedSite(site);

    if (site.countyName) {
      setSelectedCounty(site.countyName);
    }

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
      setSelectedSite(null);
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
      
      
      const selectedCountyClean = county.replace('Co. ', '').trim();
      const siteCountyClean = s.countyName.replace('Co. ', '').trim();
      
      return siteCountyClean === selectedCountyClean;
    });

    console.log(`找到 ${sitesInCounty.length} 个站点在 ${county}`);

    if (sitesInCounty.length > 0) {
      
      const firstSite = sitesInCounty[0];
      setSelectedSite(firstSite);
      
      
      setFocusRegion({
        latitude: firstSite.coordinates!.latitude,
        longitude: firstSite.coordinates!.longitude,
        latitudeDelta: 1,  
        longitudeDelta: 1,
      });
      
      console.log(`跳转到: ${firstSite.name}`, firstSite.coordinates);
    } else {
      
      console.log(`${county} 没有找到站点`);
      setSelectedSite(null);
      setFocusRegion({
        latitude: 53.1424,
        longitude: -7.6921,
        latitudeDelta: 4,
        longitudeDelta: 4,
      });
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>loading climbing point data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 顶部搜索 + 筛选 */}
      <SearchPanel
        searchText={searchText}
        onChangeSearchText={setSearchText}
        selectedCounty={selectedCounty}
        onSelectCounty={handleSelectCounty}
        countyOptions={countyOptions}
       
        
        selectedDifficulty={selectedDifficulty}
        onSelectDifficulty={setSelectedDifficulty}
        difficultyOptions={difficultyOptions}
        
        suggestedSites={suggestedSites}
        onSelectSite={focusOnSite}
        showCountyDropdown={showCountyDropdown}
        onToggleCountyDropdown={() =>
          setShowCountyDropdown((prev) => !prev)
        }
      />

      {/* 地图 */}
      <ClimbingMap
        sites={filteredSites}
        selectedSite={selectedSite}
        onSelectSite={focusOnSite}
        focusRegion={focusRegion}
      />

      {/* 底部信息条 */}
      <View style={styles.infoBar}>
        <Text style={styles.infoText}>
            Currently showing {filteredSites.length} climbing points(A total of{' '}
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
  infoSubText: {
    color: '#ddd',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 2,
  },
});