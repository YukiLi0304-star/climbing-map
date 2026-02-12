import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

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

  useEffect(() => {
    loadFavorites();
  }, []);

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
  };

  const removeFavorite = async (siteName: string, routeName: string) => {
    const updatedFavorites = favorites.filter(
      f => !(f.siteName === siteName && f.routeName === routeName)
    );
    await AsyncStorage.setItem('@climbing_route_favorites', JSON.stringify(updatedFavorites));
    setFavorites(updatedFavorites);
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