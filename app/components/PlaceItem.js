import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import theme from '../constants/theme';

// Icon cho từng danh mục
const CATEGORY_ICONS = {
  restaurant: 'restaurant-outline',
  cafe: 'cafe-outline',
  hotel: 'bed-outline',
  bar: 'wine-outline',
  atm: 'cash-outline',
  hospital: 'medical-outline',
  pharmacy: 'medkit-outline',
  gas_station: 'car-outline',
  bank: 'card-outline',
  other: 'location-outline'
};

const PlaceItem = ({ place, isFavorite, onFavoriteToggle, showDistance = true }) => {
  const navigation = useNavigation();
  
  // Xác định icon dựa trên danh mục
  const iconName = place.category && CATEGORY_ICONS[place.category] 
    ? CATEGORY_ICONS[place.category] 
    : CATEGORY_ICONS.other;
  
  // Xử lý khi click vào địa điểm
  const handlePress = () => {
    navigation.navigate('PlaceDetail', { place });
  };
  
  // Xử lý khi click vào icon yêu thích
  const handleFavoritePress = () => {
    if (onFavoriteToggle) {
      onFavoriteToggle(place);
    }
  };

  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <Ionicons name={iconName} size={24} color={theme.colors.primary} />
      </View>
      
      <View style={styles.detailsContainer}>
        <Text style={styles.placeName} numberOfLines={1}>
          {place.name}
        </Text>
        
        <Text style={styles.address} numberOfLines={2}>
          {place.address}
        </Text>
        
        {showDistance && place.distance && (
          <Text style={styles.distance}>
            <Ionicons name="navigate" size={12} color={theme.colors.primary} />
            {' '}{place.distance}
          </Text>
        )}
      </View>
      
      {onFavoriteToggle && (
        <TouchableOpacity 
          style={styles.favoriteButton}
          onPress={handleFavoritePress}
        >
          <Ionicons 
            name={isFavorite ? 'heart' : 'heart-outline'} 
            size={24} 
            color={isFavorite ? theme.colors.error : theme.colors.grey} 
          />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.medium,
    marginVertical: 6,
    padding: 12,
    ...theme.shadow.small
  },
  iconContainer: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: theme.radius.circle,
    backgroundColor: theme.colors.background,
    marginRight: 12
  },
  detailsContainer: {
    flex: 1
  },
  placeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text
  },
  address: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 2
  },
  distance: {
    fontSize: 12,
    color: theme.colors.primary,
    marginTop: 4
  },
  favoriteButton: {
    padding: 8
  }
});

// Sử dụng memo để tối ưu hiệu suất render
export default memo(PlaceItem); 