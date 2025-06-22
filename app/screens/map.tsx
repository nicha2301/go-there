import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import theme from '../constants/theme';
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
  
  const mapRef = useRef<MapView | null>(null);
  const slideAnim = useRef(new Animated.Value(BOTTOM_SHEET_HEIGHT)).current;
  
  const { location, loading: locationLoading, error: locationError, startWatchingLocation } = useLocation() as {
    location: LocationType | null;
    loading: boolean;
    error: string | null;
    startWatchingLocation: () => void;
  };
  
  const { route, loading: routeLoading, error: routeError, findRoute } = useRoute() as {
    route: RouteType | null;
    loading: boolean;
    error: string | null;
    findRoute: (start: Coordinates, end: Coordinates, mode: string) => Promise<RouteType | null>;
  };
  
  const initialRegion = {
    latitude: 10.762622,  // Vị trí mặc định TP.HCM
    longitude: 106.660172,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  const hasZoomedToInitialLocation = useRef(false);

  // Lấy vị trí ban đầu
  useEffect(() => {
    startWatchingLocation();
  }, []);

  // Zoom đến vị trí hiện tại khi có dữ liệu
  useEffect(() => {
    if (location && mapRef.current && mapReady) {
      if (!hasZoomedToInitialLocation.current) {
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
    }
  }, [location, mapReady]);
  
  // Xử lý params nếu có
  useEffect(() => {
    const handleParams = async () => {
      // Hiển thị địa điểm được chọn từ màn hình tìm kiếm
      if (params?.place) {
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
          
          // Zoom đến địa điểm và tìm đường nếu có vị trí người dùng
          if (location && mapRef.current) {
            // Zoom đến khu vực bao gồm người dùng và địa điểm
            zoomToTwoLocations(
              { latitude: location.latitude, longitude: location.longitude },
              { latitude: place.latitude, longitude: place.longitude }
            );
            
            // Tìm đường đi
            findRoute(
              { latitude: location.latitude, longitude: location.longitude },
              { latitude: place.latitude, longitude: place.longitude },
              transportMode
            );
          }
        } catch (error) {
          console.error('Error parsing place data:', error);
        }
      } else {
        // Không hiển thị nút quay lại nếu không có địa điểm được chọn
        setShowBackButton(false);
      }
    };
    
    handleParams();
  }, [params, location]);
  
  const changeTransportMode = async (mode: string) => {
    setTransportMode(mode);
    
    if (location && selectedPlace) {
      await findRoute(
        { latitude: location.latitude, longitude: location.longitude },
        { latitude: selectedPlace.latitude, longitude: selectedPlace.longitude },
        mode
      );
    }
  };
  
  const zoomToTwoLocations = (loc1: Coordinates, loc2: Coordinates) => {
    if (!mapRef.current || !loc1 || !loc2) return;
    
    mapRef.current.fitToCoordinates(
      [loc1, loc2],
      {
        edgePadding: { top: 100, right: 100, bottom: 200, left: 100 },
        animated: true
      }
    );
  };
  
  // Chuyển đến màn hình chỉ đường chi tiết
  const navigateToDirections = () => {
    if (location && selectedPlace && route) {
      router.push({
        pathname: "/screens/RouteDirections" as any,
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
    }
  };
  
  // Đóng/mở bottom sheet
  const toggleBottomSheet = () => {
    Animated.timing(slideAnim, {
      toValue: route ? height - 300 : BOTTOM_SHEET_HEIGHT,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };
  
  // Xử lý nút quay lại
  const handleBackPress = () => {
    if (selectedPlace) {
      // Nếu có địa điểm được chọn, hãy xóa nó và quay lại màn hình bản đồ thông thường
      setSelectedPlace(null);
      setMarkerCoords(null);
      setShowBackButton(false);
      
      // Quay lại vị trí hiện tại
      if (location && mapRef.current) {
        mapRef.current.animateToRegion({
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
  };

  return (
    <View className="flex-1 bg-background">
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
      >
        {/* Marker cho địa điểm được chọn */}
        {markerCoords && (
          <Marker coordinate={markerCoords} title={selectedPlace?.name}>
            <View className="items-center justify-center">
              <Ionicons name="location" size={32} color={theme.colors.primary} />
            </View>
          </Marker>
        )}
        
        {/* Polyline cho đường đi */}
        {route && route.geometry && (
          <Polyline
            coordinates={route.geometry.coordinates.map(coord => ({
              latitude: coord[1],
              longitude: coord[0]
            }))}
            strokeWidth={4}
            strokeColor={theme.colors.primary}
          />
        )}
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
        onPress={() => {
          if (location) {
            mapRef.current?.animateToRegion({
              latitude: location.latitude,
              longitude: location.longitude,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            }, 500);
          }
        }}
      >
        <Ionicons name="locate" size={24} color={theme.colors.primary} />
      </TouchableOpacity>
      
      {/* Loading indicator */}
      {(locationLoading || routeLoading) && (
        <View className="absolute inset-0 justify-center items-center bg-white/40">
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      )}
      
      {/* Bottom sheet info */}
      <Animated.View 
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[20px] p-5 shadow-lg"
        style={{ height: slideAnim }}
      >
        {/* Handle để kéo mở bottom sheet */}
        <TouchableOpacity className="items-center pb-2.5" onPress={toggleBottomSheet}>
          <View className="w-10 h-[5px] rounded-sm bg-border" />
        </TouchableOpacity>

        {/* Thông tin địa điểm */}
        {selectedPlace && (
          <View className="mt-2.5">
            <Text className="text-xl font-bold text-text">{selectedPlace.name}</Text>
            <Text className="text-sm text-textSecondary mt-1" numberOfLines={2}>
              {selectedPlace.address}
            </Text>
            
            {/* Thông tin lộ trình nếu có */}
            {route && (
              <View className="mt-4 p-3 bg-card rounded-md">
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
                <View className="flex-row justify-center mt-2.5">
                  <TouchableOpacity
                    className={`w-11 h-11 rounded-full justify-center items-center mx-2.5 ${
                      transportMode === 'driving' ? 'bg-primary' : 'bg-lightGrey'
                    }`}
                    onPress={() => changeTransportMode('driving')}
                  >
                    <Ionicons 
                      name="car" 
                      size={20} 
                      color={transportMode === 'driving' ? 'white' : theme.colors.text} 
                    />
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    className={`w-11 h-11 rounded-full justify-center items-center mx-2.5 ${
                      transportMode === 'walking' ? 'bg-primary' : 'bg-lightGrey'
                    }`}
                    onPress={() => changeTransportMode('walking')}
                  >
                    <Ionicons 
                      name="walk" 
                      size={20} 
                      color={transportMode === 'walking' ? 'white' : theme.colors.text} 
                    />
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    className={`w-11 h-11 rounded-full justify-center items-center mx-2.5 ${
                      transportMode === 'cycling' ? 'bg-primary' : 'bg-lightGrey'
                    }`}
                    onPress={() => changeTransportMode('cycling')}
                  >
                    <Ionicons 
                      name="bicycle" 
                      size={20} 
                      color={transportMode === 'cycling' ? 'white' : theme.colors.text} 
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )}
            
            {/* Nút điều hướng */}
            <TouchableOpacity 
              className="flex-row justify-center items-center bg-primary rounded-md py-3.5 mt-5 shadow-sm"
              onPress={navigateToDirections}
            >
              <Ionicons name="navigate" size={18} color="white" />
              <Text className="text-white font-bold text-base ml-2">Chỉ đường chi tiết</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </View>
  );
};

export default MapScreen;