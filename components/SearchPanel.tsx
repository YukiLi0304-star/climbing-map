import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ClimbingSite } from '../hooks/use-climbing-sites';

type Props = {
  searchText: string;
  onChangeSearchText: (v: string) => void;

  selectedCounty: string;
  onSelectCounty: (county: string) => void;
  countyOptions: string[];

 

  selectedDifficulty: string | null;
  onSelectDifficulty: (difficulty: string | null) => void;
  difficultyOptions: { id: string | null; label: string }[];

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
 
  selectedDifficulty,
  onSelectDifficulty,
  difficultyOptions,
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
            <ScrollView 
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
              style={{ maxHeight: 220 }}
            >
              {suggestedSites.map((site) => (
                <Pressable
                  key={`${site.id || site.name}_${Math.random()}`}
                  style={styles.suggestionItem}
                  onPress={() => onSelectSite(site)}
                >
                  <Text style={styles.suggestionTitle}>{site.name}</Text>
                  <Text style={styles.suggestionSubtitle}>
                    {site.countyName ?? ''}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
        {/* 难度筛选标签 */}
        <View style={styles.filterSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterRow}
          >
            {difficultyOptions.map((opt) => {
              const active = opt.id === selectedDifficulty;
              return (
                <Pressable
                  key={opt.id === null ? 'all-diff' : opt.id}
                  onPress={() => onSelectDifficulty(opt.id)}
                  style={[
                    styles.filterChip,
                    active && styles.filterChipActive,
                  ]}
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
      </View>

      {/* 郡下拉列表（铺在搜索面板下面） */}
      {showCountyDropdown && (
        <ScrollView 
          style={styles.dropdownList}
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}
        >
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
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 50,
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
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    maxHeight: 220,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    zIndex: 20,
    elevation: 5,
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
  filterSection: {
    marginTop: 8,
  },
  dropdownList: {
    marginTop: 4,
    maxHeight: 180,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
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