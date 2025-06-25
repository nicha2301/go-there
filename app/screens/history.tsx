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

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const navigation = useNavigation();
  const { loadHistory, history, loading } = usePlaces();
  
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
  
  // Xử lý khi chọn một địa điểm
  const handleSelectPlace = (place: Place) => {
    router.push({
      pathname: "/" as any,
      params: { place: JSON.stringify(place) }
    });
  };
  
  // Xử lý khi nhấn nút tìm kiếm
  const handleSearchPress = () => {
    router.push("/" as any);
  };
  
  // Xử lý xóa một mục khỏi lịch sử
  const handleRemoveItem = async (placeId: string | number) => {
    setIsDeleting(true);
    try {
      await removeFromHistory(placeId);
      loadHistory(); // Tải lại danh sách sau khi xóa
    } catch (error) {
      console.error('Error removing history item:', error);
    } finally {
      setIsDeleting(false);
    }
  };
  
  // Xử lý xóa toàn bộ lịch sử
  const handleClearHistory = async () => {
    setIsDeleting(true);
    
    try {
      await clearHistory();
      loadHistory(); // Tải lại danh sách sau khi xóa
    } catch (error) {
      console.error('Error clearing history:', error);
    } finally {
      setIsDeleting(false);
      setShowConfirmDialog(false);
    }
  };
  
  // Hiển thị xác nhận xóa
  const showClearConfirmation = () => {
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
          onPress: handleClearHistory
        }
      ]
    );
  };
  
  // Format thời gian
  const formatTime = (timestamp: number | string) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    
    // Nếu cùng ngày, chỉ hiển thị giờ
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('vi-VN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } 
    
    // Nếu trong vòng 7 ngày, hiển thị thứ
    const daysDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff < 7) {
      const days = ['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
      return `${days[date.getDay()]}, ${date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // Khác thì hiển thị ngày tháng
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });
  };
  
  // Render mỗi item trong danh sách
  const renderItem = ({ item }: { item: Place }) => (
    <View className="mb-4">
      <View className="px-3 mb-1.5">
        <Text className="text-xs text-textSecondary font-medium">
          <Ionicons name="time-outline" size={12} color={theme.colors.grey} />
          {' '}{formatTime(item.timestamp || Date.now())}
        </Text>
      </View>
      
      <View className="relative">
        <PlaceItem
          place={item}
          onPress={() => handleSelectPlace(item)}
          showDistance={false}
        />
        
        <TouchableOpacity 
          className="absolute top-2 right-2 p-2"
          onPress={() => handleRemoveItem(item.id)}
          disabled={isDeleting}
        >
          <Ionicons name="close-circle" size={20} color={theme.colors.grey} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between px-4 py-4">
        <Text className="text-2xl font-bold text-text">Lịch sử tìm kiếm</Text>
        
        {history && history.length > 0 && (
          <TouchableOpacity onPress={showClearConfirmation}>
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
                <Text className="text-white font-bold">Xem bản đồ</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
} 