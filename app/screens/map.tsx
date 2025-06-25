import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    FlatList,
    Keyboard,
    Modal,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import theme from '../constants/theme';
import useDebounce from '../hooks/useDebounce';
import useLocation from '../hooks/useLocation';
import useRoute from '../hooks/useRoute';
import { getAddressFromCoordinates, searchPlaces } from '../services/locationService';

const { width, height } = Dimensions.get('window');
const CARD_HEIGHT = 220;
const BOTTOM_SHEET_HEIGHT = 120;

// Icons cho các phương tiện
const TRANSPORT_MODES = [
  { id: 'driving', icon: 'car', name: 'Ô tô' },
  { id: 'walking', icon: 'walking', name: 'Đi bộ' },
  { id: 'cycling', icon: 'bicycle', name: 'Xe đạp' }
];

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
  address?: string;
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

// Component thanh tìm kiếm
interface SearchBarProps {
  value: string;
  onPress: () => void;
  placeholder: string;
  isFrom?: boolean;
}

const SearchBar = ({ value, onPress, placeholder, isFrom = false }: SearchBarProps) => (
  <TouchableOpacity 
    className="flex-row items-center bg-white rounded-md p-3 shadow-sm"
    onPress={onPress}
  >
    <View className="w-8 h-8 rounded-full bg-backgroundHighlight justify-center items-center mr-2">
      <Ionicons 
        name={isFrom ? "locate" : "location"} 
        size={18} 
        color={isFrom ? theme.colors.success : theme.colors.primary} 
      />
    </View>
    
    <View className="flex-1 flex-row items-center">
      {value ? (
        <Text className="flex-1 text-text" numberOfLines={1}>
          {value}
        </Text>
      ) : (
        <Text className="flex-1 text-textSecondary">{placeholder}</Text>
      )}
      <Ionicons name="search" size={18} color={theme.colors.grey} />
    </View>
  </TouchableOpacity>
);

// Component modal tìm kiếm
interface SearchModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectPlace: (place: Place) => void;
  isOriginSearch?: boolean;
  title?: string;
}

