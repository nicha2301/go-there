import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Keyboard,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PlaceItem from '../components/PlaceItem';
import theme from '../constants/theme';
import { useFavorites } from '../hooks/useFavorites';
import { useLocation } from '../hooks/useLocation';
import { usePlaces } from '../hooks/usePlaces';

// Danh mục tìm kiếm
const CATEGORIES = [
  { id: 'restaurant', label: 'Nhà hàng', icon: 'restaurant-outline' },
  { id: 'cafe', label: 'Cafe', icon: 'cafe-outline' },
  { id: 'atm', label: 'ATM', icon: 'cash-outline' },
  { id: 'hospital', label: 'Bệnh viện', icon: 'medical-outline' },
  { id: 'pharmacy', label: 'Hiệu thuốc', icon: 'medkit-outline' },
  { id: 'gas_station', label: 'Trạm xăng', icon: 'car-outline' },
];

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { search, searchNearby, searchResults, history, loading, loadHistory, selectPlace } = usePlaces();
  const { location, fetchCurrentLocation } = useLocation();
  const { checkIsFavorite, toggleFavorite } = useFavorites();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [favorites, setFavorites] = useState({});
  const [showHistory, setShowHistory] = useState(true);

  // Lấy dữ liệu khi màn hình được mở
  useEffect(() => {
    const setup = async () => {
      // Lấy vị trí hiện tại
      await fetchCurrentLocation();
      
      // Lấy lịch sử tìm kiếm
      await loadHistory();
    };
    
    setup();
  }, []);
  
  // Lấy trạng thái yêu thích của từng địa điểm
  useEffect(() => {
    const updateFavoriteStatus = async () => {
      const placesToCheck = showHistory ? [...history] : [...searchResults];
      const favoriteStatus = {};
      
      for (const place of placesToCheck) {
        favoriteStatus[place.id] = await checkIsFavorite(place.id);
      }
      
      setFavorites(favoriteStatus);
    };
    
    updateFavoriteStatus();
  }, [searchResults, history, showHistory]);
  
  // Xử lý tìm kiếm
  const handleSearch = async () => {
    if (!searchQuery.trim() && !selectedCategory) return;
    
    Keyboard.dismiss();
    setShowHistory(false);
    
    // Tìm kiếm theo từ khóa và danh mục
    await search(searchQuery.trim(), location, selectedCategory || null);
  };
  
  // Xử lý khi chọn danh mục
  const handleCategoryPress = async (categoryId) => {
    // Toggle nếu cùng danh mục
    if (categoryId === selectedCategory) {
      setSelectedCategory('');
      if (searchQuery.trim()) {
        // Nếu có từ khóa, tìm kiếm lại không có danh mục
        await search(searchQuery.trim(), location);
      } else {
        setShowHistory(true);
      }
    } else {
      setSelectedCategory(categoryId);
      setShowHistory(false);
      
      // Tìm kiếm theo danh mục (có thể kết hợp với từ khóa)
      if (searchQuery.trim()) {
        await search(searchQuery.trim(), location, categoryId);
      } else {
        // Tìm kiếm gần đây theo danh mục
        await searchNearby(location, categoryId);
      }
    }
  };
  
  // Xử lý khi chọn một địa điểm
  const handleSelectPlace = async (place) => {
    await selectPlace(place);
    navigation.navigate('PlaceDetail', { place });
  };
  
  // Xử lý toggle yêu thích
  const handleToggleFavorite = async (place) => {
    await toggleFavorite(place);
    
    // Cập nhật trạng thái local để UI phản hồi ngay
    setFavorites(prev => ({
      ...prev,
      [place.id]: !prev[place.id]
    }));
  };

  // Hiển thị phần tử trong danh sách
  const renderItem = ({ item }) => (
    <PlaceItem
      place={item}
      isFavorite={favorites[item.id] || false}
      onFavoriteToggle={handleToggleFavorite}
      onPress={() => handleSelectPlace(item)}
    />
  );

  // Hiển thị phần header với các danh mục
  const renderCategoryList = () => (
    <View style={styles.categoriesContainer}>
      <FlatList
        data={CATEGORIES}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.categoryItem,
              selectedCategory === item.id && styles.selectedCategoryItem,
            ]}
            onPress={() => handleCategoryPress(item.id)}
          >
            <Ionicons
              name={item.icon}
              size={20}
              color={selectedCategory === item.id ? 'white' : theme.colors.primary}
            />
            <Text
              style={[
                styles.categoryText,
                selectedCategory === item.id && styles.selectedCategoryText,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Thanh tìm kiếm */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={theme.colors.grey} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm địa điểm..."
            placeholderTextColor={theme.colors.grey}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                setShowHistory(true);
              }}
            >
              <Ionicons name="close-circle" size={20} color={theme.colors.grey} />
            </TouchableOpacity>
          )}
        </View>
        
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>Tìm</Text>
        </TouchableOpacity>
      </View>

      {/* Danh sách danh mục */}
      {renderCategoryList()}

      {/* Hiển thị trạng thái loading */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      )}

      {/* Hiển thị danh sách kết quả tìm kiếm hoặc lịch sử */}
      {!loading && (
        <>
          <View style={styles.resultHeader}>
            <Text style={styles.resultTitle}>
              {showHistory
                ? 'Lịch sử tìm kiếm'
                : `Kết quả (${searchResults.length})`}
            </Text>
            {showHistory && history.length > 0 && (
              <TouchableOpacity>
                <Text style={styles.clearText}>Xóa</Text>
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={showHistory ? history : searchResults}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={48} color={theme.colors.grey} />
                <Text style={styles.emptyText}>
                  {showHistory
                    ? 'Không có lịch sử tìm kiếm'
                    : 'Không tìm thấy kết quả'}
                </Text>
              </View>
            }
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  searchBarContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.medium,
    paddingHorizontal: 12,
    height: 48,
    ...theme.shadow.small,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    marginLeft: 8,
    fontSize: 16,
    color: theme.colors.text,
  },
  searchButton: {
    marginLeft: 12,
    paddingHorizontal: 16,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.medium,
    ...theme.shadow.small,
  },
  searchButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 10,
    borderRadius: theme.radius.medium,
    backgroundColor: theme.colors.card,
    ...theme.shadow.tiny,
  },
  selectedCategoryItem: {
    backgroundColor: theme.colors.primary,
  },
  categoryText: {
    marginLeft: 6,
    fontSize: 14,
    color: theme.colors.text,
  },
  selectedCategoryText: {
    color: 'white',
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  clearText: {
    color: theme.colors.error,
    fontWeight: 'bold',
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
}); 