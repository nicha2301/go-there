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
  const [headingWatchId, setHeadingWatchId] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  
  // Sử dụng useRef để lưu trữ heading thay vì state để tránh render lại
  const headingRef = useRef(0);
  
  // Sử dụng useRef để theo dõi lần gọi API cuối cùng
  const lastAddressRequestRef = useRef(null);
  const addressTimeoutRef = useRef(null);
  const retryCountRef = useRef(0);
  const lastLocationUpdateRef = useRef(null);
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 3000; // 3 giây
  const ADDRESS_DEBOUNCE = 5000; // 5 giây
  const LOCATION_UPDATE_THRESHOLD = 20; // Chỉ cập nhật nếu di chuyển hơn 20m

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
   * Lấy heading hiện tại (không gây render lại)
   */
  const getCurrentHeading = useCallback(() => {
    return headingRef.current;
  }, []);

  /**
   * Bắt đầu theo dõi hướng (heading) với tần suất cao
   */
  const startHeadingTracking = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        return;
      }
      
      // Thiết lập tần suất cập nhật cao hơn cho heading
      const headingId = await Location.watchHeadingAsync((headingData) => {
        // Cập nhật headingRef với giá trị mới
        const newHeading = headingData.magHeading || headingData.trueHeading;
        if (newHeading !== null && !isNaN(newHeading)) {
          headingRef.current = newHeading;
        }
      });
      
      setHeadingWatchId(headingId);
    } catch (err) {
      console.error('Error starting heading tracking:', err);
    }
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
      
      // Bắt đầu theo dõi vị trí với tần suất hợp lý
      const id = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000,  // Cập nhật mỗi 1 giây
          distanceInterval: LOCATION_UPDATE_THRESHOLD  // Chỉ cập nhật nếu di chuyển hơn 20m
        },
        (newLocation) => {
          const currentLocation = {
            latitude: newLocation.coords.latitude,
            longitude: newLocation.coords.longitude,
            timestamp: newLocation.timestamp,
            accuracy: newLocation.coords.accuracy,
            speed: newLocation.coords.speed,
            heading: newLocation.coords.heading
          };
          
          // Chỉ cập nhật state nếu vị trí thay đổi đáng kể
          if (!lastLocationUpdateRef.current || 
              calculateDistance(
                lastLocationUpdateRef.current, 
                currentLocation
              ) > LOCATION_UPDATE_THRESHOLD / 1000) {
            
            setLocation(currentLocation);
            lastLocationUpdateRef.current = currentLocation;
            
            // Chỉ cập nhật địa chỉ nếu vị trí thay đổi đáng kể (> 50m)
            if (!location || calculateDistance(location, currentLocation) > 0.05) {
              getAddressWithDebounce(currentLocation.latitude, currentLocation.longitude);
            }
          }
          
          // Cập nhật heading từ location nếu có và cảm biến từ trường không khả dụng
          if (newLocation.coords.heading !== null && !isNaN(newLocation.coords.heading)) {
            headingRef.current = newLocation.coords.heading;
          }
        }
      );
      
      setWatchId(id);
      setIsTracking(true);
      
      // Bắt đầu theo dõi hướng riêng biệt
      startHeadingTracking();
      
    } catch (err) {
      console.error('Error starting location tracking:', err);
      setError('Không thể theo dõi vị trí. Vui lòng kiểm tra quyền truy cập và kết nối mạng.');
    }
  }, [location, getAddressWithDebounce, startHeadingTracking]);

  /**
   * Dừng theo dõi vị trí
   */
  const stopLocationTracking = useCallback(() => {
    if (watchId) {
      watchId.remove();
      setWatchId(null);
    }
    
    if (headingWatchId) {
      headingWatchId.remove();
      setHeadingWatchId(null);
    }
    
    setIsTracking(false);
  }, [watchId, headingWatchId]);

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
      
      if (headingWatchId) {
        headingWatchId.remove();
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
    stopLocationTracking,
    getCurrentHeading,
    getAddressFromCoordinates
  };
};

export default useLocation; 