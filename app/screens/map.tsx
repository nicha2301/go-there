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
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { GestureHandlerRootView, PanGestureHandler } from 'react-native-gesture-handler';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import theme from '../constants/theme';
import useDebounce from '../hooks/useDebounce';
import useLocation from '../hooks/useLocation';
import usePlaces from '../hooks/usePlaces';
import useRoute from '../hooks/useRoute';
import { getAddressFromCoordinates } from '../services/locationService';

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

// Component SearchBar mới - trực tiếp hiển thị input thay vì button
const SearchBar = ({ 
  value, 
  onChangeText, 
  onSubmitEditing, 
  onFocus,
  placeholder, 
  autoFocus = false
}: { 
  value: string;
  onChangeText: (text: string) => void;
  onSubmitEditing: () => void;
  onFocus?: () => void;
  placeholder: string;
  autoFocus?: boolean;
}) => (
  <View className="flex-row items-center bg-white rounded-md p-2 shadow-sm">
    <View className="w-8 h-8 rounded-full bg-backgroundHighlight justify-center items-center mr-2">
      <Ionicons name="search" size={18} color={theme.colors.primary} />
    </View>
    
    <TextInput
      className="flex-1 text-text"
      placeholder={placeholder}
      placeholderTextColor={theme.colors.textSecondary}
      value={value}
      onChangeText={onChangeText}
      onSubmitEditing={onSubmitEditing}
      onFocus={onFocus}
      returnKeyType="search"
      autoFocus={autoFocus}
    />
    
    {value.length > 0 && (
      <TouchableOpacity
        onPress={() => onChangeText('')}
      >
        <Ionicons name="close-circle" size={20} color={theme.colors.grey} />
      </TouchableOpacity>
    )}
  </View>
);

