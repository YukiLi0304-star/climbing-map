
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

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
}

const STORAGE_KEY = 'user_climbing_logs';

export function useClimbingLog() {
  const [logs, setLogs] = useState<ClimbingLog[]>([]);
  const [loading, setLoading] = useState(false);

  
  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
      console.log('Loading logs from storage');
      
      if (jsonValue) {
        const storedLogs = JSON.parse(jsonValue);
        console.log(`Found ${storedLogs.length} logs in storage`);
        
        
        storedLogs.sort((a: ClimbingLog, b: ClimbingLog) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        
        setLogs(storedLogs);
      } else {
        console.log('No logs found in storage');
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
    console.log('Initial load of climbing logs');
    loadLogs();
  }, [loadLogs]);

  
  const addLog = useCallback(async (logData: Omit<ClimbingLog, 'id' | 'dateAdded'>) => {
    try {
      
      const newLog: ClimbingLog = {
        ...logData,
        id: `${logData.siteName}_${logData.routeName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        dateAdded: new Date().toISOString(),
      };

      console.log('Adding new log:', newLog.id);

      
      const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
      let currentLogs: ClimbingLog[] = [];
      
      if (jsonValue) {
        try {
          currentLogs = JSON.parse(jsonValue);
          console.log(`Found ${currentLogs.length} existing logs`);
        } catch (e) {
          console.error('Failed to parse stored logs:', e);
          currentLogs = [];
        }
      } else {
        console.log('No existing logs found');
      }

      
      const updatedLogs = [newLog, ...currentLogs];
      
      console.log(`Total logs after adding: ${updatedLogs.length}`);

      
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLogs));
      
      
      setLogs(updatedLogs);
      
      console.log('Log added successfully');
      return newLog;
    } catch (error) {
      console.error('Failed to add climbing log:', error);
      throw error;
    }
  }, []); 

  
  const removeLog = useCallback(async (logId: string) => {
    try {
      
      const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
      let currentLogs: ClimbingLog[] = [];
      
      if (jsonValue) {
        currentLogs = JSON.parse(jsonValue);
      }
      
      
      const updatedLogs = currentLogs.filter(log => log.id !== logId);
      
      
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLogs));
      
      
      setLogs(updatedLogs);
      
      console.log(`Log removed, remaining: ${updatedLogs.length}`);
    } catch (error) {
      console.error('Failed to remove climbing log:', error);
    }
  }, []);

  
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