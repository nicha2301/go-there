import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { BORDER_RADIUS, COLORS, SHADOW, SPACING } from '../constants/theme';

const { width } = Dimensions.get('window');
const ANIMATION_DURATION = 200;

// Mock data - trong thực tế sẽ sử dụng APIs như Nominatim
const mockPlaces = [
  {
    id: '1',
    name: 'Nhà hàng ABC',
    address: '123 Đường Nguyễn Huệ, Quận 1, TP.HCM',
    category: 'restaurant',
    distance: '1.2 km',
    rating: 4.5,
  },
  {
    id: '2',
    name: 'Quán Café XYZ',
    address: '456 Đường Lê Lợi, Quận 1, TP.HCM',
    category: 'cafe',
    distance: '0.8 km',
    rating: 4.2,
  },
  {
    id: '3',
    name: 'Ngân hàng VPBank',
    address: '789 Đường Đồng Khởi, Quận 1, TP.HCM',
    category: 'bank',
    distance: '2.1 km',
    rating: 3.8,
  },
  {
    id: '4',
    name: 'ATM Vietcombank',
    address: '101 Đường Lý Tự Trọng, Quận 1, TP.HCM',
    category: 'atm',
    distance: '0.5 km',
    rating: 3.5,
  },
  {
    id: '5',
    name: 'Bệnh viện Chợ Rẫy',
    address: '201 Đường Nguyễn Chí Thanh, Quận 5, TP.HCM',
    category: 'hospital',
    distance: '3.7 km',
    rating: 4.0,
  },
];

const categories = [
  { id: 'restaurant', name: 'Nhà hàng', icon: 'restaurant-outline', color: '#10B981', bgColor: '#ECFDF5' },
  { id: 'cafe', name: 'Quán cà phê', icon: 'cafe-outline', color: '#F59E0B', bgColor: '#FEF3C7' },
  { id: 'atm', name: 'ATM', icon: 'card-outline', color: '#3B82F6', bgColor: '#EFF6FF' },
  { id: 'hospital', name: 'Bệnh viện', icon: 'medkit-outline', color: '#EF4444', bgColor: '#FEE2E2' },
  { id: 'gas_station', name: 'Trạm xăng', icon: 'speedometer-outline', color: '#8B5CF6', bgColor: '#F5F3FF' },
  { id: 'pharmacy', name: 'Nhà thuốc', icon: 'bandage-outline', color: '#EC4899', bgColor: '#FCE7F3' },
];

export default function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(params.category || null);
  const [searchFocused, setSearchFocused] = useState(false);
  
  const searchInputAnim = useRef(new Animated.Value(0)).current;
  const searchBarWidth = searchInputAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [width - (SPACING.large * 2 + 48), width - SPACING.large * 2]
  });

  useEffect(() => {
    if (params.category) {
      setSelectedCategory(params.category.toString());
      performSearch('');
    }
  }, [params]);

  // Lấy vị trí người dùng
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation(location);
      }
    })();
  }, []);

  // Mock search function - trong thực tế sẽ gọi API
  const performSearch = (query) => {
    setLoading(true);
    
    // Mô phỏng delay API
    setTimeout(() => {
      // Lọc theo query và category (nếu có)
      let filteredResults = mockPlaces.filter(place => 
        place.name.toLowerCase().includes(query.toLowerCase()) ||
        place.address.toLowerCase().includes(query.toLowerCase())
      );
      
      if (selectedCategory) {
        filteredResults = filteredResults.filter(place => place.category === selectedCategory);
      }
      
      setResults(filteredResults);
      setLoading(false);
    }, 500);
  };

  const onSearch = (query) => {
    setSearchQuery(query);
    if (query.length > 2 || selectedCategory) {
      performSearch(query);
    } else if (query.length === 0 && !selectedCategory) {
      setResults([]);
    }
  };

  const selectCategory = (categoryId) => {
    const newCategory = categoryId === selectedCategory ? null : categoryId;
    setSelectedCategory(newCategory);
    performSearch(searchQuery);
  };

  const toggleSearchFocus = (focused) => {
    setSearchFocused(focused);
    Animated.timing(searchInputAnim, {
      toValue: focused ? 1 : 0,
      duration: ANIMATION_DURATION,
      useNativeDriver: false,
    }).start();
  };

  const navigateToPlace = (place) => {
    // Trong thực tế, điều hướng đến màn hình chi tiết địa điểm hoặc bản đồ
    console.log('Navigating to place:', place);
    router.push({
      pathname: '/screens/map',
      params: { placeId: place.id }
    });
  };

  const renderRatingStars = (rating) => {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const stars = [];

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <Ionicons key={`star-${i}`} name="star" size={14} color={COLORS.accent} />
        );
      } else if (i === fullStars && halfStar) {
        stars.push(
          <Ionicons key={`star-${i}`} name="star-half" size={14} color={COLORS.accent} />
        );
      } else {
        stars.push(
          <Ionicons key={`star-${i}`} name="star-outline" size={14} color={COLORS.accent} />
        );
      }
    }

    return stars;
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header with Search */}
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          {!searchFocused && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={22} color={COLORS.darkText} />
            </TouchableOpacity>
          )}
          
          <Animated.View style={[styles.searchInputContainer, { width: searchBarWidth }]}>
            <Ionicons name="search" size={20} color={COLORS.grayText} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm địa điểm..."
              placeholderTextColor={COLORS.grayText}
              value={searchQuery}
              onChangeText={onSearch}
              onFocus={() => toggleSearchFocus(true)}
              onBlur={() => toggleSearchFocus(false)}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('');
                  onSearch('');
                }}
                style={styles.clearButton}
              >
                <Ionicons name="close-circle" size={16} color={COLORS.grayText} />
              </TouchableOpacity>
            )}
          </Animated.View>
        </View>
      </View>
      
      {/* Category buttons */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContainer}
      >
        {categories.map(category => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryButton,
              selectedCategory === category.id && styles.categoryButtonSelected
            ]}
            onPress={() => selectCategory(category.id)}
          >
            <View 
              style={[
                styles.categoryIcon, 
                { backgroundColor: selectedCategory === category.id ? category.color : category.bgColor }
              ]}
            >
              <Ionicons 
                name={category.icon} 
                size={18} 
                color={selectedCategory === category.id ? COLORS.background : category.color} 
              />
            </View>
            <Text 
              style={[
                styles.categoryText,
                selectedCategory === category.id && styles.categoryTextSelected
              ]}
            >
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      {/* Results */}
      <View style={styles.resultsContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Đang tìm kiếm...</Text>
          </View>
        ) : (
          <>
            {results.length > 0 ? (
              <FlatList
                data={results}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.resultsList}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.placeCard}
                    onPress={() => navigateToPlace(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.placeIconContainer}>
                      <Ionicons
                        name={
                          item.category === 'restaurant' ? 'restaurant-outline' :
                          item.category === 'cafe' ? 'cafe-outline' :
                          item.category === 'hospital' ? 'medkit-outline' :
                          item.category === 'atm' ? 'card-outline' :
                          item.category === 'bank' ? 'business-outline' : 'location-outline'
                        }
                        size={22} 
                        color={COLORS.primary}
                      />
                    </View>
                    
                    <View style={styles.placeDetails}>
                      <View style={styles.placeHeaderRow}>
                        <Text style={styles.placeName}>{item.name}</Text>
                        <Text style={styles.placeDistance}>{item.distance}</Text>
                      </View>
                      
                      <Text style={styles.placeAddress} numberOfLines={1}>
                        {item.address}
                      </Text>
                      
                      <View style={styles.placeFooter}>
                        <View style={styles.ratingContainer}>
                          {renderRatingStars(item.rating)}
                          <Text style={styles.ratingText}>{item.rating}</Text>
                        </View>
                        
                        <TouchableOpacity 
                          style={styles.directionButton}
                          onPress={() => navigateToPlace(item)}
                        >
                          <Ionicons name="navigate" size={14} color={COLORS.background} />
                          <Text style={styles.directionText}>Chỉ đường</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
              />
            ) : (
              searchQuery.length > 0 && (
                <View style={styles.emptyResultsContainer}>
                  <Ionicons name="search-outline" size={64} color={COLORS.border} />
                  <Text style={styles.emptyTitle}>Không tìm thấy kết quả</Text>
                  <Text style={styles.emptySubtitle}>
                    Vui lòng thử với từ khóa khác hoặc thay đổi danh mục tìm kiếm
                  </Text>
                </View>
              )
            )}
          </>
        )}
      </View>
    </View>
  );
}

