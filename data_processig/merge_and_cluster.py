import json
import os
from sklearn.cluster import DBSCAN, KMeans
import numpy as np

# 你所有郡的 JSON 文件列表（根据实际文件名修改）
county_files = [
    'test_antrim_data2.json',
    'test_armagh_data2.json',
    'test_carlow_data2.json',
    'test_cavan_data2.json',
    'test_clare_data2.json',
    'test_cork_data2.json',
    'test_donegal_data2.json',
    'test_down_data2.json',
    'test_dublin_data2.json',
    'test_fermanagh_data2.json',
    'test_galway_data2.json',
    'test_kerry_data2.json',
    'test_kilkenny_data2.json',
    'test_kilkenny_data2.json',
    'test_laighin_data2.json',
    'test_leitrim_data2.json',
    'test_limerick_data2.json',
    'test_longford_data2.json',
    'test_louth_data2.json',
    'test_mayo_data2.json',
    'test_meath_data2.json',
    'test_monaghan_data2.json',
    'test_offaly_data2.json',
    'test_rosscommon_data2.json',
    'test_sligo_data2.json',
    'test_tiperrary_data2.json',
    'test_waterford_data2.json',
    'test_westmeath_data2.json',
    'test_wexford_data2.json',
    'test_wicklow_data2.json'
]

