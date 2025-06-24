import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Linking,
    Platform,
    ScrollView,
    Share,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import theme from '../constants/theme';
import useLocation from '../hooks/useLocation';
import useRoute from '../hooks/useRoute';
import { isInFavorites, removeFromFavorites, saveToFavorites } from '../services/storageService';

interface Place {
  id: string | number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  category?: string;
  distance?: string;
  rating?: number;
}

interface LocationType {
  latitude: number;
  longitude: number;
  timestamp?: number;
}

const PlaceDetail = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [place, setPlace] = useState<Place | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const hasLoadedData = useRef(false);
  
  const { location } = useLocation() as { location: LocationType | null };
  const { findRoute } = useRoute() as { findRoute: any };
  
  // Lấy dữ liệu địa điểm từ params
  useEffect(() => {
    // Tránh load lại dữ liệu nhiều lần
    if (hasLoadedData.current) return;
    
    const loadData = async () => {
      if (params.place) {
        try {
          const placeData = typeof params.place === 'string'
            ? JSON.parse(params.place as string) as Place
            : params.place as unknown as Place;
          
          setPlace(placeData);
          
          // Kiểm tra xem địa điểm có trong yêu thích không - sử dụng hàm từ service trực tiếp
          const status = await isInFavorites(placeData.id);
          setIsFavorite(status);
          hasLoadedData.current = true;
        } catch (error) {
          console.error('Error parsing place data:', error);
        }
      }
      setLoading(false);
    };
    
    loadData();
  }, [params]);
  
  // Xử lý toggle yêu thích
  const handleToggleFavorite = async () => {
    if (place) {
      try {
        if (isFavorite) {
          await removeFromFavorites(place.id);
        } else {
          await saveToFavorites(place);
        }
        setIsFavorite(!isFavorite);
      } catch (error) {
        console.error('Error toggling favorite:', error);
      }
    }
  };
  
  // Xử lý chỉ đường
  const handleNavigate = async () => {
    if (location && place) {
      try {
        // Tìm đường với API
        const route = await findRoute(
          { latitude: location.latitude, longitude: location.longitude },
          { latitude: place.latitude, longitude: place.longitude },
          'driving'
        );
        
        // Chuyển đến màn hình bản đồ với thông tin chỉ đường
        router.push({
          pathname: "/map" as any,
          params: { 
            place: JSON.stringify(place),
            from: 'detail'
          }
        });
      } catch (error) {
        console.error('Error finding route:', error);
      }
    }
  };
  
  // Xử lý chia sẻ địa điểm
  const handleShare = async () => {
    if (place) {
      try {
        await Share.share({
          message: `Xem địa điểm ${place.name} tại Go There: https://maps.google.com/maps?q=${place.latitude},${place.longitude}`,
        });
      } catch (error) {
        console.error('Error sharing place:', error);
      }
    }
  };
  
  // Mở địa chỉ với ứng dụng bản đồ mặc định
  const openInMapsApp = () => {
    if (place) {
      const url = Platform.select({
        ios: `maps:0,0?q=${place.name}@${place.latitude},${place.longitude}`,
        android: `geo:0,0?q=${place.latitude},${place.longitude}(${place.name})`,
      });
      
      Linking.canOpenURL(url).then(supported => {
        if (supported) {
          Linking.openURL(url);
        } else {
          // Fallback to Google Maps on web
          Linking.openURL(`https://maps.google.com/maps?q=${place.latitude},${place.longitude}`);
        }
      });
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text className="mt-4 text-base text-text">Đang tải...</Text>
      </View>
    );
  }

  if (!place) {
    return (
      <View className="flex-1 justify-center items-center p-6 bg-background">
        <Ionicons name="alert-circle" size={48} color={theme.colors.error} />
        <Text className="text-base text-text text-center mt-4 mb-6">Không tìm thấy thông tin địa điểm</Text>
        <TouchableOpacity
          className="w-10 h-10 rounded-full bg-card justify-center items-center shadow-sm"
          onPress={() => router.back()}
        >
          <Text className="text-primary text-base font-medium">Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row justify-between items-center px-4 py-3">
        <TouchableOpacity 
          className="w-10 h-10 rounded-full bg-card justify-center items-center shadow-sm"
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        
        <View className="flex-row">
          <TouchableOpacity 
            className="w-10 h-10 rounded-full bg-card justify-center items-center ml-3 shadow-sm"
            onPress={handleShare}
          >
            <Ionicons name="share-outline" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            className="w-10 h-10 rounded-full bg-card justify-center items-center ml-3 shadow-sm"
            onPress={handleToggleFavorite}
          >
            <Ionicons 
              name={isFavorite ? "heart" : "heart-outline"} 
              size={24} 
              color={isFavorite ? theme.colors.error : theme.colors.text} 
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        className="pb-[100px]"
      >
        {/* Bản đồ nhỏ */}
        <View className="h-[200px] mx-4 my-4 rounded-md overflow-hidden shadow-md">
          <MapView
            className="w-full h-full"
            provider={PROVIDER_DEFAULT}
            initialRegion={{
              latitude: place.latitude,
              longitude: place.longitude,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            }}
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
          >
            <Marker coordinate={{
              latitude: place.latitude,
              longitude: place.longitude,
            }}>
              <View className="items-center justify-center">
                <Ionicons name="location" size={32} color={theme.colors.primary} />
              </View>
            </Marker>
          </MapView>
          
          <TouchableOpacity 
            className="absolute right-2.5 bottom-2.5 bg-white/90 px-3 py-1.5 rounded-md shadow-sm"
            onPress={openInMapsApp}
          >
            <Text className="text-xs text-primary font-medium">Mở trong ứng dụng bản đồ</Text>
          </TouchableOpacity>
        </View>

        {/* Thông tin địa điểm */}
        <View className="px-4">
          {/* Tên địa điểm và danh mục */}
          <View className="mb-5">
            <View className="flex-row items-center bg-primary px-3 py-1.5 rounded-md self-start mb-2.5">
              <Ionicons 
                name={
                  place.category === 'restaurant' ? 'restaurant-outline' :
                  place.category === 'cafe' ? 'cafe-outline' :
                  place.category === 'atm' ? 'card-outline' :
                  place.category === 'hospital' ? 'medical-outline' :
                  place.category === 'pharmacy' ? 'medkit-outline' :
                  place.category === 'gas_station' ? 'car-outline' : 'location-outline'
                } 
                size={16} 
                color="white" 
              />
              <Text className="text-white text-sm font-medium ml-1.5">
                {place.category === 'restaurant' ? 'Nhà hàng' :
                place.category === 'cafe' ? 'Quán cafe' :
                place.category === 'atm' ? 'ATM' :
                place.category === 'hospital' ? 'Bệnh viện' :
                place.category === 'pharmacy' ? 'Hiệu thuốc' :
                place.category === 'gas_station' ? 'Trạm xăng' : 'Địa điểm'}
              </Text>
            </View>
            
            <Text className="text-2xl font-bold text-text mb-1.5">{place.name}</Text>
            
            {place.distance && (
              <Text className="text-sm text-primary">
                <Ionicons name="navigate" size={14} color={theme.colors.primary} />
                {' '}Cách {place.distance}
              </Text>
            )}
          </View>
          
          {/* Địa chỉ */}
          <View className="mt-5 p-4 bg-card rounded-md shadow-sm">
            <Text className="text-base font-bold text-text mb-2">Địa chỉ</Text>
            <Text className="text-[15px] text-text leading-[22px]">{place.address}</Text>
          </View>
          
          {/* Tọa độ */}
          <View className="mt-5 p-4 bg-card rounded-md shadow-sm">
            <Text className="text-base font-bold text-text mb-2">Tọa độ</Text>
            <Text className="text-[15px] text-text font-mono">
              {place.latitude.toFixed(6)}, {place.longitude.toFixed(6)}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Nút chỉ đường */}
      <View className="absolute bottom-0 left-0 right-0 bg-white px-4 pt-3 shadow-lg" style={{ paddingBottom: insets.bottom + 16 }}>
        <TouchableOpacity 
          className="flex-row justify-center items-center bg-primary rounded-md py-4 shadow-sm"
          onPress={handleNavigate}
        >
          <Ionicons name="navigate" size={20} color="white" />
          <Text className="text-white font-bold text-base ml-2">Chỉ đường đến đây</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default PlaceDetail; 