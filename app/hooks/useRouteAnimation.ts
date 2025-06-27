import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';
import { RouteType } from '../types/map.types';

/**
 * Hook quản lý animation cho đường đi
 * @param route Dữ liệu đường đi
 * @returns Giá trị animation và hàm điều khiển
 */
export const useRouteAnimation = (route: RouteType | null) => {
  // Animation progress từ 0-1
  const animatedValue = useRef(new Animated.Value(0)).current;
  // Số điểm hiển thị trên đường đi (0-100%)
  const [visiblePointsPercentage, setVisiblePointsPercentage] = useState(0);
  // Trạng thái animation
  const [isAnimating, setIsAnimating] = useState(false);
  // Animation đang chạy
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  // Cập nhật số điểm hiển thị khi animation thay đổi
  useEffect(() => {
    const listener = animatedValue.addListener(({ value }) => {
      // Chuyển đổi giá trị animation (0-1) thành phần trăm (0-100)
      setVisiblePointsPercentage(Math.floor(value * 100));
    });

    return () => {
      animatedValue.removeListener(listener);
    };
  }, [animatedValue]);

  // Bắt đầu animation khi có đường đi mới
  useEffect(() => {
    if (route) {
      startAnimation();
    } else {
      // Reset animation khi không có đường đi
      resetAnimation();
    }

    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
      }
    };
  }, [route]);

  // Bắt đầu animation
  const startAnimation = useCallback(() => {
    // Dừng animation đang chạy nếu có
    if (animationRef.current) {
      animationRef.current.stop();
    }

    // Reset giá trị animation về 0
    animatedValue.setValue(0);
    setIsAnimating(true);

    // Tạo animation mới
    animationRef.current = Animated.timing(animatedValue, {
      toValue: 1,
      duration: 1500, // 1.5 giây
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });

    // Bắt đầu animation
    animationRef.current.start(({ finished }) => {
      if (finished) {
        setIsAnimating(false);
      }
    });
  }, [animatedValue]);

  // Reset animation
  const resetAnimation = useCallback(() => {
    if (animationRef.current) {
      animationRef.current.stop();
    }
    animatedValue.setValue(0);
    setVisiblePointsPercentage(0);
    setIsAnimating(false);
  }, [animatedValue]);

  // Tính toán số điểm hiển thị dựa trên phần trăm
  const getVisibleCoordinates = useCallback(() => {
    if (!route || !route.geometry || !route.geometry.coordinates) {
      return [];
    }

    const allCoords = route.geometry.coordinates;
    const totalPoints = allCoords.length;
    
    // Số điểm hiển thị dựa trên phần trăm
    const visiblePoints = Math.max(1, Math.floor(totalPoints * visiblePointsPercentage / 100));
    
    // Trả về mảng các điểm hiển thị
    return allCoords.slice(0, visiblePoints);
  }, [route, visiblePointsPercentage]);

  return {
    visiblePointsPercentage,
    isAnimating,
    animatedValue,
    startAnimation,
    resetAnimation,
    getVisibleCoordinates
  };
}; 