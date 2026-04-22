import { useCallback, useEffect, useState } from 'react'; // ← 添加 useCallback
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
  const [needLogin, setNeedLogin] = useState(false);

  // 用 useCallback 包装 loadActivities
  const loadActivities = useCallback(async () => {
    // 检查登录状态
    const auth = await getFirebaseAuth();
    if (!auth.currentUser) {
      console.log('User not logged in, skipping community feed load');
      setNeedLogin(true);
      setLoading(false);
      return;
    }
    
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
      console.error('Load community feed failed:', error);
    } finally {
      setLoading(false);
    }
  }, []); // 空依赖，因为不依赖任何外部变量

  useEffect(() => {
    const initAuth = async () => {
      const auth = await getFirebaseAuth();
      const user = auth.currentUser;
      setUserId(user?.uid || null);
      
      if (!user) {
        setNeedLogin(true);
        setLoading(false);
      } else {
        setNeedLogin(false);
        loadActivities();
      }
    };
    initAuth();
  }, [loadActivities]); // ← 加上 loadActivities 依赖

  const publishActivity = async (
    type: 'favorite' | 'log',
    siteName: string,
    routeName: string,
    difficulty?: string,
    notes?: string
  ) => {
    const auth = await getFirebaseAuth();
    if (!auth.currentUser) {
      console.log('User not logged in, cannot publish activity');
      return;
    }

    const uid = auth.currentUser.uid;
    
    try {
      const firestore = await getFirebaseFirestore();
      const { collection, addDoc } = await import('firebase/firestore');
      
      const activityData: any = {
        userId: uid,
        userEmail: auth.currentUser?.email || 'Anonymous User',
        type,
        siteName,
        routeName,
        timestamp: new Date().toISOString()
      };

      if (difficulty) activityData.difficulty = difficulty;
      if (notes && notes.trim() !== '') activityData.notes = notes.substring(0, 100);

      await addDoc(collection(firestore, 'activities'), activityData);
      console.log(`Publish activity successful: ${type} ${routeName}`);
      
      loadActivities();
    } catch (error) {
      console.error('Publish activity failed:', error);
    }
  };
  
  return {
    activities,
    loading,
    needLogin,
    refresh: loadActivities,  // ← 现在这个函数是稳定的了
    publishActivity,
  };
};