import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import theme from '../constants/theme';
import { useLocation } from '../hooks/useLocation';
import { useRoute } from '../hooks/useRoute';

const { width, height } = Dimensions.get('window');
const CARD_HEIGHT = 220;
const BOTTOM_SHEET_HEIGHT = 120;

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  
  const [mapReady, setMapReady] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [markerCoords, setMarkerCoords] = useState(null);
  const [transportMode, setTransportMode] = useState('driving');
  
  const mapRef = useRef(null);
  const slideAnim = useRef(new Animated.Value(BOTTOM_SHEET_HEIGHT)).current;
  
  const { location, loading: locationLoading, error: locationError, startWatchingLocation } = useLocation();
  const { route, loading: routeLoading, error: routeError, findRoute } = useRoute();
  
  const initialRegion = {
    latitude: 10.762622,  // Vị trí mặc định TP.HCM
    longitude: 106.660172,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  // Lấy vị trí ban đầu
  useEffect(() => {
    startWatchingLocation();
  }, []);

  // Zoom đến vị trí hiện tại khi có dữ liệu
  useEffect(() => {
    if (location && mapRef.current && mapReady) {
      setTimeout(() => {
        mapRef.current?.animateToRegion({
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }, 1000);
      }, 500);
    }
  }, [location, mapReady]);
  
  // Xử lý params nếu có
  useEffect(() => {
    const handleParams = async () => {
      // Hiển thị địa điểm được chọn từ màn hình tìm kiếm
      if (params?.place) {
        try {
          const place = typeof params.place === 'string' 
            ? JSON.parse(params.place)
            : params.place;
            
          setSelectedPlace(place);
          setMarkerCoords({
            latitude: place.latitude,
            longitude: place.longitude
          });
          
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
      }
    };
    
    handleParams();
  }, [params, location]);
  
  // Tìm đường với phương tiện khác
  const changeTransportMode = async (mode) => {
    setTransportMode(mode);
    
    if (location && selectedPlace) {
      await findRoute(
        { latitude: location.latitude, longitude: location.longitude },
        { latitude: selectedPlace.latitude, longitude: selectedPlace.longitude },
        mode
      );
    }
  };
  
  // Zoom bản đồ để hiển thị hai vị trí
  const zoomToTwoLocations = (loc1, loc2) => {
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
      navigation.navigate('RouteDirections', {
        startLocation: {
          latitude: location.latitude,
          longitude: location.longitude
        },
        endLocation: {
          latitude: selectedPlace.latitude,
          longitude: selectedPlace.longitude
        },
        place: selectedPlace,
        route: route
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

  return (
    <View style={styles.container}>
      {/* Bản đồ */}
      <MapView
        ref={mapRef}
        style={styles.map}
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
            <View style={styles.markerContainer}>
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

      {/* Nút back */}
      <TouchableOpacity 
        style={[styles.backButton, { top: insets.top + 10 }]} 
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
      </TouchableOpacity>

      {/* Nút vị trí hiện tại */}
      <TouchableOpacity 
        style={[styles.myLocationButton, { bottom: route ? 300 : BOTTOM_SHEET_HEIGHT + 20 }]}
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
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      )}
      
      {/* Bottom sheet info */}
      <Animated.View style={[styles.bottomSheet, { height: slideAnim }]}>
        {/* Handle để kéo mở bottom sheet */}
        <TouchableOpacity style={styles.sheetHandle} onPress={toggleBottomSheet}>
          <View style={styles.handle} />
        </TouchableOpacity>

        {/* Thông tin địa điểm */}
        {selectedPlace && (
          <View style={styles.placeInfo}>
            <Text style={styles.placeName}>{selectedPlace.name}</Text>
            <Text style={styles.placeAddress} numberOfLines={2}>
              {selectedPlace.address}
            </Text>
            
            {/* Thông tin lộ trình nếu có */}
            {route && (
              <View style={styles.routeInfo}>
                <View style={styles.routeStats}>
                  <View style={styles.routeStat}>
                    <Ionicons name="time-outline" size={18} color={theme.colors.primary} />
                    <Text style={styles.routeStatValue}>{route.formattedDuration}</Text>
                  </View>
                  <View style={styles.routeStat}>
                    <Ionicons name="resize-outline" size={18} color={theme.colors.primary} />
                    <Text style={styles.routeStatValue}>{route.formattedDistance}</Text>
                  </View>
                </View>
                
                {/* Các phương tiện giao thông */}
                <View style={styles.transportModes}>
                  <TouchableOpacity
                    style={[
                      styles.transportButton,
                      transportMode === 'driving' && styles.transportButtonActive
                    ]}
                    onPress={() => changeTransportMode('driving')}
                  >
                    <Ionicons 
                      name="car" 
                      size={20} 
                      color={transportMode === 'driving' ? 'white' : theme.colors.text} 
                    />
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.transportButton,
                      transportMode === 'walking' && styles.transportButtonActive
                    ]}
                    onPress={() => changeTransportMode('walking')}
                  >
                    <Ionicons 
                      name="walk" 
                      size={20} 
                      color={transportMode === 'walking' ? 'white' : theme.colors.text} 
                    />
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.transportButton,
                      transportMode === 'cycling' && styles.transportButtonActive
                    ]}
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
              style={styles.directionButton}
              onPress={navigateToDirections}
            >
              <Ionicons name="navigate" size={18} color="white" />
              <Text style={styles.directionButtonText}>Chỉ đường chi tiết</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  map: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    width: 40,
    height: 40,
    borderRadius: theme.radius.circle,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadow.medium,
  },
  myLocationButton: {
    position: 'absolute',
    right: 16,
    width: 46,
    height: 46,
    borderRadius: theme.radius.circle,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadow.medium,
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    ...theme.shadow.large,
  },
  sheetHandle: {
    alignItems: 'center',
    paddingBottom: 10,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: theme.colors.border,
  },
  placeInfo: {
    marginTop: 10,
  },
  placeName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  placeAddress: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  routeInfo: {
    marginTop: 15,
    padding: 12,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.medium,
  },
  routeStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  routeStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeStatValue: {
    marginLeft: 6,
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  transportModes: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  transportButton: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.circle,
    backgroundColor: theme.colors.lightGrey,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  transportButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  directionButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.medium,
    paddingVertical: 14,
    marginTop: 20,
    ...theme.shadow.small,
  },
  directionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
}); 