const SearchModal = ({ 
  visible, 
  onClose, 
  onSelectPlace, 
  isOriginSearch = false,
  title = "Tìm kiếm địa điểm"
}: SearchModalProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const { location } = useLocation() as { location: LocationType | null };
  
  // Áp dụng debounce cho searchQuery
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  
  // Tự động tìm kiếm khi debouncedSearchQuery thay đổi và có giá trị
  useEffect(() => {
    if (debouncedSearchQuery && debouncedSearchQuery.trim().length >= 2) {
      performSearch(debouncedSearchQuery);
    }
  }, [debouncedSearchQuery, location]);
  
  // Hàm thực hiện tìm kiếm
  const performSearch = async (query: string) => {
    if (!query.trim()) return;
    
    setLoading(true);
    
    try {
      const results = await searchPlaces(
        query, 
        location ? { lat: location.latitude, lng: location.longitude } : undefined
      );
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching places:', error);
      Alert.alert('Lỗi', 'Không thể tìm kiếm địa điểm. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };
  
  // Xử lý tìm kiếm thủ công (khi người dùng nhấn nút tìm hoặc Enter)
  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    
    Keyboard.dismiss();
    performSearch(searchQuery);
  };
  
  // Xử lý khi chọn một địa điểm
  const handleSelectPlace = (place: Place) => {
    onSelectPlace(place);
    onClose();
  };
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-background pt-12">
        {/* Header */}
        <View className="flex-row items-center px-4 py-2 bg-card">
          <TouchableOpacity 
            onPress={onClose}
            className="mr-3"
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-text">
            {title}
          </Text>
        </View>
        
        {/* Thanh tìm kiếm */}
        <View className="flex-row items-center px-4 py-2">
          <View className="flex-row items-center flex-1 px-3 py-2 bg-card rounded-md border border-lightGrey">
            <Ionicons name="search" size={20} color={theme.colors.grey} />
            <TextInput
              className="flex-1 ml-2 text-base text-text"
              placeholder="Nhập tên địa điểm..."
              placeholderTextColor={theme.colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
              autoFocus={true}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
              >
                <Ionicons name="close-circle" size={20} color={theme.colors.grey} />
              </TouchableOpacity>
            )}
          </View>
          
          {/* Ẩn nút tìm kiếm vì đã có tính năng debounce */}
          {searchQuery.length > 0 && debouncedSearchQuery !== searchQuery && (
            <TouchableOpacity 
              className="ml-2 px-4 py-2 bg-primary rounded-md"
              onPress={handleSearch}
            >
              <Text className="text-white font-bold">Tìm</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {/* Hiển thị indicator khi đang tìm kiếm */}
        {loading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : (
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity 
                className="flex-row p-4 border-b border-border"
                onPress={() => handleSelectPlace(item)}
              >
                <View className="w-10 h-10 rounded-full bg-backgroundHighlight justify-center items-center mr-3">
                  <Ionicons 
                    name={item.category === 'restaurant' ? 'restaurant' : 'location'} 
                    size={20} 
                    color={theme.colors.primary} 
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-text">{item.name}</Text>
                  <Text className="text-sm text-textSecondary" numberOfLines={2}>{item.address}</Text>
                  {item.distance && (
                    <Text className="text-xs text-textSecondary mt-1">{item.distance}</Text>
                  )}
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              searchQuery.length > 0 ? (
                <View className="flex-1 justify-center items-center py-10">
                  <Ionicons name="search" size={64} color={theme.colors.border} />
                  <Text className="text-lg font-bold text-text mt-4">
                    Không tìm thấy kết quả
                  </Text>
                  <Text className="text-center text-textSecondary mt-2 px-8">
                    Thử tìm kiếm với từ khóa khác
                  </Text>
                </View>
              ) : null
            }
          />
        )}
      </View>
    </Modal>
  );
};

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
  const [isLoading, setIsLoading] = useState(false);
  const [startPlaceName, setStartPlaceName] = useState<string>('');
  const [endPlaceName, setEndPlaceName] = useState<string>('');
  const [showDirectionsUI, setShowDirectionsUI] = useState(false);
  
  // Thêm state cho modal tìm kiếm
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [isOriginSearch, setIsOriginSearch] = useState(false);
  const [searchModalTitle, setSearchModalTitle] = useState('Tìm kiếm địa điểm');
  
  // Xóa state shouldFindRoute và pendingRouteRequest để tránh vòng lặp vô hạn
  const pendingRouteRequestRef = useRef<{
    start: Coordinates;
    end: Coordinates;
    mode: string;
  } | null>(null);
  
  const mapRef = useRef<MapView | null>(null);
  const slideAnim = useRef(new Animated.Value(BOTTOM_SHEET_HEIGHT)).current;
  const hasZoomedToInitialLocation = useRef(false);
  const initialLocationRef = useRef<LocationType | null>(null);
  const initialParamsProcessed = useRef(false);
  
  const { location, address, loading: locationLoading, error: locationError, isTracking, startLocationTracking, getCurrentLocation, stopLocationTracking } = useLocation() as {
    location: LocationType | null;
    address: string;
    loading: boolean;
    error: string | null;
    isTracking: boolean;
    startLocationTracking: () => void;
    getCurrentLocation: () => void;
    stopLocationTracking: () => void;
  };
  
  const { route, loading: routeLoading, error: routeApiError, getRoute, clearRoute } = useRoute() as {
    route: RouteType | null;
    loading: boolean;
    error: string | null;
    getRoute: (start: Coordinates, end: Coordinates, mode: string) => Promise<RouteType | null>;
    clearRoute: () => void;
  };
  
  // Hàm tiện ích để animate bottom sheet
  const animateBottomSheet = useCallback((toValue: number) => {
    Animated.timing(slideAnim, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [slideAnim]);
  
  // Hàm reverse geocode
  const reverseGeocode = useCallback(async (coords: Coordinates) => {
    try {
      setIsLoadingReverseGeocode(true);
      const addressText = await getAddressFromCoordinates(coords.latitude, coords.longitude);
      
      // Tạo đối tượng địa điểm từ tọa độ và địa chỉ
      const place: Place = {
        id: `place-${Date.now()}`,
        name: addressText.split(',')[0] || 'Địa điểm đã chọn',
        address: addressText,
        latitude: coords.latitude,
        longitude: coords.longitude,
        category: 'other'
      };
      
      return place;
    } catch (error) {
      console.error('Error in reverse geocoding:', error);
      return null;
    } finally {
      setIsLoadingReverseGeocode(false);
    }
  }, []);
  
  const initialRegion = useMemo(() => ({
    latitude: 10.762622,  // Vị trí mặc định TP.HCM
    longitude: 106.660172,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  }), []);

  // Lấy vị trí ban đầu - sửa lỗi vòng lặp vô hạn
  useEffect(() => {
    startLocationTracking();
    
    // Cleanup function
    return () => {
      stopLocationTracking();
    };
  }, []); // Chỉ chạy một lần khi component mount

  // Lưu vị trí đầu tiên
  useEffect(() => {
    if (location && !initialLocationRef.current) {
      initialLocationRef.current = location;
      // Cập nhật tên vị trí hiện tại
      setStartPlaceName('Vị trí hiện tại');
    }
  }, [location]);

  // Xử lý lỗi từ API tìm đường
  useEffect(() => {
    if (routeApiError) {
      setRouteError(routeApiError);
      console.error('Route error:', routeApiError);
    }
  }, [routeApiError]);

  // Mở rộng bottom sheet khi có lộ trình
  useEffect(() => {
    if (route) {
      setIsBottomSheetExpanded(true);
      animateBottomSheet(height - 300);
      // Xóa yêu cầu tìm đường đang chờ xử lý
      pendingRouteRequestRef.current = null;
      
      // Hiển thị giao diện chỉ đường
      setShowDirectionsUI(true);
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
    if (initialParamsProcessed.current) return;
    
    const handleParams = async () => {
      try {
        // Xử lý điểm đến (place)
        if (params?.place) {
          const place = typeof params.place === 'string' 
            ? JSON.parse(params.place as string) as Place
            : params.place as unknown as Place;
            
          setSelectedPlace(place);
          setMarkerCoords({
            latitude: place.latitude,
            longitude: place.longitude
          });
          setEndPlaceName(place.name);
          
          // Hiển thị nút quay lại khi có địa điểm được chọn
          setShowBackButton(true);
          
          // Mở bottom sheet với kích thước cơ bản
          setIsBottomSheetExpanded(false);
          animateBottomSheet(BOTTOM_SHEET_HEIGHT);
          
          // Đánh dấu đã xử lý params
          initialParamsProcessed.current = true;
          
          // Hiển thị giao diện chỉ đường
          setShowDirectionsUI(true);
          
          // Nếu có vị trí, zoom đến khu vực và tìm đường
          if (location) {
            // Zoom đến khu vực bao gồm người dùng và địa điểm
            zoomToTwoLocations(
              { latitude: location.latitude, longitude: location.longitude },
              { latitude: place.latitude, longitude: place.longitude }
            );
            
            // Tìm đường trực tiếp thay vì lưu vào state để tránh vòng lặp vô hạn
            try {
              setIsLoading(true);
              await getRoute(
                { latitude: location.latitude, longitude: location.longitude },
                { latitude: place.latitude, longitude: place.longitude },
                transportMode
              );
            } catch (error) {
              console.error('Error finding route:', error);
              setRouteError(error instanceof Error ? error.message : 'Lỗi tìm đường');
            } finally {
              setIsLoading(false);
            }
          }
        }
        
        // Xử lý điểm xuất phát (startPlace)
        if (params?.startPlace) {
          const startPlace = typeof params.startPlace === 'string'
            ? JSON.parse(params.startPlace as string) as Place
            : params.startPlace as unknown as Place;
            
          // Cập nhật tên và vị trí điểm xuất phát
          setStartPlaceName(startPlace.name);
          
          // Nếu đã có điểm đến, tìm đường từ điểm xuất phát mới đến điểm đến
          if (selectedPlace) {
            setShowDirectionsUI(true);
            
            try {
              setIsLoading(true);
              await getRoute(
                { latitude: startPlace.latitude, longitude: startPlace.longitude },
                { latitude: selectedPlace.latitude, longitude: selectedPlace.longitude },
                transportMode
              );
              
              // Zoom đến khu vực bao gồm điểm xuất phát và điểm đến
              zoomToTwoLocations(
                { latitude: startPlace.latitude, longitude: startPlace.longitude },
                { latitude: selectedPlace.latitude, longitude: selectedPlace.longitude }
              );
            } catch (error) {
              console.error('Error finding route with new start location:', error);
              setRouteError(error instanceof Error ? error.message : 'Lỗi tìm đường');
            } finally {
              setIsLoading(false);
            }
          }
          
          initialParamsProcessed.current = true;
        }
      } catch (error) {
        console.error('Error parsing place data:', error);
      }
    };
    
    handleParams();
  }, [params, location, transportMode, zoomToTwoLocations, animateBottomSheet, getRoute, selectedPlace]);
  
  // Xử lý khi chọn phương tiện
  const changeTransportMode = useCallback(async (mode: string) => {
    if (mode === transportMode || !location || !selectedPlace) return;
    
    setTransportMode(mode);
    setRouteError(null);
    
    // Gọi tìm đường trực tiếp thay vì sử dụng state để tránh vòng lặp
    try {
      setIsLoading(true);
      await getRoute(
        { latitude: location.latitude, longitude: location.longitude },
        { latitude: selectedPlace.latitude, longitude: selectedPlace.longitude },
        mode
      );
    } catch (error) {
      console.error('Error finding route with new transport mode:', error);
      setRouteError(error instanceof Error ? error.message : 'Lỗi tìm đường');
    } finally {
      setIsLoading(false);
    }
  }, [transportMode, location, selectedPlace, getRoute]);
  
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
        setEndPlaceName(place.name);
        setShowBackButton(true);
        
        // Hiển thị giao diện chỉ đường
        setShowDirectionsUI(true);
        
        // Mở bottom sheet
        setIsBottomSheetExpanded(true);
        animateBottomSheet(height / 2);
        
        // Nếu có vị trí người dùng, tìm đường trực tiếp
        if (location) {
          try {
            setIsLoading(true);
            await getRoute(
              { latitude: location.latitude, longitude: location.longitude },
              { latitude: place.latitude, longitude: place.longitude },
              transportMode
            );
          } catch (error) {
            console.error('Error finding route:', error);
            setRouteError(error instanceof Error ? error.message : 'Lỗi tìm đường');
          } finally {
            setIsLoading(false);
          }
        }
      }
    } catch (error) {
      console.error('Error in reverse geocoding:', error);
    } finally {
      setIsLoadingReverseGeocode(false);
    }
  }, [reverseGeocode, animateBottomSheet, height, location, transportMode, getRoute]);
  
  // Chuyển đến màn hình chỉ đường chi tiết
  const navigateToDirections = useCallback(() => {
    if (!location || !selectedPlace) return;
    
    console.log('[MapScreen] Navigating to route directions', {
      startLocation: {
        latitude: location.latitude,
        longitude: location.longitude
      },
      endLocation: {
        latitude: selectedPlace.latitude,
        longitude: selectedPlace.longitude
      },
      place: selectedPlace,
      transportMode
    });
    
    router.push({
      pathname: "/screens/RouteDirections",
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
        transportMode
      }
    });
  }, [location, selectedPlace, transportMode, router]);
  
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
      
      // Xóa lộ trình
      clearRoute();
      
      // Thu gọn bottom sheet
      animateBottomSheet(BOTTOM_SHEET_HEIGHT);
      
      // Ẩn giao diện chỉ đường
      setShowDirectionsUI(false);
      setEndPlaceName('');
      
      // Quay lại vị trí hiện tại
      if (location && mapRef.current) {
        mapRef.current?.animateToRegion({
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }, 1000);
      }
    }
  }, [selectedPlace, location, animateBottomSheet, clearRoute]);
  
  // Di chuyển đến vị trí hiện tại
  const handleGoToCurrentLocation = useCallback(() => {
    if (location && mapRef.current) {
      mapRef.current?.animateToRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 1000);
    } else {
      getCurrentLocation();
    }
  }, [location, getCurrentLocation]);
  
  // Xử lý nút tìm đường 
  const handleFindRoute = useCallback(() => {
    if (!location || !selectedPlace) return;
    
    setRouteError(null);
    setShowDirectionsUI(true);
    
    try {
      getRoute(
        { latitude: location.latitude, longitude: location.longitude },
        { latitude: selectedPlace.latitude, longitude: selectedPlace.longitude },
        transportMode
      );
    } catch (error) {
      console.error('Error finding route:', error);
      setRouteError(error instanceof Error ? error.message : 'Lỗi tìm đường');
    }
  }, [location, selectedPlace, transportMode, getRoute]);
  
  // Xử lý khi nhấn vào thanh tìm kiếm điểm đầu
  const handleStartSearch = useCallback(() => {
    setIsOriginSearch(true);
    setSearchModalTitle('Chọn điểm xuất phát');
    setShowSearchModal(true);
  }, []);
  
  // Xử lý khi nhấn vào thanh tìm kiếm điểm đến
  const handleDestinationSearch = useCallback(() => {
    setIsOriginSearch(false);
    setSearchModalTitle('Chọn điểm đến');
    setShowSearchModal(true);
  }, []);
  
  // Xử lý khi chọn địa điểm từ modal tìm kiếm
  const handleSelectPlace = useCallback((place: Place) => {
    if (isOriginSearch) {
      // Chọn điểm xuất phát
      setStartPlaceName(place.name);
      
      // Nếu đã có điểm đến, tìm đường từ điểm xuất phát mới đến điểm đến
      if (selectedPlace) {
        try {
          setIsLoading(true);
          getRoute(
            { latitude: place.latitude, longitude: place.longitude },
            { latitude: selectedPlace.latitude, longitude: selectedPlace.longitude },
            transportMode
          );
          
          // Zoom đến khu vực bao gồm điểm xuất phát và điểm đến
          zoomToTwoLocations(
            { latitude: place.latitude, longitude: place.longitude },
            { latitude: selectedPlace.latitude, longitude: selectedPlace.longitude }
          );
        } catch (error) {
          console.error('Error finding route with new start location:', error);
          setRouteError(error instanceof Error ? error.message : 'Lỗi tìm đường');
        } finally {
          setIsLoading(false);
        }
      }
    } else {
      // Chọn điểm đến
      setSelectedPlace(place);
      setMarkerCoords({
        latitude: place.latitude,
        longitude: place.longitude
      });
      setEndPlaceName(place.name);
      
      // Hiển thị nút quay lại
      setShowBackButton(true);
      
      // Hiển thị giao diện chỉ đường
      setShowDirectionsUI(true);
      
      // Nếu có vị trí người dùng, tìm đường trực tiếp
      if (location) {
        try {
          setIsLoading(true);
          getRoute(
            { latitude: location.latitude, longitude: location.longitude },
            { latitude: place.latitude, longitude: place.longitude },
            transportMode
          );
          
          // Zoom đến khu vực bao gồm người dùng và địa điểm
          zoomToTwoLocations(
            { latitude: location.latitude, longitude: location.longitude },
            { latitude: place.latitude, longitude: place.longitude }
          );
        } catch (error) {
          console.error('Error finding route:', error);
          setRouteError(error instanceof Error ? error.message : 'Lỗi tìm đường');
        } finally {
          setIsLoading(false);
        }
      }
    }
  }, [isOriginSearch, selectedPlace, location, transportMode, getRoute, zoomToTwoLocations]);
  
  // Các nút phương tiện giao thông
  const renderTransportButtons = useMemo(() => (
    <View className="flex-row justify-around mt-3 pb-3">
      {TRANSPORT_MODES.map((mode) => (
        <TouchableOpacity
          key={mode.id}
          className={`items-center py-2 px-4 rounded-md ${transportMode === mode.id ? 'bg-backgroundHighlight' : ''}`}
          onPress={() => changeTransportMode(mode.id)}
          disabled={routeLoading || isLoading}
        >
          <FontAwesome5
            name={mode.icon}
            size={18}
            color={transportMode === mode.id ? theme.colors.primary : theme.colors.text}
          />
          <Text
            className={`text-xs mt-1 ${transportMode === mode.id ? 'text-primary font-bold' : 'text-textSecondary'}`}
          >
            {mode.name}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  ), [transportMode, changeTransportMode, routeLoading, isLoading]);
  
  // Hiển thị các marker trên bản đồ
  const mapMarkers = useMemo(() => {
    const markers = [];
    
    // Thêm marker vị trí được chọn
    if (markerCoords) {
      markers.push(
        <Marker
          key="selected"
          coordinate={markerCoords}
          title={selectedPlace?.name}
          description={selectedPlace?.address}
        >
          <View className="items-center justify-center">
            <Ionicons name="location" size={32} color={theme.colors.primary} />
          </View>
        </Marker>
      );
    }
    
    return markers;
  }, [markerCoords, selectedPlace]);
  
  // Hiển thị đường đi nếu có
  const routePolyline = useMemo(() => {
    if (!route || !route.geometry || !route.geometry.coordinates) {
      return null;
    }
    
    // Chuyển đổi định dạng tọa độ từ [lng, lat] sang {latitude, longitude}
    const coordinates = route.geometry.coordinates.map((coord: [number, number]) => ({
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
      {/* Header với thanh tìm kiếm */}
      <View className="px-4 py-2 bg-white shadow-md z-10">
        {!showDirectionsUI ? (
          // UI tìm kiếm mặc định
          <SearchBar 
            placeholder="Tìm kiếm địa điểm" 
            value=""
            onPress={handleDestinationSearch}
          />
        ) : (
          // UI tìm đường với điểm đầu/điểm cuối
          <View>
            <SearchBar 
              isFrom={true}
              placeholder="Vị trí hiện tại"
              value={startPlaceName} 
              onPress={handleStartSearch}
            />
            
            <View className="h-[1] bg-border my-2 mx-10" />
            
            <SearchBar 
              isFrom={false}
              placeholder="Chọn điểm đến"
              value={endPlaceName}
              onPress={handleDestinationSearch} 
            />
            
            {/* Nút tắt chế độ chỉ đường */}
            <TouchableOpacity 
              className="absolute right-0 top-[48%] transform -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-sm justify-center items-center"
              onPress={handleBackPress}
            >
              <Ionicons name="close" size={20} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
        )}
      </View>
      
      {/* Modal tìm kiếm */}
      <SearchModal
        visible={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onSelectPlace={handleSelectPlace}
        isOriginSearch={isOriginSearch}
        title={searchModalTitle}
      />
      
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

      {/* Nút vị trí hiện tại */}
      <TouchableOpacity 
        className="absolute right-4 w-[46px] h-[46px] rounded-full bg-white justify-center items-center shadow-md"
        style={{ bottom: route ? 300 : BOTTOM_SHEET_HEIGHT + 20 }}
        onPress={handleGoToCurrentLocation}
      >
        <Ionicons name="locate" size={24} color={theme.colors.primary} />
      </TouchableOpacity>
      
      {/* Loading indicator */}
      {(isLoading || routeLoading || isLoadingReverseGeocode) && (
        <View className="absolute inset-0 justify-center items-center bg-white/40">
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      )}
      
      {/* Bottom sheet info - chỉ hiển thị khi có địa điểm */}
      {selectedPlace && (
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
                {location && !route && !routeLoading && !isLoading && (
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
        </Animated.View>
      )}
    </View>
  );
};

export default MapScreen;
 