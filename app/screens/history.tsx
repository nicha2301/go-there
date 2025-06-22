import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PlaceItem from '../components/PlaceItem';
import theme from '../constants/theme';
import { useFavorites } from '../hooks/useFavorites';
import { usePlaces } from '../hooks/usePlaces';
import { clearHistory, removeFromHistory } from '../services/storageService';

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { loadHistory, history, loading } = usePlaces();
  const { checkIsFavorite, toggleFavorite } = useFavorites();
  
  const [favorites, setFavorites] = useState({});
  
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
  }, []);
  
  // Cập nhật trạng thái yêu thích của từng địa điểm
  useEffect(() => {
    const updateFavoriteStatus = async () => {
      const favoriteStatus = {};
      
      for (const place of history) {
        favoriteStatus[place.id] = await checkIsFavorite(place.id);
      }
      
      setFavorites(favoriteStatus);
    };
    
    if (history.length > 0) {
      updateFavoriteStatus();
    }
  }, [history]);
  
  // Xử lý khi chọn một địa điểm
  const handleSelectPlace = (place) => {
    navigation.navigate('PlaceDetail', { place });
  };
  
  // Xử lý khi toggle trạng thái yêu thích
  const handleToggleFavorite = async (place) => {
    await toggleFavorite(place);
    setFavorites(prev => ({
      ...prev,
      [place.id]: !prev[place.id]
    }));
  };
  
  // Xử lý xóa một mục khỏi lịch sử
  const handleRemoveHistoryItem = async (placeId) => {
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
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    
    // Nếu cùng ngày, hiển thị giờ
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Nếu cùng tuần, hiển thị thứ
    const daysDiff = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    if (daysDiff < 7) {
      const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
      return `${days[date.getDay()]}, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // Khác thì hiển thị ngày tháng
    return date.toLocaleDateString();
  };
  
  // Render mỗi item trong danh sách
  const renderItem = ({ item }) => (
    <View style={styles.historyItem}>
      <View style={styles.timestampContainer}>
        <Text style={styles.timestamp}>{formatTime(item.timestamp)}</Text>
      </View>
      
      <View style={styles.placeItemContainer}>
        <PlaceItem
          place={item}
          isFavorite={favorites[item.id] || false}
          onFavoriteToggle={handleToggleFavorite}
          onPress={() => handleSelectPlace(item)}
        />
        
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={() => handleRemoveHistoryItem(item.id)}
        >
          <Ionicons name="close-circle" size={22} color={theme.colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Lịch sử tìm kiếm</Text>
        
        {history.length > 0 && (
          <TouchableOpacity onPress={handleClearHistory}>
            <Text style={styles.clearText}>Xóa tất cả</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={history}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="time" size={64} color={theme.colors.lightGrey} />
              <Text style={styles.emptyText}>Lịch sử tìm kiếm trống</Text>
              <Text style={styles.emptySubText}>
                Các địa điểm bạn tìm kiếm sẽ xuất hiện ở đây để truy cập nhanh sau này.
              </Text>
              
              <TouchableOpacity 
                style={styles.exploreButton}
                onPress={() => navigation.navigate('search')}
              >
                <Text style={styles.exploreButtonText}>Tìm kiếm địa điểm</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  clearText: {
    fontSize: 14,
    color: theme.colors.error,
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 16,
    paddingTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyItem: {
    marginBottom: 20,
  },
  timestampContainer: {
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  timestamp: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  placeItemContainer: {
    position: 'relative',
  },
  deleteButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 50,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  exploreButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.medium,
    ...theme.shadow.small,
  },
  exploreButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
}); 