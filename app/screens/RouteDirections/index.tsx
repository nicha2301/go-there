import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    FlatList,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { GestureHandlerRootView, PanGestureHandler } from 'react-native-gesture-handler';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import theme from '../../constants/theme';
import useLocation from '../../hooks/useLocation';
import useRoute from '../../hooks/useRoute';

const { width, height } = Dimensions.get('window');
const BOTTOM_SHEET_MIN_HEIGHT = 150;
const BOTTOM_SHEET_MAX_HEIGHT = height * 0.65;

interface Coordinates {
  latitude: number;
  longitude: number;
}

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

interface Maneuver {
  type?: string;
  instruction?: string;
  [key: string]: any;
}

interface RouteStep {
  distance: number;
  duration: number;
  maneuver?: Maneuver;
  [key: string]: any;
}

interface RouteData {
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
  steps?: RouteStep[];
  legs?: {
    steps: RouteStep[];
  }[];
}

interface LocationHook {
  location: Coordinates | null;
  address: string;
  loading: boolean;
  error: string | null;
  isTracking: boolean;
  getCurrentLocation: () => Promise<void>;
  startLocationTracking: () => Promise<void>;
  stopLocationTracking: () => void;
}

interface RouteHook {
  route: RouteData | null;
  loading: boolean;
  error: string | null;
  getRoute: (startLocation: Coordinates, endLocation: Coordinates, transportMode: string) => Promise<RouteData | null>;
}

// Icons cho các phương tiện
const TRANSPORT_MODES = [
  { id: 'driving', icon: 'car', name: 'Ô tô' },
  { id: 'walking', icon: 'walking', name: 'Đi bộ' },
  { id: 'cycling', icon: 'bicycle', name: 'Xe đạp' }
];

// Icons cho các hướng dẫn
const MANEUVER_ICONS: Record<string, any> = {
  'straight': 'arrow-up',
  'turn-right': 'arrow-forward',
  'turn-left': 'arrow-back',
  'turn-slight-right': 'arrow-up-circle',
  'turn-slight-left': 'arrow-up-circle',
  'turn-sharp-right': 'arrow-forward-circle',
  'turn-sharp-left': 'arrow-back-circle',
  'uturn-right': 'refresh',
  'uturn-left': 'refresh',
  'roundabout-right': 'sync',
  'roundabout-left': 'sync',
  'keep-right': 'arrow-forward',
  'keep-left': 'arrow-back',
  'depart': 'flag',
  'arrive': 'flag-outline',
  'default': 'navigate'
};

// Thành phần hiển thị từng bước chỉ đường
const DirectionStep = React.memo(({ 
  step, 
  index, 
  isLastStep,
  getManeuverIcon,
  getInstructionText 
}: { 
  step: RouteStep; 
  index: number;
  isLastStep: boolean;
  getManeuverIcon: (maneuver?: Maneuver) => any;
  getInstructionText: (step: RouteStep, index: number) => string;
}) => {
  // Format khoảng cách
  const formattedDistance = useMemo(() => {
    if (step.distance <= 0) return '';
    return step.distance < 1000 
      ? `${Math.round(step.distance)} m` 
      : `${(step.distance / 1000).toFixed(1)} km`;
  }, [step.distance]);

  // Format thời gian
  const formattedDuration = useMemo(() => {
    if (step.duration <= 0) return '';
    return `(${Math.ceil(step.duration / 60)} phút)`;
  }, [step.duration]);

  return (
    <View className="flex-row py-3 border-b border-border">
      <View className="mr-3 items-center">
        <View className="w-10 h-10 rounded-full bg-backgroundHighlight justify-center items-center">
          <Ionicons 
            name={getManeuverIcon(step.maneuver)} 
            size={18} 
            color={theme.colors.primary} 
          />
        </View>
        {!isLastStep && (
          <View className="w-[2px] h-8 bg-border mt-1" />
        )}
      </View>
      
      <View className="flex-1">
        <Text className="text-base font-semibold text-text">
          {getInstructionText(step, index)}
        </Text>
        
        {step.distance > 0 && (
          <Text className="text-sm text-textSecondary mt-1">
            {formattedDistance}
            {step.duration > 0 && ` ${formattedDuration}`}
          </Text>
        )}
      </View>
    </View>
  );
});