// Nút điều khiển bản đồ (zoom in/out)
const MapControls = React.memo(({ onZoomIn, onZoomOut }: { onZoomIn: () => void; onZoomOut: () => void }) => (
  <View className="absolute right-4 top-1/4 bg-white rounded-full shadow-md overflow-hidden">
    <TouchableOpacity 
      className="p-3 border-b border-border"
      onPress={onZoomIn}
    >
      <Ionicons name="add" size={22} color={theme.colors.text} />
    </TouchableOpacity>
    <TouchableOpacity 
      className="p-3"
      onPress={onZoomOut}
    >
      <Ionicons name="remove" size={22} color={theme.colors.text} />
    </TouchableOpacity>
  </View>
));

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
}) => (
  <View className="px-4 pt-2 pb-3">
    {/* Nút mở rộng / thu gọn - làm rộng hơn */}
    <TouchableOpacity 
      className="p-2 items-center"
      onPress={onToggleExpand}
      activeOpacity={0.7}
    >
      <View className="w-12 h-1 bg-border rounded-full mb-2" />
    </TouchableOpacity>
    
    {showDirectionsUI && route ? (
      <View className="mt-1">
        <Text className="text-xl font-bold text-text">
          {route.formattedDistance} ({route.formattedDuration})
        </Text>
        <Text className="text-base text-textSecondary mb-2">
          {startPlaceName} → {endPlaceName}
        </Text>
      </View>
    ) : showDirectionsUI ? (
      <View className="h-12 justify-center">
        <Text className="text-base text-textSecondary">Đang tìm đường...</Text>
      </View>
    ) : (
      <TouchableOpacity 
        className="flex-row items-center bg-white rounded-md p-3 my-2 shadow-sm"
        onPress={onSearchPress}
      >
        <View className="w-8 h-8 rounded-full bg-backgroundHighlight justify-center items-center mr-2">
          <Ionicons name="search" size={18} color={theme.colors.primary} />
        </View>
        <Text className="flex-1 text-textSecondary">Tìm kiếm địa điểm...</Text>
      </TouchableOpacity>
    )}
    
    {/* Transport modes */}
    {showDirectionsUI && (
      <View className="flex-row justify-around py-3">
        {TRANSPORT_MODES.map(mode => (
          <TouchableOpacity
            key={mode.id}
            className={`items-center p-3 ${transportMode === mode.id ? 'bg-backgroundHighlight rounded-xl' : ''}`}
            onPress={() => onTransportModeChange(mode.id)}
            style={{ minWidth: 70 }}
          >
            <FontAwesome5 
              name={mode.icon} 
              size={20} 
              color={transportMode === mode.id ? theme.colors.primary : theme.colors.text} 
            />
            <Text 
              className={`text-sm mt-1 ${transportMode === mode.id ? 'text-primary font-bold' : 'text-textSecondary'}`}
            >
              {mode.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    )}
    
    {/* Buttons */}
    {showDirectionsUI && route && (
      <View className="flex-row justify-between mt-1">
        <TouchableOpacity
          className="flex-1 mr-2 flex-row items-center justify-center bg-primary py-3 rounded-xl"
        >
          <Ionicons name="navigate" size={20} color="#FFF" />
          <Text className="text-white font-bold ml-2">Bắt đầu</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          className="w-14 items-center justify-center bg-card border border-border rounded-xl"
        >
          <Ionicons name="share-social-outline" size={20} color={theme.colors.text} />
        </TouchableOpacity>
      </View>
    )}
  </View>
));

// Thêm displayName để tránh lỗi ESLint
BottomSheetHeader.displayName = 'BottomSheetHeader';

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
  
  // Thêm state cho tìm kiếm trực tiếp
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchResults, setSearchResults] = useState<Place[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  
  // Lấy hook usePlaces để quản lý lịch sử tìm kiếm
  const { 
    search, 
    history, 
    loading: placesLoading, 
    loadHistory, 
    selectPlace: savePlaceToHistory 
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
  }, []);

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
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching places:', error);
      Alert.alert('Lỗi', 'Không thể tìm kiếm địa điểm. Vui lòng thử lại sau.');
    } finally {
      setSearchLoading(false);
    }
  };

  // Xử lý khi chọn một địa điểm
  const handleSelectPlace = async (place: Place) => {
    // Lưu địa điểm vào lịch sử
    await savePlaceToHistory(place);
    
    // Đóng kết quả tìm kiếm
    setShowSearchResults(false);
    setSearchQuery('');
    
    // Thiết lập địa điểm đã chọn
    setSelectedPlace(place);
    setMarkerCoords({
      latitude: place.latitude,
      longitude: place.longitude
    });
    setEndPlaceName(place.name);
    
    // Hiển thị nút quay lại khi có địa điểm được chọn
    setShowBackButton(true);
    
    // Hiển thị giao diện chỉ đường
    setShowDirectionsUI(true);
    
    // Nếu có vị trí hiện tại, tìm đường
    if (location) {
      findRoute(
        { latitude: location.latitude, longitude: location.longitude },
        { latitude: place.latitude, longitude: place.longitude },
        transportMode
      );
    }
  };
  
  // Xử lý khi focus vào ô tìm kiếm
  const handleSearchFocus = () => {
    setShowSearchResults(true);
  };
  
  // Xử lý khi nhấn nút tìm kiếm
  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    
    Keyboard.dismiss();
    performSearch(searchQuery);
  };
  
  // Xử lý khi đóng kết quả tìm kiếm
  const handleCloseSearch = () => {
    setShowSearchResults(false);
    setSearchQuery('');
    Keyboard.dismiss();
  };

  // Animate bottom sheet
  const toggleBottomSheet = () => {
    const toValue = isBottomSheetExpanded ? BOTTOM_SHEET_MIN_HEIGHT : BOTTOM_SHEET_MAX_HEIGHT;
    
    Animated.spring(bottomSheetAnimation, {
      toValue,
      friction: 8,
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
        }, 500);
      }
    } catch (error) {
      console.error('Error finding route:', error);
      setRouteError(error instanceof Error ? error.message : 'Không thể tìm đường. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View className="flex-1 bg-background">
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        
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
          onMapReady={() => setMapReady(true)}
          showsMyLocationButton={false}
          onPress={(e) => {
            if (showSearchResults) {
              handleCloseSearch();
              return;
            }
            
            if (!showDirectionsUI) {
              const coords = e.nativeEvent.coordinate;
              setMarkerCoords(coords);
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
        >
          {/* Hiển thị marker cho địa điểm được chọn */}
          {markerCoords && (
            <Marker
              coordinate={markerCoords}
              title={endPlaceName || "Địa điểm đã chọn"}
            >
              <View className="items-center justify-center">
                <View className="bg-primary p-2 rounded-full">
                  <Ionicons name="location" size={20} color="#FFF" />
                </View>
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
              strokeColor={theme.colors.primary}
              lineCap="round"
              lineJoin="round"
            />
          )}
        </MapView>
        
        {/* Nút zoom */}
        <MapControls onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} />
        
        {/* Thanh tìm kiếm ở trên cùng */}
        {!showDirectionsUI && (
          <View className="absolute top-0 left-0 right-0 px-4 pt-12 pb-4 z-10">
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              onFocus={handleSearchFocus}
              placeholder="Tìm kiếm địa điểm..."
              autoFocus={false}
            />
          </View>
        )}
        
        {/* Kết quả tìm kiếm và lịch sử */}
        {showSearchResults && (
          <View className="absolute top-0 left-0 right-0 bottom-0 bg-white z-20">
            <View className="flex-row items-center px-4 py-2 bg-card" style={{ paddingTop: insets.top + 8 }}>
              <TouchableOpacity 
                onPress={handleCloseSearch}
                className="mr-3"
              >
                <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
              
              <View className="flex-1">
                <SearchBar
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={handleSearch}
                  placeholder="Tìm kiếm địa điểm..."
                  autoFocus={true}
                />
              </View>
            </View>
            
            {/* Hiển thị indicator khi đang tìm kiếm */}
            {searchLoading ? (
              <View className="flex-1 justify-center items-center">
                <ActivityIndicator size="large" color={theme.colors.primary} />
              </View>
            ) : (
              <FlatList
                data={searchQuery.length >= 2 ? searchResults : history}
                keyExtractor={(item) => item.id.toString()}
                ListHeaderComponent={
                  searchQuery.length < 2 ? (
                    <View className="px-4 py-3 bg-backgroundHighlight">
                      <Text className="text-base font-bold text-text">Lịch sử tìm kiếm</Text>
                    </View>
                  ) : null
                }
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
                      {item.timestamp && (
                        <Text className="text-xs text-textSecondary mt-1">
                          <Ionicons name="time-outline" size={12} color={theme.colors.grey} />
                          {' '}{new Date(item.timestamp).toLocaleString()}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  searchQuery.length >= 2 ? (
                    <View className="flex-1 justify-center items-center py-10">
                      <Ionicons name="search" size={64} color={theme.colors.border} />
                      <Text className="text-lg font-bold text-text mt-4">
                        Không tìm thấy kết quả
                      </Text>
                      <Text className="text-center text-textSecondary mt-2 px-8">
                        Thử tìm kiếm với từ khóa khác
                      </Text>
                    </View>
                  ) : history.length === 0 ? (
                    <View className="flex-1 justify-center items-center py-10">
                      <Ionicons name="time" size={64} color={theme.colors.border} />
                      <Text className="text-lg font-bold text-text mt-4">
                        Lịch sử tìm kiếm trống
                      </Text>
                      <Text className="text-center text-textSecondary mt-2 px-8">
                        Các địa điểm bạn tìm kiếm sẽ xuất hiện ở đây
                      </Text>
                    </View>
                  ) : null
                }
              />
            )}
          </View>
        )}
        
        {/* Nút quay lại */}
        {showBackButton && (
          <TouchableOpacity 
            className="absolute top-12 left-4 bg-white p-2 rounded-full shadow-md z-10"
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
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        )}
        
        {/* Bottom Sheet có PanGestureHandler để kéo thả */}
        <PanGestureHandler
          onGestureEvent={handleGesture}
          onHandlerStateChange={handleGestureStateChange}
          activeOffsetY={[-20, 20]}
          failOffsetY={[-100, 100]}
          enabled={!showSearchResults}
        >
          <Animated.View 
            className="absolute left-0 right-0 bottom-0 bg-white rounded-t-3xl shadow-lg z-10"
            style={[
              styles.bottomSheet,
              {
                height: bottomSheetAnimation,
                paddingBottom: insets.bottom,
                transform: [{ translateY: panY }]
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
              <View className="mx-4 mb-3 p-3 bg-errorLight rounded-xl">
                <Text className="text-error">{routeError}</Text>
              </View>
            )}
            
            {/* Phần chỉ dẫn chi tiết */}
            {showDirectionsUI && isBottomSheetExpanded && (
              <View className="flex-1 px-4 pb-2">
                <Text className="text-base font-bold text-text mb-2">Chi tiết lộ trình</Text>
                
                {isLoading || routeLoading ? (
                  <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                    <Text className="mt-2 text-textSecondary">Đang tìm đường...</Text>
                  </View>
                ) : (
                  <>
                    {(route && (route as any).legs && Array.isArray((route as any).legs) && (route as any).legs.length > 0) ? (
                      <FlatList
                        data={(route as any).legs?.[0]?.steps || []}
                        renderItem={({ item, index }) => (
                          <View className="flex-row py-3 border-b border-border">
                            <View className="mr-3 items-center">
                              <View className="w-10 h-10 rounded-full bg-backgroundHighlight justify-center items-center">
                                <Ionicons 
                                  name="navigate" 
                                  size={18} 
                                  color={theme.colors.primary} 
                                />
                              </View>
                              {index < ((route as any).legs?.[0]?.steps?.length - 1 || 0) && (
                                <View className="w-[2px] h-8 bg-border mt-1" />
                              )}
                            </View>
                            
                            <View className="flex-1">
                              <Text className="text-base font-semibold text-text">
                                {item.name || (index === 0 ? 'Xuất phát' : 'Tiếp tục đi thẳng')}
                              </Text>
                              
                              {item.distance > 0 && (
                                <Text className="text-sm text-textSecondary mt-1">
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
                        <Ionicons name="information-circle-outline" size={36} color={theme.colors.grey} />
                        <Text className="mt-2 text-textSecondary text-center">
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
 