import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Keyboard,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableNativeFeedback,
  TouchableOpacity,
  View
} from 'react-native';
import { GestureHandlerRootView, PanGestureHandler } from 'react-native-gesture-handler';
import MapView, { MapType, Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SearchBar from '../components/SearchBar';
import ThemeToggleButton from '../components/ThemeToggleButton';
import { getTheme } from '../constants/theme';
import { useTheme as useAppTheme } from '../contexts/ThemeContext';
import useDebounce from '../hooks/useDebounce';
import useLocation from '../hooks/useLocation';
import usePlaces from '../hooks/usePlaces';
import useRoute from '../hooks/useRoute';

const { width, height } = Dimensions.get('window');
const CARD_HEIGHT = 220;
const BOTTOM_SHEET_MIN_HEIGHT = 150;
const BOTTOM_SHEET_MAX_HEIGHT = height * 0.65;

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
  timestamp?: string;
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
  accuracy?: number;
  speed?: number;
  heading?: number;
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
  legs?: {
    steps: {
      name?: string;
      distance: number;
      duration: number;
    }[];
  }[];
}

// Thêm interface PlacesHook để định nghĩa kiểu trả về của usePlaces
interface PlacesHook {
  searchResults: Place[];
  history: Place[];
  loading: boolean;
  error: string | null;
  search: (query: string, location: any, category: string | null) => Promise<Place[]>;
  searchNearby: (location: any, category: string | null) => Promise<Place[]>;
  savePlace: (place: Place) => Promise<boolean>;
  loadHistory: () => Promise<Place[]>;
  clearSearchResults: () => void;
  selectPlace: (place: Place) => Promise<Place>;
}

// Nút điều khiển bản đồ (zoom in/out)
const MapControls = React.memo(({ onZoomIn, onZoomOut }: { onZoomIn: () => void; onZoomOut: () => void }) => {
  const { theme } = useAppTheme();
  const currentTheme = getTheme(theme);
  
  return (
    <View 
      className="absolute right-4 top-1/4 rounded-full shadow-md overflow-hidden"
      style={{
        backgroundColor: currentTheme.colors.card,
        shadowColor: currentTheme.colors.text,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      }}
    >
      <TouchableOpacity 
        className="p-3 border-b"
        onPress={onZoomIn}
        style={{ borderBottomColor: currentTheme.colors.border }}
      >
        <Ionicons name="add" size={22} color={currentTheme.colors.primary} />
      </TouchableOpacity>
      <TouchableOpacity 
        className="p-3"
        onPress={onZoomOut}
      >
        <Ionicons name="remove" size={22} color={currentTheme.colors.primary} />
      </TouchableOpacity>
    </View>
  );
});

// Thêm displayName để tránh lỗi ESLint
MapControls.displayName = 'MapControls';