// Thêm displayName để tránh lỗi ESLint
DirectionStep.displayName = 'DirectionStep';

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
  endPlaceName
}: { 
  route: RouteData | null;
  isExpanded: boolean;
  onToggleExpand: () => void;
  transportMode: string;
  onTransportModeChange: (mode: string) => void;
  startPlaceName: string;
  endPlaceName: string;
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
    
    {route ? (
      <View className="mt-1">
        <Text className="text-xl font-bold text-text">
          {route.formattedDistance} ({route.formattedDuration})
        </Text>
        <Text className="text-base text-textSecondary mb-2">
          {startPlaceName} → {endPlaceName}
        </Text>
      </View>
    ) : (
      <View className="h-12 justify-center">
        <Text className="text-base text-textSecondary">Đang tìm đường...</Text>
      </View>
    )}
    
    {/* Transport modes */}
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
    
    {/* Buttons */}
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
  </View>
));

// Thêm displayName để tránh lỗi ESLint
BottomSheetHeader.displayName = 'BottomSheetHeader';

export default function RouteDirections() {
  console.log('[RouteDirections] Component rendering');
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const mapRef = useRef<MapView>(null);
  
  // Refs
  const paramsProcessedRef = useRef(false);
  const routeRequestedRef = useRef<boolean>(false);
  const lastTransportModeRef = useRef<string>('driving');
  const bottomSheetAnimation = useRef(new Animated.Value(BOTTOM_SHEET_MIN_HEIGHT)).current;
  const panY = useRef(new Animated.Value(0)).current;
  
  // State
  const [startLocation, setStartLocation] = useState<Coordinates | null>(null);
  const [endLocation, setEndLocation] = useState<Coordinates | null>(null);
  const [startPlaceName, setStartPlaceName] = useState<string>('');
  const [endPlaceName, setEndPlaceName] = useState<string>('');
  const [place, setPlace] = useState<Place | null>(null);
  const [route, setRoute] = useState<RouteData | null>(null);
  const [transportMode, setTransportMode] = useState<string>('driving');
  const [loading, setLoading] = useState<boolean>(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [isBottomSheetExpanded, setIsBottomSheetExpanded] = useState<boolean>(false);
  const [mapPadding, setMapPadding] = useState<{ bottom: number }>({ bottom: BOTTOM_SHEET_MIN_HEIGHT });
  const [isMapReady, setIsMapReady] = useState<boolean>(false);
  
  // Lấy vị trí hiện tại từ hook
  const { 
    location: currentLocation, 
    address: currentAddress, 
    loading: locationLoading 
  } = useLocation();
  
  // Lấy hook tìm đường
  const { 
    route: apiRoute, 
    loading: routeLoading, 
    error: routeApiError, 
    getRoute 
  } = useRoute();

  // Khởi tạo dữ liệu từ params
  useEffect(() => {
    console.log('[RouteDirections] Initializing with params:', params);
    
    // Xử lý tham số vị trí bắt đầu
    if (params.startLat && params.startLng) {
      const startLoc = {
        latitude: parseFloat(params.startLat as string),
        longitude: parseFloat(params.startLng as string)
      };
      setStartLocation(startLoc);
      setStartPlaceName(params.startName as string || 'Điểm xuất phát');
      console.log('[RouteDirections] Set start location from params:', startLoc);
    } else if (currentLocation) {
      // Sử dụng vị trí hiện tại nếu không có tham số
      setStartLocation(currentLocation);
      setStartPlaceName(currentAddress || 'Vị trí hiện tại');
      console.log('[RouteDirections] Set start location from current location:', currentLocation);
    }
    
    // Xử lý tham số vị trí kết thúc
    if (params.endLat && params.endLng) {
      const endLoc = {
        latitude: parseFloat(params.endLat as string),
        longitude: parseFloat(params.endLng as string)
      };
      setEndLocation(endLoc);
      setEndPlaceName(params.endName as string || 'Điểm đến');
      console.log('[RouteDirections] Set end location from params:', endLoc);
    }
    
    // Xử lý tham số phương tiện
    if (params.mode) {
      const mode = params.mode as string;
      setTransportMode(mode);
      lastTransportModeRef.current = mode;
      console.log('[RouteDirections] Set transport mode from params:', mode);
    }
  }, [params, currentLocation, currentAddress]);

  // Animate bottom sheet
  const toggleBottomSheet = () => {
    const toValue = isBottomSheetExpanded ? BOTTOM_SHEET_MIN_HEIGHT : BOTTOM_SHEET_MAX_HEIGHT;
    
    Animated.spring(bottomSheetAnimation, {
      toValue,
      friction: 8,
      useNativeDriver: false
    }).start();
    
    setIsBottomSheetExpanded(!isBottomSheetExpanded);
    
    // Cập nhật padding cho bản đồ
    setMapPadding({ 
      bottom: isBottomSheetExpanded ? BOTTOM_SHEET_MIN_HEIGHT : BOTTOM_SHEET_MAX_HEIGHT - 100 
    });
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
  
  // Tìm đường khi có đủ dữ liệu
  useEffect(() => {
    // Xác định điều kiện để tìm đường
    const shouldFindRoute = startLocation && endLocation && !routeRequestedRef.current && !loading;
    
    console.log('[RouteDirections] useEffect for finding route triggered', { 
      startLocation, 
      endLocation, 
      transportMode,
      loading,
      routeLoading,
      shouldFindRoute
    });
    
    if (!shouldFindRoute) {
      if (!startLocation || !endLocation) {
        console.log('[RouteDirections] Not enough data to find route', { startLocation, endLocation });
      } else if (routeRequestedRef.current) {
        console.log('[RouteDirections] Route already requested, skipping');
      } else if (loading) {
        console.log('[RouteDirections] Loading in progress, skipping');
      }
      return;
    }
    
    // Đánh dấu đã gọi API tìm đường ngay từ đầu để tránh gọi lại nhiều lần
    routeRequestedRef.current = true;
    
    const findRouteNow = async () => {
      try {
        setLoading(true);
        setRouteError(null);
        
        // Thêm delay nhỏ để đảm bảo UI được cập nhật trước khi gọi API
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Gọi tìm đường
        console.log('[RouteDirections] Finding route between', startLocation, endLocation);
        console.log('[RouteDirections] Finding route between points with mode:', transportMode);
        const routeData = await getRoute(startLocation, endLocation, transportMode);
        
        if (routeData) {
          console.log('[RouteDirections] Route found successfully', routeData);
          setRoute(routeData);
          
          // Zoom đến khu vực hiển thị đường đi
          setTimeout(() => {
            if (mapRef.current) {
              console.log('[RouteDirections] Zooming map to route');
              mapRef.current.fitToCoordinates(
                [
                  { latitude: startLocation.latitude, longitude: startLocation.longitude },
                  { latitude: endLocation.latitude, longitude: endLocation.longitude }
                ],
                {
                  edgePadding: { top: 70, right: 70, bottom: mapPadding.bottom + 70, left: 70 },
                  animated: true
                }
              );
            }
          }, 500);
        } else {
          console.log('[RouteDirections] No route data returned');
          // Thay vì ném một lỗi mới, chỉ cần set lỗi và reset flag để có thể thử lại sau
          setRouteError('Không thể tìm thấy đường đi');
          routeRequestedRef.current = false;
        }
      } catch (error) {
        console.error('[RouteDirections] Error finding route:', error);
        setRouteError(error instanceof Error ? error.message : 'Không thể tìm đường. Vui lòng thử lại sau.');
        
        // Reset flag nếu có lỗi để có thể thử lại
        routeRequestedRef.current = false;
      } finally {
        setLoading(false);
      }
    };
    
    findRouteNow();
  }, [startLocation, endLocation, transportMode, getRoute, mapPadding.bottom]);
  
  // Xử lý khi thay đổi phương tiện
  useEffect(() => {
    // Kiểm tra xem transportMode có thay đổi so với lần cuối cùng không
    if (lastTransportModeRef.current === transportMode) {
      console.log('[RouteDirections] Transport mode unchanged, skipping');
      return;
    }
    
    // Lưu lại transport mode hiện tại
    lastTransportModeRef.current = transportMode;
    
    // Chỉ tìm đường lại nếu đã có route trước đó và đã có đủ dữ liệu
    if (route && startLocation && endLocation && !loading && !routeLoading) {
      console.log('[RouteDirections] Transport mode changed, finding new route');
      
      // Reset flag để có thể tìm route mới
      routeRequestedRef.current = false;
      
      // Tìm đường với phương tiện mới
      const findNewRoute = async () => {
        try {
          setLoading(true);
          
          // Thêm delay nhỏ để đảm bảo UI được cập nhật trước khi gọi API
          await new Promise(resolve => setTimeout(resolve, 300));
          
          console.log('[RouteDirections] Finding route with new transport mode:', transportMode);
          const newRouteData = await getRoute(startLocation, endLocation, transportMode);
          
          if (newRouteData) {
            setRoute(newRouteData);
            console.log('[RouteDirections] New route found with transport mode:', transportMode);
          } else {
            console.log('[RouteDirections] Could not find new route');
            setRouteError('Không thể tìm đường với phương tiện này. Vui lòng thử lại sau.');
          }
        } catch (error) {
          console.error('[RouteDirections] Error finding new route:', error);
          setRouteError('Lỗi khi tìm đường. Vui lòng thử lại sau.');
        } finally {
          setLoading(false);
        }
      };
      
      findNewRoute();
    }
  }, [transportMode, route, startLocation, endLocation, loading, routeLoading, getRoute]);
  
  // Theo dõi lỗi từ API tìm đường
  useEffect(() => {
    if (routeApiError) {
      console.log('[RouteDirections] Route API error detected', routeApiError);
      setRouteError(routeApiError);
    }
  }, [routeApiError]);
  
  // Cập nhật route từ API nếu có
  useEffect(() => {
    if (apiRoute && !route) {
      console.log('[RouteDirections] Updating route from API');
      setRoute(apiRoute);
      
      // Zoom đến khu vực hiển thị đường đi khi có route
      setTimeout(() => {
        if (mapRef.current && startLocation && endLocation) {
          console.log('[RouteDirections] Zooming map to route after update');
          mapRef.current.fitToCoordinates(
            [
              { latitude: startLocation.latitude, longitude: startLocation.longitude },
              { latitude: endLocation.latitude, longitude: endLocation.longitude }
            ],
            {
              edgePadding: { top: 70, right: 70, bottom: mapPadding.bottom + 70, left: 70 },
              animated: true
            }
          );
        }
      }, 500);
    }
  }, [apiRoute, route, startLocation, endLocation, mapPadding.bottom]);

  // Xử lý khi bản đồ sẵn sàng
  const handleMapReady = useCallback(() => {
    console.log('[RouteDirections] Map is ready');
    setIsMapReady(true);
    
    // Zoom đến lộ trình nếu đã có
    if (mapRef.current && startLocation && endLocation) {
      console.log('[RouteDirections] Zooming to route on map ready');
      setTimeout(() => {
        try {
          mapRef.current?.fitToCoordinates(
            [
              { latitude: startLocation.latitude, longitude: startLocation.longitude },
              { latitude: endLocation.latitude, longitude: endLocation.longitude }
            ],
            {
              edgePadding: { top: 70, right: 70, bottom: mapPadding.bottom + 70, left: 70 },
              animated: true
            }
          );
        } catch (error) {
          console.error('[RouteDirections] Error zooming map:', error);
        }
      }, 1000);
    }
  }, [startLocation, endLocation, mapPadding.bottom]);

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
  
  // Tạo điểm đầu và điểm cuối của hành trình
  const getEndpoints = useMemo(() => {
    const endpoints = [];
    
    if (startLocation) {
      endpoints.push(
        <Marker
          key="start"
          coordinate={startLocation}
          title={startPlaceName || "Điểm bắt đầu"}
        >
          <View className="items-center justify-center">
            <View className="bg-success p-2 rounded-full">
              <Ionicons name="locate" size={20} color="#FFF" />
            </View>
          </View>
        </Marker>
      );
    }
    
    if (endLocation) {
      endpoints.push(
        <Marker
          key="end"
          coordinate={endLocation}
          title={endPlaceName || place?.name || "Điểm đến"}
        >
          <View className="items-center justify-center">
            <View className="bg-primary p-2 rounded-full">
              <Ionicons name="location" size={20} color="#FFF" />
            </View>
          </View>
        </Marker>
      );
    }
    
    return endpoints;
  }, [startLocation, endLocation, startPlaceName, endPlaceName, place]);
  
  // Tạo đường đi trên bản đồ
  const getRoutePolyline = useMemo(() => {
    if (!route || !route.geometry || !route.geometry.coordinates) {
      return null;
    }
    
    const coordinates = route.geometry.coordinates.map(coord => ({
      latitude: coord[1],
      longitude: coord[0]
    }));
    
    return (
      <Polyline
        coordinates={coordinates}
        strokeWidth={5}
        strokeColor={theme.colors.primary}
        lineCap="round"
        lineJoin="round"
      />
    );
  }, [route]);
  
  // Xử lý khi chọn phương tiện di chuyển
  const handleTransportModeChange = (mode: string) => {
    console.log('[RouteDirections] Changing transport mode to:', mode);
    if (mode !== transportMode) {
      setTransportMode(mode);
    }
  };
  
  // Lấy tất cả các bước từ route
  const getAllSteps = useCallback((routeData: RouteData) => {
    if (!routeData || !routeData.legs) {
      return [];
    }
    
    let allSteps: RouteStep[] = [];
    routeData.legs.forEach(leg => {
      if (leg.steps && leg.steps.length > 0) {
        allSteps = [...allSteps, ...leg.steps];
      }
    });
    
    return allSteps;
  }, []);

  // Lấy icon cho maneuver
  const getManeuverIcon = useCallback((maneuver?: Maneuver) => {
    if (!maneuver) return MANEUVER_ICONS.default;
    
    if (maneuver.type && MANEUVER_ICONS[maneuver.type]) {
      return MANEUVER_ICONS[maneuver.type];
    }
    
    if (maneuver.modifier && MANEUVER_ICONS[`${maneuver.type}-${maneuver.modifier}`]) {
      return MANEUVER_ICONS[`${maneuver.type}-${maneuver.modifier}`];
    }
    
    return MANEUVER_ICONS.default;
  }, []);
  
  // Tạo text hướng dẫn từ maneuver
  const getInstructionText = useCallback((step: RouteStep, index: number) => {
    if (!step) return '';
    
    // Nếu là bước đầu tiên
    if (index === 0) return 'Xuất phát';
    
    // Nếu có hướng dẫn từ API
    if (step.maneuver && step.maneuver.instruction) return step.maneuver.instruction;
    
    // Nếu là tên đường
    if (step.name) {
      if (step.maneuver && step.maneuver.type === 'turn') {
        return `Rẽ ${step.maneuver.modifier === 'right' ? 'phải' : 'trái'} vào ${step.name}`;
      }
      return `Đi theo ${step.name}`;
    }
    
    // Mặc định
    return 'Tiếp tục đi thẳng';
  }, []);
  
  // Xử lý khi nhấn nút quay lại
  const handleBackPress = () => {
    router.back();
  };

  // Nút thử lại khi có lỗi
  const handleRetryRoute = useCallback(() => {
    console.log('[RouteDirections] Retrying route');
    
    // Reset trạng thái
    setRouteError(null);
    routeRequestedRef.current = false;
    
    // Tìm đường lại
    if (startLocation && endLocation) {
      const findRouteAgain = async () => {
        try {
          setLoading(true);
          
          // Thêm delay nhỏ để đảm bảo UI được cập nhật trước khi gọi API
          await new Promise(resolve => setTimeout(resolve, 300));
          
          console.log('[RouteDirections] Retrying route between', startLocation, endLocation);
          const routeData = await getRoute(startLocation, endLocation, transportMode);
          
          if (routeData) {
            console.log('[RouteDirections] Route found successfully on retry');
            setRoute(routeData);
            
            // Zoom đến khu vực hiển thị đường đi
            setTimeout(() => {
              if (mapRef.current) {
                mapRef.current.fitToCoordinates(
                  [
                    { latitude: startLocation.latitude, longitude: startLocation.longitude },
                    { latitude: endLocation.latitude, longitude: endLocation.longitude }
                  ],
                  {
                    edgePadding: { top: 70, right: 70, bottom: mapPadding.bottom + 70, left: 70 },
                    animated: true
                  }
                );
              }
            }, 500);
          } else {
            console.log('[RouteDirections] No route data returned on retry');
            setRouteError('Không thể tìm thấy đường đi. Vui lòng thử lại sau.');
          }
        } catch (error) {
          console.error('[RouteDirections] Error finding route on retry:', error);
          setRouteError(error instanceof Error ? error.message : 'Không thể tìm đường. Vui lòng thử lại sau.');
        } finally {
          setLoading(false);
        }
      };
      
      findRouteAgain();
    }
  }, [startLocation, endLocation, transportMode, getRoute, mapPadding.bottom]);

  // Hiển thị lỗi
  const renderError = () => {
    if (!routeError) return null;
    
    return (
      <View className="px-4 py-3 bg-red-50 border-l-4 border-red-500 mb-2 mx-4">
        <Text className="text-red-700">{routeError}</Text>
        <TouchableOpacity 
          className="mt-2 bg-primary py-2 px-4 rounded-md self-end"
          onPress={handleRetryRoute}
        >
          <Text className="text-white font-medium">Thử lại</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Cleanup function
  useEffect(() => {
    return () => {
      console.log('[RouteDirections] Component unmounting - cleanup');
      // Không cần làm gì đặc biệt ở đây, React sẽ tự cleanup các subscription
    };
  }, []);

  return (
    <View className="flex-1 bg-background">
      <StatusBar style="auto" />
      
      {/* Map */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        provider={PROVIDER_DEFAULT}
        initialRegion={{
          latitude: startLocation?.latitude || 10.762622,
          longitude: startLocation?.longitude || 106.660172,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01
        }}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsCompass={false}
        showsScale={true}
        showsTraffic={false}
        rotateEnabled={true}
        scrollEnabled={true}
        zoomEnabled={true}
        toolbarEnabled={false}
        loadingEnabled={true}
        moveOnMarkerPress={false}
        onMapReady={handleMapReady}
        onLayout={() => console.log('[RouteDirections] Map layout changed')}
        paddingAdjustmentBehavior="automatic"
      >
        {startLocation && (
          <Marker
            coordinate={{
              latitude: startLocation.latitude,
              longitude: startLocation.longitude
            }}
            title={startPlaceName || "Điểm bắt đầu"}
          >
            <View className="bg-primary p-2 rounded-full">
              <FontAwesome5 name="map-marker-alt" size={16} color="white" />
            </View>
          </Marker>
        )}
        
        {endLocation && (
          <Marker
            coordinate={{
              latitude: endLocation.latitude,
              longitude: endLocation.longitude
            }}
            title={endPlaceName || "Điểm đến"}
          >
            <View className="bg-red-500 p-2 rounded-full">
              <FontAwesome5 name="flag-checkered" size={16} color="white" />
            </View>
          </Marker>
        )}
        
        {/* Hiển thị đường đi */}
        {route && route.geometry && route.geometry.coordinates && route.geometry.coordinates.length > 0 && (
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
      
      {/* Nút quay lại */}
      <TouchableOpacity 
        className="absolute top-12 left-4 bg-white p-2 rounded-full shadow-md"
        onPress={handleBackPress}
      >
        <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
      </TouchableOpacity>
      
      {/* Nút điều khiển bản đồ */}
      <MapControls onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} />
      
      {/* Bottom Sheet */}
      <GestureHandlerRootView style={{ flex: 1 }}>
        <PanGestureHandler
          onGestureEvent={handleGesture}
          onHandlerStateChange={handleGestureStateChange}
        >
          <Animated.View
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-lg"
            style={{
              height: bottomSheetAnimation,
              transform: [{ translateY: panY }]
            }}
          >
            <BottomSheetHeader 
              route={route} 
              isExpanded={isBottomSheetExpanded}
              onToggleExpand={toggleBottomSheet}
              transportMode={transportMode}
              onTransportModeChange={handleTransportModeChange}
              startPlaceName={startPlaceName}
              endPlaceName={endPlaceName}
            />
            
            {/* Hiển thị lỗi */}
            {renderError()}
            
            {/* Hiển thị loading */}
            {loading && (
              <View className="px-4 py-8 items-center">
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text className="text-textSecondary mt-2">Đang tìm đường...</Text>
              </View>
            )}
            
            {/* Danh sách các bước */}
            {route && route.legs && !loading && (
              <FlatList
                data={getAllSteps(route)}
                keyExtractor={(item, index) => `step-${index}`}
                contentContainerStyle={{ padding: 16 }}
                renderItem={({ item, index }) => (
                  <DirectionStep 
                    step={item} 
                    index={index}
                    isLastStep={index === getAllSteps(route).length - 1}
                    getManeuverIcon={getManeuverIcon}
                    getInstructionText={getInstructionText}
                  />
                )}
                ListEmptyComponent={
                  <Text className="text-center py-4 text-textSecondary">
                    Không có thông tin chỉ đường chi tiết
                  </Text>
                }
              />
            )}
          </Animated.View>
        </PanGestureHandler>
      </GestureHandlerRootView>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomSheet: {
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  }
}); 