import { useEffect, useState } from 'react';
import { getFirebaseAuth, getFirebaseFirestore } from '../lib/firebase';

export type Activity = {
  id: string;
  userId: string;
  userEmail: string;
  type: 'favorite' | 'log';
  siteName: string;
  routeName: string;
  difficulty?: string;
  notes?: string;
  timestamp: string;
};

export const useCommunityFeed = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  
  useEffect(() => {
    const initAuth = async () => {
      const auth = await getFirebaseAuth();
      const user = auth.currentUser;
      setUserId(user?.uid || null);
    };
    initAuth();
  }, []);

  
  const loadActivities = async () => {
    try {
      setLoading(true);
      const firestore = await getFirebaseFirestore();
      const { collection, query, orderBy, limit, getDocs } = await import('firebase/firestore');
      
      const q = query(
        collection(firestore, 'activities'),
        orderBy('timestamp', 'desc'),
        limit(50)
      );
      
      const snapshot = await getDocs(q);
      
      const items: Activity[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as Activity);
      });
      
      setActivities(items);
    } catch (error) {
      console.error('加载社区动态失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();
  }, []);

  
  const publishActivity = async (
    type: 'favorite' | 'log',
    siteName: string,
    routeName: string,
    difficulty?: string,
    notes?: string
  ) => {
    if (!userId) {
      const auth = await getFirebaseAuth();
      const user = auth.currentUser;
      if (!user) return;
      setUserId(user.uid);
    }

    const uid = userId || (await getFirebaseAuth()).currentUser?.uid;
    if (!uid) return;
    
    try {
        const firestore = await getFirebaseFirestore();
        const { collection, addDoc } = await import('firebase/firestore');
        const auth = await getFirebaseAuth();
      
        const activityData: any = {
        userId: uid,
        userEmail: auth.currentUser?.email || '匿名用户',
        type,
        siteName,
        routeName,
        timestamp: new Date().toISOString()
        };

        
        if (difficulty) activityData.difficulty = difficulty;
        if (notes && notes.trim() !== '') activityData.notes = notes.substring(0, 100);

        await addDoc(collection(firestore, 'activities'), activityData);
      
        console.log(`动态已发布: ${type} ${routeName}`);
        
        loadActivities();
    } catch (error) {
        console.error('发布动态失败:', error);
    }
  };
    return {
        activities,
        loading,
        refresh: loadActivities,
        publishActivity,
    };
};