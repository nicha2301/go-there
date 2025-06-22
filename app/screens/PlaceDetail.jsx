import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Linking,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import theme from '../constants/theme';
import { useFavorites } from '../hooks/useFavorites';
import { useLocation } from '../hooks/useLocation';
import { useRoute } from '../hooks/useRoute';

export default function PlaceDetail() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  
  const [place, setPlace] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  
  const { location } = useLocation();
  const { findRoute } = useRoute();
  const { checkIsFavorite, toggleFavorite } = useFavorites();
  
  // Lấy dữ liệu địa điểm từ params
  useEffect(() => {
    if (params.place) {
      try {
        const placeData = typeof params.place === 'string'
          ? JSON.parse(params.place)
          : params.place;
        
        setPlace(placeData);
        
        // Kiểm tra xem địa điểm có trong yêu thích không
        const checkFavoriteStatus = async () => {
          const status = await checkIsFavorite(placeData.id);
          setIsFavorite(status);
        };
        
        checkFavoriteStatus();
      } catch (error) {
        console.error('Error parsing place data:', error);
      }
    }
  }, [params]);
  
  // Xử lý toggle yêu thích
  const handleToggleFavorite = async () => {
    if (place) {
      await toggleFavorite(place);
      setIsFavorite(prev => !prev);
    }
  };
  
  // Xử lý chỉ đường
  const handleNavigate = async () => {
    if (location && place) {
      // Tìm đường với API
      const route = await findRoute(
        { latitude: location.latitude, longitude: location.longitude },
        { latitude: place.latitude, longitude: place.longitude },
        'driving'
      );
      
      // Chuyển đến màn hình bản đồ với thông tin chỉ đường
      navigation.navigate('map', { 
        place: JSON.stringify(place)
      });
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

  // Nếu không có dữ liệu địa điểm, hiển thị trạng thái loading
  if (!place) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text style={styles.loadingText}>Đang tải thông tin...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleShare}
          >
            <Ionicons name="share-outline" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
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
        contentContainerStyle={styles.scrollContent}
      >
        {/* Bản đồ nhỏ */}
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
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
              <View style={styles.markerContainer}>
                <Ionicons name="location" size={32} color={theme.colors.primary} />
              </View>
            </Marker>
          </MapView>
          
          <TouchableOpacity 
            style={styles.openMapButton}
            onPress={openInMapsApp}
          >
            <Text style={styles.openMapButtonText}>Mở trong ứng dụng bản đồ</Text>
          </TouchableOpacity>
        </View>

        {/* Thông tin địa điểm */}
        <View style={styles.placeInfoContainer}>
          {/* Tên địa điểm và danh mục */}
          <View style={styles.placeHeader}>
            <View style={styles.categoryBadge}>
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
              <Text style={styles.categoryText}>
                {place.category === 'restaurant' ? 'Nhà hàng' :
                place.category === 'cafe' ? 'Quán cafe' :
                place.category === 'atm' ? 'ATM' :
                place.category === 'hospital' ? 'Bệnh viện' :
                place.category === 'pharmacy' ? 'Hiệu thuốc' :
                place.category === 'gas_station' ? 'Trạm xăng' : 'Địa điểm'}
              </Text>
            </View>
            
            <Text style={styles.placeName}>{place.name}</Text>
            
            {place.distance && (
              <Text style={styles.placeDistance}>
                <Ionicons name="navigate" size={14} color={theme.colors.primary} />
                {' '}Cách {place.distance}
              </Text>
            )}
          </View>
          
          {/* Địa chỉ */}
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Địa chỉ</Text>
            <Text style={styles.addressText}>{place.address}</Text>
          </View>
          
          {/* Tọa độ */}
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Tọa độ</Text>
            <Text style={styles.coordsText}>
              {place.latitude.toFixed(6)}, {place.longitude.toFixed(6)}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Nút chỉ đường */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity 
          style={styles.navigateButton}
          onPress={handleNavigate}
        >
          <Ionicons name="navigate" size={20} color="white" />
          <Text style={styles.navigateButtonText}>Chỉ đường đến đây</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.circle,
    backgroundColor: theme.colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadow.small,
  },
  headerActions: {
    flexDirection: 'row',
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.circle,
    backgroundColor: theme.colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    ...theme.shadow.small,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  mapContainer: {
    height: 200,
    margin: 16,
    borderRadius: theme.radius.medium,
    overflow: 'hidden',
    ...theme.shadow.medium,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  openMapButton: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.medium,
    ...theme.shadow.small,
  },
  openMapButtonText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  placeInfoContainer: {
    paddingHorizontal: 16,
  },
  placeHeader: {
    marginBottom: 20,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.medium,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  categoryText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  placeName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 6,
  },
  placeDistance: {
    fontSize: 14,
    color: theme.colors.primary,
  },
  infoSection: {
    marginTop: 20,
    padding: 16,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.medium,
    ...theme.shadow.tiny,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  addressText: {
    fontSize: 15,
    color: theme.colors.text,
    lineHeight: 22,
  },
  coordsText: {
    fontSize: 15,
    color: theme.colors.text,
    fontFamily: 'monospace',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingTop: 12,
    ...theme.shadow.large,
  },
  navigateButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.medium,
    paddingVertical: 16,
    ...theme.shadow.small,
  },
  navigateButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
}); 