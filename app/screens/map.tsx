import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { WebView } from 'react-native-webview';
import { BORDER_RADIUS, COLORS, SHADOW, SPACING } from '../constants/theme';

const { width, height } = Dimensions.get('window');
const BOTTOM_SHEET_HEIGHT = 180;

export default function MapScreen() {
  const router = useRouter();
  const webViewRef = useRef(null);
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [nearbyPlaces, setNearbyPlaces] = useState([
    { id: '1', name: 'Nhà hàng ABC', distance: '1.2 km', category: 'restaurant' },
    { id: '2', name: 'Quán cà phê XYZ', distance: '0.8 km', category: 'cafe' },
    { id: '3', name: 'ATM VPBank', distance: '0.5 km', category: 'atm' },
  ]);

  const bottomSheetAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Quyền truy cập vị trí bị từ chối!');
        setIsLoading(false);
        return;
      }
      
      try {
        const location = await Location.getCurrentPositionAsync({});
        setLocation(location);
      } catch (error) {
        setErrorMsg('Không thể xác định vị trí của bạn.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Tạo HTML để hiển thị bản đồ OpenStreetMap
  const getMapHtml = () => {
    let lat = 10.762622;
    let lng = 106.660172;
    
    if (location) {
      lat = location.coords.latitude;
      lng = location.coords.longitude;
    }
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
          <script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
          <style>
            body, html, #map { height: 100%; margin: 0; padding: 0; }
            .marker-pulse {
              border-radius: 50%;
              height: 14px;
              width: 14px;
              position: absolute;
              left: 50%;
              top: 50%;
              margin: -7px 0 0 -7px;
              background: ${COLORS.primary};
              opacity: 1;
              border: 2px solid white;
              box-shadow: 0 0 8px rgba(0, 0, 0, 0.3);
            }
            .marker-pulse:after {
              content: "";
              border-radius: 50%;
              height: 40px;
              width: 40px;
              position: absolute;
              margin: -13px 0 0 -13px;
              animation: pulsate 1.5s ease-out;
              animation-iteration-count: infinite;
              opacity: 0.0;
              box-shadow: 0 0 6px ${COLORS.primary}, 0 0 6px ${COLORS.primary};
              background: ${COLORS.primary};
            }
            @keyframes pulsate {
              0% { transform: scale(0.2); opacity: 0.0; }
              50% { opacity: 0.5; }
              100% { transform: scale(1.0); opacity: 0.0; }
            }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script>
            var map = L.map('map').setView([${lat}, ${lng}], 15);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '© OpenStreetMap contributors'
            }).addTo(map);
            
            // Đánh dấu vị trí hiện tại
            var pulsingIcon = L.divIcon({
              className: 'marker-pulse',
              iconSize: [20, 20],
              iconAnchor: [10, 10]
            });
            
            var marker = L.marker([${lat}, ${lng}], {icon: pulsingIcon}).addTo(map);
            
            // Xử lý sự kiện từ React Native
            window.handleMessage = function(message) {
              const data = JSON.parse(message);
              if (data.type === 'setCenter') {
                map.setView([data.lat, data.lng], data.zoom || 15);
              } else if (data.type === 'addMarker') {
                L.marker([data.lat, data.lng])
                  .addTo(map)
                  .bindPopup(data.title || 'Địa điểm');
              }
            };
          </script>
        </body>
      </html>
    `;
  };

  // Hàm gửi thông điệp đến WebView
  const sendMessageToWebView = (message) => {
    webViewRef.current?.injectJavaScript(`
      window.handleMessage('${JSON.stringify(message)}');
      true;
    `);
  };

  // Trung tâm lại bản đồ ở vị trí hiện tại
  const centerToCurrentLocation = () => {
    if (location) {
      sendMessageToWebView({
        type: 'setCenter',
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        zoom: 18
      });
    }
  };

  const toggleBottomSheet = () => {
    Animated.timing(bottomSheetAnim, {
      toValue: bottomSheetAnim._value === 0 ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  const translateY = bottomSheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [BOTTOM_SHEET_HEIGHT - 40, 0],
  });

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Map */}
      <View style={styles.mapContainer}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Đang tải bản đồ...</Text>
          </View>
        ) : errorMsg ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={COLORS.error} />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : (
          <WebView
            ref={webViewRef}
            originWhitelist={['*']}
            source={{ html: getMapHtml() }}
            style={styles.map}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            scalesPageToFit={true}
          />
        )}
      </View>
      
      {/* Search bar overlay */}
      <View style={styles.searchOverlay}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.darkText} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.searchBar}
          onPress={() => router.push('/screens/search')}
        >
          <Ionicons name="search" size={18} color={COLORS.grayText} />
          <Text style={styles.searchText}>Tìm địa điểm...</Text>
        </TouchableOpacity>
      </View>
      
      {/* Map controls */}
      <View style={styles.mapControls}>
        <TouchableOpacity 
          style={styles.mapControlButton}
          onPress={centerToCurrentLocation}
        >
          <Ionicons name="locate" size={22} color={COLORS.darkText} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.mapControlButton}
          onPress={toggleBottomSheet}
        >
          <Ionicons name="layers-outline" size={22} color={COLORS.darkText} />
        </TouchableOpacity>
      </View>
      
      {/* Bottom sheet with nearby places */}
      <Animated.View 
        style={[
          styles.bottomSheet,
          { transform: [{ translateY }] }
        ]}
      >
        <TouchableOpacity 
          style={styles.bottomSheetHandle}
          onPress={toggleBottomSheet}
        >
          <View style={styles.handle} />
        </TouchableOpacity>
        
        <Text style={styles.bottomSheetTitle}>Địa điểm gần đây</Text>
        
        <View style={styles.placesList}>
          {nearbyPlaces.map(place => (
            <TouchableOpacity 
              key={place.id}
              style={styles.placeItem}
              onPress={() => {
                // Navigate to place details or show on map
              }}
            >
              <View style={styles.placeIconContainer}>
                <Ionicons 
                  name={
                    place.category === 'restaurant' ? 'restaurant-outline' :
                    place.category === 'cafe' ? 'cafe-outline' : 'card-outline'
                  }
                  size={20} 
                  color={COLORS.primary} 
                />
              </View>
              <View style={styles.placeInfo}>
                <Text style={styles.placeName}>{place.name}</Text>
                <Text style={styles.placeDistance}>{place.distance}</Text>
              </View>
              <TouchableOpacity style={styles.directionButton}>
                <Ionicons name="navigate-outline" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
      
      {/* FAB */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => router.push('/screens/search')}
      >
        <Ionicons name="add" size={26} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: SPACING.medium,
    color: COLORS.text,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: SPACING.large,
  },
  errorText: {
    marginTop: SPACING.medium,
    color: COLORS.error,
    textAlign: 'center',
  },
  searchOverlay: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.medium,
    gap: SPACING.small,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.medium,
  },
  searchBar: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.large,
    paddingVertical: SPACING.small,
    paddingHorizontal: SPACING.medium,
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOW.medium,
  },
  searchText: {
    color: COLORS.grayText,
    marginLeft: SPACING.small,
    fontSize: 15,
  },
  mapControls: {
    position: 'absolute',
    right: SPACING.medium,
    top: 120,
    gap: SPACING.small,
  },
  mapControlButton: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.medium,
  },
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -SPACING.medium,
    height: BOTTOM_SHEET_HEIGHT,
    backgroundColor: COLORS.background,
    borderTopLeftRadius: BORDER_RADIUS.large,
    borderTopRightRadius: BORDER_RADIUS.large,
    padding: SPACING.medium,
    ...SHADOW.large,
  },
  bottomSheetHandle: {
    alignItems: 'center',
    paddingVertical: SPACING.small,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
  },
  bottomSheetTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: SPACING.medium,
    color: COLORS.darkText,
  },
  placesList: {
    gap: SPACING.small,
  },
  placeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.small,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  placeIconContainer: {
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.medium,
    backgroundColor: COLORS.lightBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeInfo: {
    flex: 1,
    marginLeft: SPACING.medium,
  },
  placeName: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
  },
  placeDistance: {
    fontSize: 13,
    color: COLORS.grayText,
  },
  directionButton: {
    padding: SPACING.small,
  },
  fab: {
    position: 'absolute',
    right: SPACING.large,
    bottom: BOTTOM_SHEET_HEIGHT + SPACING.medium,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.medium,
  },
}); 