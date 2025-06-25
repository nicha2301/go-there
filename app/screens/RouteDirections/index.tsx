import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import theme from '../../constants/theme';
import useLocation from '../../hooks/useLocation';
import useRoute from '../../hooks/useRoute';
import { searchPlaces } from '../../services/locationService';

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
        <View className="w-8 h-8 rounded-full bg-lightGrey justify-center items-center">
          <Ionicons 
            name={getManeuverIcon(step.maneuver)} 
            size={16} 
            color={theme.colors.primary} 
          />
        </View>
        {!isLastStep && (
          <View className="w-[1px] h-8 bg-border mt-1" />
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

// Thành phần hiển thị thanh tìm kiếm địa điểm
const LocationSearchBar = React.memo(({ 
  isFrom,
  placeholder,
  value,
  onPress
}: {
  isFrom: boolean,
  placeholder: string,
  value: string,
  onPress: () => void
}) => (
  <TouchableOpacity 
    className="flex-row items-center bg-card rounded-md p-2 mb-2" 
    onPress={onPress}
  >
    <View className="w-8 h-8 rounded-full bg-background justify-center items-center mr-2">
      {isFrom ? (
        <Ionicons name="locate" size={18} color={theme.colors.success} />
      ) : (
        <Ionicons name="location" size={18} color={theme.colors.primary} />
      )}
    </View>
    
    <View className="flex-1">
      {value ? (
        <Text className="text-text" numberOfLines={1}>
          {value}
        </Text>
      ) : (
        <Text className="text-textSecondary">{placeholder}</Text>
      )}
    </View>
    
    <Ionicons name="search" size={18} color={theme.colors.grey} />
  </TouchableOpacity>
));

// Thêm displayName để tránh lỗi ESLint
LocationSearchBar.displayName = 'LocationSearchBar';

export default function RouteDirections() {
  console.log('[RouteDirections] Component rendering');
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const mapRef = useRef<MapView | null>(null);
  
  const [startLocation, setStartLocation] = useState<Coordinates | null>(null);
  const [endLocation, setEndLocation] = useState<Coordinates | null>(null);
  const [startPlaceName, setStartPlaceName] = useState<string>('');
  const [endPlaceName, setEndPlaceName] = useState<string>('');
  const [place, setPlace] = useState<Place | null>(null);
  const [route, setRoute] = useState<RouteData | null>(null);
  const [transportMode, setTransportMode] = useState<string>('driving');
  const [loading, setLoading] = useState<boolean>(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  
  // Lấy vị trí hiện tại từ hook
  const { location: currentLocation, address: currentAddress } = useLocation();
  
  // Lấy hàm tìm đường từ hook
  const { getRoute, loading: routeLoading, error: routeApiError } = useRoute();
  
  // Lấy dữ liệu từ params
  useEffect(() => {
    console.log('[RouteDirections] useEffect params triggered', params);
    
    if (params) {
      // Xử lý startLocation
      if (params.startLocation) {
        try {
          console.log('[RouteDirections] Processing startLocation param', params.startLocation);
          const start = typeof params.startLocation === 'string'
            ? JSON.parse(params.startLocation as string) as Coordinates
            : params.startLocation as unknown as Coordinates;
            
          setStartLocation(start);
          console.log('[RouteDirections] Set startLocation', start);
          
          // Sử dụng tên địa điểm hiện tại nếu là vị trí hiện tại
          if (currentAddress && 
              Math.abs(start.latitude - (currentLocation?.latitude || 0)) < 0.0001 && 
              Math.abs(start.longitude - (currentLocation?.longitude || 0)) < 0.0001) {
            setStartPlaceName('Vị trí của bạn');
          } else {
            // Tìm tên địa điểm từ tọa độ
            searchPlaces('', {
              lat: start.latitude,
              lng: start.longitude
            }).then(results => {
              if (results && results.length > 0) {
                console.log('[RouteDirections] Found start place name', results[0].address);
                setStartPlaceName(results[0].address);
              }
            }).catch(err => console.error('Error searching start place:', err));
          }
        } catch (error) {
          console.error('[RouteDirections] Error parsing start location:', error);
        }
      } else if (currentLocation) {
        // Sử dụng vị trí hiện tại nếu không có startLocation trong params
        console.log('[RouteDirections] Using current location as start', currentLocation);
        setStartLocation({
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude
        });
        setStartPlaceName('Vị trí của bạn');
      }
      
      // Xử lý endLocation
      if (params.endLocation) {
        try {
          console.log('[RouteDirections] Processing endLocation param', params.endLocation);
          const end = typeof params.endLocation === 'string'
            ? JSON.parse(params.endLocation as string) as Coordinates
            : params.endLocation as unknown as Coordinates;
            
          setEndLocation(end);
          console.log('[RouteDirections] Set endLocation', end);
        } catch (error) {
          console.error('[RouteDirections] Error parsing end location:', error);
        }
      }
      
      // Xử lý place
      if (params.place) {
        try {
          console.log('[RouteDirections] Processing place param', params.place);
          const placeData = typeof params.place === 'string'
            ? JSON.parse(params.place as string) as Place
            : params.place as unknown as Place;
            
          setPlace(placeData);
          setEndPlaceName(placeData.name);
          setEndLocation({
            latitude: placeData.latitude,
            longitude: placeData.longitude
          });
          console.log('[RouteDirections] Set place and endLocation from place', placeData);
        } catch (error) {
          console.error('[RouteDirections] Error parsing place:', error);
        }
      }
      
      // Xử lý transportMode
      if (params.transportMode) {
        console.log('[RouteDirections] Setting transport mode', params.transportMode);
        setTransportMode(params.transportMode as string);
      }
    }
  }, [params, currentLocation, currentAddress]);
  
  // Tìm đường khi có đủ dữ liệu
  useEffect(() => {
    console.log('[RouteDirections] useEffect for finding route triggered', { 
      startLocation, 
      endLocation, 
      transportMode,
      loading,
      routeLoading
    });
    
    const findRouteIfPossible = async () => {
      if (startLocation && endLocation) {
        console.log('[RouteDirections] Finding route between', startLocation, endLocation);
        setLoading(true);
        setRouteError(null);
        
        try {
          // Gọi tìm đường
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
                    edgePadding: { top: 70, right: 70, bottom: 200, left: 70 },
                    animated: true
                  }
                );
              }
            }, 500);
          } else {
            console.log('[RouteDirections] No route data returned');
            throw new Error('Không thể tìm thấy đường đi');
          }
        } catch (error) {
          console.error('[RouteDirections] Error finding route:', error);
          setRouteError(error instanceof Error ? error.message : 'Không thể tìm đường. Vui lòng thử lại sau.');
        } finally {
          setLoading(false);
        }
      } else {
        console.log('[RouteDirections] Not enough data to find route', { startLocation, endLocation });
      }
    };
    
    findRouteIfPossible();
  }, [startLocation, endLocation, transportMode, getRoute]);
  
  // Theo dõi lỗi từ API tìm đường
  useEffect(() => {
    if (routeApiError) {
      console.log('[RouteDirections] Route API error detected', routeApiError);
      setRouteError(routeApiError);
    }
  }, [routeApiError]);
  
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
            <Ionicons name="locate" size={24} color={theme.colors.success} />
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
            <Ionicons name="location" size={28} color={theme.colors.primary} />
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
        strokeWidth={4}
        strokeColor={theme.colors.primary}
      />
    );
  }, [route]);
  
  // Xử lý khi chọn phương tiện di chuyển
  const handleTransportModeChange = (mode) => {
    setTransportMode(mode);
  };
  
  // Lấy icon cho maneuver
  const getManeuverIcon = useCallback((maneuver) => {
    if (!maneuver) return 'navigate';
    
    let key = 'default';
    if (maneuver.type && MANEUVER_ICONS[maneuver.type]) {
      key = maneuver.type;
    } else if (maneuver.type === 'turn') {
      if (maneuver.modifier === 'right') {
        key = 'turn-right';
      } else if (maneuver.modifier === 'left') {
        key = 'turn-left';
      } else if (maneuver.modifier === 'slight right') {
        key = 'turn-slight-right';
      } else if (maneuver.modifier === 'slight left') {
        key = 'turn-slight-left';
      } else if (maneuver.modifier === 'sharp right') {
        key = 'turn-sharp-right';
      } else if (maneuver.modifier === 'sharp left') {
        key = 'turn-sharp-left';
      } else if (maneuver.modifier === 'uturn') {
        key = maneuver.driving_side === 'left' ? 'uturn-left' : 'uturn-right';
      }
    }
    
    return MANEUVER_ICONS[key] || 'navigate';
  }, []);
  
  // Tạo text hướng dẫn từ maneuver
  const getInstructionText = useCallback((step, index) => {
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
  
  // Xử lý khi nhấn vào điểm bắt đầu
  const handleStartLocationPress = () => {
    // Thông báo cho người dùng
    Alert.alert('Thông báo', 'Quay lại màn hình bản đồ để thay đổi điểm xuất phát');
  };
  
  // Xử lý khi nhấn vào điểm đến
  const handleEndLocationPress = () => {
    // Thông báo cho người dùng
    Alert.alert('Thông báo', 'Quay lại màn hình bản đồ để thay đổi điểm đến');
  };

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="bg-card mx-4 my-2 rounded-md shadow-sm">
        <View className="p-4">
          {/* Nút quay lại */}
          <TouchableOpacity 
            className="absolute left-2 top-4 z-10 p-1"
            onPress={handleBackPress}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          
          {/* Input tìm kiếm */}
          <View className="ml-8 mr-2">
            <LocationSearchBar 
              isFrom={true}
              placeholder="Chọn điểm xuất phát" 
              value={startPlaceName}
              onPress={handleStartLocationPress}
            />
            
            <LocationSearchBar 
              isFrom={false}
              placeholder="Chọn điểm đến"
              value={endPlaceName}
              onPress={handleEndLocationPress} 
            />
          </View>
        </View>
        
        {/* Transport modes */}
        <View className="flex-row justify-around py-3 border-t border-border">
          {TRANSPORT_MODES.map(mode => (
            <TouchableOpacity
              key={mode.id}
              className={`items-center p-2 ${transportMode === mode.id ? 'bg-backgroundHighlight rounded-md' : ''}`}
              onPress={() => handleTransportModeChange(mode.id)}
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
      </View>
      
      {/* Map */}
      <View className="h-[40%] bg-background mb-2">
        {loading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : (
          <MapView
            ref={mapRef}
            style={{ flex: 1 }}
            provider={PROVIDER_DEFAULT}
            initialRegion={{
              latitude: startLocation?.latitude || 10.762622,
              longitude: startLocation?.longitude || 106.660172,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05
            }}
            showsUserLocation={true}
            showsMyLocationButton={true}
            toolbarEnabled={false}
            showsCompass={true}
            zoomEnabled={true}
            scrollEnabled={true}
            rotateEnabled={true}
          >
            {getEndpoints}
            {getRoutePolyline}
          </MapView>
        )}
      </View>
      
      {/* Route summary */}
      {route && (
        <View className="mx-4 px-4 py-3 bg-card rounded-md shadow-sm">
          <Text className="text-lg font-bold text-text">
            {route.formattedDistance}
          </Text>
          <Text className="text-base text-textSecondary">
            {route.formattedDuration} qua {route.transportMode === 'driving' ? 'đường bộ' : route.transportMode === 'walking' ? 'đường đi bộ' : 'đường đạp xe'}
          </Text>
        </View>
      )}
      
      {/* Error message */}
      {routeError && (
        <View className="mx-4 mt-2 p-3 bg-errorLight rounded-md">
          <Text className="text-error">{routeError}</Text>
        </View>
      )}
      
      {/* Steps */}
      <View className="flex-1 mt-2 mx-4 bg-card p-4 rounded-md shadow-sm">
        <Text className="text-lg font-bold text-text mb-2">Chi tiết lộ trình</Text>
        
        {loading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text className="mt-2 text-textSecondary">Đang tìm đường...</Text>
          </View>
        ) : route && route.legs && route.legs[0] && route.legs[0].steps ? (
          <FlatList
            data={route.legs[0].steps}
            renderItem={({ item, index }) => (
              <DirectionStep
                step={item}
                index={index}
                isLastStep={index === route.legs[0].steps.length - 1}
                getManeuverIcon={getManeuverIcon}
                getInstructionText={getInstructionText}
              />
            )}
            keyExtractor={(item, index) => `step-${index}`}
            showsVerticalScrollIndicator={true}
          />
        ) : (
          <View className="flex-1 justify-center items-center">
            <Ionicons name="information-circle-outline" size={36} color={theme.colors.grey} />
            <Text className="mt-2 text-textSecondary text-center">
              {routeError || 'Hướng dẫn chi tiết sẽ hiển thị ở đây khi tìm thấy đường đi.'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
} 