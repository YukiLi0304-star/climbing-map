import requests
import json
import re
import time
from bs4 import BeautifulSoup
import urllib.parse


class IrishClimbingRobust:
    def __init__(self):
        self.base_url = "http://wiki.climbing.ie"
        self.api_url = "http://wiki.climbing.ie/api.php"
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })

    
    def get_all_counties_and_sites_via_scraping(self):
        """通过网页爬取获取所有郡和攀岩点列表"""
        print("通过网页爬取获取郡和攀岩点列表...")

        try:
            response = self.session.get(
                f"{self.base_url}/index.php?title=Irish_Climbing_Wiki"
            )
            soup = BeautifulSoup(response.content, 'html.parser')

            all_data = {}
            current_county = None

            for element in soup.find_all(['h1', 'h2', 'h3', 'ul', 'p']):
                if element.name in ['h1', 'h2', 'h3']:
                    text = element.get_text().strip()
                    text = re.sub(r'\[edit\]', '', text).strip()

                    if text.startswith('Co. ') and len(text) > 5:
                        current_county = text
                        all_data[current_county] = {
                            'county_info': {'name': current_county},
                            'climbing_sites': []
                        }
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
        """
        从整篇 wikitext 中截取出 Routes / Climbs 那一节，
        如果找不到，就返回全文兜底
        """
        if not full_text:
            return ""

        pattern = r'==+\s*(Routes?|Climbs?)\s*==+'
        m = re.search(pattern, full_text, flags=re.IGNORECASE)
        if not m:
            return full_text

        start = m.end()
        m2 = re.search(r'\n==[^=].*?==', full_text[start:], flags=re.IGNORECASE)
        if m2:
            end = start + m2.start()
            return full_text[start:end]

        return full_text[start:]

    def _wikitext_to_plain(self, text: str) -> str:
        """把 MediaWiki 的 wikitext 大致清洗成纯文本"""
        if not text:
            return ""

        text = re.sub(r'<!--.*?-->', '', text, flags=re.DOTALL)
        text = re.sub(r'\{\{.*?\}\}', '', text, flags=re.DOTALL)
        text = re.sub(r'\[\[File:.*?\]\]', '', text, flags=re.IGNORECASE)

        text = re.sub(r'\[\[(?:[^|\]]*\|)?([^\]]+)\]\]', r'\1', text)
        text = re.sub(r'\[(?:https?://[^\s]+)\s+([^\]]+)\]', r'\1', text)

        text = text.replace('<br>', '\n').replace('<br/>', '\n').replace('<br />', '\n')
        text = re.sub(r"'''(.*?)'''", r'**\1**', text)  
        text = re.sub(r"''(.*?)''", r'**\1**', text)

        text = re.sub(r'[ \t]+', ' ', text)
        text = re.sub(r'\n\s*\n+', '\n', text)

        return text.strip()

    
    def clean_route_name(self, name: str) -> str:
        """清理路线名：去编号、星号、多余符号"""
        if not name:
            return ""

        name = re.sub(r'^\s*\d+[a-zA-Z]?\.?\s*', '', name)  
        cleaned = re.sub(r'[\*\#\|\-]+', ' ', name)
        cleaned = re.sub(r'\s+', ' ', cleaned)
        cleaned = cleaned.strip(' \t\n\r\"\'')
        return cleaned
    def extract_climbing_type(self, page_content: str) -> str:
        """
        从页面内容中提取攀岩类型
        基于关键词识别，如果都没识别到就返回 'other'
        """
        if not page_content:
            return 'other'
    
        content_lower = page_content.lower()
    
        
        type_keywords = {
            'cliff': 'sea cliff',
            'coastal': 'sea cliff', 
            'sea': 'sea cliff',
            'tidal': 'sea cliff',
            'ocean': 'sea cliff',
            'sport': 'sport climbing',
            'bolted': 'sport climbing',
            'boulder': 'bouldering',
            'boulderring': 'bouldering',
            'trad': 'trad climbing',
            'traditional': 'trad climbing',
            'gear': 'trad climbing',
            'quarry': 'quarry',
            'indoor': 'indoor climbing'
        }
    
        
        for keyword, climbing_type in type_keywords.items():
            if keyword in content_lower:
                print(f"    🎯 识别到类型 '{climbing_type}' (关键词: {keyword})")
                return climbing_type
    
        
        print("    ⚠️  未识别到具体类型，标记为 'other'")
        return 'other'
    
    

    def _looks_like_grade(self, difficulty: str) -> bool:
        """判断字符串看起来是不是攀岩等级（只接受带字母的）"""
        if not difficulty:
            return False

        d = difficulty.strip()

        
        uk_trad_grades = {
            "M", "MS","D", "VD", "Diff", "VDiff", "HVD",
            "S", "HS", "VS", "HVS",
            "E1", "E2", "E3", "E4", "E5", "E6", "E7", "E8", "E9"
        }
        if d in uk_trad_grades:
            return True

        
        if re.fullmatch(r"E[1-9](/[1-9])?", d):
            return True

        
        dl = d.lower()

        
        if re.fullmatch(r"[3-9][abc][+-]?", dl):
            return True

        
        if re.fullmatch(r"[3-9][ABCD][+-]?", d):
            return True

        
        return False

    def _parse_route_line(self, line: str):
        """
        解析一行：
        - Backwoods Jellyroll * 18m VS (4c)
        - Lucky Strike ** 28m VS 5a
        - W1a Black Mass HS 4b
        - JIMMY CALNEY E1 5c
        - C1a DEDALUS VS 4b
        - Deep Chimney D
        返回 dict 或 None
        """
        if not line:
            return None

        line = line.strip()
        if len(line) < 4:
            return None
        
        if len(line) > 80:
            return None
        
        
        descriptive_words = [
            'situated', 'located', 'approach', 'description', 'roadside',
            'crag', 'buttress', 'cliff', 'rock', 'formation', 'quickly',
            'after', 'rain', 'routes', 'climbs', 'miles', 'north', 'south',
            'east', 'west', 'village', 'coast', 'road', 'grid', 'ref'
        ]
    
        line_lower = line.lower()
        descriptive_word_count = sum(1 for word in descriptive_words if word in line_lower)
        if descriptive_word_count >= 2:  
            return None

        
        line = re.sub(r'^\s*\d+[a-zA-Z]?\.?\s*', '', line)
        line = line.strip()
        if not line:
            return None

        tokens = line.split()
        if len(tokens) < 2:
            return None

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

        if not grade_indices:
            
            return None

        
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
        if height_idx is not None:
            cut_positions.append(height_idx)
        if grade_indices:
            cut_positions.append(grade_indices[0])
        if not cut_positions:
            return None

        name_end = min(cut_positions)
        name_tokens = [t for t in tokens[:name_end] if t not in ['*', '**']]
        raw_name = " ".join(name_tokens)
        route_name = self.clean_route_name(raw_name)

        if (not route_name or
                len(route_name) < 1 or
                len(route_name) > 40 or  
                route_name.lower() in ['the', 'and', 'or', 'if', 'start', 'small', 'but', 'entertaining'] or
                any(word in route_name.lower() for word in ['situated', 'roadside', 'crag', 'miles']) or
                route_name[0].islower()):  
            return None

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

    
    def get_full_page_content_via_api(self, page_title):
        """通过API获取完整的页面内容"""
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

                    climbing_type = self.extract_climbing_type(content)
                    routes_section = self._extract_routes_section(content)
                    plain_routes_text = self._wikitext_to_plain(routes_section)

                    return {
                        'title': clean_title,
                        'content': content,
                        'plain_text': plain_routes_text,
                        'climbing_type': climbing_type
                    }

            return {'error': '页面不存在', 'page_title': clean_title}

        except Exception as e:
            print(f"    API请求失败: {str(e)}")
            return {'error': str(e), 'page_title': page_title}

    def get_climbing_routes_from_page(self, page_content):
        """从页面纯文本中解析出路线列表 - 增强版，支持粗体格式"""
        routes = []

        if not page_content or 'error' in page_content:
            return routes

        plain_text = page_content.get('plain_text', '') or ''
        if not plain_text:
            return routes
        
        print(f"    处理后的文本前500字符:")
        print(f"    {plain_text[:500]}")

        
        bold_routes = self._parse_bold_format_routes(plain_text)
        if bold_routes:
            routes.extend(bold_routes)
        else:
            
            routes = self._parse_line_format_routes(plain_text)
            print(f"    通过行格式找到 {len(routes)} 条路线")

        return routes

    
    def enrich_route_data(self, route_data, content, route_name):
        """精确丰富路线数据，避免污染描述字段"""
        if not content or not route_name:
            return
    
        
        escaped_name = re.escape(route_name)
        title_patterns = [
            rf'\*\*{escaped_name}\s+(\d+m)\s+([A-Za-z0-9/]+)\s*\**\*\*',  
            rf'\*\*{escaped_name}\*\*\s+(\d+m)\s+([A-Za-z0-9/]+)\s*\**',   
            rf'{escaped_name}\s+(\d+m)\s+([A-Za-z0-9/]+)\s*\**',           
        ]
    
        route_match = None
        route_start = -1
    
        
        for pattern in title_patterns:
            route_match = re.search(pattern, content)
            if route_match:
                route_start = route_match.start()
                break
    
        if route_start == -1:
            return  
    
        
        remaining_content = content[route_start:]
    
        
        next_route_patterns = [
            r'\n\s*\*\*[^*]+\s+\d+m\s+[A-Z]',      
            r'\n\s*\d+[a-zA-Z]?\.?\s+[A-Z]',       
            r'\n\s*[A-Z][A-Za-z]*(?:\s+[A-Z][A-Za-z]*)*\s+\d+m\s+[A-Z]',  
        ]
    
        
        title_end = route_match.end()
        content_after_title = remaining_content[title_end:]
    
        next_route_start = len(content_after_title)  
    
        for pattern in next_route_patterns:
            match = re.search(pattern, content_after_title)
            if match and match.start() < next_route_start:
                next_route_start = match.start()
                break
    
        
        if next_route_start < len(content_after_title):
            route_specific_content = content_after_title[:next_route_start]
        else:
            route_specific_content = content_after_title
    
        
        first_ascent_patterns = [
            r'^([A-Z][^\.]+?\.\s*\d{2,4}[^\.]*\.)',  
            r'^([A-Z][^\.]+?\d{4}[^\.]*\.)',         
            r'([A-Z][^\.]+?\.\s*\d{2,4}[^\.]*\.)',   
        ]
    
        first_ascent_text = None
        remaining_description = route_specific_content
    
        for pattern in first_ascent_patterns:
            match = re.search(pattern, route_specific_content)
            if match:
                first_ascent_text = match.group(1).strip()
                
                remaining_description = route_specific_content[match.end():].strip()
                break
    
        if first_ascent_text:
            route_data['first_ascent'] = self.clean_text(first_ascent_text)
    
        
        clean_description = remaining_description
    
        
        clean_description = re.sub(r'\*\*.+?\d+m\s+[A-Z].+?\*\*', '', clean_description)
        clean_description = re.sub(r'^\s*[A-Z].*?\d+m\s+[A-Z].*?$', '', clean_description, flags=re.MULTILINE)
    
        
        clean_description = re.sub(r'\s+', ' ', clean_description)
        clean_description = clean_description.strip()
    
        
        if clean_description and len(clean_description) > 5:  
            route_data['description'] = clean_description
    
        
        self._parse_sub_routes(route_data, route_specific_content)
    def _parse_sub_routes(self, route_data, content):
        """解析子路线信息"""
        if not content:
            return
    
        lines = content.split('\n')
        for line in lines:
            line = line.strip()
            if not line:
                continue
        
            
            pitch_patterns = [
                r'(\d+)/\s*\.?\s*(\d+)m\s*([\w/+]+)?\s*(.*)',  
                r'Pitch\s+(\d+)[:\s]*(\d+)m\s*([\w/+]+)?\s*(.*)',  
            ]
        
            for pattern in pitch_patterns:
                match = re.match(pattern, line, re.IGNORECASE)
                if match:
                    pitch_data = {
                        'pitch_number': int(match.group(1)),
                        'height': int(match.group(2)),
                        'description': self.clean_text(match.group(4)) if match.group(4) else None
                    }   
                
                    if match.group(3):  
                        pitch_data['technical_grade'] = match.group(3)
                
                    route_data['sub_routes'].append(pitch_data)
                    break

    def parse_pitch_line(self, route_data, line):
        """解析子路线行"""
        pitch_match = re.match(r'(\d+)/\.\s*(\d+)m\s*([\dabc+/]+)?\s*(.*)', line)
        if pitch_match:
            pitch_number = int(pitch_match.group(1))
            height = int(pitch_match.group(2))
            technical_grade = pitch_match.group(3) if pitch_match.group(3) else None
            description = self.clean_text(pitch_match.group(4))

            sub_route = {
                'pitch_number': pitch_number,
                'height': height,
                'description': description
            }

            if technical_grade:
                sub_route['technical_grade'] = technical_grade

            route_data['sub_routes'].append(sub_route)

    def clean_text(self, text):
        """清理普通文本"""
        if not text:
            return ""
        cleaned = re.sub(r'\s+', ' ', text)
        return cleaned.strip()

    
    def _clean_page_title(self, page_title):
        cleaned = urllib.parse.unquote(page_title)
        cleaned = cleaned.replace('%27', "'")
        cleaned = cleaned.replace('%28', '(')
        cleaned = cleaned.replace('%29', ')')
        return cleaned

    def _is_valid_climbing_site(self, text, href):
        if not text or len(text) < 3:
            return False

        exclude_texts = [
            'edit', 'search', 'category', 'file', 'template', 'user',
            'special', 'talk', 'main page', 'discussion', 'create account',
            'log in', 'navigation', 'page', 'read', 'view source', 'history'
        ]

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
            title = href.split('title=')[1].split('&')[0]
            return title
        return href.replace('/', '')

    def _parse_bold_format_routes(self, plain_text: str) -> list:
        """专门解析粗体格式的路线：现在只处理 **格式**"""
        routes = []
        seen_names = set()
    
        
        bold_pattern = r'\*\*([^*]+?)\s+(\d+)m\s+([A-Z/]+)\*\*'
    
        matches = re.findall(bold_pattern, plain_text)
    
        for match in matches:
            raw_name = match[0].strip()
            height = int(match[1])
            difficulty = match[2].strip()
        
            
            route_name = self.clean_route_name(raw_name)
        
            if not route_name or route_name in seen_names:
                continue
            
            
            if not self._looks_like_grade(difficulty):
                continue
            
            route_data = {
                'name': route_name,
                'height': height,
                'difficulty': difficulty,
                'overall_grade': difficulty,
                'technical_grade': None,
                'sub_routes': [],
                'format': 'bold'
            }
        
            
            self.enrich_route_data(route_data, plain_text, route_name)
        
            routes.append(route_data)
            seen_names.add(route_name)
    
        if matches:
            print(f"    通过粗体格式找到 {len(routes)} 条路线")
    
        return routes
    
    def _parse_line_format_routes(self, plain_text: str):
        routes = []
        seen_names = set()
    
        lines = [line.strip() for line in plain_text.split('\n') if line.strip()]

        for line in lines:
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
                'format': 'line'
            }

            self.enrich_route_data(route_data, plain_text, name)
            routes.append(route_data)
            seen_names.add(name)
    
        return routes

    
    def collect_county_data(self, county_keyword: str, max_sites: int | None = None):
        """
        只抓某一个郡的所有攀岩点详细信息，用来做 demo / 调试。
        county_keyword: 可以是 'Co. Cavan' 或者 'Cavan' 这样的关键字
        max_sites: (可选) 限制最多抓多少个攀岩点，调试时可以设一个小数字
        """
        print(f"只收集包含关键字 '{county_keyword}' 的郡的数据...")
        print("=" * 60)

        all_structure = self.get_all_counties_and_sites_via_scraping()
        if not all_structure:
            print("无法获取基础结构数据")
            return {}

        
        selected = {
            county: data
            for county, data in all_structure.items()
            if county_keyword.lower() in county.lower()
        }

        if not selected:
            print(f"没有找到包含 '{county_keyword}' 的郡名")
            return {}

        for county in selected.keys():
            print(f"将处理郡: {county}")

        all_complete_data = {}

        for county, county_data in selected.items():
            print(f"\n处理郡: {county}")
            print("-" * 40)

            all_complete_data[county] = {
                'county_info': county_data['county_info'],
                'climbing_sites': []
            }

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
                    'climbing_type': page_content.get('climbing_type', 'other'),
                    'url': site['url'],
                    'routes': routes,
                    'routes_count': len(routes),
                    'coordinates': {
                        'latitude': None,
                        'longitude': None
                    }
                }

                all_complete_data[county]['climbing_sites'].append(site_data)

                for r in routes[:2]:
                    print(f"    - {r['name']} ({r['height'] or '?'}m {r['difficulty']})")
                if len(routes) > 2:
                    print(f"    ... 还有 {len(routes) - 2} 条路线")
                if not routes:
                    print("    ⚠️ 未识别出任何路线（可能页面格式比较特别）")

                time.sleep(1)

        return all_complete_data
    
    def collect_all_data(self):
        """主函数：收集所有数据"""
        print("开始完整的爱尔兰攀岩数据收集...")
        print("=" * 60)

        all_structure = self.get_all_counties_and_sites_via_scraping()

        if not all_structure:
            print("无法获取基础结构数据")
            return {}

        total_sites = sum(len(data['climbing_sites']) for data in all_structure.values())
        print(f"\n=== 基础结构获取完成 ===")
        print(f"总共找到 {len(all_structure)} 个郡")
        print(f"总共找到 {total_sites} 个攀岩点")

        all_complete_data = {}

        for county, county_data in all_structure.items():
            print(f"\n处理郡: {county}")
            print("-" * 40)

            all_complete_data[county] = {
                'county_info': county_data['county_info'],
                'climbing_sites': []
            }

            for site in county_data['climbing_sites']:
                print(f"  正在处理: {site['name']}")

                page_content = self.get_full_page_content_via_api(site['page_title'])
                routes = self.get_climbing_routes_from_page(page_content)

                site_data = {
                    'name': site['name'],
                    'page_title': site['page_title'],
                    'climbing_type': page_content.get('climbing_type', 'other'),
                    'url': site['url'],
                    'routes': routes,
                    'routes_count': len(routes),
                    'coordinates': {
                        'latitude': None,
                        'longitude': None
                    }
                }

                all_complete_data[county]['climbing_sites'].append(site_data)

                for r in routes[:2]:
                    print(f"    - {r['name']} ({r['height'] or '?'}m {r['difficulty']})")
                if len(routes) > 2:
                    print(f"    ... 还有 {len(routes) - 2} 条路线")
                if not routes:
                    print("    ⚠️ 未识别出任何路线（可能页面格式比较特别）")

                time.sleep(1)

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

        print(f"\n📊 最终数据摘要:")
        print(f"  总郡数: {total_counties}")
        print(f"  总攀岩点: {total_sites}")
        print(f"  总路线数: {total_routes}")

        print(f"\n📈 各郡统计:")
        for county, county_data in data.items():
            county_routes = sum(len(site['routes']) for site in county_data['climbing_sites'])
            print(f"  {county}: {len(county_data['climbing_sites'])} 个攀岩点, {county_routes} 条路线")



if __name__ == "__main__":
    collector = IrishClimbingRobust()

    
    print("=== 测试单个郡 ===")
    test_data = collector.collect_county_data("Antrim", max_sites=3)  
    
    if test_data:
        collector.save_complete_data(test_data, 'test_Antrim_data.json')
        collector.generate_summary(test_data)