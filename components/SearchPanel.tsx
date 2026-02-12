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
  showCountyDropdown: boolean;
  onToggleCountyDropdown: () => void;
  
  selectedClimbingType: string;
  onSelectClimbingType: (type: string) => void;
  climbingTypeOptions: string[];
  showTypeDropdown: boolean;
  onToggleTypeDropdown: () => void;
  
  selectedDifficulty: string | null;
  onSelectDifficulty: (difficulty: string | null) => void;
  difficultyOptions: { id: string | null; label: string }[];
  showDifficultyDropdown: boolean;
  onToggleDifficultyDropdown: () => void;
  
  suggestedSites: ClimbingSite[];
  onSelectSite: (site: ClimbingSite) => void;
};

export const SearchPanel: React.FC<Props> = ({
  searchText,
  onChangeSearchText,
  
  selectedCounty,
  onSelectCounty,
  countyOptions = [],
  showCountyDropdown,
  onToggleCountyDropdown,
  
  selectedClimbingType = 'all',
  onSelectClimbingType,
  climbingTypeOptions = [],
  showTypeDropdown,
  onToggleTypeDropdown,
  
  selectedDifficulty = null,
  onSelectDifficulty,
  difficultyOptions = [],
  showDifficultyDropdown,
  onToggleDifficultyDropdown,
  
  suggestedSites = [],
  onSelectSite,
}) => {
  return (
    <View style={styles.wrapper}>
      <View style={styles.searchBar}>
        {/* 第一行：搜索框 */}
        <TextInput
          style={styles.searchInput}
          placeholder="Search by County/Crag Name/Route Name"
          placeholderTextColor="#999"
          value={searchText}
          onChangeText={onChangeSearchText}
        />

        {/* 第二行：三个筛选按钮并排 */}
        <View style={styles.filterRow}>
          {/* 郡筛选按钮 */}
          <Pressable
            style={styles.filterButton}
            onPress={onToggleCountyDropdown}
          >
            <Text style={styles.filterButtonText} numberOfLines={1}>
              {selectedCounty === '全部'
                ? 'All counties'
                : selectedCounty.replace('Co. ', '')}
            </Text>
            <Text style={styles.filterButtonIcon}>▼</Text>
          </Pressable>

          {/* 攀岩类型筛选按钮 */}
          <Pressable
            style={styles.filterButton}
            onPress={onToggleTypeDropdown}
          >
            <Text style={styles.filterButtonText} numberOfLines={1}>
              {selectedClimbingType === 'all'
                ? 'All types'
                : selectedClimbingType}
            </Text>
            <Text style={styles.filterButtonIcon}>▼</Text>
          </Pressable>

          {/* 难度筛选按钮 */}
          <Pressable
            style={styles.filterButton}
            onPress={onToggleDifficultyDropdown}
          >
            <Text style={styles.filterButtonText} numberOfLines={1}>
              {selectedDifficulty === null
                ? 'All difficulties'
                : difficultyOptions.find(opt => opt.id === selectedDifficulty)?.label || selectedDifficulty}
            </Text>
            <Text style={styles.filterButtonIcon}>▼</Text>
          </Pressable>
        </View>
      </View>

      {/* 搜索联想结果 - 实时显示，不受下拉菜单影响 */}
      {suggestedSites.length > 0 && (
        <View 
          style={styles.suggestionBox}
          onStartShouldSetResponder={() => true}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          <ScrollView 
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
            style={{ maxHeight: 220 }}
          >
            {suggestedSites.map((site) => (
              <Pressable
                key={`${site.id || site.name}`}
                style={styles.suggestionItem}
                onPress={() => {
                  onSelectSite(site);
                  onChangeSearchText('');
                }}
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

      {/* 郡下拉列表 */}
      {showCountyDropdown && (
        <View 
          style={styles.dropdownList}
          onStartShouldSetResponder={() => true}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          <ScrollView 
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            <Pressable
              style={styles.dropdownItem}
              onPress={() => {
                onSelectCounty('全部');
                onToggleCountyDropdown();
              }}
            >
              <Text style={[
                styles.dropdownItemText,
                selectedCounty === '全部' && styles.dropdownItemTextActive
              ]}>
                All counties
              </Text>
            </Pressable>
            {countyOptions.filter(c => c !== '全部').map((county) => (
              <Pressable
                key={county}
                style={styles.dropdownItem}
                onPress={() => {
                  onSelectCounty(county);
                  onToggleCountyDropdown();
                }}
              >
                <Text style={[
                  styles.dropdownItemText,
                  selectedCounty === county && styles.dropdownItemTextActive
                ]}>
                  {county.replace('Co. ', '')}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* 攀岩类型下拉列表 */}
      {showTypeDropdown && (
        <View 
          style={styles.dropdownList}
          onStartShouldSetResponder={() => true}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          <ScrollView 
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            <Pressable
              style={styles.dropdownItem}
              onPress={() => {
                onSelectClimbingType('all');
                onToggleTypeDropdown();
              }}
            >
              <Text style={[
                styles.dropdownItemText,
                selectedClimbingType === 'all' && styles.dropdownItemTextActive
              ]}>
                All types
              </Text>
            </Pressable>
            {climbingTypeOptions.map((type) => (
              <Pressable
                key={type}
                style={styles.dropdownItem}
                onPress={() => {
                  onSelectClimbingType(type);
                  onToggleTypeDropdown();
                }}
              >
                <Text style={[
                  styles.dropdownItemText,
                  selectedClimbingType === type && styles.dropdownItemTextActive
                ]}>
                  {type}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* 难度下拉列表 */}
      {showDifficultyDropdown && (
        <View 
          style={styles.dropdownList}
          onStartShouldSetResponder={() => true}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          <ScrollView 
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            {difficultyOptions.map((opt) => (
              <Pressable
                key={opt.id === null ? 'all' : opt.id}
                style={styles.dropdownItem}
                onPress={() => {
                  onSelectDifficulty(opt.id);
                  onToggleDifficultyDropdown();
                }}
              >
                <Text style={[
                  styles.dropdownItemText,
                  opt.id === selectedDifficulty && styles.dropdownItemTextActive
                ]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
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
  searchInput: {
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    paddingHorizontal: 8,
    fontSize: 13,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 2,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#333',
    flex: 1,
  },
  filterButtonIcon: {
    fontSize: 10,
    color: '#666',
    marginLeft: 4,
  },
  suggestionBox: {
    position: 'absolute',
    top: 90,
    left: 0,
    right: 0,
    maxHeight: 220,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    zIndex: 30,
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
  dropdownList: {
    position: 'absolute',
    top: 90,
    left: 8,
    right: 8,
    maxHeight: 180,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    marginTop: 4,
    zIndex: 40,
    elevation: 6,
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
  dropdownItemTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
});