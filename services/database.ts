
import * as SQLite from 'expo-sqlite';


const db = SQLite.openDatabaseSync('climbing.db');

export const initDatabase = async (): Promise<void> => {
  try {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS climbing_spots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        difficulty TEXT,
        height TEXT,
        type TEXT,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('数据库初始化成功');
  } catch (error) {
    console.log('数据库初始化失败:', error);
    throw error;
  }
};

export const addClimbingSpot = async (spot: {
  name: string;
  latitude: number;
  longitude: number;
  difficulty?: string;
  height?: string;
  type?: string;
  description?: string;
}): Promise<SQLite.SQLiteRunResult> => {
  try {
    
    const params = [
      spot.name,
      spot.latitude,
      spot.longitude,
      spot.difficulty || null,
      spot.height || null,
      spot.type || null,
      spot.description || null
    ];

    const result = await db.runAsync(
      `INSERT INTO climbing_spots (name, latitude, longitude, difficulty, height, type, description) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      params
    );
    console.log('攀岩点添加成功');
    return result;
  } catch (error) {
    console.log('添加攀岩点失败:', error);
    throw error;
  }
};

export const getAllClimbingSpots = async (): Promise<any[]> => {
  try {
    const result = await db.getAllAsync(
      'SELECT * FROM climbing_spots ORDER BY created_at DESC'
    );
    return result;
  } catch (error) {
    console.log('获取攀岩点失败:', error);
    throw error;
  }
};


export const addSampleData = async (): Promise<void> => {
  const sampleSpots = [
    {
      name: "Beaumont Quarry",
      latitude: 51.8969,
      longitude: -8.4863,
      difficulty: "5.10a",
      height: "52m",
      type: "sport",
      description: "位于科克的经典采石场攀岩点"
    },
    {
      name: "Dalkey Quarry", 
      latitude: 53.2681,
      longitude: -6.1002,
      difficulty: "5.8",
      height: "25m", 
      type: "trad",
      description: "都柏林附近的传统攀岩场地"
    },
    {
      name: "Glendalough",
      latitude: 53.0106,
      longitude: -6.3276, 
      difficulty: "5.9",
      height: "30m",
      type: "sport",
      description: "威克洛山脉的美丽攀岩区域"
    }
  ];

  for (const spot of sampleSpots) {
    await addClimbingSpot(spot);
  }
  console.log('测试数据添加完成');
};


export const hasData = async (): Promise<boolean> => {
  try {
    const spots = await getAllClimbingSpots();
    console.log('当前数据库中有', spots.length, '个点');
    return spots.length > 0;
  } catch (error) {
    console.log('检查数据失败:', error);
    return false;
  }
};


export const clearDuplicateData = async (): Promise<void> => {
  try {
    
    await db.execAsync(`
      DELETE FROM climbing_spots 
      WHERE id NOT IN (
        SELECT MIN(id) 
        FROM climbing_spots 
        GROUP BY name, latitude, longitude
      )
    `);
    console.log('重复数据已清理');
  } catch (error) {
    console.log('清理数据失败:', error);
  }
};