MANUAL_COORDINATES = {
    "Ballygalley Head": {"lat": 54.899768, "lon": -5.8430564},
    "Garron Point": {"lat": 55.044327, "lon": -5.9636919},
    "Musaem Ultach": {"lat": 54.61082452160819, "lon": -5.940261633305295},
    "Cloch An tSagairt / Carrignahasta": {"lat": 54.172303, "lon": -7.9440874},
    "Englishman's House Crag": {"lat": 54.239700, "lon": -7.9792766},
    "The Playbank": {"lat": 54.183991, "lon": -7.9624540},
    "Ailladie": {"lat": 53.07085618147317, "lon": -9.354521619848027},
    "Ailladie DWS Routes": {"lat": 53.06938269157951, "lon": -9.358451391911105},
    "Aill na Cronain": {"lat": 53.09596652591798, "lon": -9.144287340281105},
    "Aillnagapple": {"lat": 53.122266, "lon": -9.101277},
    "Aran Islands": {"lat": 53.13595125158755, "lon": -9.775660124588057},
    "Ballyryan": {"lat": 53.17451489954013, "lon": -9.390433899659381},
    "Ballynahown":{"lat": 53.067388, "lon": -9.334954},
    "Ceann Capaill": {"lat": 53.07115829336483, "lon": -9.359705081373079},
    "Cliffs Of Moher": {"lat": 52.964067, "lon": -9.4400518},
    "Croagh North/Rathborney Valley": {"lat": 53.094191, "lon": -9.1816252},
    "Doolin": {"lat": 53.02402019444805, "lon": -9.39609563179353},
    "Eagles Rock": {"lat": 53.076307, "lon": -8.998787},
    "Fanore More": {"lat": 53.10536239793872, "lon": -9.295547145994309},
    "Loop Head": {"lat": 52.560616, "lon": -9.9326811},
    "Moneen": {"lat": 53.117204561626636, "lon": -9.084488379818408},
    "Mullach Mor": {"lat": 53.00748071272914, "lon": -9.005975466625964},
    "Murroughkilly": {"lat": 53.13508776659254, "lon": -9.248790450971583},
    "Sliabh Rua": {"lat": 53.006654852019565, "lon": -9.042485915938084},
    "Oughtdarra": {"lat": 53.11032479090399, "lon": -9.327885800688207},
    "Scailp Na Seisri": {"lat": 52.96430513555103, "lon": -8.78254156583025},
    "Adrigole": {"lat": 51.69703559301246, "lon": -9.723247999854827},
    "Allihies": {"lat": 51.649274937256536, "lon": -10.038061821475074},
    "Barry's Head": {"lat": 52.26976549735654, "lon": -8.412165058994592},
    "Black Ball Head": {"lat": 51.93986112217122, "lon": -7.818375165799942},
    "Cape Clear Island": {"lat": 51.424889, "lon": -9.519918},
    "Castletownroche": {"lat": 52.150226, "lon": -8.434028},
    "Cumeengadhra": {"lat": 51.72332672908744, "lon": -9.756742208368028},
    "Glengarriff": {"lat": 51.750237002605466, "lon": -9.552411053375456},
    "Gowlbeg Mountain": {"lat": 51.707573, "lon": -9.619954},
    "Knockadoon Head": {"lat": 51.877993, "lon": -7.871538},
    "Mizen Head": {"lat": 51.454466, "lon": -9.812773},
    "Old Head Of Kinsale": {"lat": 51.605408, "lon": -8.532379},
    "Oysterhaven": {"lat": 51.688332, "lon": -8.428901},
    "Roberts Cove/Roberts Head": {"lat": 51.732233, "lon": -8.314014},
    "Sands Cove": {"lat": 51.55273899652469, "lon": -8.898379948300553},
    "Seven Heads": {"lat": 51.570303, "lon": -8.713385},
    "Sheeps Head": {"lat": 51.560510, "lon": -9.7342093},
    "Sherkin Island": {"lat": 51.468471, "lon": -9.416227},
    "Whiteball Head": {"lat": 51.594382, "lon": -10.050173},
    "Sperrin Mountains": {"lat": 54.881152904355325, "lon": -6.9152901981189325},
    "Alnadue Quarry": {"lat": 54.247531526114365, "lon": -5.987275821901865},
    "Annalong Buttress": {"lat": 54.11324808518896, "lon": -5.896021728201488},
    "Ben Crom": {"lat": 54.19695523627281, "lon": -6.000632145805122},
    "Bearnagh Slabs": {"lat": 54.202842876562244, "lon": -5.987571577375912},
    "Bearnagh Tors": {"lat": 54.18801270783289, "lon": -5.985209556562492},
    "Binnian Lough Buttress": {"lat": 54.15167896420869, "lon": -5.972937931433373},
    "Binnian Tors": {"lat": 54.15461636308752, "lon": -5.980978484719028},
    "Blue Lough Buttress": {"lat": 54.1591934808425, "lon": -5.968506094838544},
    "Buzzard's Roost": {"lat": 54.158040, "lon": -5.9782904},
    "Chimney Rock Mountain" : {"lat": 54.25912432838213, "lon": -6.0518083550039865},
    "Doan": {"lat": 54.167504, "lon": -6.0069283},
    "Douglas Crag": {"lat": 54.150650, "lon": -5.9664031},
    "Eagle Mountain": {"lat": 54.135642, "lon": -6.0926285},
    "Eagle Rocks": {"lat": 54.186786, "lon": -5.9247901},
    "Hare's Castle": {"lat": 54.245990923860106, "lon": -5.958968050765367},
    "Hen Mountain": {"lat": 54.24071629483469, "lon": -6.130098941259329},
    "Little Binnian": {"lat":54.302497444359496, "lon": -6.03739712994851},
    "Lower Cove": {"lat": 54.128685, "lon": -5.9429973},
    "Meelmore": {"lat": 54.289027440592676, "lon": -6.004977864431485},
    "Pigeon Rock": {"lat": 54.16533918351656, "lon": -6.068896873339742},
    "Slieve Beg": {"lat": 54.18542317835022, "lon": -5.946968799963725},
    "Slieve Commedagh": {"lat": 54.19195224876853, "lon": -5.937161221040189},
    "Slievemageogh": {"lat": 54.25915441222106, "lon": -6.078212076656391},
    "Slieve Lamagan": {"lat": 54.168717587508354, "lon": -5.966136981104991},
    "Slievenaglogh Buttress": {"lat": 54.4144760128664, "lon": -6.016184226167725},
    "Spellack": {"lat": 54.197754, "lon": -5.9886131},
    "Upper Cove": {"lat": 54.128685, "lon": -5.9429973},
    "Unnamed Tor": {"lat": 54.148164, "lon": -5.983834},
    "Dalkey Quarry":{"lat": 53.27138770620197, "lon": -6.107532286156922},
    "Howth Head": {"lat": 53.390310019416944, "lon": -6.045464217456754},
    "Ireland's Eye":{"lat": 53.40787400037956, "lon": -6.058602529197036},
    "The Scalp":{"lat": 53.21184808424381, "lon": -6.1716302650034},
    "Benaughlin": {"lat": 54.232203, "lon": -7.7262278},
    "Crag With A View": {"lat": 54.272818, "lon": -7.8242090},
    "Cuilcagh Gap": {"lat": 54.215349, "lon": -7.8489816},
    "The Fosstra": {"lat": 54.271924, "lon": -7.8272831},
    "Hanging Rock": {"lat": 54.39054505429748, "lon": -7.89645854943997},
    "Knockmore": {"lat": 54.404950, "lon": -7.8698471},
    "Monastir Sink": {"lat": 54.251245, "lon": -7.8181633},
    "Skreen Rock": {"lat": 54.265607, "lon": -7.8088908},
    "Wheathill Rock": {"lat": 54.261086, "lon": -7.7920297},
    "Coolrakan Quarry": {"lat": 54.524271875120526, "lon": -7.8749819474559875},
    "Aran Islands": {"lat": 53.108083, "lon": -9.709576},
    "Binn Braon": {"lat": 53.508349, "lon": -9.832390},
    "Cnoc Mordáin": {"lat": 53.38045290696549, "lon": -9.70798650829127},
    "Diamond Hill": {"lat": 53.55032422955687, "lon": -9.914532921291539},
    "Errisbeg": {"lat": 53.39878581097253, "lon": -9.958932107995473},
    "Gleann Chochan": {"lat": 53.49698826590499, "lon": -9.809893534518832},
    "Gleann Eidhneach": {"lat": 53.518991986672575, "lon": -9.79253298171159},
    "Inagh Valley": {"lat": 53.51434966698361, "lon": -9.740151517966714},
    "Little Killary": {"lat": 53.60805615133407, "lon": -9.766478455220794},
    "Maamturks": {"lat": 53.48254622629193, "lon": -9.599829122445222},
    "Ceann Bhaile Dháith / Ballydavid Head": {"lat": 52.23285575369414, "lon": -10.360647282017522},
    "Brandon East Buttress": {"lat": 52.242602858398364, "lon": -10.294101696560197},
    "An Charraig Ard": {"lat": 52.100085051328065, "lon": -10.451074730670724},
    "Com an Lochaigh": {"lat": 52.20423156896258, "lon": -10.298795473850385},
    "An Dún Mór / Dunmore Head": {"lat": 52.11007937879707, "lon": -10.481086899911675},
    "Dún Séanna / Dunshean Head": {"lat":52.12901616835795, "lon": -10.22667914511226},
    "Glanteenassig forest": {"lat": 52.207848377218106, "lon": -10.04874301060994},
    "An Blascaod Mór / Great Blasket Island": {"lat": 52.093522901041425, "lon": -10.548944008614004},
    "Ceann Sibéal": {"lat": 52.18290492064551, "lon": -10.470052838232178},
    "Binn Diarmada": {"lat": 52.20460133932021, "lon": -10.420341716556598},
    "Cuas Croom": {"lat": 52.14507431493748, "lon": -10.331172976032228},
    "Gap Of Dunloe": {"lat":52.019511395614614, "lon": -9.634020753807484},
    "Glanearagh south": {"lat": 51.84656237164003, "lon": -10.391349385275284},
    "Illaunnaweelaun": {"lat": 51.747810, "lon": -10.100547},
    "Lamb's Head": {"lat": 51.739998, "lon": -10.134939},
    "Loo Bridge": {"lat": 51.977812837238396, "lon": -9.332394373070771},
    "Maghancoosaun": {"lat": 52.01777108421642, "lon": -9.815855754013741},
    "Ballykeefe Quarry": {"lat": 52.60988385664857, "lon": -7.400515172899681},
    "Knockdrinna": {"lat": 52.506091407145, "lon": -7.241643832978418},
    "Cloch An tSagairt / Carrignahasta": {"lat": 54.168711, "lon": -7.9471548},
    "King's Rock": {"lat": 54.13230698679976, "lon": -7.989750330435332},
    "Mass Rock": {"lat":54.09880315987047, "lon": -7.974482458839324},
    "The Doons": {"lat": 54.285969, "lon": -8.3309171},
    "Swiss Valley": {"lat": 54.346006, "lon": -8.383216},
    "Slievenaglogh": {"lat": 54.0178247467604, "lon": -6.265703867854769},
    "Long Woman's Grave, Cooleys - The Thing In The Forest": {"lat": 54.066793949280324, "lon": -6.279619932356629},
    "Clogherhead": {"lat": 53.79420520139857, "lon": -6.23867971716298},
    "Achill": {"lat": 53.99771566344582, "lon": -10.175992378391788},
    "Achill Atlantic Drive": {"lat":53.87616156388723, "lon": -9.959722325545195},
    "Achillbeg Island": {"lat": 53.86646134328796, "lon": -9.952288600050665},
    "Benwee Head": {"lat":54.338760837679416, "lon": -9.8183746851223},
    "Clare Island": {"lat": 53.80719389230989, "lon": -10.000544862735456},
    "Coum Gowlaun": {"lat": 53.645183, "lon": -9.5841495},
    "Doo Lough": {"lat": 53.641049, "lon": -9.7518614},
    "Glen Loss Point": {"lat": 54.31590881916907, "lon": -9.500639364052716},
    "Inishkea Island": {"lat": 54.13082029632282, "lon": -10.208157271977418},
    "Iorras - Ceann an Eannaigh": {"lat":54.26757637442341, "lon": -10.11255198826907},
    "Iorras - Doonamo Point": {"lat": 54.270888262531315, "lon": -10.080482024901707},
    "Iorras - Gleann Lára": {"lat": 54.291221555637556, "lon": -9.988287171197415},
    "Inishturk Island": {"lat": 53.70286118986131, "lon": -10.10773872385007},
    "Killary Crags": {"lat": 53.605575, "lon": -9.7806140},
    "Derreennawinshin": {"lat":53.619285, "lon": -9.8250265},
    "Mweelrea": {"lat": 53.63937072711347, "lon": -9.830828465282123},
    "Portacloy": {"lat":54.33284501013709, "lon": -9.773955294551843},
    "Srahnalong Valley / An Scoltach": {"lat":54.31250619471283, "lon": -9.66580229243825},
    "Tangincartoor": {"lat": 53.72051882494716, "lon": -9.713071113081716},
    "Silver River Crag": {"lat": 53.12454961698092, "lon": -7.653265018927733},
    "Aughris Head": {"lat": 54.276748, "lon": -8.7745529},
    "Cooney Rock": {"lat": 54.39532665798014, "lon": -8.372257424193025},
    "Doomore Crag": {"lat": 54.321714011784174, "lon": -8.621732377097503},
    "Happy Valli": {"lat": 54.190869, "lon": -8.5408255},
    "Hawk Rock/Cuckoo Buttress": {"lat": 54.188905, "lon": -8.5768035},
    "Kings Mountain": {"lat": 54.343086, "lon": -8.4497853},
    "Mullaghmore/Roskeeragh Point" : {"lat": 54.453461, "lon": -8.4849167},
    "Scalp na gCapail": {"lat": 54.1976, "lon": -8.5491},
    "Slish Wood": {"lat": 54.226462, "lon": -8.3994461},
    "Tormore": {"lat": 54.346843, "lon": -8.4036884},
    "Union Woods": {"lat": 54.212718, "lon": -8.4728948},
    "Devil's bit": {"lat": 52.820809, "lon": -7.9146841},
    "Strabane Glen": {"lat": 54.838960519226596, "lon": -7.443053124523068},
    "Cookstown Quarry": {"lat": 54.67311891842048, "lon": -6.89068343928981},
    "Ardmore Head": {"lat": 51.947941656690496, "lon": -7.7096772725041465},
    "Ballinaclough": {"lat": 52.199898, "lon": -7.2152214},
    "Bunmahon": {"lat": 52.133446, "lon": -7.3755935},
    "Fauscoum": {"lat": 52.244699, "lon": -7.5263124},
    "Foill An Priosun": {"lat": 52.238299, "lon": -7.5000284},
    "Helvick Head": {"lat": 52.056425926554134, "lon": -7.538615769068466},
    "Mahon Valley": {"lat": 52.223187, "lon": -7.5411765},
    "Coum Tay": {"lat": 52.23011304482015, "lon": -7.583939618545757},
    "Nire Valley": {"lat": 52.27626314763002, "lon": -7.6307441267934095},
    "Fore": {"lat": 53.681059977081624, "lon": -7.2270168683822655},
    "Rock of Curry": {"lat":53.731945, "lon": -7.3263921},
    "Rocklands": {"lat": 52.327220384750575, "lon": -6.4526282344644656},
    "Forth Mountain": {"lat": 52.31858385531621, "lon": -6.5629811874627375},
    "Notes on Early Wicklow Climbing": {"lat": 53.20149138241841, "lon": -6.127625334191007},
    "Annalecka Buttress": {"lat": 53.053918, "lon": -6.423820},
    "Barnacullian": {"lat": 53.089457, "lon": -6.3915215},
    "Barnbawn": {"lat": 52.97715212463861, "lon": -6.188929950901404},
    "Bell Rock - Avoca": {"lat": 52.870690, "lon": -6.220830},
    "Bonfire Buttress": {"lat": 53.00281295825833, "lon": -6.12164854232816},
    "Bray Head" : {"lat": 53.175472, "lon": -6.0711736},
    "Carrick Mountain": {"lat": 52.982744, "lon": -6.1601915},
    "Carrigshouk": {"lat": 53.086355, "lon": -6.3617817},
    "Cloghoge": {"lat": 53.113767, "lon": -6.2666340},
    "Great Sugar Loaf": {"lat": 53.164131, "lon": -6.1494502},
    "Lough Bray": {"lat": 53.176134, "lon": -6.2910468},
    "Lough Dan": {"lat": 53.080941, "lon": -6.2963128},
    "Lough Nahanagan": {"lat": 53.03062896769608, "lon": -6.393227952813006},
    "Tonduff/Raven's Glen": {"lat": 52.984571813271515, "lon": -6.435008273042526},
    "Rocky Valley": {"lat": 53.1688597069476, "lon": -6.150056034438238},
    "Wicklow Head": {"lat": 52.9635465846995, "lon": -5.999404676696076},  
}

