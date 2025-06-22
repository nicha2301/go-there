import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PlaceItem from '../components/PlaceItem';
import theme from '../constants/theme';
import useFavorites from '../hooks/useFavorites';

// Định nghĩa kiểu dữ liệu cho Place
interface Place {
  id: string | number;
  name: string;
  address?: string;
  [key: string]: any; // Cho phép các thuộc tính khác
}

export default function FavoritesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { favorites, loading, error, loadFavorites, toggleFavorite } = useFavorites();
  
  // Tải danh sách yêu thích khi component được mount
  useEffect(() => {
    loadFavorites();
  }, []);
  
  // Xử lý khi chọn một địa điểm
  const handleSelectPlace = (place: Place) => {
    // Đảm bảo chỉ chuyển hướng một lần
    router.push({
      pathname: "/screens/PlaceDetail" as any,
      params: { 
        place: JSON.stringify(place),
        from: 'favorites'
      }
    });
  };
  
  // Xử lý khi nhấn nút tìm kiếm
  const handleSearchPress = () => {
    router.push("/search" as any);
  };
  
  // Xử lý khi toggle trạng thái yêu thích
  const handleToggleFavorite = async (place: Place) => {
    await toggleFavorite(place);
    // Không gọi loadFavorites ở đây để tránh vòng lặp
  };
  
  // Render mỗi item trong danh sách
  const renderItem = ({ item }: { item: Place }) => (
    <PlaceItem
      place={item}
      isFavorite={true}
      onFavoriteToggle={handleToggleFavorite}
      onPress={() => handleSelectPlace(item)}
    />
  );

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between px-4 py-4">
        <Text className="text-2xl font-bold text-text">Địa điểm yêu thích</Text>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={favorites}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 16, paddingTop: 8 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center p-8 mt-[50px]">
              <Ionicons name="heart" size={64} color={theme.colors.lightGrey} />
              <Text className="text-lg font-bold text-text mt-4 text-center">Bạn chưa có địa điểm yêu thích</Text>
              <Text className="text-sm text-textSecondary text-center mt-2">
                Nhấn vào biểu tượng trái tim để thêm địa điểm vào danh sách yêu thích.
              </Text>
              
              <TouchableOpacity 
                className="mt-6 py-3 px-6 bg-primary rounded-md shadow-sm"
                onPress={handleSearchPress}
              >
                <Text className="text-white font-bold">Tìm kiếm địa điểm</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
      
      {error && (
        <View className="p-4 bg-errorLight mx-4 rounded-md flex-row items-center">
          <Ionicons name="alert-circle-outline" size={24} color={theme.colors.error} />
          <Text className="text-error ml-2">{error}</Text>
        </View>
      )}
    </View>
  );
} 