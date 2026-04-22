from pyproj import Transformer
import requests
import json
import re
import time
from bs4 import BeautifulSoup
import urllib.parse

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

    def _extract_routes_section(self, full_text: str) -> str:
        if not full_text: return ""
        pattern = r'==+\s*(Routes?|Climbs?)\s*==+'
        m = re.search(pattern, full_text, flags=re.IGNORECASE)
        if not m: return full_text
        start = m.end()
        m2 = re.search(r'\n==[^=].*?==', full_text[start:], flags=re.IGNORECASE)
        if m2: return full_text[start:start + m2.start()]
        return full_text[start:]

    def _wikitext_to_plain(self, text: str) -> str:
        if not text:
            return ""

        text = re.sub(r'', '', text, flags=re.DOTALL)
        text = re.sub(r'\{\{.*?\}\}', '', text, flags=re.DOTALL)

        text = re.sub(r'<(?:br|p|div)\s*/?>', '\n', text, flags=re.IGNORECASE)
        text = re.sub(r'</(?:p|div)>', '\n', text, flags=re.IGNORECASE)
        
        text = re.sub(r'</?(?:b|strong|i|em|span)[^>]*>', ' ', text, flags=re.IGNORECASE)

        text = re.sub(r'\[\[(?:[^|\]]*\|)?([^\]]+)\]\]', r'\1', text)
        
        text = re.sub(r'\[(?:https?://[^\s]+)\s+([^\]]+)\]', r'\1', text)

        text = re.sub(r"''+", '', text)

        text = re.sub(r'[ \t]+', ' ', text)
        text = re.sub(r'\n\s*\n+', '\n', text)

        return text.strip()


    def clean_route_name(self, name: str) -> str:
        if not name: return ""
        name = re.sub(r'^\s*\d+[a-zA-Z]?\.?\s*', '', name)
        cleaned = re.sub(r'[\*\#\|\-]+', ' ', name)
        cleaned = re.sub(r'\s+', ' ', cleaned)
        cleaned = cleaned.strip(' \t\n\r\"\'')
        return cleaned

    def _looks_like_grade(self, difficulty: str) -> bool:
        if not difficulty: return False
        d = difficulty.strip()
        uk_trad_grades = {"M", "MS","D", "VD", "Diff", "VDiff", "HVD", "S", "HS", "VS", "HVS", "E1", "E2", "E3", "E4", "E5", "E6", "E7", "E8", "E9"}
        if d in uk_trad_grades: return True
        if re.fullmatch(r"E[1-9](/[1-9])?", d): return True
        if re.fullmatch(r"[3-9][abc][+-]?", d.lower()): return True
        if re.fullmatch(r"[3-9][ABCD][+-]?", d): return True
        return False

    def _parse_route_line(self, line: str):
        print(f"尝试解析: {line[:100]}...")
        import re
        
        # 过滤分段路线
        if re.match(r'^\s*\([ivx]+\)', line.lower()):
            return None
        
        if re.match(r'^\s*[ivx]+\.', line.lower()):
            return None
        
        if not line:
            return None
        
        if len(line) > 400:
            return None

        original_line = line
        
        is_bold = "'''" in line or line.startswith('*')
        
        if not is_bold:
            print(f"不是粗体，跳过")
            return None
        
        line = line.replace("'''", '').strip()
        line = re.sub(r'^\*+', '', line).strip()

        height_match = re.search(r'(\d+)\s*m', line, re.IGNORECASE)
        height = int(height_match.group(1)) if height_match else None

        # ===== 难度匹配 =====
        has_grade = False
        grade = None  # 先定义 grade
        grade_patterns = ['E1','E2','E3','E4','E5','E6','E7','HVS','VS','HS','S','VD','Diff','V.Diff', 'S.', 'M.S.','H.S.','M']
        
        for g in grade_patterns:
            if re.search(r'\b' + re.escape(g) + r'\b', line.upper()):
                print(f"  匹配到难度: {g}")
                has_grade = True
                grade = g
                break
        
        if not has_grade:
            print("  没有匹配到任何难度")
            tech_grade_match = re.search(r'\b[0-9][abc][, ]', line.lower())
            if tech_grade_match:
                has_grade = True
                # 这里也需要重新找 grade
                for g in grade_patterns:
                    if g in line.upper():
                        grade = g
                        break
        
        if not has_grade or grade is None:
            print("没有匹配到任何难度，返回 None")
            return None
        
        height = int(height_match.group(1))
        
        # 提取名字
        name_parts = line.split()
        name_words = []
        for word in name_parts:
            if re.match(r'\d+m', word, re.IGNORECASE):
                break
            if word in grade_patterns:
                break
            name_words.append(word)

        name = ' '.join(name_words)
        
        # 清理名字
        name = re.sub(r'\d+\s*m', '', name)
        name = re.sub(r'[\[\]\*\|\(\)]', '', name)
        name = re.sub(r'[–—-]', ' ', name)
        name = re.sub(r'<br\s*/?>', ' ', name)
        name = re.sub(r'\s+', ' ', name).strip()
        name = re.sub(r'^\s*\d+(?:\.\d+)?\.\s*', '', name).strip()
        name = re.sub(r'^\s*\d+(?:\.\d+)?[.:]\s*', '', name).strip()
        name = re.sub(r'^\d+\s+', '', name).strip() 
        

        # 名字长度限制
        if len(name) > 40:
            print(f"  名字太长 ({len(name)}字符)，跳过")
            return None
        
        if f"'''{name}'''" not in original_line and f"*{name}" not in original_line:
            print(f"  名字 '{name}' 不是粗体，跳过")
            return None
        
        if name.isdigit():
            print(f"  名字是纯数字 '{name}'，忽略此路线")
            return None
        
        print(f"  ✓ 返回名字: '{name}' (长度{len(name)})")
        
        name_words_count = len(name.split())
        if name_words_count > 10:
            print(f"名字单词太多 ({name_words_count}个)，跳过")
            return None
        
        has_star = '*' in original_line
        
        return {
            'name': name,
            'height': height,
            'difficulty': grade,
            'has_star': has_star,
            'raw_line': original_line
        }
    
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

    def _guess_county_from_query(self, query):
        """从查询中猜测郡名"""
        # 常见的爱尔兰郡
        counties = ["Antrim", "Dublin", "Wicklow", "Cork", "Clare", "Galway", "Kerry", "Donegal"]
        
        query_lower = query.lower()
        
        # 检查查询中是否包含郡名
        for county in counties:
            if county.lower() in query_lower:
                return county
        
        # 默认返回Antrim（因为大部分测试是Antrim）
        return "Antrim"

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
        
    def extract_grid_ref_coords(self, wikitext):
        """从wiki文本中提取Grid Ref并转换为坐标"""
        print(f"      [Grid Ref] 开始提取...")
        
        if not wikitext:
            print(f"      [Grid Ref] wikitext为空")
            return None
        
        # 1. 提取Grid Ref字符串
        print(f"      [Grid Ref] 调用_extract_grid_ref...")
        grid_ref = self._extract_grid_ref(wikitext)
        
        if not grid_ref:
            print(f"      [Grid Ref] 未找到Grid Ref字符串")
            # 调试：显示wikitext的前200字符，看看里面有什么
            print(f"      [Grid Ref] wikitext预览: '{wikitext[:200]}'")
            return None
        
        print(f"      [Grid Ref] 找到Grid Ref: {grid_ref}")
        
        # 2. 转换为坐标
        print(f"      [Grid Ref] 调用_convert_gridref...")
        coords = self._convert_gridref(grid_ref)
        if coords:
            print(f"      [Grid Ref] 转换成功: {coords}")
            coords["source"] = "grid_reference"
            return coords
        else:
            print(f"      [Grid Ref] 转换失败")
            return None

    def _extract_grid_ref(self, text):
        """提取Grid Ref字符串"""
        print(f"        [提取Grid Ref] 文本长度: {len(text)}")
        
        if not text:
            print(f"        [提取Grid Ref] 文本为空")
            return None
        
        # 先显示文本开头，看看有什么
        preview = text[:200].replace('\n', ' ').replace('\r', ' ')
        print(f"        [提取Grid Ref] 文本预览: '{preview}...'")
        
        patterns = [
            r'Grid\s*Ref\.?\s*:?\s*([A-Z]{1,2}\s*\d{6})',
            r'Grid\s*Reference\.?\s*:?\s*([A-Z]{1,2}\s*\d{6})',
            r'OS\s*Grid\s*Ref\.?\s*:?\s*([A-Z]{1,2}\s*\d{6})',
            r'OS\s*Grid\s*Reference\.?\s*:?\s*([A-Z]{1,2}\s*\d{6})',
            r'([A-Z]{1,2}\s*\d{6})\s*\(OS\s*Grid\)',
            r'([A-Z]{1,2}\s*\d{3}\s*\d{3})',
            r'([A-Z]{1,2}\s*\d{5,6})',
        ]
        
        for i, pattern in enumerate(patterns):
            print(f"        [提取Grid Ref] 尝试模式{i+1}: {pattern[:30]}...")
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                grid_ref = match.group(1).replace(' ', '').strip()
                if len(grid_ref) >= 6:  # 基本验证
                    print(f"        [提取Grid Ref] ✓ 模式{i+1}匹配成功: {grid_ref}")
                    return grid_ref.upper()
            else:
                print(f"        [提取Grid Ref] ✗ 模式{i+1}未匹配")
        
        print(f"        [提取Grid Ref] ✗ 所有模式都未匹配")
        return None

    def _convert_gridref(self, grid_ref):
        """转换Grid Ref为经纬度（简化版）"""
        try:
            # 先尝试在线API转换
            api_coords = self._convert_gridref_via_api(grid_ref)
            if api_coords:
                return api_coords
            
            # 如果API失败，尝试本地转换（针对北爱尔兰的H/I网格）
            return self._convert_gridref_locally(grid_ref)
            
        except Exception as e:
            print(f"      转换错误: {e}")
            return None

    def _convert_gridref_via_api(self, grid_ref):
        """使用在线API转换Grid Ref"""
        try:
            # 尝试gridreferencefinder.com
            url = "https://gridreferencefinder.com/gridRefAjax.php"
            params = {'gridref': grid_ref}
            headers = {'User-Agent': 'Mozilla/5.0'}
            
            print(f"      调用在线API转换: {grid_ref}")
            response = requests.get(url, params=params, headers=headers, timeout=10)
            
            if response.status_code == 200:
                text = response.text
                
                # 解析API响应
                lat_match = re.search(r'Latitude[:\s]*([\d\.\-]+)', text, re.IGNORECASE)
                lon_match = re.search(r'Longitude[:\s]*([\d\.\-]+)', text, re.IGNORECASE)
                
                if lat_match and lon_match:
                    lat = float(lat_match.group(1))
                    lon = float(lon_match.group(1))
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

    #def _extract_coordinates_logic(self, title, wikitext):
        if title in MANUAL_COORDS:
            return MANUAL_COORDS[title]

        try:
            coord_pattern = r"\{\{[Cc]oord\|([0-9\.]+)\|([0-9\.\-]+)\}\}"
            match = re.search(coord_pattern, wikitext, re.IGNORECASE)
            if match:
                return {"latitude": float(match.group(1)), "longitude": float(match.group(2))}
        except:
            pass

        print(f"      尝试去 OSM 搜索: {title} ...")
        osm_coords = self._fetch_coords_from_osm(title)
        if osm_coords:
            return osm_coords

        return {"latitude": None, "longitude": None}
    
    def _extract_coordinates_logic(self, title, wikitext):
        """分层次坐标提取"""
        print(f"\n      获取坐标: {title}")
        
        # 1. 手动坐标（最高优先级）
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
        except Exception as e:
            print(f"      Wiki模板提取错误: {e}")
            pass
        
        # 先检查wikitext是否有效
        if not wikitext:
            print(f"      ✗ wikitext为空，无法提取Grid Ref")
        elif len(wikitext) < 10:
            print(f"      ✗ wikitext太短({len(wikitext)}字符)，可能有问题")
        else:
            print(f"      wikitext长度: {len(wikitext)}字符")
        
        grid_coords = self.extract_grid_ref_coords(wikitext)
        if grid_coords:
            print(f"      ✓ Grid Ref找到坐标")
            return grid_coords
        else:
            print(f"      ✗ Grid Ref未找到坐标")

        # 3. 先尝试OSM搜索（第一层）
        print(f"      → 尝试OSM搜索...")
        osm_coords = self._fetch_coords_from_osm(title)
        if osm_coords:
            osm_coords["source"] = "osm_search"
            print(f"      ✓ OSM找到坐标")
            return osm_coords
        else:
            print(f"      ✗ OSM未找到坐标")
        
        # 5. 所有方法都失败，使用备用坐标
        print(f"      → 所有方法失败，使用备用坐标")
        return {
            "latitude": 54.864, 
            "longitude": -6.268,
            "source": "backup",
            "estimated": True
        }

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
                    
                    routes_section = self._extract_routes_section(content)
                    
                    # 不要转换成 plain_text，保留原始内容！
                    # plain_routes_text = self._wikitext_to_plain(routes_section)
                    
                    coordinates = self._extract_coordinates_logic(clean_title, content)
                    crag_type = self._determine_crag_type(content)

                    return {
                        'title': clean_title,
                        'content': content,
                        'routes_section': routes_section,  # 新增：原始路线部分
                        'coordinates': coordinates,
                        'crag_type': crag_type
                    }

            return {'error': '页面不存在', 'page_title': clean_title}
            
        except Exception as e:
            print(f"    API请求失败: {str(e)}")
            return {'error': str(e), 'page_title': page_title}


    def get_climbing_routes_from_page(self, page_content):
        routes = []
        print("DEBUG: 开始解析页面")
        if not page_content or 'error' in page_content: 
            return routes

        routes_section = page_content.get('routes_section', '') or ''
        if not routes_section:
            return routes

        lines = routes_section.split('\n')
        i = 0
        while i < len(lines):
            line = lines[i].strip()
            i += 1
            
            is_bold = "'''" in line or line.startswith('*')
            has_height = re.search(r'\d+\s*m', line, re.IGNORECASE) is not None
            has_grade = any(g in line.upper() for g in ['E1','E2','HVS','VS','HS','S','VD','M'])

            if (is_bold and has_height and has_grade) or ('<b>' in line and has_grade):
                route_block = [line]
                while i < len(lines):
                    next_line = lines[i].strip()
                    next_is_bold = "'''" in next_line or next_line.startswith('*') or '<b>' in next_line
                    next_has_height = re.search(r'\d+\s*m', next_line, re.IGNORECASE) is not None
                    if next_is_bold and next_has_height:
                        break
                    if next_line:  # 只添加非空行
                        route_block.append(next_line)
                    i += 1

                # 解析核心信息
                parsed_core = self._parse_route_line(route_block[0])
                if parsed_core is None:
                    continue
                if len(parsed_core['name']) > 40:
                    continue

                # 创建路线对象
                route_data = {
                    'name': parsed_core['name'],
                    'height': parsed_core['height'],
                    'difficulty': parsed_core['difficulty'],
                    'has_star': parsed_core.get('has_star', False),
                    'sub_routes': [],
                    'first_ascent': None,
                    'description': None
                }

                # 调用新逻辑处理详情
                #self.enrich_route_data(route_data, page_content.get('content', ''), parsed_core['name'])
                routes.append(route_data)
                if len(routes) >= 20:
                    break

        return routes

    def enrich_route_data(self, route_data, content, route_name):
        """根据你的逻辑解析路线详情"""
        import re
        print(f"\n处理路线: {route_name}")
        if not content or not route_name:
            return
        
        # 在 content 中找到包含 route_name 的那一行
        lines = content.split('\n')
        target_line = None
        for line in lines:
            # 移除 wiki 标记后检查是否包含路线名
            line_clean = re.sub(r"''+", '', line)
            line_clean = re.sub(r'[\[\]\*\|]', '', line_clean)
            if route_name in line_clean:
                target_line = line
                break
        
        if not target_line:
            print(" 没找到对应行")
            return
        
        # 用 <br/> 分割
        parts = re.split(r'<br\s*/?>', target_line)
        print(f"  分割后得到 {len(parts)} 个部分:")
        
        # 第一部分：路线名（已经包含高度和难度）
        if len(parts) == 1 and '\n' in target_line:
            parts = target_line.split('\n')
            # 清理 wiki 标记
            name_part = re.sub(r"''+", '', name_part)
            name_part = re.sub(r'[\[\]\*\|]', '', name_part)
            name_part = re.sub(r'\s+', ' ', name_part).strip()
            route_data['name'] = name_part
        
        # 处理第二部分（可能是首攀）
        start_idx = 1
        if len(parts) >= 2:
            second_part = parts[1].strip()
            second_part = re.sub(r"''+", '', second_part)
            
            # 判断是否是人名（包含大写字母+年份）
            if re.search(r'[A-Z][a-z]+.*\d{4}', second_part):
                route_data['first_ascent'] = second_part
                start_idx = 2  # 描述从第三部分开始
            else:
                # 新逻辑：如果第二部分没有年份，可能首攀和描述混在一起了
                # 尝试从第二部分提取日期之前的内容作为首攀
                # 匹配完整的"人名 + 日期"作为首攀信息
                date_match = re.search(r'([A-Z][a-z]+(?:\.?\s+[A-Z]?[a-z]+)*(?:\s*\([^)]+\))?[,.]?\s*\d{1,2}/\d{1,2}/\d{2,4}|\d{4}|[A-Z][a-z]+\s+\d{4})', second_part)
                if date_match:
                    # 把整个匹配到的内容（人名+日期）作为 first_ascent
                    route_data['first_ascent'] = date_match.group(0).strip()
                    # 剩下的才是描述
                    remaining = second_part[date_match.end():].strip()
                    if remaining:
                        if len(parts) > 2:
                            parts[2] = remaining + ' ' + parts[2]
                        else:
                            parts.append(remaining)
                    start_idx = 2
                    if remaining:
                    # 把剩余部分加到描述里
                        if len(parts) > 2:
                            parts[2] = remaining + ' ' + parts[2]
                        else:
                            parts.append(remaining)
                    start_idx = 2
                else:
                    # 如果还是没匹配到，就把整个第二部分当作描述
                    start_idx = 1
        
        # 剩下的都是描述
        if len(parts) > start_idx:
            desc_parts = []
            for p in parts[start_idx:]:
                clean_p = re.sub(r"''+", '', p.strip())
                if clean_p:
                    desc_parts.append(clean_p)
            route_data['description'] = ' '.join(desc_parts)
        
    def _extract_first_ascent(self, text):
        """多种格式提取首攀信息"""
        patterns = [
            r'([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:,\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)*\.?\s*(?:\d{1,2}/\d{1,2}/)?\d{4}\.?)\b',
            r'([A-Z]\s+[A-Z][a-z]+(?:,\s*[A-Z]\s+[A-Z][a-z]+)*\.\s*(?:\d{1,2}/)?\d{4}\.?)\b',
            r'(?:FA[:\s]+)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:,\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)*\s+(?:\d{1,2}/\d{1,2}/)?\d{4})',
            r'(?:First\s+ascent[:\s]+)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:,\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)*[^.]+\d{4}\.?)\b',
            r'([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*[^.]+\d{4})\.',
        ]
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
            if match:
                fa_text = match.group(1).strip()
                fa_text = re.sub(r'\s+', ' ', fa_text)
                return fa_text
        
        return None

    def _extract_sub_routes(self, text):
        """提取分段信息"""
        sub_routes = []
        
        patterns = [
            r'(\d+)\)\s*(\d+)m\.?\s*(.*?)(?=\s*\d+\)\s*\d+m|$)',
            r'(\d+)/\s*(\d+)m\.?\s*(.*?)(?=\s*\d+/\s*\d+m|$)',
            r'Pitch\s*(\d+)[:\-]\s*(\d+)m\.?\s*(.*?)(?=\s*Pitch\s*\d+[:\-]|$)',
        ]
        
        for pattern in patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE | re.DOTALL)
            for match in matches:
                pitch_num = int(match.group(1))
                height = int(match.group(2))
                description = match.group(3).strip()
                
                description = re.sub(r'\s+', ' ', description)
                
                technical_grade = None
                grade_match = re.search(r'\b([A-Z][0-9]?[a-z]?[+-]?|[0-9][abc][+-]?)\b', description)
                if grade_match:
                    technical_grade = grade_match.group(1)
                
                sub_route = {
                    'pitch_number': pitch_num,
                    'height': height,
                    'description': description[:200],
                    'technical_grade': technical_grade
                }
                sub_routes.append(sub_route)
        
        return sub_routes

    def _extract_description(self, text, first_ascent, sub_routes):
        cleaned_text = text
        
        if first_ascent:
            cleaned_text = re.sub(re.escape(first_ascent), '', cleaned_text, flags=re.IGNORECASE)
        
        if sub_routes:
            for sub in sub_routes:
                pattern = rf"{sub['pitch_number']}\)\s*{sub['height']}m\.?\s*{re.escape(sub['description'][:50])}"
                cleaned_text = re.sub(pattern, '', cleaned_text, flags=re.DOTALL)
        
        lines = cleaned_text.split('\n')
        
        meaningful_lines = []
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            if re.match(r'^\d+[\)/]', line):
                continue
            if re.search(r'^\d+m\s+[A-Z]', line):
                continue
            if len(line) < 10:
                continue
            if re.search(r'[12]\d{3}\b', line) and re.search(r'[A-Z][a-z]+,', line):
                continue
            
            meaningful_lines.append(line)
        
        if meaningful_lines:
            description = ' '.join(meaningful_lines)
            description = re.sub(r'\s+', ' ', description).strip()
            
            description = re.sub(r'\s*\*\*.*$', '', description)
            description = re.sub(r'\s*\[\[.*$', '', description)
            
            return description if len(description) > 15 else None
        
        return None

    def parse_pitch_line(self, route_data, line):
        """辅助方法：解析单个分段行"""
        pitch_match = re.match(r'(\d+)[)/]\.?\s*(\d+)m\.?\s*(.*)', line)
        if pitch_match:
            sub_route = {
                'pitch_number': int(pitch_match.group(1)), 
                'height': int(pitch_match.group(2)), 
                'description': self.clean_text(pitch_match.group(3))
            }
            grade_match = re.search(r'\b([A-Z][0-9]?[a-z]?[+-]?|[0-9][abc][+-]?)\b', sub_route['description'])
            if grade_match:
                sub_route['technical_grade'] = grade_match.group(1)
            
            route_data['sub_routes'].append(sub_route)
            return True
        return False

    def clean_text(self, text):
        if not text: return ""
        cleaned = re.sub(r'\s+', ' ', text)
        return cleaned.strip()

    def _clean_page_title(self, page_title):
        cleaned = urllib.parse.unquote(page_title)
        cleaned = cleaned.replace('%27', "'").replace('%28', '(').replace('%29', ')')
        return cleaned

    def _is_valid_climbing_site(self, text, href):
        if not text or len(text) < 3: return False
        exclude_texts = ['edit', 'search', 'category', 'file', 'template', 'user', 'special', 'talk', 'main page', 'discussion', 'create account', 'log in', 'navigation', 'page', 'read', 'view source', 'history']
        text_lower = text.lower()
        if any(exclude in text_lower for exclude in exclude_texts): return False
        if not href.startswith('/index.php?title='): return False
        if text.startswith('Co. '): return False
        return True

    def _extract_page_title(self, href):
        if 'title=' in href: return href.split('title=')[1].split('&')[0]
        return href.replace('/', '')

    def collect_all_data(self):
        print("开始完整的爱尔兰攀岩数据收集...")
        all_structure = self.get_all_counties_and_sites_via_scraping()
        if not all_structure: return {}

        all_complete_data = {}
        for county, county_data in all_structure.items():
            print(f"\n处理郡: {county}")
            all_complete_data[county] = {'county_info': county_data['county_info'], 'climbing_sites': []}
            
            for site in county_data['climbing_sites']:
                print(f"  正在处理: {site['name']}")
                page_content = self.get_full_page_content_via_api(site['page_title'])
                routes = self.get_climbing_routes_from_page(page_content)

                site_data = {
                    'name': site['name'], 'page_title': site['page_title'], 'url': site['url'],
                    'routes': routes, 'routes_count': len(routes),
                    'coordinates': page_content.get('coordinates', {'latitude': None, 'longitude': None}),
                    'climbing_type': page_content.get('crag_type', 'Unknown')
                }
                all_complete_data[county]['climbing_sites'].append(site_data)
                print(f"  {site_data['climbing_type']} | {site_data['coordinates']}")
                time.sleep(1)
        return all_complete_data

    def save_complete_data(self, data, filename='complete_irish_climbing_data.json'):
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"\n完整数据已保存到 {filename}")

    def generate_summary(self, data):
        total_counties = len(data)
        total_sites = 0; total_routes = 0
        for county, county_data in data.items():
            total_sites += len(county_data['climbing_sites'])
            for site in county_data['climbing_sites']:
                total_routes += len(site['routes'])
        print(f"\n 最终数据摘要: 郡 {total_counties} | 站点 {total_sites} | 路线 {total_routes}")

    def collect_county_data(self, county_keyword: str, max_sites: int = None):
        print(f"只收集包含关键字 '{county_keyword}' 的郡的数据...")
        all_structure = self.get_all_counties_and_sites_via_scraping()
        
        selected = {}
        for county, data in all_structure.items():
            if county_keyword.lower() in county.lower():
                selected[county] = data
        
        if not selected:
            return {}

        all_complete_data = {}
        for county, county_data in selected.items():
            print(f"\n处理郡: {county}")
            all_complete_data[county] = {'county_info': county_data['county_info'], 'climbing_sites': []}
            
            sites = county_data['climbing_sites']
            if max_sites is not None:
                sites = sites[:max_sites]

            for site in sites:
                print(f"  正在处理: {site['name']}")
                page_content = self.get_full_page_content_via_api(site['page_title'])
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
                print(f"   {site_data['climbing_type']} | {site_data['coordinates']}")
                time.sleep(1)
                
        return all_complete_data