def apply_manual_corrections(site):
    """完全替换坐标（如果岩场名称在字典中）"""
    site_name = site.get('name', '')
    if site_name in MANUAL_COORDINATES:
        correct = MANUAL_COORDINATES[site_name]
        old_lat = site['coordinates']['latitude']
        old_lon = site['coordinates']['longitude']
        
        # 强制替换
        site['coordinates']['latitude'] = correct['lat']
        site['coordinates']['longitude'] = correct['lon']
        
        print(f"  替换: {site_name}")
        print(f"  旧坐标: ({old_lat}, {old_lon})")
        print(f"  新坐标: ({correct['lat']}, {correct['lon']})")
        return True
    return False

def load_all_sites():
    """加载所有郡的站点"""
    all_sites = []
    replaced_count = 0
    for file_path in county_files:
        if not os.path.exists(file_path):
            print(f"跳过: {file_path} 不存在")
            continue
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        for county, county_data in data.items():
            for site in county_data['climbing_sites']:
                if site.get('coordinates') and site['coordinates'].get('latitude'):
                    # 应用手动校正
                    if apply_manual_corrections(site):
                        replaced_count += 1

                    all_sites.append({
                        'county': county,
                        'site': site,
                        'lat': site['coordinates']['latitude'],
                        'lon': site['coordinates']['longitude']
                    })
    print(f"共加载 {len(all_sites)} 个站点")
    print(f"已替换 {replaced_count} 个站点的坐标")
    return all_sites