// Bottom sheet header
const BottomSheetHeader = React.memo(({ 
  route, 
  isExpanded, 
  onToggleExpand, 
  transportMode, 
  onTransportModeChange,
  startPlaceName,
  endPlaceName,
  onSearchPress,
  showDirectionsUI
}: { 
  route: RouteType | null;
  isExpanded: boolean;
  onToggleExpand: () => void;
  transportMode: string;
  onTransportModeChange: (mode: string) => void;
  startPlaceName: string;
  endPlaceName: string;
  onSearchPress: () => void;
  showDirectionsUI: boolean;
}) => {
  const { theme } = useAppTheme();
  const currentTheme = getTheme(theme);
  
  return (
    <View className="px-4 pt-2 pb-3">
      {/* Nút mở rộng / thu gọn - làm rộng hơn */}
      <TouchableOpacity 
        className="p-2 items-center"
        onPress={onToggleExpand}
        activeOpacity={0.7}
      >
        <View 
          className="w-12 h-1 rounded-full mb-2" 
          style={{ backgroundColor: currentTheme.colors.border }}
        />
      </TouchableOpacity>
      
      {showDirectionsUI && route ? (
        <View className="mt-1">
          <Text 
            className="text-xl font-bold"
            style={{ color: currentTheme.colors.text }}
          >
            {route.formattedDistance} ({route.formattedDuration})
          </Text>
          <Text 
            className="text-base mb-2"
            style={{ color: currentTheme.colors.textSecondary }}
          >
            {startPlaceName} → {endPlaceName}
          </Text>
        </View>
      ) : showDirectionsUI ? (
        <View className="h-12 justify-center">
          <Text 
            className="text-base"
            style={{ color: currentTheme.colors.textSecondary }}
          >
            Đang tìm đường...
          </Text>
        </View>
      ) : (
        <TouchableOpacity 
          className="flex-row items-center rounded-md p-3 my-2 shadow-sm"
          onPress={onSearchPress}
          style={{
            backgroundColor: currentTheme.colors.card,
            shadowColor: currentTheme.colors.text,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <View 
            className="w-8 h-8 rounded-full justify-center items-center mr-2"
            style={{ backgroundColor: currentTheme.colors.backgroundHighlight }}
          >
            <Ionicons name="search" size={18} color={currentTheme.colors.primary} />
          </View>
          <Text 
            className="flex-1"
            style={{ color: currentTheme.colors.textSecondary }}
          >
            Tìm kiếm địa điểm...
          </Text>
        </TouchableOpacity>
      )}
      
      {/* Transport modes */}
      {showDirectionsUI && (
        <View className="flex-row justify-around py-">
          {TRANSPORT_MODES.map(mode => (
            <TouchableOpacity
              key={mode.id}
              className={`items-center p-3 ${transportMode === mode.id ? 'rounded-xl' : ''}`}
              onPress={() => onTransportModeChange(mode.id)}
              style={{ 
                minWidth: 70,
                backgroundColor: transportMode === mode.id ? currentTheme.colors.backgroundHighlight : 'transparent'
              }}
            >
              <FontAwesome5 
                name={mode.icon} 
                size={20} 
                color={transportMode === mode.id ? currentTheme.colors.primary : currentTheme.colors.text} 
              />
              <Text 
                className={`text-sm mt-1 ${transportMode === mode.id ? 'font-bold' : ''}`}
                style={{ 
                  color: transportMode === mode.id ? currentTheme.colors.primary : currentTheme.colors.textSecondary 
                }}
              >
                {mode.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      
    </View>
  );
});

// Thêm displayName để tránh lỗi ESLint
BottomSheetHeader.displayName = 'BottomSheetHeader';

const MapScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { theme } = useAppTheme();
  const currentTheme = useMemo(() => getTheme(theme), [theme]);
  
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
  
  // Thêm state cho chế độ điều hướng tích cực
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [distanceToNextStep, setDistanceToNextStep] = useState<number | null>(null);
  
  // Thêm state cho tìm kiếm trực tiếp
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [localSearchResults, setLocalSearchResults] = useState<Place[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  
  // Animation cho thanh search và kết quả tìm kiếm
  const searchBarAnimation = useRef(new Animated.Value(0)).current;
  const historySlideAnimation = useRef(new Animated.Value(50)).current; // Bắt đầu từ 50px bên dưới
  const historyOpacityAnimation = useRef(new Animated.Value(0)).current; // Bắt đầu với opacity 0
  
  // Sử dụng custom hooks
  const { 
    location, 
    address, 
    loading: locationLoading, 
    error: locationError, 
    isTracking,
    getCurrentHeading, 
    startLocationTracking, 
    getCurrentLocation, 
    stopLocationTracking,
    getAddressFromCoordinates
  } = useLocation() as {
    location: LocationType | null;
    address: string;
    loading: boolean;
    error: string | null;
    isTracking: boolean;
    getCurrentHeading: () => number;
    startLocationTracking: () => void;
    getCurrentLocation: () => void;
    stopLocationTracking: () => void;
    getAddressFromCoordinates: (lat: number, lng: number) => Promise<string>;
  };
  
  const { 
    searchResults, 
    history, 
    search, 
    searchNearby, 
    savePlace: savePlaceToHistory, 
    loading: placesLoading, 
    loadHistory, 
    clearSearchResults,
    selectPlace
  } = usePlaces() as PlacesHook;
  
  // Áp dụng debounce cho searchQuery
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  
  const pendingRouteRequestRef = useRef<{
    start: Coordinates;
    end: Coordinates;
    mode: string;
  } | null>(null);
  
  const mapRef = useRef<MapView | null>(null);
  const searchInputRef = useRef<TextInput>(null);
  const bottomSheetAnimation = useRef(new Animated.Value(BOTTOM_SHEET_MIN_HEIGHT)).current;
  const panY = useRef(new Animated.Value(0)).current;
  const hasZoomedToInitialLocation = useRef(false);
  const initialLocationRef = useRef<LocationType | null>(null);
  const initialParamsProcessed = useRef(false);
  
  const [followUserHeading, setFollowUserHeading] = useState(false);
  const [mapType, setMapType] = useState<MapType>('standard');
  const [currentHeading, setCurrentHeading] = useState(0);
  const [compassMode, setCompassMode] = useState<'off' | 'follow' | 'rotate'>('off');
  
  // Animation ref để tránh tạo animation mới khi đang có animation
  const animationInProgressRef = useRef(false);
  const headingUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const { route, loading: routeLoading, error: routeApiError, getRoute, clearRoute } = useRoute() as {
    route: RouteType | null;
    loading: boolean;
    error: string | null;
    getRoute: (start: Coordinates, end: Coordinates, mode: string) => Promise<RouteType | null>;
    clearRoute: () => void;
  };

  // Định nghĩa initialRegion
  const initialRegion = useMemo(() => ({
    latitude: 10.762622,  // Vị trí mặc định TP.HCM
    longitude: 106.660172,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  }), []);

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
  }, [getAddressFromCoordinates]);

  // Lấy vị trí ban đầu - sửa lỗi vòng lặp vô hạn
  useEffect(() => {
    startLocationTracking();
    loadHistory();
    
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

  // Tự động tìm kiếm khi debouncedSearchQuery thay đổi và có giá trị
  useEffect(() => {
    if (debouncedSearchQuery && debouncedSearchQuery.trim().length >= 2) {
      performSearch(debouncedSearchQuery);
    }
  }, [debouncedSearchQuery, location]);
  
  // Hàm thực hiện tìm kiếm
  const performSearch = async (query: string) => {
    if (!query.trim()) return;
    
    setSearchLoading(true);
    
    try {
      const results = await search(
        query, 
        location,
        null
      );
      setLocalSearchResults(results);
    } catch (error) {
      console.error('Error searching places:', error);
      Alert.alert('Lỗi', 'Không thể tìm kiếm địa điểm. Vui lòng thử lại sau.');
    } finally {
      setSearchLoading(false);
    }
  };

  // Hàm tìm đường
  const findRoute = async (start: Coordinates, end: Coordinates, mode: string) => {
    try {
      setIsLoading(true);
      setRouteError(null);
      
      const routeData = await getRoute(start, end, mode);
      
      if (routeData) {
        // Zoom đến khu vực hiển thị đường đi
        setTimeout(() => {
          if (mapRef.current) {
            mapRef.current.fitToCoordinates(
              [
                { latitude: start.latitude, longitude: start.longitude },
                { latitude: end.latitude, longitude: end.longitude }
              ],
              {
                edgePadding: { top: 70, right: 70, bottom: 200, left: 70 },
                animated: true
              }
            );
          }
        }, 200);
        
        // Reset các giá trị điều hướng
        setIsNavigating(false);
        setCurrentStepIndex(0);
        setDistanceToNextStep(null);
      }
    } catch (error) {
      console.error('Error finding route:', error);
      setRouteError('Không thể tìm đường đi. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  };

  // Hàm bắt đầu điều hướng
  const startNavigation = () => {
    if (!route || !location) return;
    
    setIsNavigating(true);
    setCurrentStepIndex(0);
    
    // Zoom đến vị trí hiện tại và hướng theo lộ trình
    if (mapRef.current) {
      mapRef.current.animateCamera({
        center: {
          latitude: location.latitude,
          longitude: location.longitude
        },
        pitch: 60,
        heading: location.heading || 0,
        zoom: 18,
        altitude: 1000
      }, { duration: 1000 });
    }
    
    // Bật chế độ theo dõi hướng
    setCompassMode('follow');
    
    // Hạ bottom sheet xuống
    Animated.timing(bottomSheetAnimation, {
      toValue: BOTTOM_SHEET_MIN_HEIGHT,
      duration: 300,
      useNativeDriver: false,
      easing: Easing.out(Easing.ease)
    }).start();
    
    setIsBottomSheetExpanded(false);
    
    // Bắt đầu theo dõi vị trí để cập nhật điều hướng
    startLocationTracking();
    
    // Cập nhật thông tin điều hướng ban đầu
    updateNavigation();
  };
  
  // Hàm cập nhật thông tin điều hướng dựa trên vị trí hiện tại
  const updateNavigation = useCallback(() => {
    if (!isNavigating || !route || !location || !route.legs || !route.legs[0]?.steps) return;
    
    // Lấy các bước trong lộ trình
    const steps = route.legs[0].steps;
    
    if (currentStepIndex >= steps.length) {
      // Đã hoàn thành lộ trình
      setIsNavigating(false);
      Alert.alert('Hoàn thành', 'Bạn đã đến điểm đến!');
      return;
    }
    
    // Tính khoảng cách đến bước tiếp theo
    const nextStep = steps[currentStepIndex];
    
    // TODO: Tính toán khoảng cách chính xác từ vị trí hiện tại đến điểm tiếp theo
    // Đây là phần giả định đơn giản
    const distance = Math.max(0, nextStep.distance - 50 * currentStepIndex);
    setDistanceToNextStep(distance);
    
    // Kiểm tra xem đã đến bước tiếp theo chưa (giả định đơn giản)
    if (distance < 20) {
      setCurrentStepIndex(prev => prev + 1);
    }
  }, [isNavigating, route, location, currentStepIndex]);
  
  // Theo dõi vị trí để cập nhật điều hướng
  useEffect(() => {
    if (isNavigating && location) {
      updateNavigation();
    }
  }, [isNavigating, location, updateNavigation]);
  
  // Hàm dừng điều hướng
  const stopNavigation = () => {
    setIsNavigating(false);
    setCompassMode('off');
    
    // Hạ bottom sheet xuống
    Animated.timing(bottomSheetAnimation, {
      toValue: BOTTOM_SHEET_MIN_HEIGHT,
      duration: 300,
      useNativeDriver: false,
      easing: Easing.out(Easing.ease)
    }).start();
    
    setIsBottomSheetExpanded(false);
    
    // Zoom ra để nhìn toàn bộ lộ trình
    if (mapRef.current && route) {
      mapRef.current.fitToCoordinates(
        route.geometry.coordinates.map(coord => ({
          latitude: coord[1],
          longitude: coord[0]
        })),
        {
          edgePadding: { top: 70, right: 70, bottom: 200, left: 70 },
          animated: true
        }
      );
    }
  };

  // Xử lý khi chọn một địa điểm
  const handleSelectPlace = async (place: Place) => {
    try {
      // Ẩn bàn phím ngay lập tức
      Keyboard.dismiss();
      
      // Lưu địa điểm vào lịch sử
      await savePlaceToHistory(place);
      
      // Đóng kết quả tìm kiếm và thiết lập địa điểm đã chọn
      setShowSearchResults(false);
      setSearchQuery('');
      setSelectedPlace(place);
      setMarkerCoords({
        latitude: place.latitude,
        longitude: place.longitude
      });
      setEndPlaceName(place.name);
      setShowBackButton(true);
      setShowDirectionsUI(true);
      
      // Nếu có vị trí hiện tại, tìm đường
      if (location) {
        // Đặt timeout nhỏ để đảm bảo UI được cập nhật trước khi tìm đường
        // Điều này giúp tránh vấn đề khi bàn phím đang hiển thị
        requestAnimationFrame(() => {
          findRoute(
            { latitude: location.latitude, longitude: location.longitude },
            { latitude: place.latitude, longitude: place.longitude },
            transportMode
          );
        });
      }
    } catch (error) {
      console.error('Error selecting place:', error);
    }
  };
  
  // Hàm xử lý khi focus vào ô tìm kiếm
  const handleSearchFocus = () => {
    // Hiển thị màn hình tìm kiếm
    setShowSearchResults(true);
    
    // Animation hiển thị màn hình tìm kiếm
    Animated.timing(searchBarAnimation, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
      easing: Easing.out(Easing.ease)
    }).start();
    
    // Animation cho component history
    Animated.parallel([
      Animated.timing(historySlideAnimation, {
        toValue: 0,
        duration: 400,
        delay: 100,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease)
      }),
      Animated.timing(historyOpacityAnimation, {
        toValue: 1,
        duration: 400,
        delay: 100,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease)
      })
    ]).start();
    
    // Load lịch sử tìm kiếm
    loadHistory().then(() => {
      // Cập nhật state
    }).catch(error => {
      console.error('Error loading history:', error);
    });
  };
  
  // Hàm xử lý khi nhấn tìm kiếm
  const handleSearch = () => {
    if (searchQuery.trim().length >= 2) {
      performSearch(searchQuery);
    }
    Keyboard.dismiss();
  };
  
  // Hàm xử lý khi đóng tìm kiếm
  const handleCloseSearch = () => {
    // Ẩn kết quả tìm kiếm với animation
    Animated.parallel([
      Animated.timing(searchBarAnimation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.in(Easing.ease)
      }),
      Animated.timing(historySlideAnimation, {
        toValue: 50,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.in(Easing.ease)
      }),
      Animated.timing(historyOpacityAnimation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.in(Easing.ease)
      })
    ]).start(() => {
      setShowSearchResults(false);
      // Xóa kết quả tìm kiếm
      setSearchQuery('');
      clearSearchResults();
    });
    
    // Ẩn bàn phím
    Keyboard.dismiss();
  };

  // Animate bottom sheet
  const toggleBottomSheet = () => {
    const toValue = isBottomSheetExpanded ? BOTTOM_SHEET_MIN_HEIGHT : BOTTOM_SHEET_MAX_HEIGHT;
    
    Animated.spring(bottomSheetAnimation, {
      toValue,
      friction: 10,
      useNativeDriver: false
    }).start();
    
    setIsBottomSheetExpanded(!isBottomSheetExpanded);
  };

  // Xử lý gesture kéo thả cho bottom sheet
  const handleGesture = useCallback(
    Animated.event(
      [{ nativeEvent: { translationY: panY } }],
      { useNativeDriver: false }
    ),
    [panY]
  );

  // Sử dụng any để tránh lỗi TypeScript khi không có kiểu cụ thể cho event
  const handleGestureStateChange = ({ nativeEvent }: any) => {
    // Chỉ xử lý gesture khi người dùng kéo từ phần header của bottom sheet
    // hoặc khi đang ở trạng thái thu gọn
    if (!isBottomSheetExpanded || (nativeEvent && nativeEvent.y < 200)) {
      // Nếu có thuộc tính translationY
      if (nativeEvent && typeof nativeEvent.translationY === 'number') {
        // Kéo lên (translationY < 0), mở rộng bottom sheet
        if (nativeEvent.translationY < -50 && !isBottomSheetExpanded) {
          toggleBottomSheet();
        } 
        // Kéo xuống (translationY > 0), thu nhỏ bottom sheet
        else if (nativeEvent.translationY > 50 && isBottomSheetExpanded) {
          toggleBottomSheet();
        }
      }
    }

    // Reset giá trị panY
    Animated.spring(panY, {
      toValue: 0,
      useNativeDriver: false,
      tension: 40,
      friction: 5
    }).start();
  };
  
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
  
  // Xử lý khi chọn phương tiện di chuyển
  const handleTransportModeChange = (mode: string) => {
    if (mode !== transportMode) {
      setTransportMode(mode);
      
      // Nếu đã có điểm đi và điểm đến, tìm đường lại với phương tiện mới
      if (location && selectedPlace) {
        findRoute(
          { latitude: location.latitude, longitude: location.longitude },
          { latitude: selectedPlace.latitude, longitude: selectedPlace.longitude },
          mode
        );
      }
    }
  };

  // Zoom in và out
  const handleZoomIn = () => {
    mapRef.current?.getCamera().then((camera) => {
      if (camera.zoom) {
        camera.zoom += 1;
        mapRef.current?.animateCamera(camera, { duration: 300 });
      }
    });
  };

  const handleZoomOut = () => {
    mapRef.current?.getCamera().then((camera) => {
      if (camera.zoom) {
        camera.zoom -= 1;
        mapRef.current?.animateCamera(camera, { duration: 300 });
      }
    });
  };

  // Xử lý theo dõi hướng người dùng - sử dụng interval thay vì requestAnimationFrame
  useEffect(() => {
    // Xóa interval cũ nếu có
    if (headingUpdateIntervalRef.current) {
      clearInterval(headingUpdateIntervalRef.current);
      headingUpdateIntervalRef.current = null;
    }
    
    // Nếu đang theo dõi hướng, tạo interval mới
    if (compassMode !== 'off') {
      headingUpdateIntervalRef.current = setInterval(() => {
        if (location && !animationInProgressRef.current) {
          const heading = getCurrentHeading();
          
          // Chỉ cập nhật nếu heading thay đổi đáng kể
          if (Math.abs(heading - currentHeading) > 3) {
            setCurrentHeading(heading);
            
            if (compassMode === 'rotate') {
              // Đánh dấu đang có animation
              animationInProgressRef.current = true;
              
              try {
                mapRef.current?.animateCamera({
                  heading: heading,
                  center: {
                    latitude: location.latitude,
                    longitude: location.longitude
                  },
                  pitch: 0,
                  zoom: 18, // Zoom gần hơn khi theo dõi hướng
                }, { duration: 200 });
                
                // Đặt timeout để đánh dấu animation đã hoàn thành
                setTimeout(() => {
                  animationInProgressRef.current = false;
                }, 250);
              } catch (error) {
                console.error('Error animating camera:', error);
                animationInProgressRef.current = false;
              }
            } else if (compassMode === 'follow') {
              // Chỉ cập nhật vị trí mà không xoay bản đồ
              mapRef.current?.animateCamera({
                center: {
                  latitude: location.latitude,
                  longitude: location.longitude
                },
                zoom: 18
              }, { duration: 200 });
            }
          }
        }
      }, 100); // Cập nhật mỗi 100ms để có độ mượt cao
    }
    
    return () => {
      if (headingUpdateIntervalRef.current) {
        clearInterval(headingUpdateIntervalRef.current);
        headingUpdateIntervalRef.current = null;
      }
    };
  }, [compassMode, location, getCurrentHeading, currentHeading]);

  // Nút chuyển đổi chế độ theo dõi hướng
  const toggleCompassMode = () => {
    // Xoay qua các chế độ: off -> follow -> rotate -> off
    const modes: ('off' | 'follow' | 'rotate')[] = ['off', 'follow', 'rotate'];
    const currentIndex = modes.indexOf(compassMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    const newMode = modes[nextIndex];
    
    setCompassMode(newMode);
    
    if (newMode !== 'off' && location) {
      // Nếu bật chế độ theo dõi, zoom đến vị trí người dùng
      const heading = getCurrentHeading();
      setCurrentHeading(heading);
      
      mapRef.current?.animateCamera({
        center: {
          latitude: location.latitude,
          longitude: location.longitude
        },
        heading: newMode === 'rotate' ? heading : 0,
        pitch: 0,
        zoom: 18
      }, { duration: 500 });
    } else if (newMode === 'off') {
      // Nếu tắt chế độ theo dõi hướng, reset về hướng bắc
      mapRef.current?.animateCamera({
        heading: 0,
        pitch: 0
      }, { duration: 500 });
    }
  };

  // Thêm hàm để cập nhật vị trí người dùng mà không cần animation
  const centerMapOnUser = useCallback(() => {
    if (location) {
      mapRef.current?.animateCamera({
        center: {
          latitude: location.latitude,
          longitude: location.longitude
        },
        heading: compassMode === 'rotate' ? getCurrentHeading() : 0,
        zoom: compassMode !== 'off' ? 18 : 16,
        pitch: 0
      }, { duration: 300 });
    } else {
      getCurrentLocation();
    }
  }, [location, compassMode, getCurrentHeading, getCurrentLocation]);

  // Hiển thị chỉ báo hướng
  const renderCompassIndicator = () => {
    if (compassMode === 'off') return null;
    
    return (
      <View className="absolute top-40 left-4 bg-white p-2 rounded-lg shadow-md z-10 items-center">
        <Text className="text-xs text-textSecondary">Hướng</Text>
        <View className="flex-row items-center">
          <Ionicons name="compass" size={16} color={currentTheme.colors.primary} />
          <Text className="ml-1 font-bold">{Math.round(currentHeading)}°</Text>
        </View>
      </View>
    );
  };

  // Hàm tạo hiệu ứng cho từng item trong danh sách
  const getItemAnimationStyle = useCallback((index: number) => {
    return {
      opacity: historyOpacityAnimation,
      transform: [
        { 
          translateY: historySlideAnimation.interpolate({
            inputRange: [0, 50],
            outputRange: [0, 25 + index * 5]
          })
        },
        {
          scale: historyOpacityAnimation.interpolate({
            inputRange: [0, 1],
            outputRange: [0.9, 1]
          })
        }
      ]
    };
  }, [historyOpacityAnimation, historySlideAnimation]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View 
        className="flex-1"
        style={{ backgroundColor: currentTheme.colors.background }}
      >
        <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
        
        {/* Bản đồ */}
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          provider={PROVIDER_DEFAULT}
          initialRegion={initialRegion}
          showsUserLocation={true}
          toolbarEnabled={false}
          showsCompass={true}
          zoomEnabled={true}
          scrollEnabled={true}
          rotateEnabled={true}
          mapType={mapType}
          onMapReady={() => setMapReady(true)}
          showsMyLocationButton={false}
          customMapStyle={theme === 'dark' ? currentTheme.mapStyle : []}
          onPress={(e) => {
            if (showSearchResults) {
              handleCloseSearch();
              return;
            }
            
            if (!isNavigating) {
              const coords = e.nativeEvent.coordinate;
              setMarkerCoords(coords);
              
              // Hiển thị loading indicator tại vị trí được chọn
              setIsLoadingReverseGeocode(true);
              
              reverseGeocode(coords).then(place => {
                if (place) {
                  setSelectedPlace(place);
                  setEndPlaceName(place.name);
                  setShowDirectionsUI(true);
                  
                  // Nếu có vị trí hiện tại, tìm đường
                  if (location) {
                    findRoute(
                      { latitude: location.latitude, longitude: location.longitude },
                      { latitude: place.latitude, longitude: place.longitude },
                      transportMode
                    );
                  }
                }
              });
            }
          }}
          onLongPress={(e) => {
            // Xử lý nhấn giữ tương tự như nhấn thường
            const coords = e.nativeEvent.coordinate;
            setMarkerCoords(coords);
            
            // Hiển thị loading indicator tại vị trí được chọn
            setIsLoadingReverseGeocode(true);
            
            reverseGeocode(coords).then(place => {
              if (place) {
                setSelectedPlace(place);
                setEndPlaceName(place.name);
                setShowDirectionsUI(true);
                setShowBackButton(true);
                
                // Nếu có vị trí hiện tại, tìm đường
                if (location) {
                  findRoute(
                    { latitude: location.latitude, longitude: location.longitude },
                    { latitude: place.latitude, longitude: place.longitude },
                    transportMode
                  );
                }
              }
            }).finally(() => {
              setIsLoadingReverseGeocode(false);
            });
          }}
          onPanDrag={() => {
            // Nếu người dùng kéo bản đồ, tắt chế độ theo dõi hướng
            if (compassMode !== 'off') {
              setCompassMode('off');
            }
          }}
        >
          {/* Hiển thị marker cho địa điểm được chọn */}
          {markerCoords && (
            <Marker
              coordinate={markerCoords}
              title={endPlaceName || "Địa điểm đã chọn"}
            >
              <View className="items-center justify-center">
                {isLoadingReverseGeocode ? (
                  <View className="bg-white p-2 rounded-full">
                    <ActivityIndicator size="small" color={currentTheme.colors.primary} />
                  </View>
                ) : (
                  <View className="bg-primary p-2 rounded-full">
                    <Ionicons name="location" size={20} color="#FFF" />
                  </View>
                )}
              </View>
            </Marker>
          )}
          
          {/* Hiển thị đường đi */}
          {route && route.geometry && route.geometry.coordinates && (
            <Polyline
              coordinates={route.geometry.coordinates.map(coord => ({
                latitude: coord[1],
                longitude: coord[0]
              }))}
              strokeWidth={5}
              strokeColor={currentTheme.colors.primary}
              lineCap="round"
              lineJoin="round"
            />
          )}
        </MapView>
        
        {/* Nút zoom */}
        <MapControls onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} />
        
        {/* Hiển thị chỉ báo hướng */}
        {renderCompassIndicator()}
        
        {/* Hiển thị chỉ dẫn lớn khi đang điều hướng */}
        {isNavigating && route && route.legs && route.legs[0]?.steps && currentStepIndex < route.legs[0].steps.length && (
          <View 
            className="absolute top-0 left-0 right-0 z-30"
            style={{ 
              backgroundColor: currentTheme.colors.primary,
              paddingTop: insets.top,
              paddingBottom: 20
            }}
          >
            <View className="px-4 py-3 flex-row items-center">
              <TouchableOpacity
                onPress={stopNavigation}
                className="mr-3 p-1"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              
              <View className="flex-1">
                <Text className="text-white text-lg font-bold">
                  {route.legs[0].steps[currentStepIndex].name || 'Tiếp tục đi thẳng'}
                </Text>
                
                {distanceToNextStep !== null && (
                  <Text className="text-white text-2xl font-bold mt-1">
                    {distanceToNextStep < 1000 
                      ? `${Math.round(distanceToNextStep)} m` 
                      : `${(distanceToNextStep / 1000).toFixed(1)} km`}
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}
        
        {/* Thanh tìm kiếm ở trên cùng - luôn hiển thị khi không trong chế độ điều hướng */}
        {!showDirectionsUI && !isNavigating && (
          <View 
            className="absolute top-0 left-0 right-0 px-4 z-30"
            style={{
              paddingTop: insets.top + 12,
              paddingBottom: 16,
              backgroundColor: showSearchResults ? 'transparent' : undefined,
            }}
          >
            <View className="flex-row items-center">
              {showSearchResults && (
                <TouchableOpacity 
                  onPress={handleCloseSearch}
                  className="mr-3 p-1"
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="arrow-back" size={24} color={currentTheme.colors.primary} />
                </TouchableOpacity>
              )}
              
              <View className="flex-1">
                {!showSearchResults ? (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleSearchFocus}
                    className="shadow-sm"
                  >
                    <View 
                      className="flex-row items-center rounded-full p-3 shadow-sm"
                      style={{
                        backgroundColor: currentTheme.colors.card,
                        shadowColor: currentTheme.colors.text,
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 4,
                        elevation: 3,
                        borderColor: currentTheme.colors.border,
                        borderWidth: 1,
                      }}
                    >
                      <View 
                        className="w-8 h-8 rounded-full justify-center items-center mr-2"
                        style={{ backgroundColor: currentTheme.colors.backgroundHighlight }}
                      >
                        <Ionicons name="search" size={18} color={currentTheme.colors.primary} />
                      </View>
                      <Text 
                        className="flex-1"
                        style={{ color: currentTheme.colors.textSecondary }}
                      >
                        Tìm kiếm địa điểm...
                      </Text>
                    </View>
                  </TouchableOpacity>
                ) : (
                  <SearchBar
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onSubmitEditing={handleSearch}
                    placeholder="Tìm kiếm địa điểm..."
                    autoFocus={true}
                  />
                )}
              </View>
            </View>
          </View>
        )}
        
        {/* Kết quả tìm kiếm và lịch sử */}
        {showSearchResults && (
          <Animated.View 
            className="absolute top-0 left-0 right-0 bottom-0 z-20"
            style={{
              backgroundColor: currentTheme.colors.background,
              opacity: searchBarAnimation,
              paddingTop: insets.top + 70, // Để không che phủ thanh tìm kiếm
            }}
          >
            {/* Hiển thị indicator khi đang tìm kiếm */}
            {searchLoading ? (
              <View className="flex-1 justify-center items-center">
                <ActivityIndicator size="large" color={currentTheme.colors.primary} />
              </View>
            ) : (
              <Animated.FlatList
                data={searchQuery.length >= 2 ? localSearchResults : history}
                keyExtractor={(item) => item.id.toString()}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
                style={{
                  transform: [{ translateY: historySlideAnimation }],
                  opacity: historyOpacityAnimation
                }}
                ListHeaderComponent={
                  searchQuery.length < 2 ? (
                    <View 
                      className="px-4 py-4 mt-4"
                      style={{ backgroundColor: currentTheme.colors.backgroundHighlight }}
                    >
                      <Text 
                        className="text-base font-bold"
                        style={{ color: currentTheme.colors.text }}
                      >
                        Lịch sử tìm kiếm
                      </Text>
                    </View>
                  ) : localSearchResults.length > 0 ? (
                    <View 
                      className="px-4 py-3"
                      style={{ backgroundColor: currentTheme.colors.backgroundHighlight }}
                    >
                      <Text 
                        className="text-base font-bold"
                        style={{ color: currentTheme.colors.text }}
                      >
                        Kết quả tìm kiếm
                      </Text>
                    </View>
                  ) : null
                }
                renderItem={({ item, index }) => (
                  <Animated.View
                    style={getItemAnimationStyle(index)}
                  >
                    {Platform.OS === 'android' ? (
                      <TouchableNativeFeedback
                        onPress={() => handleSelectPlace(item)}
                        background={TouchableNativeFeedback.Ripple(
                          currentTheme.colors.primary + '20',
                          false
                        )}
                      >
                        <View 
                          className="flex-row items-center px-4 py-3 border-b"
                          style={{ 
                            borderBottomColor: currentTheme.colors.border,
                            backgroundColor: currentTheme.colors.card
                          }}
                        >
                          <View 
                            className="w-10 h-10 rounded-full justify-center items-center mr-3"
                            style={{ backgroundColor: currentTheme.colors.backgroundHighlight }}
                          >
                            <Ionicons 
                              name={item.category === 'history' ? 'time' : 'location'} 
                              size={20} 
                              color={currentTheme.colors.primary} 
                            />
                          </View>
                          
                          <View className="flex-1">
                            <Text 
                              className="text-base font-semibold"
                              style={{ color: currentTheme.colors.text }}
                              numberOfLines={1}
                            >
                              {item.name}
                            </Text>
                            
                            <Text 
                              className="text-sm"
                              style={{ color: currentTheme.colors.textSecondary }}
                              numberOfLines={1}
                            >
                              {item.address}
                            </Text>
                          </View>
                        </View>
                      </TouchableNativeFeedback>
                    ) : (
                      <TouchableOpacity 
                        className="flex-row items-center px-4 py-3 border-b"
                        style={{ 
                          borderBottomColor: currentTheme.colors.border,
                          backgroundColor: currentTheme.colors.card
                        }}
                        onPress={() => handleSelectPlace(item)}
                        activeOpacity={0.7}
                      >
                        <View 
                          className="w-10 h-10 rounded-full justify-center items-center mr-3"
                          style={{ backgroundColor: currentTheme.colors.backgroundHighlight }}
                        >
                          <Ionicons 
                            name={item.category === 'history' ? 'time' : 'location'} 
                            size={20} 
                            color={currentTheme.colors.primary} 
                          />
                        </View>
                        
                        <View className="flex-1">
                          <Text 
                            className="text-base font-semibold"
                            style={{ color: currentTheme.colors.text }}
                            numberOfLines={1}
                          >
                            {item.name}
                          </Text>
                          
                          <Text 
                            className="text-sm"
                            style={{ color: currentTheme.colors.textSecondary }}
                            numberOfLines={1}
                          >
                            {item.address}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    )}
                  </Animated.View>
                )}
                ListEmptyComponent={
                  searchQuery.length >= 2 ? (
                    <Animated.View 
                      className="flex-1 justify-center items-center py-10"
                      style={getItemAnimationStyle(0)}
                    >
                      <Ionicons name="search" size={64} color={currentTheme.colors.border} />
                      <Text 
                        className="text-lg font-bold mt-4"
                        style={{ color: currentTheme.colors.text }}
                      >
                        Không tìm thấy kết quả
                      </Text>
                      <Text 
                        className="text-center mt-2 px-8"
                        style={{ color: currentTheme.colors.textSecondary }}
                      >
                        Thử tìm kiếm với từ khóa khác
                      </Text>
                    </Animated.View>
                  ) : history.length === 0 ? (
                    <Animated.View 
                      className="flex-1 justify-center items-center py-10"
                      style={getItemAnimationStyle(0)}
                    >
                      <Ionicons name="time" size={64} color={currentTheme.colors.border} />
                      <Text 
                        className="text-lg font-bold mt-4"
                        style={{ color: currentTheme.colors.text }}
                      >
                        Lịch sử tìm kiếm trống
                      </Text>
                      <Text 
                        className="text-center mt-2 px-8"
                        style={{ color: currentTheme.colors.textSecondary }}
                      >
                        Các địa điểm bạn tìm kiếm sẽ xuất hiện ở đây
                      </Text>
                    </Animated.View>
                  ) : null
                }
              />
            )}
          </Animated.View>
        )}
        
        {/* Nút quay lại */}
        {showBackButton && (
          <TouchableOpacity 
            className="absolute top-12 left-4 p-2 rounded-full shadow-md z-10"
            onPress={() => {
              setShowDirectionsUI(false);
              setSelectedPlace(null);
              setMarkerCoords(null);
              setEndPlaceName('');
              setShowBackButton(false);
              clearRoute();
              
              // Thu gọn bottom sheet
              setIsBottomSheetExpanded(false);
              Animated.spring(bottomSheetAnimation, {
                toValue: BOTTOM_SHEET_MIN_HEIGHT,
                friction: 8,
                useNativeDriver: false
              }).start();
            }}
            style={{
              backgroundColor: currentTheme.colors.card,
              shadowColor: currentTheme.colors.text,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <Ionicons name="arrow-back" size={24} color={currentTheme.colors.text} />
          </TouchableOpacity>
        )}
        
        {/* Bottom Sheet chỉ hiển thị khi đã search hoặc chọn điểm trên bản đồ */}
        {showDirectionsUI && (
          <PanGestureHandler
            onGestureEvent={handleGesture}
            onHandlerStateChange={handleGestureStateChange}
            activeOffsetY={[-20, 20]}
            failOffsetY={[-100, 100]}
            enabled={!showSearchResults}
          >
            <Animated.View 
              className="absolute left-0 right-0 bottom-0 rounded-t-3xl shadow-lg z-10"
              style={[
                styles.bottomSheet,
                {
                  height: bottomSheetAnimation,
                  paddingBottom: insets.bottom,
                  transform: [{ translateY: panY }],
                  backgroundColor: currentTheme.colors.card,
                  shadowColor: currentTheme.colors.text,
                  shadowOffset: { width: 0, height: -3 },
                  shadowOpacity: 0.1,
                  shadowRadius: 5,
                  elevation: 10,
                }
              ]}
            >
              {/* Header với thông tin tóm tắt và nút điều khiển */}
              <BottomSheetHeader
                route={route}
                isExpanded={isBottomSheetExpanded}
                onToggleExpand={toggleBottomSheet}
                transportMode={transportMode}
                onTransportModeChange={handleTransportModeChange}
                startPlaceName={startPlaceName}
                endPlaceName={endPlaceName}
                onSearchPress={handleSearchFocus}
                showDirectionsUI={showDirectionsUI}
              />
              
              {/* Hiển thị lỗi */}
              {routeError && (
                <View 
                  className="mx-4 mb-3 p-3 rounded-xl"
                  style={{ backgroundColor: currentTheme.colors.errorLight }}
                >
                  <Text style={{ color: currentTheme.colors.error }}>{routeError}</Text>
                </View>
              )}
              
              {/* Phần chỉ dẫn chi tiết */}
              {showDirectionsUI && isBottomSheetExpanded && (
                <View className="flex-1 px-4 pb-2">
                  <Text 
                    className="text-base font-bold mb-2"
                    style={{ color: currentTheme.colors.text }}
                  >
                    Chi tiết lộ trình
                  </Text>
                  
                  {isLoading || routeLoading ? (
                    <View className="flex-1 justify-center items-center">
                      <ActivityIndicator size="small" color={currentTheme.colors.primary} />
                      <Text 
                        className="mt-2"
                        style={{ color: currentTheme.colors.textSecondary }}
                      >
                        Đang tìm đường...
                      </Text>
                    </View>
                  ) : (
                    <>
                      {/* Nút Bắt đầu điều hướng */}
                      {!isNavigating && route && route.legs && route.legs.length > 0 && (
                        <TouchableOpacity
                          className="mb-4 py-3 px-4 rounded-full items-center"
                          style={{ backgroundColor: currentTheme.colors.primary }}
                          onPress={startNavigation}
                        >
                          <Text className="text-white font-bold text-base">
                            Bắt đầu điều hướng
                          </Text>
                        </TouchableOpacity>
                      )}
                      
                      {/* Nút Dừng điều hướng */}
                      {isNavigating && (
                        <TouchableOpacity
                          className="mb-4 py-3 px-4 rounded-full items-center"
                          style={{ backgroundColor: currentTheme.colors.error }}
                          onPress={stopNavigation}
                        >
                          <Text className="text-white font-bold text-base">
                            Dừng điều hướng
                          </Text>
                        </TouchableOpacity>
                      )}
                      
                      {/* Hiển thị bước hiện tại khi đang điều hướng */}
                      {isNavigating && route && route.legs && route.legs[0]?.steps && currentStepIndex < route.legs[0].steps.length && (
                        <View 
                          className="mb-4 p-4 rounded-xl"
                          style={{ backgroundColor: currentTheme.colors.backgroundHighlight }}
                        >
                          <Text 
                            className="text-lg font-bold mb-1"
                            style={{ color: currentTheme.colors.text }}
                          >
                            {route.legs[0].steps[currentStepIndex].name || 'Tiếp tục đi thẳng'}
                          </Text>
                          
                          {distanceToNextStep !== null && (
                            <Text 
                              className="text-base"
                              style={{ color: currentTheme.colors.primary }}
                            >
                              {distanceToNextStep < 1000 
                                ? `${Math.round(distanceToNextStep)} m` 
                                : `${(distanceToNextStep / 1000).toFixed(1)} km`}
                            </Text>
                          )}
                          
                          {currentStepIndex < route.legs[0].steps.length - 1 && (
                            <Text 
                              className="text-sm mt-2"
                              style={{ color: currentTheme.colors.textSecondary }}
                            >
                              Tiếp theo: {route.legs[0].steps[currentStepIndex + 1].name || 'Tiếp tục đi thẳng'}
                            </Text>
                          )}
                        </View>
                      )}
                      
                      {(route && route.legs && Array.isArray(route.legs) && route.legs.length > 0 && route.legs[0]?.steps) ? (
                        <FlatList
                          data={(route.legs && route.legs[0] && route.legs[0].steps) ? route.legs[0].steps : []}
                          renderItem={({ item, index }) => (
                            <View 
                              className="flex-row py-3 border-b"
                              style={{ borderBottomColor: currentTheme.colors.border }}
                            >
                              <View className="mr-3 items-center">
                                <View 
                                  className="w-10 h-10 rounded-full justify-center items-center"
                                  style={{ backgroundColor: currentTheme.colors.backgroundHighlight }}
                                >
                                  <Ionicons 
                                    name="navigate" 
                                    size={18} 
                                    color={currentTheme.colors.primary} 
                                  />
                                </View>
                                {index < ((route.legs && route.legs[0] && route.legs[0].steps) ? route.legs[0].steps.length - 1 : 0) && (
                                  <View 
                                    className="w-[2px] h-8 mt-1"
                                    style={{ backgroundColor: currentTheme.colors.border }}
                                  />
                                )}
                              </View>
                              
                              <View className="flex-1">
                                <Text 
                                  className="text-base font-semibold"
                                  style={{ color: currentTheme.colors.text }}
                                >
                                  {item.name || (index === 0 ? 'Xuất phát' : 'Tiếp tục đi thẳng')}
                                </Text>
                                
                                {item.distance > 0 && (
                                  <Text 
                                    className="text-sm mt-1"
                                    style={{ color: currentTheme.colors.textSecondary }}
                                  >
                                    {item.distance < 1000 
                                      ? `${Math.round(item.distance)} m` 
                                      : `${(item.distance / 1000).toFixed(1)} km`}
                                    {item.duration > 0 && ` (${Math.ceil(item.duration / 60)} phút)`}
                                  </Text>
                                )}
                              </View>
                            </View>
                          )}
                          keyExtractor={(item, index) => `step-${index}`}
                          showsVerticalScrollIndicator={true}
                          nestedScrollEnabled={true}
                          onTouchStart={(e) => {
                            // Ngăn sự kiện chạm lan tỏa lên PanGestureHandler khi người dùng scroll trong FlatList
                            e.stopPropagation();
                          }}
                        />
                      ) : (
                        <View className="flex-1 justify-center items-center">
                          <Ionicons name="information-circle-outline" size={36} color={currentTheme.colors.grey} />
                          <Text 
                            className="mt-2 text-center"
                            style={{ color: currentTheme.colors.textSecondary }}
                          >
                            {routeError || 'Hướng dẫn chi tiết sẽ hiển thị ở đây khi tìm thấy đường đi.'}
                          </Text>
                        </View>
                      )}
                    </>
                  )}
                </View>
              )}
            </Animated.View>
          </PanGestureHandler>
        )}
        
        {/* Nút vị trí hiện tại */}
        <TouchableOpacity 
          className="absolute right-4 bottom-32 p-3 rounded-full shadow-md z-10"
          onPress={centerMapOnUser}
          style={{
            backgroundColor: currentTheme.colors.card,
            shadowColor: currentTheme.colors.text,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <Ionicons name="locate" size={24} color={currentTheme.colors.primary} />
        </TouchableOpacity>
        
        {/* Nút theo dõi hướng */}
        <TouchableOpacity 
          className={`absolute right-4 bottom-48 p-3 rounded-full shadow-md z-10 ${
            compassMode === 'off' ? '' : 
            compassMode === 'follow' ? '' : ''
          }`}
          onPress={toggleCompassMode}
          style={{
            backgroundColor: compassMode === 'rotate' ? currentTheme.colors.primary : currentTheme.colors.card,
            shadowColor: currentTheme.colors.text,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <Ionicons 
            name="compass" 
            size={24} 
            color={compassMode === 'rotate' ? '#FFF' : currentTheme.colors.primary} 
          />
        </TouchableOpacity>
        
        {/* Nút chuyển đổi kiểu bản đồ */}
        <TouchableOpacity 
          className="absolute right-4 bottom-64 p-3 rounded-full shadow-md z-10"
          onPress={() => {
            // Chuyển đổi giữa các kiểu bản đồ: standard, satellite, hybrid
            const mapTypes: MapType[] = ['standard', 'satellite', 'hybrid'];
            const currentIndex = mapTypes.indexOf(mapType);
            const nextIndex = (currentIndex + 1) % mapTypes.length;
            setMapType(mapTypes[nextIndex]);
          }}
          style={{
            backgroundColor: currentTheme.colors.card,
            shadowColor: currentTheme.colors.text,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <Ionicons name="layers" size={24} color={currentTheme.colors.primary} />
        </TouchableOpacity>
        
        {/* Nút chuyển đổi theme */}
        <ThemeToggleButton 
          className="absolute right-4 bottom-80 z-10"
        />
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  bottomSheet: {
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  }
});

export default MapScreen;
 