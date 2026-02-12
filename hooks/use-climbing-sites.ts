import { useEffect, useMemo, useState } from 'react';

import antrimData from '../data_processig/antrim_all_data.json';
import cavanData from '../data_processig/cavan_all_data.json';
import clareData from '../data_processig/clare_all_data.json';
import corkData from '../data_processig/cork_all_data.json';
import derryData from '../data_processig/derry_all_data.json';
import donegalData from '../data_processig/donegal_all_data.json';
import downData from '../data_processig/down_all_data.json';
import dublinData from '../data_processig/dublin_all_data.json';
import fermanaghData from '../data_processig/fermanagh_all_data.json';
import galwayData from '../data_processig/galway_all_data.json';
import kerryData from '../data_processig/kerry_all_data.json';
import kildareData from '../data_processig/kildare_all_data.json';
import kilkennyData from '../data_processig/kilkenny_all_data.json';
import laoisData from '../data_processig/laois_all_data.json';
import leitrimData from '../data_processig/leitrim_all_data.json';
import limerickData from '../data_processig/limerick_all_data.json';
import longfordData from '../data_processig/longford_all_data.json';
import louthData from '../data_processig/louth_all_data.json';
import mayoData from '../data_processig/mayo_all_data.json';
import meathData from '../data_processig/meath_all_data.json';
import monaghanData from '../data_processig/monaghan_all_data.json';
import offalyData from '../data_processig/offaly_all_data.json';
import roscommonData from '../data_processig/roscommon_all_data.json';
import sligoData from '../data_processig/sligo_all_data.json';
import tipperaryData from '../data_processig/tipperary_all_data.json';
import tyroneData from '../data_processig/tyrone_all_data.json';
import waterfordData from '../data_processig/waterford_all_data.json';
import westmeathData from '../data_processig/westmeath_all_data.json';
import wexfordData from '../data_processig/wexford_all_data.json';
import wicklowData from '../data_processig/wicklow_all_data.json';


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
  climbing_type?: string;
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
        ...(clareData as any),
        ...(corkData as any),
        ...(donegalData as any),
        ...(dublinData as any), 
        ...(galwayData as any),
        ...(kerryData as any),
        ...(kildareData as any),
        ...(kilkennyData as any),
        ...(laoisData as any),
        ...(leitrimData as any),
        ...(limerickData as any),
        ...(longfordData as any),
        ...(louthData as any),
        ...(mayoData as any),
        ...(meathData as any),
        ...(monaghanData as any),
        ...(offalyData as any),
        ...(roscommonData as any),
        ...(sligoData as any),
        ...(tipperaryData as any),
        ...(tyroneData as any),
        ...(waterfordData as any),
        ...(westmeathData as any),
        ...(wexfordData as any),
        ...(wicklowData as any),
        ...(derryData as any),
        ...(downData as any),
        ...(fermanaghData as any),
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
  
  return { allSites, loading, countyOptions, difficultyOptions };
}