def add_cluster_info(all_sites):
    """添加聚类信息"""
    if len(all_sites) < 3:
        return all_sites
    
    coords = np.array([[s['lat'], s['lon']] for s in all_sites])
    
    # DBSCAN
    dbscan = DBSCAN(eps=0.1, min_samples=3)
    db_labels = dbscan.fit_predict(coords)
    
    is_noise = db_labels == -1
    valid_coords = coords[~is_noise]
    valid_indices = [i for i, noise in enumerate(is_noise) if not noise]
    
    if len(valid_coords) < 3:
        return all_sites
    
    # K-Means
    n_clusters = min(5, len(valid_coords) // 5 + 2)
    kmeans = KMeans(n_clusters=n_clusters, random_state=42)
    kmeans_labels = kmeans.fit_predict(valid_coords)
    
    # 映射结果
    for i, idx in enumerate(valid_indices):
        all_sites[idx]['cluster_id'] = int(kmeans_labels[i])
    
    for i, noise in enumerate(is_noise):
        if noise:
            all_sites[i]['cluster_id'] = -1
    
    # 生成名称
    cluster_centers = kmeans.cluster_centers_
    cluster_names = {}
    for cluster_id in range(n_clusters):
        center_lat = cluster_centers[cluster_id][0]
        center_lon = cluster_centers[cluster_id][1]
        
        if center_lat > 54.5:
            region = "North"
        elif center_lat < 53.0:
            region = "South"
        else:
            region = "Central"
        
        if center_lon < -8.5:
            region = "West " + region
        elif center_lon > -6.5:
            region = "East " + region
        
        cluster_names[cluster_id] = f"{region} Hotspot {cluster_id + 1}"
    
    for item in all_sites:
        cid = item.get('cluster_id', -1)
        item['site']['cluster_id'] = cid
        item['site']['cluster_name'] = cluster_names.get(cid, 'Isolated') if cid >= 0 else 'Isolated'
    
    # 打印统计
    print("\n聚类结果:")
    for cid in range(n_clusters):
        count = sum(1 for s in all_sites if s.get('cluster_id') == cid)
        print(f"  {cluster_names[cid]}: {count} 个站点")
    print(f"  孤立点: {sum(1 for s in all_sites if s.get('cluster_id') == -1)} 个站点")
    
    return all_sites

def save_merged(all_sites, output='merged_clustered.json'):
    """保存合并后的数据"""
    merged = {}
    for item in all_sites:
        county = item['county']
        site = item['site']
        if county not in merged:
            merged[county] = {'county_info': {'name': county}, 'climbing_sites': []}
        merged[county]['climbing_sites'].append(site)
    
    with open(output, 'w', encoding='utf-8') as f:
        json.dump(merged, f, indent=2, ensure_ascii=False)
    print(f"\n已保存到 {output}")

def export_incorrect_coordinates(all_sites, output='incorrect_coords.txt'):
    """导出坐标可能不准确的站点（供手动查找）"""
    suspicious = []
    for item in all_sites:
        lat = item['lat']
        lon = item['lon']
        # 爱尔兰大致范围
        if lat < 51.4 or lat > 55.4 or lon < -10.5 or lon > -5.5:
            suspicious.append(item)
    
    if suspicious:
        print(f"\n发现 {len(suspicious)} 个坐标可能在爱尔兰范围外，需要检查：")
        with open(output, 'w', encoding='utf-8') as f:
            for item in suspicious:
                site = item['site']
                f.write(f"{site['name']},{item['county']},{item['lat']},{item['lon']}\n")
                print(f"  - {site['name']} ({item['county']}): {item['lat']}, {item['lon']}")
        print(f"已保存到 {output}")
    else:
        print("\n所有坐标都在爱尔兰范围内")

if __name__ == "__main__":
    all_sites = load_all_sites()
    all_sites = add_cluster_info(all_sites)
    save_merged(all_sites, 'ireland_clustered.json')