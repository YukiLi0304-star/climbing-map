import requests
import json
import re
import time
from bs4 import BeautifulSoup
import urllib.parse
import numpy as np
from pyproj import Transformer

MANUAL_COORDS = {
    "Dalkey Quarry": {"latitude": 53.272, "longitude": -6.108},
    "Fair Head": {"latitude": 55.216, "longitude": -6.136},
    "Glendalough": {"latitude": 53.012, "longitude": -6.355},
    "Burren": {"latitude": 53.056, "longitude": -9.167},
}

class IrishClimbingRobust:
    def __init__(self):
        self.base_url = "http://wiki.climbing.ie"
        self.api_url = "http://wiki.climbing.ie/api.php"
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        # 难度模式 - 用于识别路线
        self.grade_pattern = r'\b(MS|HS|HVS|VS|VD|HVD|Severe|Diff|VDiff|E[1-9](?:/[1-9])?|[4-6][abc]|M|S|D)\b'

    def get_all_counties_and_sites_via_scraping(self):
        print("通过网页爬取获取郡和攀岩点列表...")
        try:
            response = self.session.get(f"{self.base_url}/index.php?title=Irish_Climbing_Wiki")
            soup = BeautifulSoup(response.content, 'html.parser')
            all_data = {}
            current_county = None

            for element in soup.find_all(['h1', 'h2', 'h3', 'ul', 'p']):
                if element.name in ['h1', 'h2', 'h3']:
                    text = element.get_text().strip()
                    text = re.sub(r'\[edit\]', '', text).strip()
                    if text.startswith('Co. ') and len(text) > 5:
                        current_county = text
                        all_data[current_county] = {'county_info': {'name': current_county}, 'climbing_sites': []}
                        print(f"\n找到郡: {current_county}")

                elif element.name in ['ul', 'p'] and current_county:
                    links = element.find_all('a', href=True)
                    for link in links:
                        text = link.get_text().strip()
                        href = link['href']
                        if self._is_valid_climbing_site(text, href):
                            page_title = self._extract_page_title(href)
                            site_data = {
                                'name': text,
                                'page_title': page_title,
                                'url': f"{self.base_url}{href}" if href.startswith('/') else href
                            }
                            all_data[current_county]['climbing_sites'].append(site_data)
                            print(f"  ✓ {text}")
            return all_data
        except Exception as e:
            print(f"网页爬取失败: {e}")
            return {}

    def get_climbing_routes_from_page(self, page_content):
        routes = []
        if not page_content or 'error' in page_content:
            return routes

        content = page_content.get('content', '')
        if not content:
            return routes

        lines = content.split('\n')
        
        for line in lines:
            original_line = line  # 保存原始行用于检查星号
            line = line.strip()
            if not line:
                continue
            
            # ===== 新增：先提取高度并移除 =====
            height = None
            height_match = re.search(r'(\d+)\s*(?:m|ft)', line)
            if height_match:
                height = int(height_match.group(1))
                # 从行中移除高度部分
                line = line[:height_match.start()].strip() + ' ' + line[height_match.end():].strip()
                line = line.strip()
            # ===== 高度处理结束 =====
            
            # 检查粗体（核心条件）
            has_bold = "'''" in line or "<b>" in line
            if not has_bold:
                continue
            
            # 找难度
            grade_match = re.search(self.grade_pattern, line, re.IGNORECASE)
            if not grade_match:
                continue
            
            # 检查单引号
            start = grade_match.start()
            if start > 0 and line[start-1] == "'":
                continue
            
            # 基础难度
            difficulty = grade_match.group(0)
            
            # 检查后面有没有技术等级
            rest = line[grade_match.end():].strip()
            tech_match = re.search(r'^[3-6][abc]', rest)
            if tech_match:
                difficulty += ' ' + tech_match.group(0)
            
            # 提取名字
            name = line[:grade_match.start()].strip()
            name = re.sub(r"'''", '', name)
            name = re.sub(r'<[^>]+>', ' ', name)
            name = re.sub(r'\s+', ' ', name)
            name = name.strip()
            name = re.sub(r'[()]', '', name)
            name = re.sub(r'\sV', ' ', name)
            #name = re.sub(r'\s+\d+$', '', name).strip()
            #name = re.sub(r'^\d+(?:\.\d+)?\.\s*', '', name).strip()
            name = re.sub(r'\s*\*+\s*', '', name).strip()
            name = re.sub(r'[\s\.]+$', '', name).strip()
            name = re.sub(r'\setres', ' ', name)
            name = re.sub(r'\s*[-–—]\s*$', '', name).strip()
            #name = re.sub(r'^[\s\-–—]*\d+\.?\s*', '', name).strip()
            name = name.replace('&nbsp;', ' ').replace('&amp;', '&')
            name = re.sub(r'^\s*\d+(?:\.\d+)?\.\s*', '', name).strip()
            name = re.sub(r'^\s*\d+(?:\.\d+)?[.:]\s*', '', name).strip()

            
            if len(name) < 2:
                continue
            if len(name) > 50:
                continue

            routes.append({
                'name': name,
                'difficulty': difficulty,
                'height': height,  # 这里放提取到的高度
                'has_star': '*' in original_line,
                'first_ascent': None,
                'description': None
            })
            
            if len(routes) >= 20:
                break
        
        return routes

    def _extract_routes_section(self, full_text: str) -> str:
        """提取路线部分，如果找不到就返回整个文本"""
        if not full_text: 
            return ""
        
        # 尝试找 Routes 或 Climbs 标题
        pattern = r'==+\s*(Routes?|Climbs?)\s*==+'
        m = re.search(pattern, full_text, flags=re.IGNORECASE)
        
        if m:
            start = m.end()
            # 找到下一个标题
            m2 = re.search(r'\n==[^=].*?==', full_text[start:], flags=re.IGNORECASE)
            if m2:
                return full_text[start:start + m2.start()]
            return full_text[start:]
        
        # 如果找不到专门的路线段，返回整个内容
        return full_text

    def get_full_page_content_via_api(self, page_title):
        try:
            clean_title = self._clean_page_title(page_title)
            
            params = {
                'action': 'query', 
                'prop': 'revisions', 
                'titles': clean_title, 
                'rvprop': 'content', 
                'format': 'json'
            }
            response = self.session.get(self.api_url, params=params, timeout=10)
            data = response.json()
            pages = data['query']['pages']
            
            for page_id, page_data in pages.items():
                if 'revisions' in page_data:
                    content = page_data['revisions'][0]['*']
                    
                    # 获取路线部分
                    routes_section = self._extract_routes_section(content)
                    
                    coordinates = self._extract_coordinates_logic(clean_title, content)
                    crag_type = self._determine_crag_type(content)

                    return {
                        'title': clean_title,
                        'content': content,
                        'routes_section': routes_section,
                        'coordinates': coordinates,
                        'crag_type': crag_type
                    }

            return {'error': '页面不存在', 'page_title': clean_title}
            
        except Exception as e:
            print(f"    API请求失败: {str(e)}")
            return {'error': str(e), 'page_title': page_title}

    def collect_county_data(self, county_keyword: str, max_sites: int = None):
        """只收集指定郡的数据"""
        print(f"收集关键字 '{county_keyword}' 的郡的数据...")
        all_structure = self.get_all_counties_and_sites_via_scraping()
        
        selected = {}
        for county, data in all_structure.items():
            if county_keyword.lower() in county.lower():
                selected[county] = data
        
        if not selected:
            print(f"未找到郡: {county_keyword}")
            return {}

        all_complete_data = {}
        for county, county_data in selected.items():
            print(f"\n处理郡: {county}")
            all_complete_data[county] = {'county_info': county_data['county_info'], 'climbing_sites': []}
            
            sites = county_data['climbing_sites']
            if max_sites is not None:
                sites = sites[:max_sites]

            for site in sites:
                print(f"\n  正在处理: {site['name']}")
                page_content = self.get_full_page_content_via_api(site['page_title'])
                
                # 使用修复后的路线解析
                routes = self.get_climbing_routes_from_page(page_content)
                
                crag_types = page_content.get('crag_type', ['Inland', 'Trad'])
                if isinstance(crag_types, list):
                    climbing_type_str = ', '.join(crag_types)
                else:
                    climbing_type_str = crag_types

                site_data = {
                    'name': site['name'], 
                    'page_title': site['page_title'], 
                    'climbing_type': climbing_type_str,
                    'url': site['url'],
                    'routes': routes, 
                    'routes_count': len(routes),
                    'coordinates': page_content.get('coordinates', {'latitude': None, 'longitude': None}),
                }
                all_complete_data[county]['climbing_sites'].append(site_data)
                print(f"   类型: {site_data['climbing_type']} | 路线数: {len(routes)}")
                time.sleep(0.5)  # 减少等待时间
                
        return all_complete_data

    def save_complete_data(self, data, filename='complete_irish_climbing_data.json'):
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"\n完整数据已保存到 {filename}")

    def generate_summary(self, data):
        total_counties = len(data)
        total_sites = 0
        total_routes = 0
        for county, county_data in data.items():
            total_sites += len(county_data['climbing_sites'])
            for site in county_data['climbing_sites']:
                total_routes += len(site['routes'])
        print(f"\n最终数据摘要: 郡 {total_counties} | 站点 {total_sites} | 路线 {total_routes}")

    def add_cluster_info_to_data(self, data):
        """给所有站点添加 cluster_id 和 cluster_name"""
        from sklearn.cluster import DBSCAN, KMeans
        import numpy as np
        
        print("\n开始聚类分析...")
        
        # 1. 收集所有有坐标的站点
        sites_with_coords = []
        coords = []
        
        for county, county_data in data.items():
            for site in county_data['climbing_sites']:
                if site['coordinates'] and site['coordinates'].get('latitude'):
                    # 确保坐标是数值类型
                    lat = site['coordinates']['latitude']
                    lon = site['coordinates']['longitude']
                    if lat and lon and isinstance(lat, (int, float)) and isinstance(lon, (int, float)):
                        sites_with_coords.append({
                            'county': county,
                            'site': site,
                            'lat': lat,
                            'lon': lon
                        })
                        coords.append([lat, lon])
        
        if len(coords) < 3:
            print(f"坐标点太少 ({len(coords)}个)，无法聚类")
            return data
        
        coords = np.array(coords)
        print(f"共有 {len(coords)} 个站点参与聚类")
        
        # 2. 第一步：DBSCAN 过滤噪声点
        # eps: 0.1度 ≈ 11公里，可以根据实际情况调整
        # min_samples: 最少3个点才算一个簇
        print("运行 DBSCAN 过滤噪声点...")
        dbscan = DBSCAN(eps=0.1, min_samples=3)
        db_labels = dbscan.fit_predict(coords)
        
        # 统计 DBSCAN 结果
        unique_labels = set(db_labels)
        n_clusters_db = len([l for l in unique_labels if l != -1])
        n_noise = list(db_labels).count(-1)
        print(f"DBSCAN 发现 {n_clusters_db} 个簇，{n_noise} 个噪声点")
        
        # 标记哪些是噪声点（-1表示噪声）
        is_noise = db_labels == -1
        
        # 3. 第二步：只对非噪声点做 K-Means
        valid_coords = coords[~is_noise]
        valid_indices = [i for i, noise in enumerate(is_noise) if not noise]
        
        if len(valid_coords) < 3:
            print("有效点太少，无法做 K-Means")
            return data
        
        # 确定 K 值（根据有效点数量自动确定）
        n_clusters = min(5, len(valid_coords) // 5 + 2)
        print(f"K-Means 聚类数: {n_clusters}")
        
        kmeans = KMeans(n_clusters=n_clusters, random_state=42)
        kmeans_labels = kmeans.fit_predict(valid_coords)
        
        # 4. 把聚类结果映射回所有站点
        for i, idx in enumerate(valid_indices):
            cluster_id = int(kmeans_labels[i])
            sites_with_coords[idx]['cluster_id'] = cluster_id
        
        # 噪声点单独标记
        for i, noise in enumerate(is_noise):
            if noise:
                sites_with_coords[i]['cluster_id'] = -1
        
        # 5. 生成簇名称（根据坐标中心点）
        cluster_centers = kmeans.cluster_centers_
        cluster_names = {}
        
        # 简单的命名逻辑（可以根据实际位置手动调整）
        for cluster_id in range(n_clusters):
            center_lat = cluster_centers[cluster_id][0]
            center_lon = cluster_centers[cluster_id][1]
            
            # 根据经纬度大致判断区域
            if center_lat > 54.5:
                region = "Northern"
            elif center_lat < 53.0:
                region = "Southern"
            else:
                region = "Central"
            
            if center_lon < -8.5:
                region = "Western " + region
            elif center_lon > -6.5:
                region = "Eastern " + region
            
            cluster_names[cluster_id] = f"{region} Hotspot {cluster_id + 1}"
        
        # 6. 把 cluster_id 和 cluster_name 写回原始数据
        for item in sites_with_coords:
            county = item['county']
            site = item['site']
            cluster_id = item.get('cluster_id', -1)
            
            site['cluster_id'] = cluster_id
            if cluster_id >= 0:
                site['cluster_name'] = cluster_names[cluster_id]
            else:
                site['cluster_name'] = 'Isolated'
        
        # 打印聚类统计
        print("\n聚类结果统计:")
        for cluster_id in range(n_clusters):
            count = sum(1 for item in sites_with_coords if item.get('cluster_id') == cluster_id)
            print(f"  {cluster_names[cluster_id]}: {count} 个站点")
        noise_count = sum(1 for item in sites_with_coords if item.get('cluster_id') == -1)
        print(f"  孤立点: {noise_count} 个站点")
        
        return data

    # 以下是原有的辅助方法，保持不变
    def _clean_page_title(self, page_title):
        cleaned = urllib.parse.unquote(page_title)
        cleaned = cleaned.replace('%27', "'").replace('%28', '(').replace('%29', ')')
        return cleaned

    def _is_valid_climbing_site(self, text, href):
        if not text or len(text) < 3: 
            return False
        exclude_texts = ['edit', 'search', 'category', 'file', 'template', 'user', 
                        'special', 'talk', 'main page', 'discussion', 'create account', 
                        'log in', 'navigation', 'page', 'read', 'view source', 'history']
        text_lower = text.lower()
        if any(exclude in text_lower for exclude in exclude_texts): 
            return False
        if not href.startswith('/index.php?title='): 
            return False
        if text.startswith('Co. '): 
            return False
        return True

    def _extract_page_title(self, href):
        if 'title=' in href: 
            return href.split('title=')[1].split('&')[0]
        return href.replace('/', '')

    def _determine_crag_type(self, wikitext):
        text_lower = wikitext.lower()
        location = 'Inland'
        
        if any(word in text_lower for word in ['sea cliff', 'sea-cliff', 'tidal', 'coastal', 'cliff']):
            location = 'Sea Cliff'
        elif any(word in text_lower for word in ['quarry', 'quarries']):
            location = 'Quarry'
        elif any(word in text_lower for word in ['mountain', 'hill', 'alpine', 'slieve']):
            location = 'Mountain'

        style = 'Trad'
        if any(word in text_lower for word in ['sport', 'bolt', 'bolted', 'clip']):
            style = 'Sport'
        elif any(word in text_lower for word in ['boulder', 'problem']):
            style = 'Boulder'
        
        return [location, style]

    def _extract_coordinates_logic(self, title, wikitext):
        """分层次坐标提取"""
        print(f"\n      获取坐标: {title}")
        
        # 1. 手动坐标
        if title in MANUAL_COORDS:
            print(f"      ✓ 使用手动坐标")
            coords = MANUAL_COORDS[title].copy()
            coords["source"] = "manual"
            return coords
        
        # 2. Wiki坐标模板
        try:
            coord_pattern = r"\{\{[Cc]oord\|([0-9\.]+)\|([0-9\.\-]+)\}\}"
            match = re.search(coord_pattern, wikitext, re.IGNORECASE)
            if match:
                coords = {
                    "latitude": float(match.group(1)),
                    "longitude": float(match.group(2)),
                    "source": "wiki_template"
                }
                print(f"      ✓ 从Wiki模板获取坐标")
                return coords
        except:
            pass

        # 4. Grid Ref
        print(f"      → 尝试Grid Ref...")
        grid_coords = self.extract_grid_ref_coords(wikitext)
        if grid_coords:
            print(f"      ✓ Grid Ref找到坐标")
            return grid_coords
        
        # 3. OSM搜索
        print(f"      → 尝试OSM搜索...")
        osm_coords = self._fetch_coords_from_osm(title)
        if osm_coords:
            osm_coords["source"] = "osm_search"
            print(f"      ✓ OSM找到坐标")
            return osm_coords
        
        
        # 5. 备用坐标
        print(f"      → 使用备用坐标")
        return {
            "latitude": 54.864, 
            "longitude": -6.268,
            "source": "backup",
            "estimated": True
        }

    def _fetch_coords_from_osm(self, query):
        """从OpenStreetMap获取坐标"""
        print(f"      _fetch_coords_from_osm 被调用, query={query}")
        try:
            clean_query = query.replace('_', ' ').strip()
            # 用 + 代替空格，和浏览器一致
            clean_query = clean_query.replace(' ', '+')
            
            url = "https://nominatim.openstreetmap.org/search"
            params = {
                'q': f"{clean_query},+Ireland",
                'format': 'json',
                'limit': 1
            }
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            
            time.sleep(1.5)
            response = requests.get(url, params=params, headers=headers, timeout=10)
            
            print(f"      OSM状态码: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"      OSM返回 {len(data)} 个结果")
                if data:
                    return {
                        "latitude": float(data[0]['lat']),
                        "longitude": float(data[0]['lon'])
                    }
                else:
                    print(f"      OSM无结果")
            else:
                print(f"      OSM状态码错误: {response.status_code}")
                
        except Exception as e:
            print(f"      OSM错误: {e}")
        
        return None
    def _extract_grid_ref(self, text):
        """提取Grid Ref字符串"""
        print(f"        [提取Grid Ref] 文本长度: {len(text)}")
        
        if not text:
            print(f"        [提取Grid Ref] 文本为空")
            return None
        
        patterns = [
            r'Grid\s*Ref\.?\s*:?\s*([A-Z]{1,2}\s*\d{6})',
            r'Grid\s*Reference\.?\s*:?\s*([A-Z]{1,2}\s*\d{6})',
            r'OS\s*Grid\s*Ref\.?\s*:?\s*([A-Z]{1,2}\s*\d{6})',
            r'OS\s*Grid\s*Reference\.?\s*:?\s*([A-Z]{1,2}\s*\d{6})',
            r'([A-Z]{1,2}\s*\d{6})\s*\(OS\s*Grid\)',
            r'([A-Z]{1,2}\s*\d{3}\s*\d{3})',
            r'([A-Z]{1,2}\s*\d{5,6})',
            r'Grid\s*Ref\.?\s*:?\s*(\d{6})'
        ]
        
        for i, pattern in enumerate(patterns):
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                grid_ref = match.group(1).replace(' ', '').strip()
                if len(grid_ref) >= 6:
                    print(f"        [提取Grid Ref] ✓ 模式{i+1}匹配成功: {grid_ref}")
                    return grid_ref.upper()
        
        print(f"        [提取Grid Ref] ✗ 所有模式都未匹配")
        return None
    
    def _convert_gridref(self, grid_ref, county_name=""):
        """转换Grid Ref为经纬度（简化版）"""
        try:
            # 新增：去掉开头的字母（如 "GR"），只保留数字
            if grid_ref.upper().startswith('GR'):
                grid_ref = re.sub(r'^GR\s*', '', grid_ref, flags=re.IGNORECASE)
                print(f"      去掉GR前缀: {grid_ref}")
            # 如果是纯数字，直接跳过（不处理）
            if grid_ref.isdigit() and len(grid_ref) == 6:
                print(f"      纯数字网格参考，无法推断前缀: {grid_ref}")
                return None
            # 先尝试在线API转换
            api_coords = self._convert_gridref_via_api(grid_ref)
            if api_coords:
                return api_coords
            
            # 如果API失败，尝试本地转换
            return self._convert_gridref_locally(grid_ref)
            
        except Exception as e:
            print(f"      转换错误: {e}")
            return None

    def _convert_gridref_via_api(self, grid_ref):
        """使用在线API转换Grid Ref"""
        try:
            # 方案1：gridreferencefinder.com
            url = "https://irish.gridreferencefinder.com"
            params = {'gridref': grid_ref}
            headers = {'User-Agent': 'Mozilla/5.0'}
            
            print(f"      调用在线API转换: {grid_ref}")
            response = requests.get(url, params=params, headers=headers, timeout=10)
            
            if response.status_code == 200:
                text = response.text
                lat_match = re.search(r'Latitude[:\s]*([\d\.\-]+)', text, re.IGNORECASE)
                lon_match = re.search(r'Longitude[:\s]*([\d\.\-]+)', text, re.IGNORECASE)
                
                if lat_match and lon_match:
                    lat = float(lat_match.group(1))
                    lon = float(lon_match.group(1))
                    print("API转换成功: ")
                    return {"latitude": lat, "longitude": lon}
                        
        except Exception as e:
            print(f"      API转换失败: {e}")
        
        return None

    def _convert_gridref_locally(self, grid_ref):
        """本地转换Grid Ref（使用 pyproj 精确转换）"""
        print(f"      执行本地转换: {grid_ref}")
        try:
            # 清理网格参考
            grid_ref = grid_ref.upper().replace(' ', '')
            
            if len(grid_ref) != 7:
                print(f"      网格格式错误: {grid_ref}")
                return None
            
            letter = grid_ref[0]
            numbers = grid_ref[1:]
            
            # 爱尔兰网格基准坐标（100km方格）
            grid_bases = {
                'A': (000000, 400000), 'B': (100000, 400000), 'C': (200000, 400000),
                'D': (300000, 400000), 'E': (400000, 400000), 'F': (000000, 300000),
                'G': (100000, 300000), 'H': (200000, 300000), 'J': (300000, 300000),
                'K': (400000, 300000), 'L': (000000, 200000), 'M': (100000, 200000),
                'N': (200000, 200000), 'O': (300000, 200000), 'P': (400000, 200000),
                'Q': (000000, 100000), 'R': (100000, 100000), 'S': (200000, 100000),
                'T': (300000, 100000), 'U': (400000, 100000), 'V': (000000, 000000),
                'W': (100000, 000000), 'X': (200000, 000000), 'Y': (300000, 000000),
                'Z': (400000, 000000)
            }
            
            if letter not in grid_bases:
                print(f"      不支持的网格前缀: {letter}")
                return None
            
            base_easting, base_northing = grid_bases[letter]
            
            # 提取东距和北距（6位数字：前3后3）
            easting_hm = int(numbers[:3])
            northing_hm = int(numbers[3:])

            # 爱尔兰网格有 300000 米的假东距和假北距偏移
            easting = base_easting + easting_hm * 100
            northing = base_northing + northing_hm * 100
            
            # ========== 使用 pyproj 精确转换 ==========
            # 创建转换器：爱尔兰网格 (EPSG:29903) → WGS84 (EPSG:4326)
            transformer = Transformer.from_crs(29903, 4326, always_xy=True)
            
            # 执行转换（pyproj 返回 (经度, 纬度)）
            longitude, latitude = transformer.transform(easting, northing)
            
            return {
                "latitude": round(latitude, 6),
                "longitude": round(longitude, 6)
            }
                    
        except Exception as e:
            print(f"      本地转换失败: {e}")
            return None

    def extract_grid_ref_coords(self, wikitext):
        """从wiki文本中提取Grid Ref并转换为坐标"""
        print(f"      [Grid Ref] 开始提取...")
        
        if not wikitext:
            print(f"      [Grid Ref] wikitext为空")
            return None
        
        # 1. 提取Grid Ref字符串
        grid_ref = self._extract_grid_ref(wikitext)
        
        if not grid_ref:
            print(f"      [Grid Ref] 未找到Grid Ref字符串")
            return None
        
        print(f"      [Grid Ref] 找到Grid Ref: {grid_ref}")
        
        # 2. 转换为坐标
        coords = self._convert_gridref(grid_ref, county_name="test_county")
        if coords:
            print(f"      [Grid Ref] 转换成功: {coords}")
            coords["source"] = "grid_reference"
            return coords
        else:
            print(f"      [Grid Ref] 转换失败")
            return None

if __name__ == "__main__":
    collector = IrishClimbingRobust()
    
    # 测试 Waterford 郡
    test_county = "Waterford"
    
    print(f"\n开始测试郡: {test_county}")
    print("=" * 50)
    
    county_data = collector.collect_county_data(test_county, max_sites=None)
    
    if county_data:
        # 添加聚类信息
        #county_data = collector.add_cluster_info_to_data(county_data)
        filename = f'test_{test_county.lower()}_data2.json'
        collector.save_complete_data(county_data, filename)
        
        # 打印前几个站点的路线
        for county_name, county_info in county_data.items():
            print(f"\n{county_name} 的攀岩点:")
            for i, site in enumerate(county_info['climbing_sites'][:5]):  # 只显示前5个
                print(f"\n  {i+1}. {site['name']}")
                print(f"     类型: {site['climbing_type']}")
                print(f"     路线数: {site['routes_count']}")
                # 显示前3条路线
                for j, route in enumerate(site['routes'][:3]):
                    print(f"        - {route['name'][:60]}...")
        
        collector.generate_summary(county_data)
    else:
        print(f"未找到 {test_county} 郡的数据")