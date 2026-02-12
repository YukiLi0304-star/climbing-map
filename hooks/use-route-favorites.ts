import AsyncStorage from '@react-native-async-storage/async-storage';
import { deleteDoc, doc, setDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { getFirebaseAuth, getFirebaseFirestore } from '../lib/firebase';
import { useCommunityFeed } from './use-community-feed';

export type FavoriteRoute = {
  id: string;
  siteName: string;
  routeName: string;
  difficulty?: string;
  dateAdded: string;
  siteUrl?: string;
};

export const useRouteFavorites = () => {
  const [favorites, setFavorites] = useState<FavoriteRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const { publishActivity } = useCommunityFeed();
  
  
useEffect(() => {
  const initAuth = async () => {
    try {
      const auth = await getFirebaseAuth();
      console.log('Auth 实例获取成功');
      
      
      const currentUser = auth.currentUser;
      if (currentUser) {
        console.log('已有登录用户:', currentUser.uid);
        setUserId(currentUser.uid);
        
        setTimeout(() => syncFromCloud(currentUser.uid), 500);  
      }
      
      
      const unsubscribe = auth.onAuthStateChanged((user: any) => {
        console.log('onAuthStateChanged 触发:', user?.uid);
        setUserId(user?.uid || null);
        if (user?.uid) {
          console.log('用户登录，拉取云端数据');
          syncFromCloud(user.uid);  
        }
      });
      
      return unsubscribe;
    } catch (error) {
      console.log('Auth init failed:', error);
    }
  };
  initAuth();
}, []); 

  
  useEffect(() => {
    loadFavorites();
  }, []);

  
  const syncToCloud = async (favorite: FavoriteRoute, isDelete: boolean = false) => {
    if (!userId) return;
    
    try {
      const firestore = await getFirebaseFirestore();
      const docRef = doc(firestore, 'favorites', favorite.id);
      
      if (isDelete) {
        await deleteDoc(docRef);
        console.log('云端删除:', favorite.id);
      } else {
        await setDoc(docRef, {
          ...favorite,
          userId,
          dateAdded: favorite.dateAdded
        });
        console.log('云端写入:', favorite.id);
      }
    } catch (error) {
      console.log('云端操作失败（已存本地）:', error);
    }
  };

  
  const loadFavorites = async () => {
    try {
      const stored = await AsyncStorage.getItem('@climbing_route_favorites');
      if (stored) {
        setFavorites(JSON.parse(stored));
      }
    } catch (error) {
      console.error('加载收藏失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const addFavorite = async (
    siteName: string, 
    routeName: string, 
    difficulty?: string,
    siteUrl?: string
  ) => {
    const id = `${siteName}_${routeName}`.replace(/\s+/g, '_');
    
    const newFavorite: FavoriteRoute = {
      id,
      siteName,
      routeName,
      difficulty,
      siteUrl,
      dateAdded: new Date().toISOString(),
    };

    
    const updatedFavorites = [...favorites, newFavorite];
    await AsyncStorage.setItem('@climbing_route_favorites', JSON.stringify(updatedFavorites));
    setFavorites(updatedFavorites);

    syncToCloud(newFavorite, false);

    publishActivity('favorite', siteName, routeName, difficulty, '');
  };

  const removeFavorite = async (siteName: string, routeName: string) => {
    const id = `${siteName}_${routeName}`.replace(/\s+/g, '_');
    
    
    const updatedFavorites = favorites.filter(f => f.id !== id);
    await AsyncStorage.setItem('@climbing_route_favorites', JSON.stringify(updatedFavorites));
    setFavorites(updatedFavorites);

    
    syncToCloud({ id, siteName, routeName } as FavoriteRoute, true);
  };
  

const syncFromCloud = async (uid: string) => {
  if (!uid) {
    console.log('没有userId，跳过云端拉取');
    return;
  }
  
  try {
    console.log('开始拉取云端收藏, userId:', uid);
    const firestore = await getFirebaseFirestore();
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    
    const favoritesRef = collection(firestore, 'favorites');
    const q = query(favoritesRef, where('userId', '==', uid));  
    const snapshot = await getDocs(q);
    
    console.log(`查询到 ${snapshot.size} 条云端收藏`);
    
    const cloudFavorites: FavoriteRoute[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      cloudFavorites.push({
        id: data.id,
        siteName: data.siteName,
        routeName: data.routeName,
        difficulty: data.difficulty,
        siteUrl: data.siteUrl,
        dateAdded: data.dateAdded
      });
    });
    
    if (cloudFavorites.length > 0) {
      const localIds = new Set(favorites.map(f => f.id));
      const newFavorites = cloudFavorites.filter(f => !localIds.has(f.id));
      
      if (newFavorites.length > 0) {
        const merged = [...favorites, ...newFavorites];
        await AsyncStorage.setItem('@climbing_route_favorites', JSON.stringify(merged));
        setFavorites(merged);
        console.log(`从云端拉取 ${newFavorites.length} 条新收藏`);
      }
    }
  } catch (error) {
    console.error('云端拉取失败:', error);
  }
};

  const isFavorite = (siteName: string, routeName: string): boolean => {
    return favorites.some(
      f => f.siteName === siteName && f.routeName === routeName
    );
  };

  const toggleFavorite = async (
    siteName: string, 
    routeName: string, 
    difficulty?: string,
    siteUrl?: string
  ) => {
    if (isFavorite(siteName, routeName)) {
      await removeFavorite(siteName, routeName);
    } else {
      await addFavorite(siteName, routeName, difficulty, siteUrl);
    }
    
    await loadFavorites();
    console.log('重新加载完成');
  };

  const getFavoritesBySite = (siteName: string): FavoriteRoute[] => {
    return favorites.filter(f => f.siteName === siteName);
  };

  return {
    favorites,
    loading,
    addFavorite,
    removeFavorite,
    isFavorite,
    toggleFavorite,
    getFavoritesBySite,
    loadFavorites,
  };
};