const TextInput = ({ style, ...props }) => {
  return (
    <input
      style={{
        ...style,
        outline: 'none',
        border: 'none',
        backgroundColor: 'transparent',
        flex: 1,
        height: '100%',
        padding: 0,
        margin: 0,
        fontSize: 16,
      }}
      {...props}
    />
  );
};

const ScrollView = ({ children, contentContainerStyle, ...props }) => {
  return (
    <div
      style={{
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}
      {...props}
    >
      <div style={contentContainerStyle}>
        {children}
      </div>
    </div>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: SPACING.large,
    paddingBottom: SPACING.medium,
    backgroundColor: COLORS.background,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.medium,
    backgroundColor: COLORS.lightBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.small,
  },
  searchInputContainer: {
    height: 48,
    backgroundColor: COLORS.lightBackground,
    borderRadius: BORDER_RADIUS.large,
    paddingHorizontal: SPACING.medium,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.darkText,
    marginLeft: SPACING.small,
    height: '100%',
  },
  clearButton: {
    padding: SPACING.xs,
  },
  categoriesContainer: {
    paddingHorizontal: SPACING.large,
    paddingVertical: SPACING.medium,
    gap: SPACING.medium,
    flexDirection: 'row',
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.small,
    paddingHorizontal: SPACING.medium,
    borderRadius: BORDER_RADIUS.large,
    backgroundColor: COLORS.background,
    ...SHADOW.small,
    marginRight: SPACING.small,
  },
  categoryButtonSelected: {
    backgroundColor: COLORS.primary,
    ...SHADOW.medium,
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.small,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  categoryTextSelected: {
    color: COLORS.background,
  },
  resultsContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.medium,
  },
  loadingText: {
    color: COLORS.text,
    fontSize: 16,
  },
  resultsList: {
    paddingHorizontal: SPACING.large,
    paddingVertical: SPACING.medium,
  },
  placeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.medium,
  },
  placeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.lightBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeDetails: {
    flex: 1,
    marginLeft: SPACING.medium,
  },
  placeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  placeName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.darkText,
    flex: 1,
  },
  placeDistance: {
    fontSize: 14,
    color: COLORS.grayText,
    marginLeft: SPACING.medium,
  },
  placeAddress: {
    fontSize: 14,
    color: COLORS.grayText,
    marginTop: 2,
    marginBottom: 8,
  },
  placeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    color: COLORS.text,
    marginLeft: 4,
    fontWeight: '500',
  },
  directionButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.medium,
    paddingVertical: 6,
    paddingHorizontal: SPACING.small,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  directionText: {
    color: COLORS.background,
    fontSize: 12,
    fontWeight: '500',
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.small,
  },
  emptyResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.large,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: SPACING.medium,
    color: COLORS.darkText,
  },
  emptySubtitle: {
    fontSize: 15,
    color: COLORS.grayText,
    textAlign: 'center',
    marginTop: SPACING.small,
  },
}); 