"""
if __name__ == "__main__":
    collector = IrishClimbingRobust()

    counties_list = ["Antrim", "Armagh", "Carlow", "Cavan", "Clare", "Cork", "Derry", 
                    "Donegal", "Down", "Dublin", "Fermanagh", "Galway", "Kerry", 
                    "Kildare", "Kilkenny", "Laois", "Leitrim", "Limerick", "Longford", 
                    "Louth", "Mayo", "Meath", "Monaghan", "Offaly", "Roscommon", 
                    "Sligo", "Tipperary", "Tyrone", "Waterford", "Westmeath", 
                    "Wexford", "Wicklow"]

    for county in counties_list:
        print(f"\n处理郡: {county}")
        county_data = collector.collect_county_data(county, max_sites=None)
        
        if county_data:
            collector.save_complete_data(county_data, f'{county.lower()}_all_data.json')
            collector.generate_summary(county_data)
            print(f"{county} 数据保存成功")
        else:
            print(f"未找到 {county} 郡的数据")
        
        time.sleep(1.5)
"""
if __name__ == "__main__":
    collector = IrishClimbingRobust()
    
    test_county = "Down"  # 你可以改成任何你想测试的郡名，比如 "kerry", "galway", "donegal" 等等
    
    print(f"\n开始测试郡: {test_county}")
    print("=" * 50)
    
    county_data = collector.collect_county_data(test_county, max_sites=None)
    
    if county_data:
        filename = f'test_{test_county.lower()}_data2.json'
        collector.save_complete_data(county_data, filename)
        
        # 打印前几个站点的路线看看效果
        for county_name, county_info in county_data.items():
            print(f"\n{county_name} 的攀岩点:")
            for i, site in enumerate(county_info['climbing_sites'][:3]):
                print(f"  {i+1}. {site['name']}")
                print(f"     类型: {site['climbing_type']}")
                print(f"     路线数: {site['routes_count']}")
                # 显示前3条路线
                for j, route in enumerate(site['routes'][:3]):
                    print(f"        - {route['name']} ({route.get('difficulty', '?')})")
                    if route.get('first_ascent') != 'Unknown':
                        print(f"          首攀: {route['first_ascent']}")
                    if route.get('description'):
                        print(f"          描述: {route['description'][:50]}...")
    else:
        print(f"未找到 {test_county} 郡的数据")
