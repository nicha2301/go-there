import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Keyboard,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { GestureHandlerRootView, PanGestureHandler } from 'react-native-gesture-handler';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomSheetHeader from '../components/map/BottomSheetHeader';
import CompassIndicator from '../components/map/CompassIndicator';
import MapActionButtons from '../components/map/MapActionButtons';
import MapControls from '../components/map/MapControls';
import NavigationOverlay from '../components/map/NavigationOverlay';
import RouteDetails from '../components/map/RouteDetails';
import SearchResults from '../components/map/SearchResults';
import SearchBar from '../components/SearchBar';
import { getTheme } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { useBottomSheet } from '../hooks/useBottomSheet';
import useDebounce from '../hooks/useDebounce';
import useLocation from '../hooks/useLocation';
import { useMapInteraction } from '../hooks/useMapInteraction';
import { useMapNavigation } from '../hooks/useMapNavigation';
import { useMapRoute } from '../hooks/useMapRoute';
import { useMapSearch } from '../hooks/useMapSearch';
import usePlaces from '../hooks/usePlaces';
import useRoute from '../hooks/useRoute';
import { Coordinates, PlacesHook } from '../types/map.types';

const { width, height } = Dimensions.get('window');

const MapScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { theme } = useTheme();
  const currentTheme = useMemo(() => getTheme(theme), [theme]);
  
  const [mapReady, setMapReady] = useState(false);
  const hasZoomedToInitialLocation = useRef(false);
  const initialLocationRef = useRef(null);
  const initialParamsProcessed = useRef(false);
  const headingUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mapRef = useRef<MapView | null>(null);
  
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
    location: any;
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
  
  const { route, loading: routeLoading, error: routeApiError, getRoute, clearRoute } = useRoute() as {
    route: any;
    loading: boolean;
    error: string | null;
    getRoute: (start: Coordinates, end: Coordinates, mode: string) => Promise<any>;
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
      const addressText = await getAddressFromCoordinates(coords.latitude, coords.longitude);
      
      // Tạo đối tượng địa điểm từ tọa độ và địa chỉ
      const place = {
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
    }
  }, [getAddressFromCoordinates]);

  // Custom hooks
  const {
    compassMode,
    setCompassMode,
    mapType,
    currentHeading,
    setCurrentHeading,
    animationInProgressRef,
    handleZoomIn,
    handleZoomOut,
    toggleCompassMode,
    centerMapOnUser: centerMapOnUserBase,
    toggleMapType
  } = useMapInteraction(mapRef);

  const {
    searchQuery,
    setSearchQuery,
    showSearchResults,
    setShowSearchResults,
    localSearchResults,
    searchLoading,
    searchBarAnimation,
    historySlideAnimation,
    historyOpacityAnimation,
    performSearch,
    handleSearchFocus,
    handleSearch,
    handleCloseSearch
  } = useMapSearch(search, loadHistory, clearSearchResults, history);

  const {
    isBottomSheetExpanded,
    setIsBottomSheetExpanded,
    bottomSheetAnimation,
    panY,
    toggleBottomSheet,
    handleGesture,
    handleGestureStateChange,
    BOTTOM_SHEET_MIN_HEIGHT
  } = useBottomSheet();

  const {
    selectedPlace,
    markerCoords,
    transportMode,
    showBackButton,
    routeError,
    isLoadingReverseGeocode,
    isLoading,
    startPlaceName,
    setStartPlaceName,
    endPlaceName,
    showDirectionsUI,
    findRoute,
    handleSelectPlace: baseHandleSelectPlace,
    handleTransportModeChange: baseHandleTransportModeChange,
    handleMapPress,
    handleBackPress
  } = useMapRoute(mapRef, getRoute, reverseGeocode, savePlaceToHistory);

  const {
    isNavigating,
    currentStepIndex,
    distanceToNextStep,
    startNavigation: baseStartNavigation,
    updateNavigation,
    stopNavigation: baseStopNavigation
  } = useMapNavigation(mapRef, route, location, startLocationTracking, setCompassMode);

  // Áp dụng debounce cho searchQuery
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  
  // Lấy vị trí ban đầu - sửa lỗi vòng lặp vô hạn
  useEffect(() => {
    startLocationTracking();
    loadHistory();
    
    // Cleanup function
    return () => {
      stopLocationTracking();
      if (headingUpdateIntervalRef.current) {
        clearInterval(headingUpdateIntervalRef.current);
      }
    };
  }, []); // Chỉ chạy một lần khi component mount

  // Lưu vị trí đầu tiên
  useEffect(() => {
    if (location && !initialLocationRef.current) {
      initialLocationRef.current = location;
      // Cập nhật tên vị trí hiện tại
      setStartPlaceName('Vị trí hiện tại');
    }
  }, [location, setStartPlaceName]);

  // Tự động tìm kiếm khi debouncedSearchQuery thay đổi và có giá trị
  useEffect(() => {
    if (debouncedSearchQuery && debouncedSearchQuery.trim().length >= 2) {
      performSearch(debouncedSearchQuery, location);
    }
  }, [debouncedSearchQuery, location, performSearch]);

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
  }, [compassMode, location, getCurrentHeading, currentHeading, setCurrentHeading, animationInProgressRef]);

  // Theo dõi vị trí để cập nhật điều hướng
  useEffect(() => {
    if (isNavigating && location) {
      updateNavigation();
    }
  }, [isNavigating, location, updateNavigation]);

  // Wrapper functions
  const handleSelectPlace = useCallback((place: any) => {
    Keyboard.dismiss();
    return baseHandleSelectPlace(place, location);
  }, [baseHandleSelectPlace, location]);

  const handleTransportModeChange = useCallback((mode: string) => {
    baseHandleTransportModeChange(mode, location);
  }, [baseHandleTransportModeChange, location]);

  const centerMapOnUser = useCallback(() => {
    if (location) {
      centerMapOnUserBase(location, getCurrentHeading);
    } else {
      getCurrentLocation();
    }
  }, [location, centerMapOnUserBase, getCurrentHeading, getCurrentLocation]);

  const startNavigation = useCallback(() => {
    baseStartNavigation(bottomSheetAnimation, setIsBottomSheetExpanded);
  }, [baseStartNavigation, bottomSheetAnimation, setIsBottomSheetExpanded]);

  const stopNavigation = useCallback(() => {
    baseStopNavigation(bottomSheetAnimation, setIsBottomSheetExpanded);
  }, [baseStopNavigation, bottomSheetAnimation, setIsBottomSheetExpanded]);

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
              handleMapPress(e.nativeEvent.coordinate, location);
            }
          }}
          onLongPress={(e) => {
            // Xử lý nhấn giữ tương tự như nhấn thường
            if (!isNavigating) {
              handleMapPress(e.nativeEvent.coordinate, location);
            }
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
              coordinates={route.geometry.coordinates.map((coord: [number, number]) => ({
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
        <CompassIndicator compassMode={compassMode} currentHeading={currentHeading} />
        
        {/* Hiển thị chỉ dẫn lớn khi đang điều hướng */}
        <NavigationOverlay 
          isNavigating={isNavigating}
          route={route}
          currentStepIndex={currentStepIndex}
          distanceToNextStep={distanceToNextStep}
          stopNavigation={stopNavigation}
          insets={insets}
        />
        
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
            <SearchResults
              searchLoading={searchLoading}
              searchQuery={searchQuery}
              localSearchResults={localSearchResults}
              history={history}
              historySlideAnimation={historySlideAnimation}
              historyOpacityAnimation={historyOpacityAnimation}
              handleSelectPlace={handleSelectPlace}
              insets={insets}
            />
          </Animated.View>
        )}
        
        {/* Nút quay lại */}
        {showBackButton && (
          <TouchableOpacity 
            className="absolute top-12 left-4 p-2 rounded-full shadow-md z-10"
            onPress={() => handleBackPress(clearRoute)}
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
                  
                  <RouteDetails
                    route={route}
                    isLoading={isLoading}
                    routeLoading={routeLoading}
                    routeError={routeError}
                    isNavigating={isNavigating}
                    currentStepIndex={currentStepIndex}
                    distanceToNextStep={distanceToNextStep}
                    startNavigation={startNavigation}
                    stopNavigation={stopNavigation}
                  />
                </View>
              )}
            </Animated.View>
          </PanGestureHandler>
        )}
        
        {/* Các nút điều khiển bản đồ */}
        <MapActionButtons
          centerMapOnUser={centerMapOnUser}
          toggleCompassMode={toggleCompassMode}
          toggleMapType={toggleMapType}
          compassMode={compassMode}
          mapType={mapType}
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