import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PlaceItem from '../components/PlaceItem';
import theme from '../constants/theme';
import useFavorites from '../hooks/useFavorites';
import usePlaces from '../hooks/usePlaces';
import { clearHistory, removeFromHistory } from '../services/storageService';

// Định nghĩa kiểu dữ liệu cho Place
interface Place {
  id: string | number;
  name: string;
  address?: string;
  timestamp?: number | string;
  [key: string]: any; // Cho phép các thuộc tính khác
}

// Định nghĩa kiểu dữ liệu cho Favorites
interface FavoritesState {
  [key: string]: boolean;
}

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const navigation = useNavigation();
  const { loadHistory, history, loading } = usePlaces();
  const { checkIsFavorite, toggleFavorite } = useFavorites();
  
  const [favorites, setFavorites] = useState<FavoritesState>({});
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  // Load dữ liệu khi màn hình được mở
  useEffect(() => {
    loadHistory();
    
    // Thêm listener để load lại khi focus vào màn hình này
    const unsubscribe = navigation.addListener('focus', () => {
      loadHistory();
    });
    
    // Cleanup
    return () => {
      unsubscribe();
    };
  }, [navigation]);
  
  // Cập nhật trạng thái yêu thích của từng địa điểm
  useEffect(() => {
    const updateFavoriteStatus = async () => {
      const favoriteStatus: FavoritesState = {};
      
      for (const place of history as Place[]) {
        favoriteStatus[place.id.toString()] = await checkIsFavorite(place.id);
      }
      
      setFavorites(favoriteStatus);
    };
    
    if (history && history.length > 0) {
      updateFavoriteStatus();
    }
  }, [history, checkIsFavorite]);
  
  // Xử lý khi chọn một địa điểm
  const handleSelectPlace = (place: Place) => {
    router.push({
      pathname: "/screens/PlaceDetail" as any,
      params: { place: JSON.stringify(place) }
    });
  };
  
  // Xử lý khi nhấn nút tìm kiếm
  const handleSearchPress = () => {
    router.push("/search" as any);
  };
  
  // Xử lý khi toggle trạng thái yêu thích
  const handleToggleFavorite = async (place: Place) => {
    await toggleFavorite(place);
    setFavorites(prev => ({
      ...prev,
      [place.id.toString()]: !prev[place.id.toString()]
    }));
  };
  
  // Xử lý xóa một mục khỏi lịch sử
  const handleRemoveHistoryItem = async (placeId: string | number) => {
    await removeFromHistory(placeId);
    loadHistory();
  };
  
  // Xử lý xóa toàn bộ lịch sử
  const handleClearHistory = () => {
    Alert.alert(
      "Xóa lịch sử",
      "Bạn có chắc muốn xóa toàn bộ lịch sử tìm kiếm?",
      [
        {
          text: "Hủy",
          style: "cancel"
        },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            await clearHistory();
            loadHistory();
          }
        }
      ]
    );
  };
  
  // Định dạng thời gian
  const formatTime = (timestamp: number | string) => {
    const date = new Date(timestamp);
    const now = new Date();
    
    // Nếu cùng ngày, hiển thị giờ
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Nếu cùng tuần, hiển thị thứ
    const daysDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff < 7) {
      const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
      return `${days[date.getDay()]}, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // Khác thì hiển thị ngày tháng
    return date.toLocaleDateString();
  };
  
  // Render mỗi item trong danh sách
  const renderItem = ({ item }: { item: Place }) => (
    <View className="mb-5">
      <View className="px-3 mb-1.5">
        <Text className="text-xs text-textSecondary font-medium">{formatTime(item.timestamp || Date.now())}</Text>
      </View>
      
      <View className="relative">
        <PlaceItem
          place={item}
          isFavorite={favorites[item.id.toString()] || false}
          onFavoriteToggle={handleToggleFavorite}
          onPress={() => handleSelectPlace(item)}
        />
        
        <TouchableOpacity 
          className="absolute -top-2 -right-2 bg-background rounded-xl p-0.5"
          onPress={() => handleRemoveHistoryItem(item.id)}
        >
          <Ionicons name="close-circle" size={22} color={theme.colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between px-4 py-4">
        <Text className="text-2xl font-bold text-text">Lịch sử tìm kiếm</Text>
        
        {history && history.length > 0 && (
          <TouchableOpacity onPress={handleClearHistory}>
            <Text className="text-sm text-error font-bold">Xóa tất cả</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={history as Place[]}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 16, paddingTop: 8 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center p-8 mt-[50px]">
              <Ionicons name="time" size={64} color={theme.colors.lightGrey} />
              <Text className="text-lg font-bold text-text mt-4 text-center">Lịch sử tìm kiếm trống</Text>
              <Text className="text-sm text-textSecondary text-center mt-2">
                Các địa điểm bạn tìm kiếm sẽ xuất hiện ở đây để truy cập nhanh sau này.
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
    </View>
  );
} 