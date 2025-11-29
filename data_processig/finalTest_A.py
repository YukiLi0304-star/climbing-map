import requests
import json
import re
import time
from bs4 import BeautifulSoup
import urllib.parse

MANUAL_COORDS = {
    "Dalkey Quarry": {"lat": 53.272, "lng": -6.108},
    "Fair Head": {"lat": 55.216, "lng": -6.136},
    "Glendalough": {"lat": 53.012, "lng": -6.355},
    "Burren": {"lat": 53.056, "lng": -9.167},
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


    def _fetch_coords_from_osm(self, query):
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
            print(f"      🔍 尝试去 OSM 搜索: '{clean_query}' ...")
            
            time.sleep(1.5) 
            
            resp = requests.get(search_url, params=params, headers=headers, timeout=10)

            if resp.status_code != 200:
                print(f"      ❌ OSM 拒绝访问 (代码 {resp.status_code})。可能是 User-Agent 问题。")
                return None

            data = resp.json()
            
            if data and len(data) > 0:
                lat = float(data[0]['lat'])
                lng = float(data[0]['lon'])
                print(f"      🌍 [OSM成功] {clean_query} -> {lat}, {lng}")
                return {"lat": lat, "lng": lng}
            else:
                print(f"      ⚠️ OSM 没找到这个地点")
                
        except json.JSONDecodeError:
            print(f"      ❌ OSM 返回格式错误 (可能被防火墙拦截)")
        except Exception as e:
            print(f"      ❌ OSM 搜索报错: {e}")
            
        return None

    def _extract_coordinates_logic(self, title, wikitext):
        if title in MANUAL_COORDS:
            return MANUAL_COORDS[title]

        try:
            coord_pattern = r"\{\{[Cc]oord\|([0-9\.]+)\|([0-9\.\-]+)\}\}"
            match = re.search(coord_pattern, wikitext, re.IGNORECASE)
            if match:
                return {"lat": float(match.group(1)), "lng": float(match.group(2))}
        except:
            pass

        print(f"      🔍 尝试去 OSM 搜索: {title} ...")
        osm_coords = self._fetch_coords_from_osm(title)
        if osm_coords:
            return osm_coords

        return {"lat": None, "lng": None}

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
                    plain_routes_text = self._wikitext_to_plain(routes_section)
                    
                    coordinates = self._extract_coordinates_logic(clean_title, content)
                    
                    crag_type = self._determine_crag_type(content)

                    return {
                        'title': clean_title,
                        'content': content,
                        'plain_text': plain_routes_text,
                        'coordinates': coordinates,
                        'crag_type': crag_type
                    }

            return {'error': '页面不存在', 'page_title': clean_title}
            
        except Exception as e:
            print(f"    API请求失败: {str(e)}")
            return {'error': str(e), 'page_title': page_title}


    def get_climbing_routes_from_page(self, page_content):
        routes = []
        if not page_content or 'error' in page_content: return routes
        plain_text = page_content.get('plain_text', '') or ''
        if not plain_text: return routes

        lines = [line.strip() for line in plain_text.split('\n') if line.strip()]
        seen_names = set()

        for line in lines:
            parsed = self._parse_route_line(line)
            if not parsed: continue
            name = parsed['name']
            if name in seen_names: continue
            
            route_data = {
                'name': name,
                'height': parsed['height'],
                'difficulty': parsed['difficulty'],
                'overall_grade': parsed['overall_grade'],
                'technical_grade': parsed['technical_grade'],
                'sub_routes': [],
            }
            self.enrich_route_data(route_data, plain_text, name)
            routes.append(route_data)
            seen_names.add(name)

        print(f"    找到 {len(routes)} 条路线 (将只保留前 50 条)")
        return routes[:20]


    def enrich_route_data(self, route_data, content, route_name):
        pattern = r"(?m)^" + re.escape(route_name)
        match = re.search(pattern, content)
        if match:
            route_start = match.start()
        else:
            route_start = content.find(route_name)

        if route_start == -1: return

        remaining_content = content[route_start:]
        
        next_route_pattern = r'\n\d+[a-zA-Z]?\.?\s+[A-Z]'
        next_route_match = re.search(next_route_pattern, remaining_content[len(route_name):])

        if next_route_match:
            route_content = remaining_content[:len(route_name) + next_route_match.start()]
        else:
            route_content = remaining_content

        fa_text = ""
        first_ascent_match = re.search(r'\n(.+?\d{4}.*?)\n', route_content)
        if first_ascent_match:
            fa_text = self.clean_text(first_ascent_match.group(1))
            if len(fa_text) > 5:
                route_data['first_ascent'] = fa_text

        lines = route_content.split('\n')
        description_lines = []
        in_pitches = False

        for line in lines[1:]:
            line = line.strip()
            if not line: continue
            
            if line.startswith(route_name) and (str(route_data['height']) in line or route_data['difficulty'] in line):
                continue
            
            if fa_text and line in fa_text:
                continue
            

            if re.search(r'\d{1,2}/\d{4}', line) or re.search(r'(19|20)\d{2}', line):
                if len(line) < 50 or re.search(r'[A-Z]\s+[A-Z][a-z]+', line): 
                    continue

            if re.match(r'\d+/\.\s*\d+m', line):
                in_pitches = True
                self.parse_pitch_line(route_data, line)
            
            elif not in_pitches:
                description_lines.append(line)

        if description_lines:
            route_data['description'] = ' '.join(description_lines)


    def parse_pitch_line(self, route_data, line):
        pitch_match = re.match(r'(\d+)/\.\s*(\d+)m\s*([\dabc+/]+)?\s*(.*)', line)
        if pitch_match:
            sub_route = {'pitch_number': int(pitch_match.group(1)), 'height': int(pitch_match.group(2)), 'description': self.clean_text(pitch_match.group(4))}
            if pitch_match.group(3): sub_route['technical_grade'] = pitch_match.group(3)
            route_data['sub_routes'].append(sub_route)

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
                    'coordinates': page_content.get('coordinates', {'lat': None, 'lng': None}),
                    'type': page_content.get('crag_type', 'Unknown')
                }
                all_complete_data[county]['climbing_sites'].append(site_data)
                print(f"      📍 {site_data['type']} | {site_data['coordinates']}")
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
        print(f"\n📊 最终数据摘要: 郡 {total_counties} | 站点 {total_sites} | 路线 {total_routes}")

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
                    'url': site['url'],
                    'routes': routes, 
                    'routes_count': len(routes),
                    'coordinates': page_content.get('coordinates', {'lat': None, 'lng': None}),
                    'type': page_content.get('crag_type', 'Unknown')
                }
                all_complete_data[county]['climbing_sites'].append(site_data)
                print(f"      📍 {site_data['type']} | {site_data['coordinates']}")
                time.sleep(1)
                
        return all_complete_data


if __name__ == "__main__":
    collector = IrishClimbingRobust()

    Antrim_data = collector.collect_county_data("Antrim", max_sites=3)
    if Antrim_data:
        collector.save_complete_data(Antrim_data, 'test_antrim_data.json')
        collector.generate_summary(Antrim_data)
    else:
        print("未找到 Antrim 郡的数据")
    Cavan_data = collector.collect_county_data("Cavan", max_sites=3)
    if Antrim_data:
        collector.save_complete_data(Cavan_data, 'test_Cavan_data.json')
        collector.generate_summary(Cavan_data)
    else:
        print("未找到 Cavan 郡的数据")
