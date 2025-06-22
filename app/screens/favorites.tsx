import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from 'expo-router';
import React, { useEffect } from 'react';
import {
    ActivityIndicator,
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

export default function FavoritesScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { favorites, loading, error, loadFavorites, toggleFavorite } = useFavorites();
  
  // Load dữ liệu khi màn hình được mở
  useEffect(() => {
    loadFavorites();
    
    // Thêm listener để load lại khi focus vào màn hình này (để cập nhật khi có thay đổi ở màn hình khác)
    const unsubscribe = navigation.addListener('focus', () => {
      loadFavorites();
    });
    
    // Cleanup
    return () => {
      unsubscribe();
    };
  }, []);
  
  // Xử lý khi chọn một địa điểm
  const handleSelectPlace = (place) => {
    navigation.navigate('PlaceDetail', { place });
  };
  
  // Xử lý khi toggle trạng thái yêu thích
  const handleToggleFavorite = async (place) => {
    await toggleFavorite(place);
  };
  
  // Render mỗi item trong danh sách
  const renderItem = ({ item }) => (
    <PlaceItem
      place={item}
      isFavorite={true}
      onFavoriteToggle={handleToggleFavorite}
      onPress={() => handleSelectPlace(item)}
    />
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Địa điểm yêu thích</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={favorites}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="heart" size={64} color={theme.colors.lightGrey} />
              <Text style={styles.emptyText}>Bạn chưa có địa điểm yêu thích</Text>
              <Text style={styles.emptySubText}>
                Nhấn vào biểu tượng trái tim để thêm địa điểm vào danh sách yêu thích.
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
      
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={24} color={theme.colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
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
  listContainer: {
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
  errorContainer: {
    padding: 16,
    backgroundColor: theme.colors.errorLight,
    marginHorizontal: 16,
    borderRadius: theme.radius.medium,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    color: theme.colors.error,
    marginLeft: 8,
  },
}); 