
import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ClimbingSite, ClusterOption } from '../hooks/use-climbing-sites';

type Props = {
  searchText: string;
  onChangeSearchText: (v: string) => void;

  selectedCounty: string;
  onSelectCounty: (county: string) => void;
  countyOptions: string[];

  selectedCluster: number | null;
  onSelectCluster: (id: number | null) => void;
  clusterOptions: ClusterOption[];

  suggestedSites: ClimbingSite[];
  onSelectSite: (site: ClimbingSite) => void;

  showCountyDropdown: boolean;
  onToggleCountyDropdown: () => void;
};

export const SearchPanel: React.FC<Props> = ({
  searchText,
  onChangeSearchText,
  selectedCounty,
  onSelectCounty,
  countyOptions,
  selectedCluster,
  onSelectCluster,
  clusterOptions,
  suggestedSites,
  onSelectSite,
  showCountyDropdown,
  onToggleCountyDropdown,
}) => {
  return (
    <View style={styles.wrapper}>
      <View style={styles.searchBar}>
        {/* 第一行：搜索 + 郡下拉按钮 */}
        <View style={styles.topRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by County/Crag Name/Route Name"
            value={searchText}
            onChangeText={onChangeSearchText}
          />

          <Pressable
            style={styles.dropdownButton}
            onPress={onToggleCountyDropdown}
          >
            <Text style={styles.dropdownButtonText}>
              {selectedCounty === '全部'
                ? 'All counties'
                : selectedCounty.replace('Co. ', '')}
              {'  ▼'}
            </Text>
          </Pressable>
        </View>

        {/* 搜索联想结果 */}
        {suggestedSites.length > 0 && (
          <View style={styles.suggestionBox}>
            {suggestedSites.map((site) => (
              <Pressable
                key={site.id || site.name}
                style={styles.suggestionItem}
                onPress={() => onSelectSite(site)}
              >
                <Text style={styles.suggestionTitle}>{site.name}</Text>
                <Text style={styles.suggestionSubtitle}>
                  {site.countyName ?? ''}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* 风格（cluster）筛选标签 */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterRow}
        >
          {clusterOptions.map((opt) => {
            const active = opt.id === selectedCluster;
            return (
              <Pressable
                key={opt.id === null ? 'all' : opt.id.toString()}
                onPress={() => onSelectCluster(opt.id)}
                style={[styles.filterChip, active && styles.filterChipActive]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    active && styles.filterChipTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* 郡下拉列表（铺在搜索面板下面） */}
      {showCountyDropdown && (
        <View style={styles.dropdownList}>
          {countyOptions.map((county) => (
            <Pressable
              key={county}
              style={styles.dropdownItem}
              onPress={() => onSelectCounty(county)}
            >
              <Text style={styles.dropdownItemText}>
                {county === '全部'
                  ? 'All counties'
                  : county.replace('Co. ', '')}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 30,
    left: 8,
    right: 8,
    zIndex: 10,
  },
  searchBar: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    paddingHorizontal: 8,
    fontSize: 13,
    backgroundColor: '#fff',
  },
  dropdownButton: {
    marginLeft: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
  },
  dropdownButtonText: {
    fontSize: 12,
    color: '#333',
  },
  suggestionBox: {
    marginTop: 4,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    maxHeight: 140,
  },
  suggestionItem: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f2',
  },
  suggestionTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333',
  },
  suggestionSubtitle: {
    fontSize: 11,
    color: '#888',
  },
  filterRow: {
    marginTop: 4,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ccc',
    marginRight: 6,
    marginTop: 4,
  },
  filterChipActive: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  filterChipText: {
    fontSize: 11,
    color: '#333',
  },
  filterChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  dropdownList: {
    marginTop: 4,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    maxHeight: 220,
  },
  dropdownItem: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f2',
  },
  dropdownItemText: {
    fontSize: 13,
    color: '#333',
  },
});