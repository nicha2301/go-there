import { useCallback, useState } from 'react';
import { Animated, Easing } from 'react-native';
import { LocationType, RouteType } from '../types/map.types';

export const useMapNavigation = (
  mapRef: React.RefObject<any>,
  route: RouteType | null,
  location: LocationType | null,
  startLocationTracking: () => void,
  setCompassMode: (mode: 'off' | 'follow' | 'rotate') => void
) => {
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [distanceToNextStep, setDistanceToNextStep] = useState<number | null>(null);

  // Hàm bắt đầu điều hướng
  const startNavigation = useCallback((bottomSheetAnimation: Animated.Value, setIsBottomSheetExpanded: (value: boolean) => void) => {
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
      toValue: 150, // BOTTOM_SHEET_MIN_HEIGHT
      duration: 300,
      useNativeDriver: false,
      easing: Easing.out(Easing.ease)
    }).start();
    
    setIsBottomSheetExpanded(false);
    
    // Bắt đầu theo dõi vị trí để cập nhật điều hướng
    startLocationTracking();
  }, [route, location, mapRef, setCompassMode, startLocationTracking]);
  
  // Hàm cập nhật thông tin điều hướng dựa trên vị trí hiện tại
  const updateNavigation = useCallback(() => {
    if (!isNavigating || !route || !location || !route.legs || !route.legs[0]?.steps) return;
    
    // Lấy các bước trong lộ trình
    const steps = route.legs[0].steps;
    
    if (currentStepIndex >= steps.length) {
      // Đã hoàn thành lộ trình
      setIsNavigating(false);
      alert('Hoàn thành! Bạn đã đến điểm đến!');
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
  
  // Hàm dừng điều hướng
  const stopNavigation = useCallback((bottomSheetAnimation: Animated.Value, setIsBottomSheetExpanded: (value: boolean) => void) => {
    setIsNavigating(false);
    setCompassMode('off');
    
    // Hạ bottom sheet xuống
    Animated.timing(bottomSheetAnimation, {
      toValue: 150, // BOTTOM_SHEET_MIN_HEIGHT
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
  }, [mapRef, route, setCompassMode]);

  return {
    isNavigating,
    currentStepIndex,
    distanceToNextStep,
    startNavigation,
    updateNavigation,
    stopNavigation
  };
}; 