import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getAddressFromCoordinates, getCurrentLocation as getLocationFromService } from '../services/locationService';

/**
 * Hook quản lý vị trí và địa chỉ người dùng
 * @returns {Object} Vị trí, địa chỉ và các hàm liên quan
 */
const useLocation = () => {
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [watchId, setWatchId] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  
  // Sử dụng useRef để theo dõi lần gọi API cuối cùng
  const lastAddressRequestRef = useRef(null);
  const addressTimeoutRef = useRef(null);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 3000; // 3 giây
  const ADDRESS_DEBOUNCE = 5000; // 5 giây

  /**
   * Lấy vị trí hiện tại
   */
  const getCurrentLocation = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const currentLocation = await getLocationFromService();
      
      if (currentLocation) {
        setLocation(currentLocation);
        getAddressWithDebounce(currentLocation.latitude, currentLocation.longitude);
      }
    } catch (err) {
      console.error('Error getting current location:', err);
      setError('Không thể lấy vị trí hiện tại. Vui lòng kiểm tra quyền truy cập và kết nối mạng.');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Lấy địa chỉ từ tọa độ với debounce để tránh gọi API quá nhiều
   */
  const getAddressWithDebounce = useCallback((latitude, longitude) => {
    // Hủy timeout trước đó nếu có
    if (addressTimeoutRef.current) {
      clearTimeout(addressTimeoutRef.current);
    }
    
    // Tạo key cho request hiện tại
    const requestKey = `${latitude},${longitude}`;
    
    // Nếu đã gọi API với tọa độ này gần đây, không gọi lại
    if (lastAddressRequestRef.current === requestKey) {
      return;
    }
    
    // Đặt timeout để gọi API sau một khoảng thời gian
    addressTimeoutRef.current = setTimeout(async () => {
      try {
        lastAddressRequestRef.current = requestKey;
        const result = await getAddressFromCoordinates(latitude, longitude);
        
        if (result && result !== 'Không thể lấy địa chỉ') {
          setAddress(result);
          retryCountRef.current = 0; // Reset retry counter on success
        } else if (retryCountRef.current < MAX_RETRIES) {
          // Thử lại nếu chưa đạt số lần tối đa
          retryCountRef.current++;
          setTimeout(() => {
            getAddressWithDebounce(latitude, longitude);
          }, RETRY_DELAY);
        }
      } catch (err) {
        console.error('Error getting address:', err);
      }
    }, ADDRESS_DEBOUNCE);
  }, []);

  /**
   * Bắt đầu theo dõi vị trí
   */
  const startLocationTracking = useCallback(async () => {
    try {
      // Kiểm tra quyền truy cập vị trí
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setError('Quyền truy cập vị trí bị từ chối');
        return;
      }
      
      // Bắt đầu theo dõi vị trí
      const id = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000,
          distanceInterval: 10
        },
        (newLocation) => {
          const currentLocation = {
            latitude: newLocation.coords.latitude,
            longitude: newLocation.coords.longitude,
            timestamp: newLocation.timestamp
          };
          
          setLocation(currentLocation);
          
          // Chỉ cập nhật địa chỉ nếu vị trí thay đổi đáng kể (> 50m)
          if (!location || calculateDistance(location, currentLocation) > 0.05) {
            getAddressWithDebounce(currentLocation.latitude, currentLocation.longitude);
          }
        }
      );
      
      setWatchId(id);
      setIsTracking(true);
      
    } catch (err) {
      console.error('Error starting location tracking:', err);
      setError('Không thể theo dõi vị trí. Vui lòng kiểm tra quyền truy cập và kết nối mạng.');
    }
  }, [location, getAddressWithDebounce]);

  /**
   * Dừng theo dõi vị trí
   */
  const stopLocationTracking = useCallback(() => {
    if (watchId) {
      watchId.remove();
      setWatchId(null);
      setIsTracking(false);
    }
  }, [watchId]);

  /**
   * Tính khoảng cách giữa hai vị trí
   */
  const calculateDistance = (point1, point2) => {
    if (!point1 || !point2) return 0;
    
    const R = 6371; // Bán kính trái đất tính bằng km
    const dLat = deg2rad(point2.latitude - point1.latitude);
    const dLon = deg2rad(point2.longitude - point1.longitude);
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(point1.latitude)) * Math.cos(deg2rad(point2.latitude)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  /**
   * Chuyển đổi độ sang radian
   */
  const deg2rad = (deg) => {
    return deg * (Math.PI/180);
  };

  // Lấy vị trí hiện tại khi component mount
  useEffect(() => {
    getCurrentLocation();
    
    // Cleanup khi component unmount
    return () => {
      if (watchId) {
        watchId.remove();
      }
      
      if (addressTimeoutRef.current) {
        clearTimeout(addressTimeoutRef.current);
      }
    };
  }, []);

  return {
    location,
    address,
    loading,
    error,
    isTracking,
    getCurrentLocation,
    startLocationTracking,
    stopLocationTracking
  };
};

export default useLocation; 