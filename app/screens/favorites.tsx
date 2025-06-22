import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useRef, useState } from 'react';
import { Animated, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { BORDER_RADIUS, COLORS, SHADOW, SPACING } from '../constants/theme';

// Mock data - trong thực tế sẽ lấy từ AsyncStorage hoặc SQLite
const mockFavorites = [
  {
    id: '1',
    name: 'Nhà hàng ABC',
    address: '123 Đường Nguyễn Huệ, Quận 1, TP.HCM',
    category: 'restaurant',
    notes: 'Quán ăn yêu thích với món bún bò ngon',
  },
  {
    id: '2',
    name: 'Quán Café XYZ',
    address: '456 Đường Lê Lợi, Quận 1, TP.HCM',
    category: 'cafe',
    notes: 'Wifi mạnh, không gian yên tĩnh',
  },
  {
    id: '3',
    name: 'ATM Vietcombank',
    address: '101 Đường Lý Tự Trọng, Quận 1, TP.HCM',
    category: 'atm',
    notes: 'ATM gần nhà, ít người',
  },
];

export default function FavoritesScreen() {
  const router = useRouter();
  const [favorites, setFavorites] = useState(mockFavorites);
  const [expandedId, setExpandedId] = useState(null);
  
  // Để tạo hiệu ứng mở rộng ghi chú
  const animatedValues = useRef(
    mockFavorites.reduce((acc, fav) => {
      acc[fav.id] = new Animated.Value(0);
      return acc;
    }, {})
  ).current;

  const navigateToPlace = (item) => {
    // Điều hướng đến bản đồ với marker tại vị trí địa điểm
    router.push({
      pathname: '/screens/map',
      params: { placeId: item.id }
    });
  };

  const toggleNotes = (id) => {
    // Nếu đang mở, đóng lại
    if (expandedId === id) {
      Animated.timing(animatedValues[id], {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start(() => setExpandedId(null));
    } 
    // Nếu đang đóng, mở ra
    else {
      // Đóng cái hiện tại (nếu có)
      if (expandedId) {
        Animated.timing(animatedValues[expandedId], {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }).start();
      }
      
      // Mở cái mới
      setExpandedId(id);
      Animated.timing(animatedValues[id], {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
  };

  const removeFavorite = (id) => {
    // Animation khi xóa
    Animated.timing(animatedValues[id], {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start(() => {
      setFavorites(favorites.filter(item => item.id !== id));
      if (expandedId === id) {
        setExpandedId(null);
      }
    });
  };

  const getItemHeight = (id, item) => {
    if (!item.notes) return 'auto';
    
    return animatedValues[id].interpolate({
      inputRange: [0, 1],
      outputRange: [0, 80],
    });
  };

  const renderItemIcon = (category) => {
    switch (category) {
      case 'restaurant':
        return <Ionicons name="restaurant-outline" size={22} color="#10B981" />;
      case 'cafe':
        return <Ionicons name="cafe-outline" size={22} color="#F59E0B" />;
      case 'atm':
        return <Ionicons name="card-outline" size={22} color="#3B82F6" />;
      default:
        return <Ionicons name="location-outline" size={22} color="#3B82F6" />;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.darkText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Địa Điểm Yêu Thích</Text>
        <View style={{ width: 40 }} />
      </View>
      
      {/* Content */}
      <View style={styles.content}>
        {favorites.length > 0 ? (
          <FlatList
            data={favorites}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContainer}
            renderItem={({ item }) => (
              <View style={styles.itemContainer}>
                <TouchableOpacity 
                  style={styles.favoriteItem}
                  onPress={() => navigateToPlace(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.itemIconContainer}>
                    {renderItemIcon(item.category)}
                  </View>
                  
                  <View style={styles.itemContent}>
                    <Text style={styles.itemTitle}>{item.name}</Text>
                    <Text style={styles.itemAddress} numberOfLines={1}>{item.address}</Text>
                    
                    <View style={styles.itemActions}>
                      <TouchableOpacity 
                        style={[
                          styles.actionButton,
                          { backgroundColor: item.notes ? '#EFF6FF' : 'transparent' }
                        ]}
                        onPress={() => item.notes && toggleNotes(item.id)}
                        disabled={!item.notes}
                      >
                        <Ionicons 
                          name={
                            item.notes 
                              ? expandedId === item.id 
                                ? "chevron-up" 
                                : "chevron-down" 
                              : "document-outline"
                          } 
                          size={16} 
                          color={item.notes ? COLORS.primary : COLORS.grayText}
                        />
                        <Text 
                          style={[
                            styles.actionText,
                            { color: item.notes ? COLORS.primary : COLORS.grayText }
                          ]}
                        >
                          {item.notes ? 'Ghi chú' : 'Không có ghi chú'}
                        </Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={styles.directionButton}
                        onPress={() => navigateToPlace(item)}
                      >
                        <Ionicons name="navigate-outline" size={16} color={COLORS.background} />
                        <Text style={styles.directionText}>Chỉ đường</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  <TouchableOpacity 
                    style={styles.favoriteButton}
                    onPress={() => removeFavorite(item.id)}
                  >
                    <Ionicons name="heart" size={22} color={COLORS.notification} />
                  </TouchableOpacity>
                </TouchableOpacity>
                
                {/* Notes expandable section */}
                {item.notes && (
                  <Animated.View 
                    style={[
                      styles.notesContainer,
                      { 
                        height: getItemHeight(item.id, item),
                        opacity: animatedValues[item.id]
                      }
                    ]}
                  >
                    <Text style={styles.notesText}>{item.notes}</Text>
                  </Animated.View>
                )}
              </View>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="heart-outline" size={64} color={COLORS.border} />
            </View>
            <Text style={styles.emptyTitle}>Chưa có địa điểm yêu thích</Text>
            <Text style={styles.emptyText}>
              Thêm địa điểm yêu thích bằng cách nhấn vào biểu tượng trái tim khi tìm kiếm
            </Text>
            <TouchableOpacity
              style={styles.searchButton}
              onPress={() => router.push('/screens/search')}
            >
              <Ionicons name="search" size={18} color={COLORS.background} />
              <Text style={styles.searchButtonText}>Tìm kiếm ngay</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      
      {/* Bottom navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={styles.navButton}
          onPress={() => router.push('/screens/map')}
        >
          <Ionicons name="map-outline" size={24} color={COLORS.grayText} />
          <Text style={styles.navText}>Bản đồ</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navButton}
          onPress={() => router.push('/screens/search')}
        >
          <Ionicons name="search-outline" size={24} color={COLORS.grayText} />
          <Text style={styles.navText}>Tìm kiếm</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navButton}
          onPress={() => router.push('/screens/history')}
        >
          <Ionicons name="time-outline" size={24} color={COLORS.grayText} />
          <Text style={styles.navText}>Lịch sử</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navButtonActive}>
          <Ionicons name="heart" size={24} color={COLORS.primary} />
          <Text style={styles.navTextActive}>Yêu thích</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: SPACING.large,
    paddingBottom: SPACING.medium,
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
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.darkText,
  },
  content: {
    flex: 1,
  },
  listContainer: {
    padding: SPACING.large,
  },
  itemContainer: {
    marginBottom: SPACING.medium,
  },
  favoriteItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.large,
    padding: SPACING.medium,
    ...SHADOW.small,
  },
  itemIconContainer: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.medium,
    backgroundColor: COLORS.lightBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemContent: {
    flex: 1,
    marginLeft: SPACING.medium,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.darkText,
    marginBottom: 2,
  },
  itemAddress: {
    fontSize: 14,
    color: COLORS.grayText,
    marginBottom: SPACING.small,
  },
  itemActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.small,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.medium,
  },
  actionText: {
    fontSize: 13,
    marginLeft: 4,
  },
  directionButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.medium,
    paddingHorizontal: SPACING.small,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  directionText: {
    fontSize: 13,
    color: COLORS.background,
    marginLeft: 4,
    fontWeight: '500',
  },
  favoriteButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.small,
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.round,
  },
  notesContainer: {
    backgroundColor: COLORS.lightBackground,
    borderBottomLeftRadius: BORDER_RADIUS.large,
    borderBottomRightRadius: BORDER_RADIUS.large,
    padding: SPACING.medium,
    marginTop: -SPACING.small,
    overflow: 'hidden',
  },
  notesText: {
    fontSize: 14,
    color: COLORS.darkText,
    fontStyle: 'italic',
  },
  separator: {
    height: SPACING.small,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.large,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.lightBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.large,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.darkText,
    marginBottom: SPACING.medium,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.grayText,
    textAlign: 'center',
    marginBottom: SPACING.large,
  },
  searchButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.small,
    paddingHorizontal: SPACING.large,
    borderRadius: BORDER_RADIUS.large,
    ...SHADOW.small,
  },
  searchButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '500',
    marginLeft: SPACING.small,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: SPACING.medium,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  navButton: {
    alignItems: 'center',
  },
  navButtonActive: {
    alignItems: 'center',
  },
  navText: {
    fontSize: 12,
    color: COLORS.grayText,
    marginTop: 4,
  },
  navTextActive: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
    marginTop: 4,
  },
}); 