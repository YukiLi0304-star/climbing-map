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
      console.log('Auth instance acquired successfully');
      
      
      const currentUser = auth.currentUser;
      if (currentUser) {
        console.log('Existing logged-in user:', currentUser.uid);
        setUserId(currentUser.uid);
        
        setTimeout(() => syncFromCloud(currentUser.uid), 500);  
      }else {
        // 未登录，只加载本地收藏
        loadFavorites();
      }
      
      
      const unsubscribe = auth.onAuthStateChanged((user: any) => {
        setUserId(user?.uid || null);
        if (user?.uid) {
          console.log('User logged in, fetching cloud data');
          syncFromCloud(user.uid);  
        }
      });
      
      return unsubscribe;
    } catch (error) {
      console.log('Auth init failed:', error);
      loadFavorites(); // 失败时只加载本地收藏
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
        console.log('Cloud delete:', favorite.id);
      } else {
        await setDoc(docRef, {
          ...favorite,
          userId,
          dateAdded: favorite.dateAdded
        });
        console.log('Cloud write:', favorite.id);
      }
    } catch (error) {
      console.log('Cloud operation failed (saved locally):', error);
    }
  };

  
  const loadFavorites = async () => {
    try {
      const stored = await AsyncStorage.getItem('@climbing_route_favorites');
      if (stored) {
        setFavorites(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Load favorites failed:', error);
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
    const auth = await getFirebaseAuth();
    if (!auth.currentUser) {
      throw new Error('Please log in to add favorites');
    }
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
    const auth = await getFirebaseAuth();
    if (!auth.currentUser) {
      throw new Error('Please log in to remove favorites');
    }
    const id = `${siteName}_${routeName}`.replace(/\s+/g, '_');
    
    
    const updatedFavorites = favorites.filter(f => f.id !== id);
    await AsyncStorage.setItem('@climbing_route_favorites', JSON.stringify(updatedFavorites));
    setFavorites(updatedFavorites);

    
    syncToCloud({ id, siteName, routeName } as FavoriteRoute, true);
  };
  

const syncFromCloud = async (uid: string) => {
  if (!uid) {
    console.log('No userId found, skipping cloud fetch');
    return;
  }
  
  try {
    console.log('Starting cloud fetch, userId:', uid);
    const firestore = await getFirebaseFirestore();
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    
    const favoritesRef = collection(firestore, 'favorites');
    const q = query(favoritesRef, where('userId', '==', uid));  
    const snapshot = await getDocs(q);
    
    console.log(`Query returned ${snapshot.size} cloud favorites`);
    
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
        console.log(`From cloud fetch: ${newFavorites.length} new favorites`);
      }
    }
  } catch (error) {
    console.error('Cloud fetch failed:', error);
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
    //添加检查
    const auth = await getFirebaseAuth();
    if (!auth.currentUser) {
      throw new Error('Please log in first');
    }
    if (isFavorite(siteName, routeName)) {
      await removeFavorite(siteName, routeName);
    } else {
      await addFavorite(siteName, routeName, difficulty, siteUrl);
    }
    
    await loadFavorites();
    console.log('Reload completed');
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