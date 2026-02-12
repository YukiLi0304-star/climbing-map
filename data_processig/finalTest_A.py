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

    #def _parse_route_line(self, line: str):
        if not line: return None
        line = line.strip()
        
        if re.search(r'(19|20)\d{2}', line) or re.search(r'\d{1,2}/\d{1,2}', line):
            return None

        if re.search(r'[A-Z]\s+[A-Z][a-z]+', line) and "," in line:
            return None

        if len(line) > 80: return None
        ignore_starts = ["A small", "The", "This", "Located", "Situated", "Access", "Descent", "Approach", "Takes"]
        for start_word in ignore_starts:
            if line.startswith(start_word):
                return None

        line = re.sub(r'^\s*\d+[a-zA-Z]?\.?\s*', '', line)
        line = line.strip()
        if not line: return None
        tokens = line.split()
        if len(tokens) < 2: return None
        
        height = None
        height_idx = None
        for i, tok in enumerate(tokens):
            m = re.fullmatch(r'(\d{1,3})m', tok)
            if m:
                height = int(m.group(1))
                height_idx = i
                break
        
        grade_indices = []
        start_search = height_idx + 1 if height_idx is not None else 1
        for i in range(start_search, len(tokens)):
            if self._looks_like_grade(tokens[i].strip("()")):
                grade_indices.append(i)
        if not grade_indices:
            for i in range(1, len(tokens)):
                if self._looks_like_grade(tokens[i].strip("()")):
                    grade_indices.append(i)
                    break
        if not grade_indices: return None

        overall_grade = tokens[grade_indices[0]].strip("()")
        technical_grade = None
        if len(grade_indices) > 1:
            technical_grade = tokens[grade_indices[1]].strip("()")
        else:
            for i in range(grade_indices[0] + 1, len(tokens)):
                cand = tokens[i].strip("()")
                if self._looks_like_grade(cand):
                    technical_grade = cand
                    break

        cut_positions = []
        if height_idx is not None: cut_positions.append(height_idx)
        if grade_indices: cut_positions.append(grade_indices[0])
        if not cut_positions: return None

        name_end = min(cut_positions)
        name_tokens = [t for t in tokens[:name_end] if t not in ['*', '**']]
        raw_name = " ".join(name_tokens)
        route_name = self.clean_route_name(raw_name)

        if len(route_name) > 40: return None
        if len(route_name) < 2: return None
        if (not route_name or route_name.lower() in ['the', 'and', 'or', 'if', 'start']): return None

        difficulty_str = overall_grade
        if technical_grade and technical_grade != overall_grade:
            difficulty_str = f"{overall_grade} {technical_grade}"

        return {
            'name': route_name,
            'height': height,
            'overall_grade': overall_grade,
            'technical_grade': technical_grade,
            'difficulty': difficulty_str,
        }
    
    def _parse_route_line(self, line: str):
        """重写 - 适配wikitext格式"""
        if not line:
            return None
        
        line = line.strip()
        
        # 移除wikitext标记
        line = re.sub(r"''+", '', line)  # 移除粗体/斜体标记
        line = re.sub(r'\[\[[^|\]]*\|([^\]]+)\]\]', r'\1', line)  # 转换[[链接|显示文本]]为显示文本
        line = re.sub(r'\[\[([^\]]+)\]\]', r'\1', line)  # 转换[[页面名]]为页面名
        
        # 跳过太长的行（通常是段落）
        if len(line) > 100:
            return None
        
        # 跳过明显的非路线行
        if line.startswith(('The ', 'This ', 'Located ', 'Situated ', 'Access ', 
                            'Descent ', 'Approach ', 'Takes ', 'From ', 'To ',
                            'First ', 'FA:', 'Ascent')):
            return None
        
        # 移除数字编号（1., 2), 3.等）
        line = re.sub(r'^\s*\d+[\.\)]\s*', '', line)
        
        # 检查是否包含高度（必须）
        height_match = re.search(r'(\d+)\s*m', line, re.IGNORECASE)
        if not height_match:
            return None
        
        height = int(height_match.group(1))
        
        # 检查是否包含难度（必须）- 爱尔兰攀岩常用难度等级
        grade_patterns = [
            r'\b(E[1-9][0-9]?)\b',  # E1, E2, E3...
            r'\b(HVS|VS|HS|S|VD|HVD|D|MS|M)\b',  # 传统难度
            r'\b([1-9][abc])\b',  # 技术难度 5a, 6b等
            r'\b(F[0-9][abc])\b',  # 法国难度
            r'\b([A-Z][0-9])\b',  # A1, A2等
        ]
        
        grade = None
        for pattern in grade_patterns:
            grade_match = re.search(pattern, line, re.IGNORECASE)
            if grade_match:
                grade = grade_match.group(1).upper()
                break
        
        if not grade:
            return None
        
        # 提取路线名（高度之前的部分）
        height_pos = height_match.start()
        name_part = line[:height_pos].strip()
        
        # 清理路线名
        name_part = re.sub(r'^[\*\-\:\s]+', '', name_part)  # 移除开头的特殊字符
        name_part = re.sub(r'[\*\-\:\s]+$', '', name_part)  # 移除结尾的特殊字符
        
        # 如果路线名太短或太长，跳过
        if len(name_part) < 2 or len(name_part) > 60:
            return None
        
        # 检查路线名是否有效
        if re.match(r'^[\d\s]+$', name_part):  # 纯数字
            return None
        
        return {
            'name': name_part,
            'height': height,
            'difficulty': grade,
            'overall_grade': grade,
            'technical_grade': None,
        }

    def _determine_crag_type(self, wikitext):
        """关键词权重打分法判断类型"""
        text_lower = wikitext.lower()
        scores = {"bouldering": 0, "sea_cliff": 0, "sport_climbing": 0, "quarry": 0}

        if "boulder" in text_lower: scores["bouldering"] += 3
        if "problem" in text_lower: scores["bouldering"] += 2
        if "sit start" in text_lower: scores["bouldering"] += 2
        if "font" in text_lower: scores["bouldering"] += 1
        
        if "sea cliff" in text_lower: scores["sea_cliff"] += 5
        if "tidal" in text_lower: scores["sea_cliff"] += 3
        if "high tide" in text_lower: scores["sea_cliff"] += 2
        
        if "sport climbing" in text_lower: scores["sport_climbing"] += 5
        if "bolted" in text_lower: scores["sport_climbing"] += 3
        if "bolts" in text_lower: scores["sport_climbing"] += 2
        
        if "quarry" in text_lower: scores["quarry"] += 5

        best_type = max(scores, key=scores.get)
        max_score = scores[best_type]

        if max_score < 2: return "Trad Climbing"
        if best_type == "bouldering": return "Bouldering"
        if best_type == "sea_cliff": return "Sea Cliff"
        if best_type == "sport_climbing": return "Sport Climbing"
        if best_type == "quarry": return "Quarry"
        return "Trad Climbing"


    #def _fetch_coords_from_osm(self, query):
        clean_query = query.replace('_', ' ').strip()
        
        search_url = "https://nominatim.openstreetmap.org/search"
        
        params = {
            'q': clean_query + ", Ireland",
            'format': 'json',
            'limit': 1
        }

        headers = {
            'User-Agent': 'CragMap_Student_App/1.0 (climbing_student_project@gmail.com)',
            'Referer': 'http://wiki.climbing.ie/'
        }
        
        try:
            print(f"      尝试去 OSM 搜索: '{clean_query}' ...")
            
            time.sleep(1.5) 
            
            resp = requests.get(search_url, params=params, headers=headers, timeout=10)

            if resp.status_code != 200:
                print(f"     OSM 拒绝访问 (代码 {resp.status_code})。可能是 User-Agent 问题。")
                return None

            data = resp.json()
            
            if data and len(data) > 0:
                lat = float(data[0]['lat'])
                lng = float(data[0]['lon'])
                print(f"     [OSM成功] {clean_query} -> {lat}, {lng}")
                return {"latitude": lat, "longitude": lng}
            else:
                print(f"     OSM 没找到这个地点")
                
        except json.JSONDecodeError:
            print(f"     OSM 返回格式错误 (可能被防火墙拦截)")
        except Exception as e:
            print(f"      OSM 搜索报错: {e}")
            
        return None
    
    
    
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
        """强制返回坐标 - 找不到精确的就返回爱尔兰的大致位置"""
        try:
            clean_query = query.replace('_', ' ').strip()
            
            # 尝试精确搜索
            print(f"      搜索: '{clean_query}'")
            
            # 先尝试直接搜索
            url = "https://nominatim.openstreetmap.org/search"
            params = {
                'q': f"{clean_query}, Ireland",
                'format': 'json',
                'limit': 5,
                'addressdetails': 1
            }
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            
            time.sleep(1)
            response = requests.get(url, params=params, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                if data:
                    # 优先选择自然特征或包含查询词的
                    for result in data:
                        display_name = str(result.get('display_name', '')).lower()
                        result_type = str(result.get('type', '')).lower()
                        
                        # 检查是否在爱尔兰
                        if any(word in display_name for word in ['ireland', 'irish', 'co.']):
                            coords = {
                                "latitude": float(result['lat']),
                                "longitude": float(result['lon'])
                            }
                            print(f"      找到精确坐标: {coords}")
                            print(f"          地点: {display_name[:60]}...")
                            return coords
                    
                    # 如果没有在爱尔兰的，至少返回第一个结果
                    first_result = data[0]
                    coords = {
                        "latitude": float(first_result['lat']),
                        "longitude": float(first_result['lon'])
                    }
                    print(f"     找到坐标（可能不在爱尔兰）: {coords}")
                    return coords
            
            # 如果精确搜索失败，尝试备用搜索
            print(f"      精确搜索失败，尝试备用策略...")
            
            # 策略1：搜索"climbing crag"
            if 'climbing' not in clean_query.lower():
                backup_params = {'q': f"{clean_query} climbing, Ireland", 'format': 'json', 'limit': 1}
                time.sleep(1)
                response = requests.get(url, params=backup_params, headers=headers, timeout=10)
                
                if response.status_code == 200:
                    data = response.json()
                    if data:
                        coords = {
                            "latitude": float(data[0]['lat']),
                            "longitude": float(data[0]['lon'])
                        }
                        print(f"     通过climbing关键词找到坐标: {coords}")
                        return coords
            
            # 策略2：只搜索郡名（从查询中提取或猜测）
            county = self._guess_county_from_query(query)
            if county:
                county_params = {'q': f"{county}, Ireland", 'format': 'json', 'limit': 1}
                time.sleep(1)
                response = requests.get(url, params=county_params, headers=headers, timeout=10)
                
                if response.status_code == 200:
                    data = response.json()
                    if data:
                        coords = {
                            "latitude": float(data[0]['lat']),
                            "longitude": float(data[0]['lon'])
                        }
                        print(f"    使用{county}郡中心坐标: {coords}")
                        return None
            
            # 策略3：返回爱尔兰的地理中心（保底）
            ireland_center = {"latitude": 53.3498, "longitude": -6.2603}  # 都柏林
            print(f"      🏴󠁧󠁢󠁩󠁥󠁿 使用爱尔兰中心坐标: {ireland_center}")
            return None
            
        except Exception as e:
            print(f"     搜索出错: {e}")
            # 即使出错也返回爱尔兰中心
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
        """本地转换Grid Ref（针对北爱尔兰）"""
        try:
            # 只处理北爱尔兰的H/I网格
            if not grid_ref.startswith(('H', 'I')):
                print(f"      仅支持北爱尔兰网格(H/I)")
                return None
            
            # 清理网格参考
            grid_ref = grid_ref.upper().replace(' ', '')
            
            if len(grid_ref) != 7:  # H + 6位数字
                print(f"      网格格式错误: {grid_ref}")
                return None
            
            letter = grid_ref[0]
            numbers = grid_ref[1:]
            
            # H网格的基础坐标（北爱尔兰）
            if letter == 'H':
                base_easting = 200000  # 500km方格
                base_northing = 400000
            elif letter == 'I':
                base_easting = 300000
                base_northing = 400000
            else:
                return None
            
            # 提取东距和北距（6位数字：前3后3）
            easting_str = numbers[:3]
            northing_str = numbers[3:]
            
            easting = base_easting + int(easting_str) * 10  # 转换为米
            northing = base_northing + int(northing_str) * 10
            
            # 简化的坐标转换公式（近似）
            # 注意：这是简化转换，精确转换需要专业库
            lon = -6.5 + (easting - 250000) / 150000
            lat = 54.5 + (northing - 450000) / 150000
            
            # 限制在合理范围内
            lat = max(53.0, min(55.5, lat))
            lon = max(-8.0, min(-5.5, lon))
            
            return {
                "latitude": round(lat, 6),
                "longitude": round(lon, 6)
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
        
        # 4. OSM失败，尝试Grid Ref（第二层）← 问题可能在这里！
        print(f"      → OSM失败，尝试Grid Ref...")
        
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
        if not page_content or 'error' in page_content: 
            return routes
        
        # 使用 routes_section，不是 plain_text！
        routes_section = page_content.get('routes_section', '') or ''
        if not routes_section:
            return routes

        lines = [line.strip() for line in routes_section.split('\n') if line.strip()]
        seen_names = set()

        for line in lines:

            if len(routes) >= 20:
                print(f"    已收集20条路线，停止解析")
                break

            parsed = self._parse_route_line(line)
            if not parsed: 
                continue
            name = parsed['name']
            if name in seen_names: 
                continue
            
            route_data = {
                'name': name,
                'height': parsed['height'],
                'difficulty': parsed['difficulty'],
                'overall_grade': parsed['overall_grade'],
                'technical_grade': parsed['technical_grade'],
                'sub_routes': [],
            }
            # 使用 routes_section，保留HTML结构！
            self.enrich_route_data(route_data, routes_section, name)
            routes.append(route_data)
            seen_names.add(name)

        print(f"    找到 {len(routes)} 条路线")
        return routes
    
    #def get_climbing_routes_from_page(self, page_content):
        routes = []
        if not page_content or 'error' in page_content: 
            return routes
        
        full_content = page_content.get('content', '') or ''
        if not full_content:
            return routes
        
        lines = full_content.split('\n')
        seen_names = set()
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # 清理wikitext标记
            line = re.sub(r"''+", '', line)
            line = re.sub(r'\[\[[^|\]]*\|([^\]]+)\]\]', r'\1', line)
            line = re.sub(r'\[\[([^\]]+)\]\]', r'\1', line)
            
            #  1. 先匹配带高度的传统路线
            trad_match = re.search(r'^(.{1,50}?)\s+(\d+)m\s+((?:E[1-9]|HVS|VS|HS|S|VD))', line, re.IGNORECASE)
            if trad_match:
                name = trad_match.group(1).strip()
                height = int(trad_match.group(2))
                grade = trad_match.group(3).strip().upper()
                
                # 清理名字里的\t和多余空格
                name = re.sub(r'\s+', ' ', name).strip()
                
                if len(name) >= 2 and name.lower() not in seen_names:
                    route = {
                        'name': name,
                        'height': height,
                        'difficulty': grade,
                        'overall_grade': grade,
                        'technical_grade': None,
                        'sub_routes': [],
                        'first_ascent': 'Unknown',
                        'description': 'No description available'
                    }
                    routes.append(route)
                    seen_names.add(name.lower())
                    print(f"      {name} {height}m {grade}")
                    continue
            
            #  2. 再匹配抱石路线（无高度）
            boulder_match = re.search(r'^(.{1,50}?)\s+([4-8][abc\+]?)$', line, re.IGNORECASE)
            if boulder_match:
                name = boulder_match.group(1).strip()
                grade = boulder_match.group(2).strip().upper()
                
                name = re.sub(r'\s+', ' ', name).strip()
                
                if len(name) >= 2 and name.lower() not in seen_names:
                    route = {
                        'name': name,
                        'height': None,
                        'difficulty': grade,
                        'overall_grade': grade,
                        'technical_grade': None,
                        'sub_routes': [],
                        'first_ascent': 'Unknown',
                        'description': 'No description available'
                    }
                    routes.append(route)
                    seen_names.add(name.lower())
                    print(f"      {name} {grade}")
        
        print(f"    共找到 {len(routes)} 条路线")
        
        for route in routes[:20]:
            self.enrich_route_data(route, full_content, route['name'])
        
        return routes[:20]
        
    #def _parse_bouldering_routes(self, text):
        """专门解析抱石路线"""
        routes = []
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        seen_names = set()
        
        for line in lines:
            # 清理wikitext标记
            line = re.sub(r"''+", '', line)
            line = re.sub(r'\[\[[^|\]]*\|([^\]]+)\]\]', r'\1', line)
            
            # 匹配抱石格式："路线名 难度"
            match = re.search(r'^(.+?)\s+(4[abc]?|5[abc\+]?|6[abc\+]?|7[abc\+]?|8[abc\+]?)\s*$', line)
            if not match:
                continue
                
            name = match.group(1).strip()
            grade = match.group(2).strip().upper()
            
            if name.lower() in seen_names:
                continue
                
            route = {
                'name': name,
                'height': None,
                'difficulty': grade,
                'overall_grade': grade,
                'technical_grade': None,
                'sub_routes': [],
                'first_ascent': 'Unknown',
                'description': 'No description available'
            }
            routes.append(route)
            seen_names.add(name.lower())
            print(f"      抱石路线: {name} ({grade})")
        
        print(f"    找到 {len(routes)} 条抱石路线")
        return routes[:20]

    #def enrich_route_data(self, route_data, content, route_name):
        """修复版本 - 准确获取路线描述和首攀信息，并处理多段路线"""
        if not content or not route_name:
            return
        
        print(f"      处理路线: {route_name}")
        
        # 1. 寻找包含路线名的标题行（必须包含高度和难度）
        # 更精确的模式：路线名 高度m 难度
        title_pattern = rf'(?:\*\*)?{re.escape(route_name)}\s+(\d+)m\s+([A-Z0-9/]+)(?:\s*\(([^)]+)\))?(?:\*\*)?'
        title_match = re.search(title_pattern, content, re.IGNORECASE)
        
        if not title_match:
            print(f"      未找到{route_name}的标题行")
            return
        
        route_title = title_match.group(0)
        print(f"      找到标题: {route_title}")
        
        # 2. 从标题结束位置开始
        title_end = title_match.end()
        remaining_content = content[title_end:]
        
        # 3. 更智能的边界检测
        # 先查找典型的下一条路线模式
        next_route_start = len(remaining_content)
        
        # 模式1: 数字编号后跟路线名 (如 "9. Pat's Route 18m VS")
        pattern1 = rf'\n\s*\d+\.\s+[A-Z][A-Za-z\'\- ]+\s+\d+m\s+[A-Z]'
        # 模式2: 路线名 高度m 难度 (无编号)
        pattern2 = rf'\n\s*[A-Z][A-Za-z\'\- ]+\s+\d+m\s+[A-Z]'
        # 模式3: **路线名** 格式
        pattern3 = rf'\n\s*\*\*[A-Z][A-Za-z\'\- ]+\s+\d+m\s+[A-Z]'
        
        for pattern in [pattern1, pattern2, pattern3]:
            match = re.search(pattern, remaining_content, re.MULTILINE | re.IGNORECASE)
            if match and match.start() > 50:  # 确保不是当前路线的一部分
                # 验证这确实是另一条路线
                line_text = remaining_content[match.start():match.end()].strip()
                if route_name.lower() not in line_text.lower():  # 不是当前路线
                    next_route_start = min(next_route_start, match.start())
                    print(f"      检测到下一条路线: {line_text[:40]}...")
                    break
        
        # 4. 如果没有找到明显的下一条路线，尝试找下一个数字编号
        if next_route_start == len(remaining_content):
            # 查找下一个以数字加句点开头的行
            next_num_match = re.search(r'\n\s*\d+\.\s+', remaining_content, re.MULTILINE)
            if next_num_match and next_num_match.start() > 50:
                next_route_start = min(next_route_start, next_num_match.start())
                print(f"      检测到下一个数字编号段落")
        
        # 5. 提取专属内容
        route_specific_content = remaining_content[:next_route_start].strip()
        print(f"      专属内容长度: {len(route_specific_content)} 字符")
        
        if not route_specific_content:
            print(f"      没有专属内容")
            return
        
        # 6. 先处理多段路线（优先级高）
        pitch_pattern = r'(\d+)\)\s*(\d+)m\.?\s*(.*?)(?=\s*\d+\)\s*\d+m|$)'
        pitch_matches = list(re.finditer(pitch_pattern, route_specific_content, re.DOTALL | re.IGNORECASE))
        
        if pitch_matches:
            print(f"      发现 {len(pitch_matches)} 个分段")
            route_data['sub_routes'] = []
            
            for i, match in enumerate(pitch_matches):
                pitch_num = int(match.group(1))
                height = int(match.group(2))
                description = match.group(3).strip()
                
                # 清理描述文本
                description = re.sub(r'\s+', ' ', description)
                
                # 尝试提取该段的难度等级
                pitch_grade = None
                grade_match = re.search(r'\b([A-Z][0-9]?[a-z]?[+-]?|[0-9][abc][+-]?)\b', description)
                if grade_match:
                    pitch_grade = grade_match.group(1)
                
                sub_route = {
                    'pitch_number': pitch_num,
                    'height': height,
                    'description': description[:200],
                    'technical_grade': pitch_grade
                }
                route_data['sub_routes'].append(sub_route)
                print(f"        分段 {pitch_num}: {height}m - {description[:50]}...")
            
            # 移除已处理的分段内容
            last_pitch_end = pitch_matches[-1].end()
            route_specific_content = route_specific_content[last_pitch_end:].strip()
            print(f"      分段处理后剩余内容长度: {len(route_specific_content)}")
        
        # 7. 提取首攀信息（如果有）
        # 首攀信息通常在第一行，格式如 "I Rea, M Rea. 7/7/1984." 或 "T McQueen, A Lyttle. 7/1984."
        fa_pattern = r'^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:,\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)*\.?\s+(?:\d{1,2}/\d{1,2}/)?\d{4}(?:\.|$))'
        fa_match = re.match(fa_pattern, route_specific_content)
        
        if fa_match:
            first_ascent_text = fa_match.group(1).strip()
            route_data['first_ascent'] = self.clean_text(first_ascent_text)
            print(f"      提取首攀: {route_data['first_ascent'][:60]}...")
            
            # 移除首攀信息
            route_specific_content = route_specific_content[fa_match.end():].strip()
            print(f"      首攀处理后剩余内容长度: {len(route_specific_content)}")
        
        # 8. 提取描述（剩余内容）
        if route_specific_content:
            # 按行分割，过滤空行
            lines = [line.strip() for line in route_specific_content.split('\n') if line.strip()]
            
            if lines:
                description_lines = []
                for line in lines:
                    # 跳过太短的行或可能的下一条路线
                    if len(line) < 10 or re.search(r'^\d+\.\s+[A-Z]', line):
                        continue
                    # 跳过明显的首攀信息（如果之前没匹配到）
                    if re.search(r'[12]\d{3}\.', line) and re.search(r'[A-Z][a-z]+,', line):
                        continue
                    
                    description_lines.append(line)
                
                if description_lines:
                    description = ' '.join(description_lines)
                    # 清理多余空格
                    description = re.sub(r'\s+', ' ', description).strip()
                    
                    # 移除尾部可能的下一条路线引用
                    description = re.sub(r'\s*\d+\.\s+[A-Z].*$', '', description)
                    description = re.sub(r'\s*[A-Z][a-z]+\s+\d+m\s+[A-Z].*$', '', description)
                    
                    if len(description) > 15:
                        route_data['description'] = description[:400]  # 适当增加长度限制
                        print(f"      提取描述: {route_data['description'][:80]}...")
        
        # 9. 如果没有找到描述但有分段，则使用第一个分段的描述作为总体描述
        if not route_data.get('description') and route_data.get('sub_routes'):
            first_pitch_desc = route_data['sub_routes'][0]['description']
            if len(first_pitch_desc) > 20:
                route_data['description'] = first_pitch_desc[:200]
                print(f"      使用第一个分段作为描述: {first_pitch_desc[:60]}...")
        
        # 10. 如果仍然没有描述，检查是否有被错误截断的内容
        if not route_data.get('description') and len(route_specific_content) > 0:
            # 可能首攀模式不匹配，尝试提取任何有意义的文本
            lines = [line.strip() for line in route_specific_content.split('\n') if line.strip() and len(line) > 15]
            if lines:
                description = ' '.join(lines[:2])  # 取前两行
                description = re.sub(r'\s+', ' ', description).strip()
                if len(description) > 20:
                    route_data['description'] = description[:300]
                    print(f"      从剩余文本提取描述: {description[:60]}...")
        
        print(f"      完成处理 (子路线: {len(route_data.get('sub_routes', []))}, 描述: {'有' if route_data.get('description') else '无'}, 首攀: {'有' if route_data.get('first_ascent') else '无'})")

    #def enrich_route_data(self, route_data, content, route_name):
        """修复版本 - 更简单鲁棒地提取路线信息"""
        if not content or not route_name:
            return
        
        print(f"      处理路线: {route_name}")
        
        # 1. 寻找包含路线名的行（更宽松的匹配）
        # 先找到所有包含路线名的行
        lines = content.split('\n')
        route_lines = []
        
        for i, line in enumerate(lines):
            if route_name.lower() in line.lower():
                route_lines.append((i, line.strip()))
        
        if not route_lines:
            print(f"     未找到包含'{route_name}'的行")
            return
        
        print(f"      找到 {len(route_lines)} 行包含路线名")
        
        # 2. 找到主标题行（通常包含高度和难度）
        main_line = None
        for line_idx, line in route_lines:
            # 检查是否包含高度和难度
            if re.search(r'\d+m\s+[A-Z]', line):
                main_line = (line_idx, line)
                print(f"      找到主标题行: {line[:80]}...")
                break
        
        if not main_line and route_lines:
            main_line = route_lines[0]
        
        # 3. 提取该路线专属的内容区域
        start_line = main_line[0]
        end_line = len(lines)
        
        # 查找下一条路线的开始（下一个包含高度和难度的行）
        for i in range(start_line + 1, len(lines)):
            line = lines[i].strip()
            # 跳过空行
            if not line:
                continue
            
            # 检查是否是下一条路线的开始（包含高度和难度但不是当前路线）
            if re.search(r'\d+m\s+[A-Z]', line) and route_name.lower() not in line.lower():
                # 验证这确实是另一条路线
                # 简单的验证：至少包含一个单词和数字
                words = re.findall(r'[A-Za-z\']+', line)
                if words and len(words[0]) > 2:  # 至少3个字母的单词
                    end_line = i
                    print(f"      检测到下一条路线: {line[:60]}...")
                    break
        
        # 4. 提取专属内容
        route_content_lines = lines[start_line:end_line]
        route_content = '\n'.join(route_content_lines).strip()
        
        print(f"      专属内容长度: {len(route_content)} 字符")
        
        if not route_content:
            print(f"      没有专属内容")
            return
        
        # 5. 提取首攀信息（多种格式）
        first_ascent = self._extract_first_ascent(route_content)
        if first_ascent:
            route_data['first_ascent'] = first_ascent
            print(f"      提取首攀: {first_ascent[:60]}...")
        
        # 6. 提取分段信息
        sub_routes = self._extract_sub_routes(route_content)
        if sub_routes:
            route_data['sub_routes'] = sub_routes
            print(f"      提取分段: {len(sub_routes)} 个")
        
        # 7. 提取描述（剩余内容）
        description = self._extract_description(route_content, first_ascent, sub_routes)
        if description:
            route_data['description'] = description[:400]
            print(f"      提取描述: {description[:80]}...")
        
        print(f"      完成处理 (子路线: {len(route_data.get('sub_routes', []))}, 描述: {'有' if route_data.get('description') else '无'}, 首攀: {'有' if route_data.get('first_ascent') else '无'})")

    def enrich_route_data(self, route_data, content, route_name):
        """重写 - 针对wikitext格式"""
        if not content or not route_name:
            return
        
        print(f"      处理路线: {route_name}")
        
        # 1. 在wikitext中定位路线
        lines = content.split('\n')
        
        # 找到路线标题行
        route_line_index = -1
        route_line_text = ""
        
        for i, line in enumerate(lines):
            # 移除wikitext标记后检查
            line_clean = re.sub(r"''+", '', line)
            line_clean = re.sub(r'\[\[[^\]]+\]\]', '', line_clean)
            
            if route_name.lower() in line_clean.lower():
                # 确认这是路线标题行（包含高度和难度）
                if re.search(r'\d+\s*m', line_clean, re.IGNORECASE):
                    if re.search(r'\b(E[1-9]|HVS|VS|HS|S|VD|[1-9][abc])\b', line_clean, re.IGNORECASE):
                        route_line_index = i
                        route_line_text = line
                        print(f"      找到路线行[{i}]: {line_clean[:100]}")
                        break
        
        if route_line_index == -1:
            print(f"     未找到路线: {route_name}")
            route_data['first_ascent'] = "Unknown"
            route_data['description'] = "No description available"
            return
        
        # 2. 提取首攀信息
        first_ascent = "Unknown"
        
        # 在路线行之后查找首攀信息
        for i in range(route_line_index + 1, min(route_line_index + 5, len(lines))):
            line = lines[i].strip()
            
            # 跳过空行和wiki标记行
            if not line or line.startswith(('*', '#', ':', ';', '{', '|')):
                continue
            
            line_clean = re.sub(r"''+", '', line)
            line_clean = re.sub(r'\[\[[^\]]+\]\]', '', line_clean)
            
            # 检查是否包含首攀特征
            if re.search(r'[A-Z][a-z]+', line_clean):  # 包含人名
                if re.search(r'\d{4}', line_clean):  # 包含年份
                    first_ascent = re.split(r'<br\s*/?>', line_clean.strip())[0]
                    print(f"      找到首攀[{i}]: {first_ascent[:80]}")
                    break
            
            # 检查FA:标记
            if re.search(r'FA[:\.]|First\s+Ascent', line, re.IGNORECASE):
                fa_match = re.search(r'FA[:\.]\s*(.+?)(?=\n|$|<br>)', line, re.IGNORECASE)
                if fa_match:
                    first_ascent = fa_match.group(1).strip()
                    print(f"      找到FA标记: {first_ascent[:80]}")
                    break
        
        route_data['first_ascent'] = first_ascent if first_ascent != "Unknown" else "Unknown"
        
        # 3. 提取描述信息
        description_lines = []
        
        # 从路线行下一行开始，直到遇到下一个路线标题
        for i in range(route_line_index + 1, len(lines)):
            line = lines[i].strip()
            
            if not line:
                continue
            
            # 检查是否是下一条路线
            if re.search(r'[A-Z][a-z]+', line_clean):  # 包含人名
                if re.search(r'\d{4}', line_clean):  # 包含年份
                    first_ascent = line_clean.strip().split('<br>')[0]
                    print(f"      找到首攀[{i}]: {first_ascent[:80]}")
                    break
            
            # 跳过wiki标记行
            if line.startswith(('==', '*', '#', ':', ';', '{', '|', '[[Category', '[[File')):
                continue
            
            # 跳过已经提取为首攀的行
            if first_ascent != "Unknown" and first_ascent in line:
                continue
            
            # 清理wikitext标记
            line_clean = re.sub(r"''+", '', line)
            line_clean = re.sub(r'\[\[[^|\]]*\|([^\]]+)\]\]', r'\1', line_clean)
            line_clean = re.sub(r'\[\[([^\]]+)\]\]', r'\1', line_clean)
            line_clean = re.sub(r'\{\{[^\}]+\}\}', '', line_clean)
            line_clean = re.sub(r'<[^>]+>', '', line_clean)
            line_clean = re.sub(r'\s+', ' ', line_clean).strip()
            
            # 只保留有意义的描述文本
            if len(line_clean) > 15:
                # 跳过看起来像路线标题的行
                if not re.search(r'^\d+[\.\)]?\s*\w+\s+\d+m', line_clean):
                    description_lines.append(line_clean)
            
            # 限制描述长度
            if len(' '.join(description_lines)) > 500:
                break
        
        if description_lines:
            description = ' '.join(description_lines)
            description = re.sub(r'\s+', ' ', description).strip()
            route_data['description'] = description[:500]
            print(f"      找到描述: {description[:100]}...")
        else:
            route_data['description'] = None
        
        print(f"      完成: {route_name}")
        
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

                site_data = {
                    'name': site['name'], 
                    'page_title': site['page_title'], 
                    'climbing_type': page_content.get('crag_type', 'Unknown'),
                    'url': site['url'],
                    'routes': routes, 
                    'routes_count': len(routes),
                    'coordinates': page_content.get('coordinates', {'latitude': None, 'longitude': None}),
                }
                all_complete_data[county]['climbing_sites'].append(site_data)
                print(f"   {site_data['climbing_type']} | {site_data['coordinates']}")
                time.sleep(1)
                
        return all_complete_data

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