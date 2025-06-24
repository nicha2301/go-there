import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRouter } from 'expo-router';
import { styled } from 'nativewind';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Keyboard,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PlaceItem from '../components/PlaceItem';
import useFavorites from '../hooks/useFavorites';
import useLocation from '../hooks/useLocation';
import usePlaces from '../hooks/usePlaces';

// Styled components
const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTextInput = styled(TextInput);
const StyledTouchableOpacity = styled(TouchableOpacity);

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
  const router = useRouter();
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
      if (placesToCheck.length === 0) return;
      
      const favoriteStatus = {};
      
      for (const place of placesToCheck) {
        favoriteStatus[place.id] = await checkIsFavorite(place.id);
      }
      
      setFavorites(favoriteStatus);
    };
    
    updateFavoriteStatus();
  }, [searchResults, history, showHistory, checkIsFavorite]);
  
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
    
    // Chuyển đến màn hình bản đồ với địa điểm đã chọn
    router.push({
      pathname: "/" as any,
      params: { 
        place: JSON.stringify(place),
        from: 'search'
      }
    });
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
    <StyledView className="px-4 py-2">
      <FlatList
        data={CATEGORIES}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <StyledTouchableOpacity
            className={`flex-row items-center px-3 py-2 mr-2 rounded-medium ${
              selectedCategory === item.id 
                ? 'bg-primary' 
                : 'bg-background border border-lightGrey'
            }`}
            onPress={() => handleCategoryPress(item.id)}
          >
            <Ionicons
              name={item.icon}
              size={20}
              color={selectedCategory === item.id ? 'white' : '#3366FF'}
            />
            <StyledText
              className={`ml-1 text-sm ${
                selectedCategory === item.id ? 'text-white' : 'text-primary'
              }`}
            >
              {item.label}
            </StyledText>
          </StyledTouchableOpacity>
        )}
      />
    </StyledView>
  );

  return (
    <StyledView className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {/* Thanh tìm kiếm */}
      <StyledView className="flex-row items-center px-4 py-2">
        <StyledView className="flex-row items-center flex-1 px-3 py-2 bg-card rounded-medium border border-lightGrey">
          <Ionicons name="search" size={20} color="#8F9BB3" />
          <StyledTextInput
            className="flex-1 ml-2 text-base text-text"
            placeholder="Tìm kiếm địa điểm..."
            placeholderTextColor="#8F9BB3"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <StyledTouchableOpacity
              onPress={() => {
                setSearchQuery('');
                setShowHistory(true);
              }}
            >
              <Ionicons name="close-circle" size={20} color="#8F9BB3" />
            </StyledTouchableOpacity>
          )}
        </StyledView>
        
        <StyledTouchableOpacity 
          className="ml-2 px-4 py-2 bg-primary rounded-medium"
          onPress={handleSearch}
        >
          <StyledText className="text-white font-bold">Tìm</StyledText>
        </StyledTouchableOpacity>
      </StyledView>

      {/* Danh sách danh mục */}
      {renderCategoryList()}

      {/* Hiển thị trạng thái loading */}
      {loading && (
        <StyledView className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3366FF" />
        </StyledView>
      )}

      {/* Hiển thị danh sách kết quả tìm kiếm hoặc lịch sử */}
      {!loading && (
        <>
          <StyledView className="flex-row justify-between items-center px-4 py-2">
            <StyledText className="text-lg font-bold text-text">
              {showHistory
                ? 'Lịch sử tìm kiếm'
                : `Kết quả (${searchResults.length})`}
            </StyledText>
            {showHistory && history.length > 0 && (
              <StyledTouchableOpacity>
                <StyledText className="text-error font-bold">Xóa</StyledText>
              </StyledTouchableOpacity>
            )}
          </StyledView>

          <FlatList
            data={showHistory ? history : searchResults}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 16 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <StyledView className="flex-1 justify-center items-center py-10">
                <Ionicons 
                  name={showHistory ? "time" : "search"} 
                  size={64} 
                  color="#E4E9F2" 
                />
                <StyledText className="text-lg font-bold text-text mt-4">
                  {showHistory 
                    ? 'Lịch sử tìm kiếm trống'
                    : 'Không tìm thấy kết quả'
                  }
                </StyledText>
                <StyledText className="text-center text-textSecondary mt-2 px-8">
                  {showHistory
                    ? 'Các địa điểm bạn tìm kiếm sẽ xuất hiện ở đây'
                    : 'Thử tìm kiếm với từ khóa khác hoặc thay đổi danh mục'
                  }
                </StyledText>
              </StyledView>
            }
          />
        </>
      )}
    </StyledView>
  );
} 