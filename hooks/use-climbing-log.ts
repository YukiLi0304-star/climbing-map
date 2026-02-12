import AsyncStorage from '@react-native-async-storage/async-storage';
import { deleteDoc, doc, setDoc } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import { getFirebaseAuth, getFirebaseFirestore } from '../lib/firebase';
import { useCommunityFeed } from './use-community-feed';


export interface ClimbingLog {
  id: string;
  routeId: string;
  siteName: string;
  routeName: string;
  routeGrade?: string;
  cragName?: string;
  date: string;
  climbingStyle: 'Onsight' | 'Redpoint' | 'Flash' | 'Attempt';
  rating: 1 | 2 | 3;
  partner?: string;
  notes?: string;
  dateAdded: string;
  userId?: string;
}

const STORAGE_KEY = 'user_climbing_logs';

export function useClimbingLog() {
  const [logs, setLogs] = useState<ClimbingLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const { publishActivity } = useCommunityFeed();
  
  useEffect(() => {
    const initAuth = async () => {
      try {
        const auth = await getFirebaseAuth();
        const currentUser = auth.currentUser;
        if (currentUser) {
          setUserId(currentUser.uid);
          syncFromCloud(currentUser.uid);
        }
        
        const unsubscribe = auth.onAuthStateChanged((user: any) => {
          setUserId(user?.uid || null);
          if (user?.uid) {
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

  
  const syncFromCloud = async (uid: string) => {
    if (!uid) return;
    
    try {
      const firestore = await getFirebaseFirestore();
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      
      const logsRef = collection(firestore, 'climbingLogs');
      const q = query(logsRef, where('userId', '==', uid));
      const snapshot = await getDocs(q);
      
      const cloudLogs: ClimbingLog[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        cloudLogs.push(data as ClimbingLog);
      });
      
      if (cloudLogs.length > 0) {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        const localLogs = stored ? JSON.parse(stored) : [];
        const localIds = new Set(localLogs.map((l: ClimbingLog) => l.id));
        
        const newLogs = cloudLogs.filter(l => !localIds.has(l.id));
        
        if (newLogs.length > 0) {
          const merged = [...newLogs, ...localLogs].sort((a, b) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
          );
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          setLogs(merged);
          console.log(`从云端拉取 ${newLogs.length} 条日志`);
        } else {
          setLogs(localLogs);
        }
      } else {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) setLogs(JSON.parse(stored));
      }
    } catch (error) {
      console.log('云端拉取失败:', error);
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) setLogs(JSON.parse(stored));
    }
  };

  
  const syncToCloud = async (log: ClimbingLog, isDelete: boolean = false, uid: string) => {  
    console.log('syncToCloud 被调用, userId:', uid, 'isDelete:', isDelete);
    if (!uid) {
      console.log('没有 userId，跳过云端写入');
      return;
    }
    
    try {
      const firestore = await getFirebaseFirestore();
      const docRef = doc(firestore, 'climbingLogs', log.id);
      
      if (isDelete) {
        await deleteDoc(docRef);
        console.log('云端删除日志:', log.id);
      } else {
        
        const cleanLog = Object.fromEntries(
          Object.entries(log).filter(([_, value]) => value !== undefined)
        );
        
        await setDoc(docRef, {
          ...cleanLog,
          userId: uid,  
        });
        console.log('云端写入日志:', log.id);
      }
    } catch (error) {
      console.log('云端操作失败（已存本地）:', error);
    }
  };

  
  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
      
      if (jsonValue) {
        const storedLogs = JSON.parse(jsonValue);
        storedLogs.sort((a: ClimbingLog, b: ClimbingLog) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setLogs(storedLogs);
      } else {
        setLogs([]);
      }
    } catch (error) {
      console.error('Failed to load climbing logs:', error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

const addLog = useCallback(async (logData: Omit<ClimbingLog, 'id' | 'dateAdded'>) => {
  try {
    
    let currentUid = userId;
    if (!currentUid) {
      const auth = await getFirebaseAuth();
      const currentUser = auth.currentUser;
      if (currentUser) {
        currentUid = currentUser.uid;
        console.log('addLog 中重新获取到用户:', currentUid);
        setUserId(currentUid);  
      }
    }

    
    if (!currentUid) {
      console.log('用户未登录，仅保存到本地');
    }

    const newLog: ClimbingLog = {
      ...logData,
      id: `${logData.siteName}_${logData.routeName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      dateAdded: new Date().toISOString(),
    };

    console.log('Adding new log:', newLog.id);
    console.log('当前 userId:', currentUid);

    
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
    let currentLogs: ClimbingLog[] = jsonValue ? JSON.parse(jsonValue) : [];
    const updatedLogs = [newLog, ...currentLogs];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLogs));
    setLogs(updatedLogs);
    
    
    if (currentUid) {
      await syncToCloud(newLog, false, currentUid);
      publishActivity('log', logData.siteName, logData.routeName, logData.routeGrade, logData.notes || '' );
    }
    
    console.log('Log added successfully');
    return newLog;
  } catch (error) {
    console.error('Failed to add climbing log:', error);
    throw error;
  }
}, [userId]); 

const removeLog = useCallback(async (logId: string) => {
  try {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
    let currentLogs: ClimbingLog[] = jsonValue ? JSON.parse(jsonValue) : [];
    
    const logToDelete = currentLogs.find(log => log.id === logId);
    const updatedLogs = currentLogs.filter(log => log.id !== logId);
    
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLogs));
    setLogs(updatedLogs);
    
    
    if (logToDelete && userId) {
      await syncToCloud(logToDelete, true, userId);  
    }
    
    console.log(`Log removed, remaining: ${updatedLogs.length}`);
  } catch (error) {
    console.error('Failed to remove climbing log:', error);
  }
}, [userId]);

  
  const hasClimbedRoute = useCallback((siteName: string, routeName: string) => {
    return logs.some(log => 
      log.siteName === siteName && log.routeName === routeName
    );
  }, [logs]);

  const getLogsForRoute = useCallback((siteName: string, routeName: string) => {
    return logs.filter(log => 
      log.siteName === siteName && log.routeName === routeName
    );
  }, [logs]);

  return {
    logs,
    loading,
    loadLogs,
    addLog,
    removeLog,
    hasClimbedRoute,
    getLogsForRoute,
  };
}