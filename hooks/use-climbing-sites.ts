
import { useEffect, useMemo, useState } from 'react';


import antrimData from '../data_processig/climbing_data_Co_Antrim.json';
import cavanData from '../data_processig/climbing_data_Co_Cavan.json';






export type RouteInfo = {
  name: string;
  height?: number | null;
  difficulty?: string;
  overall_grade?: string | null;
  technical_grade?: string | null;
  description?: string;
  sub_routes?: RouteInfo[];
  first_ascent?: string; 
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
  cluster_label?: string;      
  type?:string;
};

type CountyInfo = {
  name: string;
};

export type CountyData = {
  county_info: CountyInfo;
  climbing_sites: ClimbingSite[];
};

export type RawData = Record<string, CountyData>;

export type ClusterOption = {
  id: number | null; 
  label: string;
};



export function useClimbingSites() {
  const [allSites, setAllSites] = useState<ClimbingSite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const rawData: RawData = {
        ...(antrimData as any),
        ...(cavanData as any),
        
        
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
            const id = `${countyName}_${site.name}`.replace(/[^a-zA-Z0-9]/g, '_');
            merged.push({
              ...site,
              id,
              countyName,
            });
          }
        });
      });

      setAllSites(merged);
    } finally {
      setLoading(false);
    }
  }, []);

  
  const countyOptions = useMemo(() => {
    const set = new Set<string>();
    allSites.forEach((s) => {
      if (s.countyName) set.add(s.countyName);
    });
    return ['全部', ...Array.from(set)];
  }, [allSites]);

  
  const clusterOptions: ClusterOption[] = useMemo(() => {
    const map = new Map<number, string>();

    allSites.forEach((s) => {
      if (typeof s.cluster_id === 'number') {
        const label = s.cluster_label || `Cluster ${s.cluster_id}`;
        if (!map.has(s.cluster_id)) {
          map.set(s.cluster_id, label);
        }
      }
    });

    const arr: ClusterOption[] = [{ id: null, label: 'All Style' }];
    Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .forEach(([id, label]) => {
        arr.push({ id, label });
      });

    return arr;
  }, [allSites]);

  return { allSites, loading, countyOptions, clusterOptions };
}