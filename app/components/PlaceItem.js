import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { styled } from 'nativewind';
import React, { memo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

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

// Styled components
const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);

const PlaceItem = ({ place, isFavorite, onFavoriteToggle, showDistance = true, onPress }) => {
  const router = useRouter();
  
  // Xác định icon dựa trên danh mục
  const iconName = place.category && CATEGORY_ICONS[place.category] 
    ? CATEGORY_ICONS[place.category] 
    : CATEGORY_ICONS.other;
  
  // Xử lý khi click vào địa điểm
  const handlePress = () => {
    if (onPress) {
      onPress(place);
    } else {
      router.push({
        pathname: "/screens/PlaceDetail",
        params: { place: JSON.stringify(place) }
      });
    }
  };
  
  // Xử lý khi click vào icon yêu thích
  const handleFavoritePress = () => {
    if (onFavoriteToggle) {
      onFavoriteToggle(place);
    }
  };

  return (
    <StyledTouchableOpacity 
      className="flex-row items-center bg-card rounded-medium my-1.5 p-3 shadow-sm"
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <StyledView className="w-11 h-11 justify-center items-center rounded-circle bg-background mr-3">
        <Ionicons name={iconName} size={24} color="#3366FF" />
      </StyledView>
      
      <StyledView className="flex-1">
        <StyledText className="text-base font-bold text-text" numberOfLines={1}>
          {place.name}
        </StyledText>
        
        <StyledText className="text-sm text-textSecondary mt-0.5" numberOfLines={2}>
          {place.address}
        </StyledText>
        
        {showDistance && place.distance && (
          <StyledText className="text-xs text-primary mt-1">
            <Ionicons name="navigate" size={12} color="#3366FF" />
            {' '}{place.distance}
          </StyledText>
        )}
      </StyledView>
      
      {onFavoriteToggle && (
        <StyledTouchableOpacity 
          className="p-2"
          onPress={handleFavoritePress}
        >
          <Ionicons 
            name={isFavorite ? 'heart' : 'heart-outline'} 
            size={24} 
            color={isFavorite ? '#FF3D71' : '#8F9BB3'} 
          />
        </StyledTouchableOpacity>
      )}
    </StyledTouchableOpacity>
  );
};

// Sử dụng memo để tối ưu hiệu suất render
export default memo(PlaceItem); 