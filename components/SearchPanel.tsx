import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ui } from '@/constants/ui';
import { ClimbingSite } from '../hooks/use-climbing-sites';

type Props = {
  searchText: string;
  onChangeSearchText: (v: string) => void;
  selectedCounty: string;
  onSelectCounty: (county: string) => void;
  countyOptions: string[];
  showCountyDropdown: boolean;
  onToggleCountyDropdown: () => void;
  selectedTypes: string[];
  onSelectType: (type: string) => void;
  typeOptions: string[];
  showTypeDropdown: boolean;
  onToggleTypeDropdown: () => void;
  selectedDifficulty: string | null;
  onSelectDifficulty: (difficulty: string | null) => void;
  difficultyOptions: { id: string | null; label: string }[];
  showDifficultyDropdown: boolean;
  onToggleDifficultyDropdown: () => void;
  selectedHotspot: string;
  onSelectHotspot: (hotspot: string) => void;
  hotspotOptions: string[];
  showHotspotDropdown: boolean;
  onToggleHotspotDropdown: () => void;
  suggestedSites: ClimbingSite[];
  onSelectSite: (site: ClimbingSite) => void;
};

const ALL_COUNTIES = 'All Counties';

export const SearchPanel: React.FC<Props> = ({
  searchText,
  onChangeSearchText,
  selectedCounty,
  onSelectCounty,
  countyOptions = [],
  showCountyDropdown,
  onToggleCountyDropdown,
  selectedTypes = [],
  onSelectType,
  typeOptions = [],
  showTypeDropdown,
  onToggleTypeDropdown,
  selectedDifficulty = null,
  onSelectDifficulty,
  difficultyOptions = [],
  showDifficultyDropdown,
  onToggleDifficultyDropdown,
  selectedHotspot = 'all',
  onSelectHotspot,
  hotspotOptions = [],
  showHotspotDropdown,
  onToggleHotspotDropdown,
  suggestedSites = [],
  onSelectSite,
}) => {
  const getTypeButtonText = () => {
    if (selectedTypes.length === 0) return 'All types';
    if (selectedTypes.length === 1) return selectedTypes[0];
    return `${selectedTypes.length} types`;
  };

  const countyLabel = selectedCounty === ALL_COUNTIES
    ? ALL_COUNTIES
    : selectedCounty.replace('Co. ', '');

  const DropdownItem = ({
    label,
    selected,
    onPress,
  }: {
    label: string;
    selected?: boolean;
    onPress: () => void;
  }) => (
    <Pressable style={styles.dropdownItem} onPress={onPress}>
      <Text style={[styles.dropdownItemText, selected && styles.dropdownItemTextActive]}>
        {label}
      </Text>
      {selected ? (
        <Ionicons name="checkmark" size={16} color={ui.colors.accent} />
      ) : null}
    </Pressable>
  );

  return (
    <View style={styles.wrapper}>
      <View style={styles.panel}>
        <View style={styles.searchRow}>
          <Ionicons name="search-outline" size={18} color={ui.colors.textSoft} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search crags, counties, routes"
            placeholderTextColor={ui.colors.textSoft}
            value={searchText}
            onChangeText={onChangeSearchText}
          />
          {searchText ? (
            <Pressable onPress={() => onChangeSearchText('')} style={styles.clearButton}>
              <Ionicons name="close" size={16} color={ui.colors.textMuted} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <Pressable style={styles.filterButton} onPress={onToggleCountyDropdown}>
            <Text style={styles.filterLabel}>County</Text>
            <Text style={styles.filterValue} numberOfLines={1}>
              {countyLabel}
            </Text>
            <Ionicons style={styles.filterChevron} name="chevron-down" size={14} color={ui.colors.textMuted} />
          </Pressable>

          <Pressable
            style={[styles.filterButton, selectedTypes.length > 0 && styles.filterButtonActive]}
            onPress={onToggleTypeDropdown}
          >
            <Text style={styles.filterLabel}>Type</Text>
            <Text style={styles.filterValue} numberOfLines={1}>
              {getTypeButtonText()}
            </Text>
            <Ionicons style={styles.filterChevron} name="chevron-down" size={14} color={ui.colors.textMuted} />
          </Pressable>

          <Pressable style={styles.filterButton} onPress={onToggleDifficultyDropdown}>
            <Text style={styles.filterLabel}>Grade</Text>
            <Text style={styles.filterValue} numberOfLines={1}>
              {selectedDifficulty === null
                ? 'All difficulties'
                : difficultyOptions.find((opt) => opt.id === selectedDifficulty)?.label || selectedDifficulty}
            </Text>
            <Ionicons style={styles.filterChevron} name="chevron-down" size={14} color={ui.colors.textMuted} />
          </Pressable>

          <Pressable style={styles.filterButton} onPress={onToggleHotspotDropdown}>
            <Text style={styles.filterLabel}>Cluster</Text>
            <Text style={styles.filterValue} numberOfLines={1}>
              {selectedHotspot === 'all' ? 'All hotspots' : selectedHotspot}
            </Text>
            <Ionicons style={styles.filterChevron} name="chevron-down" size={14} color={ui.colors.textMuted} />
          </Pressable>
        </ScrollView>
      </View>

      {suggestedSites.length > 0 ? (
        <View
          style={styles.suggestionBox}
          onStartShouldSetResponder={() => true}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled style={styles.scrollArea}>
            {suggestedSites.map((site) => (
              <Pressable
                key={`${site.id || site.name}`}
                style={styles.suggestionItem}
                onPress={() => {
                  onSelectSite(site);
                  onChangeSearchText('');
                }}
              >
                <View>
                  <Text style={styles.suggestionTitle}>{site.name}</Text>
                  <Text style={styles.suggestionSubtitle}>{site.countyName ?? ''}</Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color={ui.colors.textSoft} />
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {showCountyDropdown ? (
        <View
          style={styles.dropdownList}
          onStartShouldSetResponder={() => true}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled style={styles.scrollArea}>
            <DropdownItem
              label={ALL_COUNTIES}
              selected={selectedCounty === ALL_COUNTIES}
              onPress={() => {
                onSelectCounty(ALL_COUNTIES);
                onToggleCountyDropdown();
              }}
            />
            {countyOptions.filter((county) => county !== ALL_COUNTIES).map((county) => (
              <DropdownItem
                key={county}
                label={county.replace('Co. ', '')}
                selected={selectedCounty === county}
                onPress={() => {
                  onSelectCounty(county);
                  onToggleCountyDropdown();
                }}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {showTypeDropdown ? (
        <View
          style={styles.dropdownList}
          onStartShouldSetResponder={() => true}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled style={styles.scrollArea}>
            <DropdownItem label="Clear selection" onPress={() => onSelectType('clear')} />
            {typeOptions.map((type) => (
              <DropdownItem
                key={type}
                label={type}
                selected={selectedTypes.includes(type)}
                onPress={() => onSelectType(type)}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {showDifficultyDropdown ? (
        <View
          style={styles.dropdownList}
          onStartShouldSetResponder={() => true}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled style={styles.scrollArea}>
            {difficultyOptions.map((opt) => (
              <DropdownItem
                key={opt.id === null ? 'all' : opt.id}
                label={opt.label}
                selected={opt.id === selectedDifficulty}
                onPress={() => {
                  onSelectDifficulty(opt.id);
                  onToggleDifficultyDropdown();
                }}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {showHotspotDropdown ? (
        <View
          style={styles.dropdownList}
          onStartShouldSetResponder={() => true}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled style={styles.scrollArea}>
            <DropdownItem
              label="All hotspots"
              selected={selectedHotspot === 'all'}
              onPress={() => {
                onSelectHotspot('all');
                onToggleHotspotDropdown();
              }}
            />
            {hotspotOptions.map((hotspot) => (
              <DropdownItem
                key={hotspot}
                label={hotspot}
                selected={selectedHotspot === hotspot}
                onPress={() => {
                  onSelectHotspot(hotspot);
                  onToggleHotspotDropdown();
                }}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 54,
    left: 14,
    right: 14,
    zIndex: 12,
  },
  panel: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: ui.radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.34)',
    padding: 12,
    ...ui.shadows.card,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: ui.radii.md,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: ui.colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: ui.colors.text,
    paddingVertical: 0,
  },
  clearButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(156, 99, 255, 0.12)',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    paddingRight: 8,
  },
  filterButton: {
    width: 138,
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingRight: 28,
    borderRadius: ui.radii.md,
    backgroundColor: 'rgba(255,255,255,0.56)',
    borderWidth: 1,
    borderColor: ui.colors.border,
    position: 'relative',
  },
  filterButtonActive: {
    backgroundColor: 'rgba(156, 99, 255, 0.2)',
    borderColor: ui.colors.borderStrong,
  },
  filterLabel: {
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: ui.colors.textSoft,
    marginBottom: 3,
  },
  filterValue: {
    fontSize: 13,
    fontWeight: '600',
    color: ui.colors.text,
    paddingRight: 4,
  },
  filterChevron: {
    position: 'absolute',
    right: 10,
    top: 22,
  },
  suggestionBox: {
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.26)',
    borderRadius: ui.radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    ...ui.shadows.soft,
  },
  scrollArea: {
    maxHeight: 260,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(188, 163, 255, 0.18)',
  },
  suggestionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: ui.colors.text,
  },
  suggestionSubtitle: {
    fontSize: 12,
    color: ui.colors.textSoft,
    marginTop: 3,
  },
  dropdownList: {
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.44)',
    borderRadius: ui.radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    ...ui.shadows.soft,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(188, 163, 255, 0.18)',
  },
  dropdownItemText: {
    fontSize: 14,
    color: ui.colors.textMuted,
  },
  dropdownItemTextActive: {
    color: ui.colors.accent,
    fontWeight: '700',
  },
});
