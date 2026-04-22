import requests
import json
import re
import time
from bs4 import BeautifulSoup
import urllib.parse
import html  # 需要导入html模块

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
        # 难度模式
        self.grade_pattern = r'\b(MS|HS|HVS|VS|VD|HVD|Severe|Diff|VDiff|E[1-9](?:/[1-9])?|F[7-9][a-c][+-]?|Fr [7-9][a-c]|S[0-9]|[4-6][abc]|M|S|D)\b'

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
        import re
        if not line:
            return None
        
        # 精简调试信息
        if len(line) > 400:
            return None

        original_line = line
        
        is_bold = "'''" in line or line.startswith('*')
        
        if not is_bold:
            return None
        
        line = line.replace("'''", '').strip()
        line = re.sub(r'^\*+', '', line).strip()

        
        height_match = re.search(r'(\d+)\s*m', line, re.IGNORECASE)
        height = int(height_match.group(1)) if height_match else None
        
        has_grade = False
        grade_patterns = ['E1','E2','E3','E4','E5','E6','E7','HVS','VS','HS','S','VD',
                  'F7a','F7b','F7c','F8a','F8b','Fr 7a','Fr 7b','Fr 7c','7a','7b','7c']    
        for g in grade_patterns:
            if re.search(r'\b' + re.escape(g) + r'\b', line.upper()):
                has_grade = True
                grade = g
                break

        if not has_grade:
            tech_grade_match = re.search(r'\b[0-9][abc][, ]', line.lower())
            if tech_grade_match:
                has_grade = True
                for g in grade_patterns:
                    if g in line.upper():
                        grade = g
                        break
        
        if not has_grade:
            return None
        
        height = int(height_match.group(1))
        
        
        name_parts = line.split()
        name_words = []
        for word in name_parts:

            if re.match(r'\d+m', word, re.IGNORECASE):
                break
            if word in grade_patterns:
                break
            name_words.append(word)

        name = ' '.join(name_words)
        
        name = re.sub(r'[\[\]\*\|\(\)]', '', name)
        name = re.sub(r'\s+', ' ', name).strip()
        name_words_count = len(name.split())
        if name_words_count > 10:
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
        counties = ["Antrim", "Dublin", "Wicklow", "Cork", "Clare", "Galway", "Kerry", "Donegal"]
        query_lower = query.lower()
        for county in counties:
            if county.lower() in query_lower:
                return county
        return "Antrim"

    def _fetch_coords_from_osm(self, query):
        """从OSM获取坐标"""
        try:
            clean_query = query.replace('_', ' ').strip()
            
            url = "https://nominatim.openstreetmap.org/search"
            params = {
                'q': f"{clean_query}, Ireland",
                'format': 'json',
                'limit': 1
            }
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            
            time.sleep(1)
            response = requests.get(url, params=params, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data:
                    coords = {
                        "latitude": float(data[0]['lat']),
                        "longitude": float(data[0]['lon'])
                    }
                    return coords
            return None
            
        except Exception as e:
            return None
        
    def extract_grid_ref_coords(self, wikitext):
        """从wiki文本中提取Grid Ref并转换为坐标"""
        if not wikitext:
            return None
        
        grid_ref = self._extract_grid_ref(wikitext)
        if not grid_ref:
            return None
        
        coords = self._convert_gridref(grid_ref)
        if coords:
            coords["source"] = "grid_reference"
            return coords
        return None

    def _extract_grid_ref(self, text):
        """提取Grid Ref字符串"""
        if not text:
            return None
        
        patterns = [
            r'Grid\s*Ref\.?\s*:?\s*([A-Z]{1,2}\s*\d{6})',
            r'Grid\s*Reference\.?\s*:?\s*([A-Z]{1,2}\s*\d{6})',
            r'OS\s*Grid\s*Ref\.?\s*:?\s*([A-Z]{1,2}\s*\d{6})',
            r'OS\s*Grid\s*Reference\.?\s*:?\s*([A-Z]{1,2}\s*\d{6})',
            r'([A-Z]{1,2}\s*\d{6})\s*\(OS\s*Grid\)',
            r'([A-Z]{1,2}\s*\d{3}\s*\d{3})',
            r'([A-Z]{1,2}\s*\d{5,6})',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                grid_ref = match.group(1).replace(' ', '').strip()
                if len(grid_ref) >= 6:
                    return grid_ref.upper()
        
        return None

    def _convert_gridref(self, grid_ref):
        """转换Grid Ref为经纬度 - 优先使用在线API"""
        try:
            api_coords = self._convert_gridref_via_api(grid_ref)
            if api_coords:
                return api_coords
        except Exception as e:
            pass
        
        return self._convert_gridref_locally(grid_ref)

    def _convert_gridref_via_api(self, grid_ref):
        """使用在线API转换Grid Ref"""
        try:
            url = "https://gridreferencefinder.com/gridRefAjax.php"
            params = {'gridref': grid_ref}
            headers = {'User-Agent': 'Mozilla/5.0'}
            
            response = requests.get(url, params=params, headers=headers, timeout=10)
            
            if response.status_code == 200:
                text = response.text
                lat_match = re.search(r'Latitude[:\s]*([\d\.\-]+)', text, re.IGNORECASE)
                lon_match = re.search(r'Longitude[:\s]*([\d\.\-]+)', text, re.IGNORECASE)
                
                if lat_match and lon_match:
                    lat = float(lat_match.group(1))
                    lon = float(lon_match.group(1))
                    return {"latitude": lat, "longitude": lon}
                    
        except Exception as e:
            pass
        
        return None

    def _convert_gridref_locally(self, grid_ref):
        """本地转换Grid Ref（仅用于H/I网格）"""
        try:
            if not grid_ref.startswith(('H', 'I')):
                return None
            
            grid_ref = grid_ref.upper().replace(' ', '')
            
            if len(grid_ref) != 7:
                return None
            
            letter = grid_ref[0]
            numbers = grid_ref[1:]
            
            if letter == 'H':
                base_easting = 200000
                base_northing = 400000
            elif letter == 'I':
                base_easting = 300000
                base_northing = 400000
            else:
                return None
            
            easting_str = numbers[:3]
            northing_str = numbers[3:]
            
            easting = base_easting + int(easting_str) * 10
            northing = base_northing + int(northing_str) * 10
            
            lon = -6.5 + (easting - 250000) / 150000
            lat = 54.5 + (northing - 450000) / 150000
            
            lat = max(53.0, min(55.5, lat))
            lon = max(-8.0, min(-5.5, lon))
            
            return {
                "latitude": round(lat, 6),
                "longitude": round(lon, 6)
            }
            
        except Exception as e:
            return None    

    def _extract_coordinates_logic(self, title, wikitext):
        """分层次坐标提取 - 精简调试信息"""
        # 1. 手动坐标
        if title in MANUAL_COORDS:
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
                return coords
        except Exception as e:
            pass
        
        # 3. Grid Ref
        grid_coords = self.extract_grid_ref_coords(wikitext)
        if grid_coords:
            return grid_coords

        # 4. OSM搜索
        osm_coords = self._fetch_coords_from_osm(title)
        if osm_coords:
            osm_coords["source"] = "osm_search"
            return osm_coords
        
        # 5. 备用坐标
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
            return {'error': str(e), 'page_title': page_title}
        
    def parse_dws_route_from_line(self, line):
        """解析深水 solo 路线"""
        
        # 先检查整行是否有高度和难度
        has_height = re.search(r'\d+\s*m', line) is not None
        has_grade = re.search(self.grade_pattern, line) is not None
        
        if not has_height or not has_grade:
            return None
        
        # 提取名字
        name = None
        bold_match = re.search(r'<b>(.*?)</b>', line)
        if not bold_match:
            bold_match = re.search(r"'''(.*?)'''", line)
        
        if bold_match:
            name = bold_match.group(1)
            name = html.unescape(name)
        else:
            name = line
        
        # ===== 修复：先找到难度和高度在整行中的位置 =====
        height_match = re.search(r'(\d+)\s*m', line)
        grade_match = re.search(self.grade_pattern, line)
        
        # 如果名字是从加粗部分来的，它可能不包含高度和难度
        # 但如果名字里确实包含了这些，需要根据它们在整行的位置来截取
        
        # 找到高度出现的位置
        height_pos = height_match.start() if height_match else len(line)
        
        # 如果名字是从加粗部分来的，直接用加粗内容
        if bold_match:
            name = bold_match.group(1)
        else:
            # 否则取高度之前的部分
            name = line[:height_pos].strip()

        if len(name) > 50:
            return None
        
        if re.match(r'^\s*\d+/\s*\.', line):
            return None
        
        # 清理名字（但不要删掉单词里的S）
        name = html.unescape(name)
        name = name.replace('&nbsp;', ' ')
        
        # 只移除星标，不移除难度（因为难度可能在名字后面）
        name = re.sub(r'\*+', '', name)

        name = re.sub(r'\d+\s*m', '', name)

        # 再去掉难度（用 grade_pattern）
        name = re.sub(self.grade_pattern, '', name)
        
        # 如果名字里还有括号内容，移除
        name = re.sub(r'\([^)]*\)', '', name)
        
        # 清理多余空格
        name = re.sub(r'\s+', ' ', name)
        name = name.strip()
        # ===== 清理结束 =====
        
        if not name or len(name) < 3:
            return None
        
        # 提取高度
        height = int(height_match.group(1)) if height_match else None
        
        # 提取难度（从整行，不是从名字）
        difficulty = grade_match.group(0) if grade_match else None
        
        # 提取星标
        has_star = '***' in line or '**' in line
        
        return {
            'name': name,
            'height': height,
            'difficulty': difficulty,
            'has_star': has_star,
            'sub_routes': [],
            'first_ascent': None,
            'description': None
        }
    def get_climbing_routes_from_page(self, page_content):
        """直接从整个页面内容解析所有路线"""
        routes = []
        if not page_content or 'error' in page_content: 
            return routes

        # 直接使用整个页面内容，而不是 routes_section
        full_content = page_content.get('content', '')
        if not full_content:
            return routes

        print(f"\n[DEBUG] 开始解析页面，内容长度: {len(full_content)} 字符")
        
        lines = full_content.split('\n')
        line_count = 0
        dws_count = 0
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            line_count += 1
            
            # 先检查是否已经达到20条
            if len(routes) >= 20:
                print(f"  已收集20条路线，停止解析")
                break

            # 尝试用 DWS 格式解析每一行
            dws_route = self.parse_dws_route_from_line(line)
            if dws_route:
                name = dws_route['name']
            
                # 跳过介绍性文字
                if len(name) > 500:
                    continue
                if 'generally' in name.lower() or 'tide' in name.lower():
                    continue
                if name.startswith("''") or "&nbsp;" in name:
                    continue

                # 简单去重：检查是否已经有相同名字的路线
                is_duplicate = False
                for r in routes:
                    if r['name'] == dws_route['name']:
                        is_duplicate = True
                        break
                
                if not is_duplicate:
                    routes.append(dws_route)
                    dws_count += 1
                    print(f"  ✓ 抓到: {dws_route['name']} ({dws_route['difficulty']})")
                continue 
            
            # 可选：每100行打印一个进度
            if line_count % 100 == 0:
                print(f"  [进度] 已处理 {line_count} 行，当前 {len(routes)} 条路线")
        
        print(f"[DEBUG] 共处理 {line_count} 行，DWS格式抓到 {dws_count} 条，总共 {len(routes)} 条路线")
        return routes

    def enrich_route_data(self, route_data, content, route_name):
        """根据你的逻辑解析路线详情"""
        import re
        if not content or not route_name:
            return
        
        lines = content.split('\n')
        target_line = None
        for line in lines:
            line_clean = re.sub(r"''+", '', line)
            line_clean = re.sub(r'[\[\]\*\|]', '', line_clean)
            if route_name in line_clean:
                target_line = line
                break
        
        if not target_line:
            return
        
        parts = re.split(r'<br\s*/?>', target_line)
        
        if len(parts) == 1 and '\n' in target_line:
            parts = target_line.split('\n')
            name_part = re.sub(r"''+", '', name_part)
            name_part = re.sub(r'[\[\]\*\|]', '', name_part)
            name_part = re.sub(r'\s+', ' ', name_part).strip()
            route_data['name'] = name_part
        
        start_idx = 1
        if len(parts) >= 2:
            second_part = parts[1].strip()
            second_part = re.sub(r"''+", '', second_part)
            
            if re.search(r'[A-Z][a-z]+.*\d{4}', second_part):
                route_data['first_ascent'] = second_part
                start_idx = 2
            else:
                date_match = re.search(r'([A-Z][a-z]+(?:\.?\s+[A-Z]?[a-z]+)*(?:\s*\([^)]+\))?[,.]?\s*\d{1,2}/\d{1,2}/\d{2,4}|\d{4}|[A-Z][a-z]+\s+\d{4})', second_part)
                if date_match:
                    route_data['first_ascent'] = date_match.group(0).strip()
                    remaining = second_part[date_match.end():].strip()
                    if remaining:
                        if len(parts) > 2:
                            parts[2] = remaining + ' ' + parts[2]
                        else:
                            parts.append(remaining)
                    start_idx = 2
                else:
                    start_idx = 1
        
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
                print(f"  {site_data['climbing_type']} | 路线数: {len(routes)}")
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
        print(f"\n最终数据摘要: 郡 {total_counties} | 站点 {total_sites} | 路线 {total_routes}")

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
                print(f"  类型: {site_data['climbing_type']} | 路线数: {len(routes)}")
                time.sleep(1)
                
        return all_complete_data


if __name__ == "__main__":
    collector = IrishClimbingRobust()
    
    test_county = "Clare"  # 你可以改成任何你想测试的郡名，比如 "kerry", "galway", "donegal" 等等
    
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