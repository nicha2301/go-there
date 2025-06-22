import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    FlatList,
    SafeAreaView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import theme from '../constants/theme';

// Icons cho các bước chỉ đường
const MANEUVER_ICONS = {
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

const RouteDirections = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  
  const [startLocation, setStartLocation] = useState(null);
  const [endLocation, setEndLocation] = useState(null);
  const [place, setPlace] = useState(null);
  const [route, setRoute] = useState(null);
  const [transportMode, setTransportMode] = useState('driving');
  
  // Lấy dữ liệu từ params
  useEffect(() => {
    if (params) {
      if (params.startLocation) {
        try {
          setStartLocation(
            typeof params.startLocation === 'string'
              ? JSON.parse(params.startLocation)
              : params.startLocation
          );
        } catch (error) {
          console.error('Error parsing start location:', error);
        }
      }
      
      if (params.endLocation) {
        try {
          setEndLocation(
            typeof params.endLocation === 'string'
              ? JSON.parse(params.endLocation)
              : params.endLocation
          );
        } catch (error) {
          console.error('Error parsing end location:', error);
        }
      }
      
      if (params.place) {
        try {
          setPlace(
            typeof params.place === 'string'
              ? JSON.parse(params.place)
              : params.place
          );
        } catch (error) {
          console.error('Error parsing place data:', error);
        }
      }
      
      if (params.route) {
        try {
          const routeData = JSON.parse(params.route);
          setRoute(routeData);
          
          if (routeData.transportMode) {
            setTransportMode(routeData.transportMode);
          }
        } catch (error) {
          console.error('Error parsing route data:', error);
        }
      }
    }
  }, [params]);
  
  // Hiển thị icon cho từng loại maneuver
  const getManeuverIcon = (maneuver) => {
    if (!maneuver || !maneuver.type) {
      return MANEUVER_ICONS.default;
    }
    
    return MANEUVER_ICONS[maneuver.type] || MANEUVER_ICONS.default;
  };
  
  // Tạo hướng dẫn cho từng bước
  const getInstructionText = (step, index) => {
    if (index === 0) {
      return 'Bắt đầu hành trình';
    }
    
    if (!step.maneuver || !step.maneuver.type) {
      return 'Tiếp tục hành trình';
    }
    
    switch (step.maneuver.type) {
      case 'straight':
        return 'Đi thẳng';
      case 'turn-right':
        return 'Rẽ phải';
      case 'turn-left':
        return 'Rẽ trái';
      case 'turn-slight-right':
        return 'Rẽ nhẹ phải';
      case 'turn-slight-left':
        return 'Rẽ nhẹ trái';
      case 'turn-sharp-right':
        return 'Rẽ gắt phải';
      case 'turn-sharp-left':
        return 'Rẽ gắt trái';
      case 'uturn-right':
        return 'Quay đầu bên phải';
      case 'uturn-left':
        return 'Quay đầu bên trái';
      case 'roundabout-right':
      case 'roundabout-left':
        return 'Đi vào vòng xuyến';
      case 'keep-right':
        return 'Giữ bên phải';
      case 'keep-left':
        return 'Giữ bên trái';
      case 'depart':
        return 'Xuất phát';
      case 'arrive':
        return 'Đã đến điểm đích';
      default:
        return 'Tiếp tục hành trình';
    }
  };
  
  // Chia sẻ thông tin lộ trình
  const shareRoute = async () => {
    if (!route) return;
    
    try {
      const { startPoint, endPoint, formattedDistance, formattedDuration } = route;
      
      const message = 
        `Chỉ đường từ:\n` +
        `- Điểm đầu: ${startPoint.latitude}, ${startPoint.longitude}\n` +
        `- Điểm cuối: ${endPoint.latitude}, ${endPoint.longitude}\n` +
        `- Khoảng cách: ${formattedDistance}\n` +
        `- Thời gian: ${formattedDuration}\n` +
        `Được chia sẻ từ ứng dụng Go There`;
      
      await Share.share({
        message,
        title: 'Thông tin chỉ đường'
      });
    } catch (error) {
      console.error('Error sharing route:', error);
    }
  };
  
  // Icon cho từng loại phương tiện
  const getTransportIcon = (mode) => {
    switch (mode) {
      case 'driving':
        return 'car';
      case 'walking':
        return 'walk';
      case 'cycling':
        return 'bicycle';
      default:
        return 'navigate';
    }
  };
  
  // Tên cho từng loại phương tiện
  const getTransportName = (mode) => {
    switch (mode) {
      case 'driving':
        return 'Lái xe';
      case 'walking':
        return 'Đi bộ';
      case 'cycling':
        return 'Đạp xe';
      default:
        return 'Điều hướng';
    }
  };
  
  // Nếu không có dữ liệu
  if (!route || !startLocation || !endLocation) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={styles.errorText}>Không có thông tin chỉ đường</Text>
        <TouchableOpacity
          style={styles.backToMapButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backToMapText}>Quay lại bản đồ</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chỉ đường</Text>
        <TouchableOpacity
          style={styles.shareButton}
          onPress={shareRoute}
        >
          <Ionicons name="share-outline" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {/* Bản đồ */}
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          provider={PROVIDER_DEFAULT}
          initialRegion={{
            latitude: (startLocation.latitude + endLocation.latitude) / 2,
            longitude: (startLocation.longitude + endLocation.longitude) / 2,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          scrollEnabled={false}
          zoomEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
        >
          {/* Điểm xuất phát */}
          <Marker coordinate={startLocation}>
            <View style={styles.startMarker}>
              <Ionicons name="locate" size={20} color="white" />
            </View>
          </Marker>

          {/* Điểm đến */}
          <Marker coordinate={endLocation}>
            <View style={styles.endMarker}>
              <Ionicons name="location" size={24} color={theme.colors.primary} />
            </View>
          </Marker>

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
      </View>

      {/* Thông tin hành trình */}
      <View style={styles.routeSummaryContainer}>
        <View style={styles.routeInfo}>
          <View style={styles.routeInfoItem}>
            <Ionicons name="time-outline" size={24} color={theme.colors.primary} />
            <Text style={styles.routeInfoText}>{route.formattedDuration}</Text>
          </View>
          <View style={styles.routeInfoDivider} />
          <View style={styles.routeInfoItem}>
            <Ionicons name="resize-outline" size={24} color={theme.colors.primary} />
            <Text style={styles.routeInfoText}>{route.formattedDistance}</Text>
          </View>
        </View>

        {/* Địa điểm */}
        <View style={styles.placeInfoContainer}>
          <View style={styles.locationRow}>
            <View style={styles.locationIconContainer}>
              <View style={styles.startDot} />
            </View>
            <Text style={styles.locationText}>Vị trí hiện tại</Text>
          </View>
          
          <View style={styles.locationLine} />
          
          <View style={styles.locationRow}>
            <View style={styles.locationIconContainer}>
              <View style={styles.endDot} />
            </View>
            <Text style={styles.locationText} numberOfLines={1}>{place?.name || 'Điểm đến'}</Text>
          </View>
        </View>
      </View>

      {/* Danh sách các bước chỉ đường */}
      <View style={styles.directionsContainer}>
        <Text style={styles.directionsTitle}>Các bước di chuyển</Text>
        
        <FlatList
          data={route.steps || []}
          keyExtractor={(item, index) => `step-${index}`}
          contentContainerStyle={styles.stepList}
          renderItem={({ item, index }) => (
            <View style={styles.stepItem}>
              <View style={styles.stepIconContainer}>
                <Ionicons 
                  name={getManeuverIcon(item.maneuver)} 
                  size={20} 
                  color={theme.colors.primary} 
                />
              </View>
              
              <View style={styles.stepDetails}>
                <Text style={styles.stepText}>
                  {getInstructionText(item, index)}
                </Text>
                {item.distance > 0 && (
                  <Text style={styles.stepDistance}>
                    {item.distance < 1000 
                      ? `${Math.round(item.distance)} m` 
                      : `${(item.distance / 1000).toFixed(1)} km`}
                  </Text>
                )}
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyStepsContainer}>
              <Ionicons name="information-circle-outline" size={40} color={theme.colors.grey} />
              <Text style={styles.emptyStepsText}>
                Không có thông tin chi tiết cho lộ trình này
              </Text>
            </View>
          }
        />
      </View>
      
      {/* Nút bắt đầu điều hướng */}
      <TouchableOpacity 
        style={[styles.startButton, { marginBottom: insets.bottom + 16 }]}
        onPress={() => {
          // Trong thực tế, bắt đầu điều hướng real-time
          navigation.goBack();
        }}
      >
        <Text style={styles.startButtonText}>Bắt đầu điều hướng</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.circle,
    backgroundColor: theme.colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadow.small,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.error,
    marginBottom: 20,
  },
  backToMapButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.medium,
    ...theme.shadow.small,
  },
  backToMapText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  mapContainer: {
    height: 200,
    width: '100%',
    ...theme.shadow.small,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  startMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  endMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeSummaryContainer: {
    backgroundColor: theme.colors.card,
    paddingVertical: 16,
    paddingHorizontal: 20,
    ...theme.shadow.small,
  },
  routeInfo: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  routeInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeInfoDivider: {
    height: 24,
    width: 1,
    backgroundColor: theme.colors.border,
    marginHorizontal: 20,
  },
  routeInfoText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 6,
    color: theme.colors.text,
  },
  placeInfoContainer: {
    marginTop: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationIconContainer: {
    width: 20,
    alignItems: 'center',
  },
  startDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.accent,
  },
  endDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.primary,
  },
  locationLine: {
    width: 2,
    height: 20,
    backgroundColor: theme.colors.border,
    marginLeft: 9,
  },
  locationText: {
    marginLeft: 12,
    fontSize: 14,
    color: theme.colors.text,
  },
  directionsContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  directionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 12,
  },
  stepList: {
    paddingBottom: 90,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  stepIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.lightGrey,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepDetails: {
    flex: 1,
  },
  stepText: {
    fontSize: 15,
    color: theme.colors.text,
    marginBottom: 4,
  },
  stepDistance: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  emptyStepsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyStepsText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
  },
  startButton: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 16,
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: theme.radius.medium,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadow.medium,
  },
  startButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  shareButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center'
  },
});

export default RouteDirections; 