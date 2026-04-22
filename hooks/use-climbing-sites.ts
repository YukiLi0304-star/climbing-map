import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState } from 'react';

import { Alert } from 'react-native';
import irelandData from '../data_processig/ireland_clustered.json';

export type RouteInfo = {
  name: string;
  height?: number | null;
  difficulty?: string;
  overall_grade?: string | null;
  technical_grade?: string | null;
  description?: string;
  sub_routes?: RouteInfo[];
  first_ascent?: string;
  isFromFirebase?: boolean; // 标记是否是从 Firebase 添加的
};

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type ClimbingSite = {
  id?: string;
  name: string;
  page_title?: string;
  url?: string;
  routes: RouteInfo[];
  routes_count: number;
  coordinates?: Coordinates;
  countyName?: string;
  cluster_id?: number | null;
  cluster_name?: string;
  cluster_label?: string;
  type?: string;
  climbing_type?: string;
  area?: string;
  types?: string[];
};

type CountyInfo = {
  name: string;
};

export type CountyData = {
  county_info: CountyInfo;
  climbing_sites: ClimbingSite[];
};

export type RawData = Record<string, CountyData>;

export function useClimbingSites() {
  const [allSites, setAllSites] = useState<ClimbingSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncedRouteIds, setSyncedRouteIds] = useState<Set<string>>(new Set());

  const loadDataFromJson = () => {
    const rawData: RawData = {
      ...(irelandData as any),
    };

    const merged: ClimbingSite[] = [];

    Object.values(rawData).forEach((countyData) => {
      const countyName = countyData.county_info?.name ?? 'Unknown';

      countyData.climbing_sites.forEach((site) => {
        if (
          site.coordinates &&
          typeof site.coordinates.latitude === 'number' &&
          typeof site.coordinates.longitude === 'number'
        ) {
          const areaName = site.area || 'Unknown';
          const id = `${countyName}_${areaName}_${site.name}`.replace(/[^a-zA-Z0-9]/g, '_');
          
          let siteTypes: string[] = [];
          const climbingType = site.climbing_type || '';

          if (climbingType.includes(',')) {
            siteTypes = climbingType.split(',').map(t => t.trim());
          } else {
            if (climbingType.includes('Sea')) siteTypes.push('Sea Cliff');
            if (climbingType.includes('Quarry')) siteTypes.push('Quarry');
            if (climbingType.includes('Mountain')) siteTypes.push('Mountain');
            if (climbingType.includes('Inland')) siteTypes.push('Inland');
            if (climbingType.includes('Trad')) siteTypes.push('Trad');
            if (climbingType.includes('Sport')) siteTypes.push('Sport');
            if (climbingType.includes('Boulder')) siteTypes.push('Boulder');
          }

          if (siteTypes.length === 0) {
            siteTypes = ['Inland', 'Trad'];
          }
          
          // 标记 JSON 中的路线不是来自 Firebase
          const routesWithFlag = (site.routes || []).map(r => ({
            ...r,
            isFromFirebase: false,
          }));
          
          merged.push({
            ...site,
            id,
            countyName,
            types: siteTypes,
            routes: routesWithFlag,
            routes_count: routesWithFlag.length,
          });
        }
      });
    });

    return merged;
  };

  // 从 Firebase 加载审核通过的路线
  const loadApprovedRoutes = async () => {
    try {
      const { getFirebaseFirestore } = await import('@/lib/firebase');
      const { collection, getDocs } = await import('firebase/firestore');
      
      const firestore = await getFirebaseFirestore();
      const snapshot = await getDocs(collection(firestore, 'approved_routes'));
      const routes: any[] = [];
      snapshot.forEach((doc) => {
        routes.push({ id: doc.id, ...doc.data() });
      });
      console.log(`Load approved routes successful, loaded ${routes.length} routes`);
      return routes;
    } catch (error) {
      console.error('Load approved routes failed:', error);
      return [];
    }
  };

  const getRouteId = (cragName: string, routeName: string) => `${cragName}_${routeName}`;

  // 加载已同步的路线记录
  const loadSyncedRecords = async () => {
    try {
      const saved = await AsyncStorage.getItem('synced_route_ids');
      if (saved) {
        const parsed = JSON.parse(saved);
        setSyncedRouteIds(new Set(parsed));
        console.log(`Load synced records successful, loaded ${parsed.length} route IDs`);
      }
    } catch (error) {
      console.error('Load synced records failed:', error);
    }
  };

  const saveSyncedRouteIds = async (ids: Set<string>) => {
    try {
      await AsyncStorage.setItem('synced_route_ids', JSON.stringify([...ids]));
    } catch (error) {
      console.error('Save synced records failed:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        // 加载已同步记录
        await loadSyncedRecords();
        
        const cached = await AsyncStorage.getItem('climbing_sites');
        if (cached) {
          const parsed = JSON.parse(cached);
          setAllSites(parsed);
          console.log(`From cache loaded ${parsed.length} climbing sites`);
        } else {
          const merged = loadDataFromJson();
          setAllSites(merged);
          await AsyncStorage.setItem('climbing_sites', JSON.stringify(merged));
          console.log(`From JSON loaded ${merged.length} climbing sites`);
        }
        
        await checkForUpdates();
      } catch (error) {
        console.error('Load data failed:', error);
        const merged = loadDataFromJson();
        setAllSites(merged);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const [hasUpdate, setHasUpdate] = useState(false);

  const checkForUpdates = async () => {
    try {
      const { getFirebaseFirestore } = await import('@/lib/firebase');
      const { doc, getDoc } = await import('firebase/firestore');
      
      const firestore = await getFirebaseFirestore();
      const versionDoc = await getDoc(doc(firestore, 'metadata', 'version'));
      const remoteVersion = versionDoc.data()?.version || 0;
      
      const localVersion = await AsyncStorage.getItem('data_version');
      const currentVersion = parseInt(localVersion || '0');
      
      console.log(`Local version: ${currentVersion}, Remote version: ${remoteVersion}`);
      
      if (remoteVersion > currentVersion) {
        setHasUpdate(true);
      } else {
        setHasUpdate(false);
      }
    } catch (error) {
      console.error('Check for updates failed:', error);
    }
  };

  // 同步数据（包含添加和删除）
  const syncData = async () => {
    setSyncing(true);
    try {
      // 1. 加载 Firebase 路线
      const approved = await loadApprovedRoutes();
      
      // 2. 加载本地 JSON 基础数据
      const jsonData = loadDataFromJson();
      
      // 3. 获取当前 Firebase 中的所有路线 ID
      const currentFirebaseIds = new Set(
        approved.map(r => getRouteId(r.cragName, r.route.name))
      );
      
      // 4. 计算新增和删除
      const newRouteIds = new Set(
        [...currentFirebaseIds].filter(id => !syncedRouteIds.has(id))
      );
      
      const removedRouteIds = new Set(
        [...syncedRouteIds].filter(id => !currentFirebaseIds.has(id))
      );
      
      const addedCount = newRouteIds.size;
      const removedCount = removedRouteIds.size;
      
      console.log(`同步统计: +${addedCount}, -${removedCount}`);
      
      // 5. 合并数据
      let merged = jsonData.map(site => {
        // 获取这个岩场在 Firebase 中的路线
        const firebaseRoutesForSite = approved.filter(r => r.cragName === site.name);
        
        // 转换 Firebase 路线（标记为来自 Firebase）
        const newRoutesFromFirebase = firebaseRoutesForSite.map(r => ({
          name: r.route.name,
          difficulty: r.route.difficulty,
          height: r.route.height,
          has_star: r.route.has_star,
          description: r.route.description,
          first_ascent: r.route.first_ascent,
          isFromFirebase: true, // 标记来自 Firebase
        }));
        
        // 保留本地 JSON 中的路线（isFromFirebase = false）
        const localRoutes = (site.routes || []).filter(r => !r.isFromFirebase);
        
        // 合并：本地路线 + Firebase 路线
        // 去重（按名称）
        const firebaseNames = new Set(newRoutesFromFirebase.map(r => r.name));
        const uniqueLocalRoutes = localRoutes.filter(r => !firebaseNames.has(r.name));
        
        const allRoutes = [...uniqueLocalRoutes, ...newRoutesFromFirebase];
        
        return {
          ...site,
          routes: allRoutes,
          routes_count: allRoutes.length
        };
      });
      
      // 6. 保存到缓存
      await AsyncStorage.setItem('climbing_sites', JSON.stringify(merged));
      
      // 7. 更新 state
      setAllSites([...merged]);
      
      // 8. 更新已同步记录
      const newSyncedIds = new Set([...syncedRouteIds, ...newRouteIds]);
      // 删除已移除的
      removedRouteIds.forEach(id => newSyncedIds.delete(id));
      setSyncedRouteIds(newSyncedIds);
      await saveSyncedRouteIds(newSyncedIds);
      
      // 9. 更新版本号
      try {
        const { getFirebaseFirestore } = await import('@/lib/firebase');
        const { doc, getDoc } = await import('firebase/firestore');
        const firestore = await getFirebaseFirestore();
        const versionDoc = await getDoc(doc(firestore, 'metadata', 'version'));
        await AsyncStorage.setItem('data_version', String(versionDoc.data()?.version || 0));
      } catch (error) {
        console.error('Update version failed:', error);
      }
      
      setHasUpdate(false);
      
      // 10. 弹窗提示
      if (addedCount > 0 && removedCount === 0) {
        Alert.alert('Sync Complete', `Added ${addedCount} new ${addedCount === 1 ? 'route' : 'routes'}`);
      } else if (removedCount > 0 && addedCount === 0) {
        Alert.alert('Sync Complete', `Removed ${removedCount} ${removedCount === 1 ? 'route' : 'routes'}`);
      } else if (addedCount > 0 && removedCount > 0) {
        Alert.alert('Sync Complete', `Added ${addedCount}, removed ${removedCount} routes`);
      } else {
        Alert.alert('Sync Complete', 'No changes detected');
      }
      
      return { success: true, added: addedCount, removed: removedCount };
    } catch (error) {
      console.error('Sync failed:', error);
      Alert.alert('Sync Failed', 'Please check your network');
      return { success: false, error };
    } finally {
      setSyncing(false);
    }
  };

  const countyOptions = useMemo(() => {
    const set = new Set<string>();
    allSites.forEach((s) => {
      if (s.countyName) set.add(s.countyName);
    });
    return ['All Counties', ...Array.from(set)];
  }, [allSites]);
  
  const climbingTypeOptions = useMemo(() => {
    const set = new Set<string>();
    allSites.forEach((site) => {
      const type = site.climbing_type || site.type;
      if (type && type !== 'Unknown') {
        set.add(type);
      }
    });
    return Array.from(set).sort();
  }, [allSites]);
  
  const difficultyOptions = useMemo(() => {
    const set = new Set<string>();
    allSites.forEach((site) => {
      site.routes?.forEach((route) => {
        if (route.difficulty) {
          set.add(route.difficulty);
        }
      });
    });
    const difficultyOrder: Record<string, number> = {
      'VD': 1, 'S': 2, 'HS': 3, 'VS': 4, 'HVS': 5,
      'E1': 6, 'E2': 7, 'E3': 8, 'E4': 9, 'E5': 10, 'E6': 11
    };
    const sorted = Array.from(set).sort((a, b) => {
      const orderA = difficultyOrder[a] ?? 99;
      const orderB = difficultyOrder[b] ?? 99;
      return orderA - orderB;
    });
    return [
      { id: null, label: 'All difficulties' },
      ...sorted.map(d => ({ id: d, label: d }))
    ];
  }, [allSites]);

  const refreshFromJson = async () => {
    // 保留，但不太需要
    return { updated: false };
  };
  
  return { 
    allSites, 
    loading, 
    countyOptions,
    climbingTypeOptions,
    difficultyOptions,
    syncing,        
    refreshFromJson,
    hasUpdate,
    checkForUpdates,
    syncData
  };
}
