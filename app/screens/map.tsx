import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import theme from '../constants/theme';
import useFavorites from '../hooks/useFavorites';
import useLocation from '../hooks/useLocation';
import useRoute from '../hooks/useRoute';

const { width, height } = Dimensions.get('window');
const CARD_HEIGHT = 220;
const BOTTOM_SHEET_HEIGHT = 120;

interface Place {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  category?: string;
  distance?: string;
  rating?: number;
}

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface LocationType {
  latitude: number;
  longitude: number;
  timestamp?: number;
}

interface RouteType {
  geometry: {
    coordinates: [number, number][];
  };
  distance: number;
  duration: number;
  formattedDistance: string;
  formattedDuration: string;
  startPoint: Coordinates;
  endPoint: Coordinates;
  transportMode: string;
}

const MapScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [mapReady, setMapReady] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [markerCoords, setMarkerCoords] = useState<Coordinates | null>(null);
  const [transportMode, setTransportMode] = useState<string>('driving');
  const [showBackButton, setShowBackButton] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [isBottomSheetExpanded, setIsBottomSheetExpanded] = useState(false);
  const [isLoadingReverseGeocode, setIsLoadingReverseGeocode] = useState(false);
  const [shouldFindRoute, setShouldFindRoute] = useState(false);
  const [pendingRouteRequest, setPendingRouteRequest] = useState<{
    start: Coordinates;
    end: Coordinates;
    mode: string;
  } | null>(null);
  
  const mapRef = useRef<MapView | null>(null);
  const slideAnim = useRef(new Animated.Value(BOTTOM_SHEET_HEIGHT)).current;
  const hasZoomedToInitialLocation = useRef(false);
  const initialLocationRef = useRef<LocationType | null>(null);
  const initialParamsProcessed = useRef(false);
  
  const { location, loading: locationLoading, error: locationError, startWatchingLocation, reverseGeocode } = useLocation() as {
    location: LocationType | null;
    loading: boolean;
    error: string | null;
    startWatchingLocation: () => void;
    reverseGeocode: (coords: Coordinates) => Promise<Place | null>;
  };
  
  const { route, loading: routeLoading, error, findRoute } = useRoute() as {
    route: RouteType | null;
    loading: boolean;
    error: string | null;
    findRoute: (start: Coordinates, end: Coordinates, mode: string) => Promise<RouteType | null>;
  };
  
  const { favorites } = useFavorites();
  
  // Hàm tiện ích để animate bottom sheet - phải khai báo trước khi sử dụng trong useEffect
  const animateBottomSheet = useCallback((toValue: number) => {
    Animated.timing(slideAnim, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [slideAnim]);
  
  const initialRegion = useMemo(() => ({
    latitude: 10.762622,  // Vị trí mặc định TP.HCM
    longitude: 106.660172,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  }), []);

  // Lấy vị trí ban đầu
  useEffect(() => {
    startWatchingLocation();
  }, [startWatchingLocation]);

  // Lưu vị trí đầu tiên để tránh cập nhật liên tục
  useEffect(() => {
    if (location && !initialLocationRef.current) {
      initialLocationRef.current = location;
    }
  }, [location]);

  // Xử lý lỗi
  useEffect(() => {
    if (error) {
      setRouteError(error);
      console.error('Route error:', error);
    }
  }, [error]);

  // Mở rộng bottom sheet khi có lộ trình
  useEffect(() => {
    if (route) {
      setIsBottomSheetExpanded(true);
      animateBottomSheet(height - 300);
      // Xóa yêu cầu tìm đường đang chờ xử lý
      setPendingRouteRequest(null);
    }
  }, [route, animateBottomSheet, height]);

  // Zoom đến vị trí hiện tại khi có dữ liệu
  useEffect(() => {
    if (location && mapRef.current && mapReady && !hasZoomedToInitialLocation.current) {
      setTimeout(() => {
        mapRef.current?.animateToRegion({
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }, 1000);
        hasZoomedToInitialLocation.current = true;
      }, 500);
    }
  }, [location, mapReady]);
  
  // Zoom giữa hai điểm
  const zoomToTwoLocations = useCallback((loc1: Coordinates, loc2: Coordinates) => {
    if (!mapRef.current || !loc1 || !loc2) return;
    
    mapRef.current.fitToCoordinates(
      [loc1, loc2],
      {
        edgePadding: { top: 100, right: 100, bottom: 200, left: 100 },
        animated: true
      }
    );
  }, []);
  
  // Xử lý params khi màn hình được mở - chỉ chạy một lần
  useEffect(() => {
    // Chỉ xử lý params một lần
    if (initialParamsProcessed.current || !params?.place) return;
    
    const handleParams = async () => {
      try {
        const place = typeof params.place === 'string' 
          ? JSON.parse(params.place as string) as Place
          : params.place as unknown as Place;
          
        setSelectedPlace(place);
        setMarkerCoords({
          latitude: place.latitude,
          longitude: place.longitude
        });
        
        // Hiển thị nút quay lại khi có địa điểm được chọn
        setShowBackButton(true);
        
        // Mở bottom sheet với kích thước cơ bản
        setIsBottomSheetExpanded(false);
        animateBottomSheet(BOTTOM_SHEET_HEIGHT);
        
        // Đánh dấu đã xử lý params
        initialParamsProcessed.current = true;
        
        // Nếu có vị trí, zoom đến khu vực và đặt yêu cầu tìm đường
        if (location) {
          // Zoom đến khu vực bao gồm người dùng và địa điểm
          zoomToTwoLocations(
            { latitude: location.latitude, longitude: location.longitude },
            { latitude: place.latitude, longitude: place.longitude }
          );
          
          // Lưu yêu cầu tìm đường để xử lý sau
          setPendingRouteRequest({
            start: { latitude: location.latitude, longitude: location.longitude },
            end: { latitude: place.latitude, longitude: place.longitude },
            mode: transportMode
          });
        }
      } catch (error) {
        console.error('Error parsing place data:', error);
      }
    };
    
    handleParams();
  }, [params, location, transportMode, zoomToTwoLocations, animateBottomSheet]);
  
  // Xử lý tìm đường khi có yêu cầu
  useEffect(() => {
    const processRouteRequest = async () => {
      // Nếu đang tìm đường hoặc không có yêu cầu, không làm gì cả
      if (routeLoading || !pendingRouteRequest) return;
      
      try {
        console.log('Finding route from', pendingRouteRequest.start, 'to', pendingRouteRequest.end);
        await findRoute(
          pendingRouteRequest.start,
          pendingRouteRequest.end,
          pendingRouteRequest.mode
        );
      } catch (error) {
        console.error('Error finding route:', error);
        setRouteError(error instanceof Error ? error.message : 'Lỗi tìm đường');
        
        // Ngay cả khi có lỗi, vẫn hiển thị thông tin địa điểm
        setIsBottomSheetExpanded(true);
        animateBottomSheet(height / 2);
        
        // Xóa yêu cầu tìm đường để không thử lại
        setPendingRouteRequest(null);
      }
    };
    
    processRouteRequest();
  }, [pendingRouteRequest, routeLoading, findRoute, animateBottomSheet, height]);
  
  const changeTransportMode = useCallback(async (mode: string) => {
    if (mode === transportMode || !location || !selectedPlace) return;
    
    setTransportMode(mode);
    setRouteError(null);
    
    // Thay vì gọi findRoute trực tiếp, đặt một yêu cầu tìm đường mới
    setPendingRouteRequest({
      start: { latitude: location.latitude, longitude: location.longitude },
      end: { latitude: selectedPlace.latitude, longitude: selectedPlace.longitude },
      mode
    });
  }, [transportMode, location, selectedPlace]);
  
  // Xử lý khi nhấn giữ trên bản đồ
  const handleLongPress = useCallback(async (event: any) => {
    const { coordinate } = event.nativeEvent;
    setMarkerCoords(coordinate);
    setRouteError(null);
    
    try {
      setIsLoadingReverseGeocode(true);
      
      // Tìm thông tin địa điểm từ tọa độ
      const place = await reverseGeocode(coordinate);
      
      if (place) {
        setSelectedPlace(place);
        setShowBackButton(true);
        
        // Mở bottom sheet
        setIsBottomSheetExpanded(true);
        animateBottomSheet(height / 2);
        
        // Nếu có vị trí người dùng, đặt yêu cầu tìm đường
        if (location) {
          setPendingRouteRequest({
            start: { latitude: location.latitude, longitude: location.longitude },
            end: { latitude: place.latitude, longitude: place.longitude },
            mode: transportMode
          });
        }
      }
    } catch (error) {
      console.error('Error in reverse geocoding:', error);
    } finally {
      setIsLoadingReverseGeocode(false);
    }
  }, [reverseGeocode, animateBottomSheet, height, location, transportMode]);
  
  // Chuyển đến màn hình chỉ đường chi tiết
  const navigateToDirections = useCallback(() => {
    if (location && selectedPlace && route) {
      router.push({
        pathname: "/route-directions" as any,
        params: {
          startLocation: JSON.stringify({
            latitude: location.latitude,
            longitude: location.longitude
          }),
          endLocation: JSON.stringify({
            latitude: selectedPlace.latitude,
            longitude: selectedPlace.longitude
          }),
          place: JSON.stringify(selectedPlace),
          route: JSON.stringify(route)
        }
      });
    } else {
      Alert.alert('Thông báo', 'Không thể tìm đường đi. Vui lòng thử lại sau.');
    }
  }, [location, selectedPlace, route, router]);
  
  // Đóng/mở bottom sheet
  const toggleBottomSheet = useCallback(() => {
    const newExpandedState = !isBottomSheetExpanded;
    setIsBottomSheetExpanded(newExpandedState);
    
    animateBottomSheet(newExpandedState ? (height / 2) : BOTTOM_SHEET_HEIGHT);
  }, [isBottomSheetExpanded, animateBottomSheet, height]);
  
  // Xử lý nút quay lại
  const handleBackPress = useCallback(() => {
    if (selectedPlace) {
      // Nếu có địa điểm được chọn, hãy xóa nó và quay lại màn hình bản đồ thông thường
      setSelectedPlace(null);
      setMarkerCoords(null);
      setShowBackButton(false);
      setIsBottomSheetExpanded(false);
      setPendingRouteRequest(null);
      
      // Thu gọn bottom sheet
      animateBottomSheet(BOTTOM_SHEET_HEIGHT);
      
      // Quay lại vị trí hiện tại
      if (location && mapRef.current) {
        mapRef.current?.animateToRegion({
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }, 1000);
      }
      
      // Chuyển đến tab tìm kiếm nếu đến từ đó
      if (params?.from === 'search') {
        router.push('/search' as any);
      }
    } else {
      // Nếu không có địa điểm được chọn, chuyển đến tab tìm kiếm
      router.push('/search' as any);
    }
  }, [selectedPlace, location, params?.from, router, animateBottomSheet]);

  // Xử lý nút tìm đường
  const handleFindRoute = useCallback(() => {
    if (!location || !selectedPlace) return;
    
    // Thay vì gọi findRoute trực tiếp, đặt một yêu cầu tìm đường mới
    setPendingRouteRequest({
      start: { latitude: location.latitude, longitude: location.longitude },
      end: { latitude: selectedPlace.latitude, longitude: selectedPlace.longitude },
      mode: transportMode
    });
  }, [location, selectedPlace, transportMode]);

  // Xử lý nút vị trí hiện tại
  const handleGoToCurrentLocation = useCallback(() => {
    if (location && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 500);
    }
  }, [location]);

  // Render các nút chọn phương tiện
  const renderTransportButtons = useMemo(() => {
    const transportOptions = [
      { id: 'driving', icon: 'car' as const },
      { id: 'walking', icon: 'walk' as const },
      { id: 'cycling', icon: 'bicycle' as const }
    ];
    
    return (
      <View className="flex-row justify-center mt-2.5">
        {transportOptions.map(option => (
          <TouchableOpacity
            key={option.id}
            className={`w-11 h-11 rounded-full justify-center items-center mx-2.5 ${
              transportMode === option.id ? 'bg-primary' : 'bg-lightGrey'
            }`}
            onPress={() => changeTransportMode(option.id)}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={option.icon} 
              size={20} 
              color={transportMode === option.id ? 'white' : theme.colors.text} 
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  }, [transportMode, changeTransportMode]);

  const isLoading = locationLoading || routeLoading || isLoadingReverseGeocode;

  // Tạo các điểm trên bản đồ (vị trí hiện tại, địa điểm đã chọn, địa điểm yêu thích)
  const mapMarkers = useMemo(() => {
    const markers = [];
    
    // Thêm marker vị trí hiện tại
    if (location) {
      markers.push(
        <Marker
          key="current-location"
          coordinate={{
            latitude: location.latitude,
            longitude: location.longitude
          }}
          title="Vị trí hiện tại"
          description={location.address}
          pinColor={theme.colors.primary}
        >
          <FontAwesome5 name="map-marker-alt" size={24} color={theme.colors.primary} />
        </Marker>
      );
    }
    
    // Thêm marker địa điểm đã chọn
    if (selectedPlace) {
      markers.push(
        <Marker
          key={selectedPlace.id}
          coordinate={{
            latitude: selectedPlace.latitude,
            longitude: selectedPlace.longitude
          }}
          title={selectedPlace.name}
          description={selectedPlace.address}
          pinColor={theme.colors.secondary}
        />
      );
    }
    
    // Thêm marker các địa điểm yêu thích
    favorites.forEach(favorite => {
      markers.push(
        <Marker
          key={favorite.id}
          coordinate={{
            latitude: favorite.latitude,
            longitude: favorite.longitude
          }}
          title={favorite.name}
          description={favorite.address}
          pinColor={theme.colors.accent}
        >
          <FontAwesome5 name="star" size={20} color={theme.colors.accent} />
        </Marker>
      );
    });
    
    return markers;
  }, [location, selectedPlace, favorites]);
  
  // Hiển thị đường đi nếu có
  const routePolyline = useMemo(() => {
    if (!route || !route.geometry || !route.geometry.coordinates) {
      return null;
    }
    
    // Chuyển đổi định dạng tọa độ từ [lng, lat] sang {latitude, longitude}
    const coordinates = route.geometry.coordinates.map(coord => ({
      latitude: coord[1],
      longitude: coord[0]
    }));
    
    return (
      <Polyline
        coordinates={coordinates}
        strokeWidth={4}
        strokeColor={theme.colors.primary}
      />
    );
  }, [route]);
  
  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {/* Bản đồ */}
      <MapView
        ref={mapRef}
        className="flex-1 w-full h-full"
        provider={PROVIDER_DEFAULT}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton={false}
        toolbarEnabled={false}
        showsCompass={false}
        showsScale={true}
        onMapReady={() => setMapReady(true)}
        onLongPress={handleLongPress}
      >
        {mapMarkers}
        {routePolyline}
      </MapView>

      {/* Nút back - chỉ hiển thị khi có địa điểm được chọn */}
      {showBackButton && (
        <TouchableOpacity 
          className="absolute left-4 w-10 h-10 rounded-full bg-white justify-center items-center shadow-md"
          style={{ top: insets.top + 10 }}
          onPress={handleBackPress}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      )}

      {/* Nút vị trí hiện tại */}
      <TouchableOpacity 
        className="absolute right-4 w-[46px] h-[46px] rounded-full bg-white justify-center items-center shadow-md"
        style={{ bottom: route ? 300 : BOTTOM_SHEET_HEIGHT + 20 }}
        onPress={handleGoToCurrentLocation}
      >
        <Ionicons name="locate" size={24} color={theme.colors.primary} />
      </TouchableOpacity>
      
      {/* Loading indicator */}
      {isLoading && (
        <View className="absolute inset-0 justify-center items-center bg-white/40">
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      )}
      
      {/* Bottom sheet info */}
      <Animated.View 
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[20px] shadow-lg"
        style={{ 
          height: slideAnim,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.1,
          shadowRadius: 5,
          elevation: 10,
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: 20
        }}
      >
        {/* Handle để kéo mở bottom sheet */}
        <TouchableOpacity 
          className="items-center pb-3" 
          onPress={toggleBottomSheet}
          activeOpacity={0.7}
          style={{ marginBottom: 5 }}
        >
          <View className="w-10 h-[5px] rounded-sm bg-border" />
          <Ionicons 
            name={isBottomSheetExpanded ? "chevron-down" : "chevron-up"} 
            size={18} 
            color={theme.colors.textSecondary} 
            style={{ marginTop: 6 }}
          />
        </TouchableOpacity>

        {/* Thông tin địa điểm */}
        {selectedPlace && (
          <View className="mt-1">
            <Text className="text-xl font-bold text-text">{selectedPlace.name}</Text>
            <Text className="text-sm text-textSecondary mt-1" numberOfLines={isBottomSheetExpanded ? 0 : 2}>
              {selectedPlace.address}
            </Text>
            
            {/* Hiển thị chi tiết địa điểm khi không có lộ trình */}
            {!route && isBottomSheetExpanded && (
              <View className="mt-4">
                {selectedPlace.category && (
                  <View className="flex-row items-center mt-2">
                    <Ionicons name="pricetag-outline" size={18} color={theme.colors.primary} />
                    <Text className="text-base text-text ml-2">{selectedPlace.category}</Text>
                  </View>
                )}
                
                {selectedPlace.distance && (
                  <View className="flex-row items-center mt-2">
                    <Ionicons name="resize-outline" size={18} color={theme.colors.primary} />
                    <Text className="text-base text-text ml-2">{selectedPlace.distance}</Text>
                  </View>
                )}
                
                {/* Nút tìm đường */}
                {location && !route && !routeLoading && !pendingRouteRequest && (
                  <TouchableOpacity 
                    className="flex-row justify-center items-center bg-primary rounded-md py-3.5 mt-5 shadow-sm"
                    onPress={handleFindRoute}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="map-outline" size={18} color="white" />
                    <Text className="text-white font-bold text-base ml-2">Tìm đường đi</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            
            {/* Hiển thị lỗi nếu có */}
            {routeError && (
              <View className="mt-4 p-3 bg-error/10 rounded-md">
                <Text className="text-error">{routeError}</Text>
              </View>
            )}
            
            {/* Thông tin lộ trình nếu có */}
            {route && (
              <Animated.View className="mt-4 p-3 bg-card rounded-md">
                <View className="flex-row justify-around mb-3">
                  <View className="flex-row items-center">
                    <Ionicons name="time-outline" size={18} color={theme.colors.primary} />
                    <Text className="ml-1.5 text-base font-semibold text-text">{route.formattedDuration}</Text>
                  </View>
                  <View className="flex-row items-center">
                    <Ionicons name="resize-outline" size={18} color={theme.colors.primary} />
                    <Text className="ml-1.5 text-base font-semibold text-text">{route.formattedDistance}</Text>
                  </View>
                </View>
                
                {/* Các phương tiện giao thông */}
                {renderTransportButtons}
              </Animated.View>
            )}
            
            {/* Nút điều hướng */}
            {route && (
              <TouchableOpacity 
                className="flex-row justify-center items-center bg-primary rounded-md py-3.5 mt-5 shadow-sm"
                onPress={navigateToDirections}
                activeOpacity={0.8}
              >
                <Ionicons name="navigate" size={18} color="white" />
                <Text className="text-white font-bold text-base ml-2">Chỉ đường chi tiết</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        
        {/* Hiển thị thông báo khi không có địa điểm nào được chọn */}
        {!selectedPlace && (
          <View className="items-center justify-center py-5">
            <Ionicons name="search" size={28} color={theme.colors.textSecondary} />
            <Text className="text-textSecondary text-base mt-2 text-center">
              Tìm kiếm hoặc chọn địa điểm trên bản đồ để xem thông tin chi tiết
            </Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
};

export default MapScreen;