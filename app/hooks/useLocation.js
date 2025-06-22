import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { getAddressFromCoordinates, getCurrentLocation } from '../services/locationService';

const useLocation = () => {
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [watchId, setWatchId] = useState(null);

  // Lấy vị trí hiện tại một lần
  const fetchCurrentLocation = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const currentLocation = await getCurrentLocation();
      setLocation(currentLocation);
      
      // Lấy địa chỉ
      const currentAddress = await getAddressFromCoordinates(
        currentLocation.latitude, 
        currentLocation.longitude
      );
      setAddress(currentAddress);
      
      return currentLocation;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Theo dõi vị trí liên tục
  const startWatchingLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setError('Quyền truy cập vị trí bị từ chối');
        setLoading(false);
        return;
      }
      
      // Hủy theo dõi cũ nếu có
      if (watchId) {
        stopWatchingLocation();
      }
      
      // Bắt đầu theo dõi vị trí mới
      const id = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,  // 5 giây
          distanceInterval: 10, // 10 mét
        },
        (newLocation) => {
          const { latitude, longitude } = newLocation.coords;
          setLocation({
            latitude,
            longitude,
            timestamp: newLocation.timestamp
          });
          
          // Cập nhật địa chỉ không quá thường xuyên (tốn request)
          getAddressFromCoordinates(latitude, longitude)
            .then(address => setAddress(address))
            .catch(err => console.log('Error getting address:', err));
        }
      );
      
      setWatchId(id);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  // Dừng theo dõi vị trí
  const stopWatchingLocation = () => {
    if (watchId) {
      watchId.remove();
      setWatchId(null);
    }
  };

  // Hủy theo dõi khi component unmount
  useEffect(() => {
    return () => {
      stopWatchingLocation();
    };
  }, []);

  return {
    location,
    address,
    loading,
    error,
    fetchCurrentLocation,
    startWatchingLocation,
    stopWatchingLocation,
  };
};

export default useLocation; 