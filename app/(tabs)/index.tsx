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

  const { allSites, loading, countyOptions, difficultyOptions, climbingTypeOptions } =
    useClimbingSites();

  // ===== 筛选条件状态 =====
  const [searchText, setSearchText] = useState('');
  const [selectedCounty, setSelectedCounty] = useState<string>('全部');
  const [selectedClimbingType, setSelectedClimbingType] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
  
  // ===== 选中项状态 =====
  const [selectedSite, setSelectedSite] = useState<ClimbingSite | null>(null);
  
  // ===== 下拉菜单状态 =====
  const [showCountyDropdown, setShowCountyDropdown] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showDifficultyDropdown, setShowDifficultyDropdown] = useState(false);
  
  // ===== 地图区域状态 =====
  const [focusRegion, setFocusRegion] = useState<Region | null>({
    latitude: 53.1424,
    longitude: -7.6921,
    latitudeDelta: 4,
    longitudeDelta: 4,
  });

  // ===== 筛选逻辑 =====
  const filteredSites = useMemo(() => {
    const q = searchText.trim().toLowerCase();

    return allSites.filter((site) => {
      // 郡筛选
      if (selectedCounty !== '全部' && site.countyName !== selectedCounty) {
        return false;
      }

      // 攀岩类型筛选
      if (selectedClimbingType !== 'all') {
        const siteType = (site.climbing_type || site.type || '').toLowerCase();
        const filterType = selectedClimbingType.toLowerCase();
        
        if (!siteType.includes(filterType)) {
          return false;
        }
      }

      // 难度筛选
      if (selectedDifficulty) {
        const hasRouteWithDifficulty = (site.routes || []).some(
          (route) => route.difficulty === selectedDifficulty
        );
        if (!hasRouteWithDifficulty) {
          return false;
        }
      }

      // 搜索文本筛选
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
  }, [allSites, searchText, selectedCounty, selectedClimbingType, selectedDifficulty]);

  // ===== 搜索联想 - 实时响应 =====
  const suggestedSites = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q || q.length < 1) return []; // 输入一个字母就开始联想

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

  // ===== 计算区域范围 =====
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

  // ===== 关闭所有下拉菜单 =====
  const closeAllDropdowns = () => {
    setShowCountyDropdown(false);
    setShowTypeDropdown(false);
    setShowDifficultyDropdown(false);
  };

  // ===== 点击标记或选择联想结果：跳转到该站点 =====
  const focusOnSite = (site: ClimbingSite) => {
    setSelectedSite(site);
    
    // 关闭所有下拉菜单
    closeAllDropdowns();

    if (site.coordinates) {
      setFocusRegion({
        latitude: site.coordinates.latitude,
        longitude: site.coordinates.longitude,
        latitudeDelta: 0.12,
        longitudeDelta: 0.12,
      });
    }

    // 清空搜索框
    setSearchText('');
  };

  // ===== 选择郡：只移动地图 =====
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

  // ===== 选择攀岩类型 =====
  const handleSelectClimbingType = (type: string) => {
    setSelectedClimbingType(type);
    setShowTypeDropdown(false);
  };

  // ===== 选择难度 =====
  const handleSelectDifficulty = (difficulty: string | null) => {
    setSelectedDifficulty(difficulty);
    setShowDifficultyDropdown(false);
  };

  // ===== 切换郡下拉菜单 =====
  const toggleCountyDropdown = () => {
    setShowCountyDropdown(!showCountyDropdown);
    setShowTypeDropdown(false);
    setShowDifficultyDropdown(false);
  };

  // ===== 切换类型下拉菜单 =====
  const toggleTypeDropdown = () => {
    setShowTypeDropdown(!showTypeDropdown);
    setShowCountyDropdown(false);
    setShowDifficultyDropdown(false);
  };

  // ===== 切换难度下拉菜单 =====
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
          // 搜索
          searchText={searchText}
          onChangeSearchText={setSearchText}
          
          // 郡筛选
          selectedCounty={selectedCounty}
          onSelectCounty={handleSelectCounty}
          countyOptions={countyOptions}
          showCountyDropdown={showCountyDropdown}
          onToggleCountyDropdown={toggleCountyDropdown}
          
          // 攀岩类型筛选
          selectedClimbingType={selectedClimbingType}
          onSelectClimbingType={handleSelectClimbingType}
          climbingTypeOptions={climbingTypeOptions || []}
          showTypeDropdown={showTypeDropdown}
          onToggleTypeDropdown={toggleTypeDropdown}
          
          // 难度筛选
          selectedDifficulty={selectedDifficulty}
          onSelectDifficulty={handleSelectDifficulty}
          difficultyOptions={difficultyOptions}
          showDifficultyDropdown={showDifficultyDropdown}
          onToggleDifficultyDropdown={toggleDifficultyDropdown}
          
          // 搜索联想
          suggestedSites={suggestedSites}
          onSelectSite={focusOnSite}
        />
      </View>

      {/* 底部信息条 - 原始版本样式 */}
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
  // 原始版本底部信息条样式
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