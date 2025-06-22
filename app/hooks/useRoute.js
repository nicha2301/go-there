import { useState } from 'react';
import { formatDistance, formatDuration, getRoute } from '../services/routeService';

export const useRoute = () => {
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Tìm đường đi giữa hai điểm
  const findRoute = async (startPoint, endPoint, transportMode = 'driving') => {
    try {
      setLoading(true);
      setError(null);
      
      const routeData = await getRoute(startPoint, endPoint, transportMode);
      
      // Thêm thông tin định dạng đẹp
      const enhancedRoute = {
        ...routeData,
        formattedDistance: formatDistance(routeData.distance),
        formattedDuration: formatDuration(routeData.duration),
        startPoint,
        endPoint,
        transportMode
      };
      
      setRoute(enhancedRoute);
      return enhancedRoute;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  // Xóa đường đi hiện tại
  const clearRoute = () => {
    setRoute(null);
    setError(null);
  };
  
  // Đổi phương tiện di chuyển và tìm lại đường đi
  const changeTransportMode = async (transportMode) => {
    if (!route || !route.startPoint || !route.endPoint) {
      setError('Không có thông tin đường đi');
      return null;
    }
    
    return await findRoute(route.startPoint, route.endPoint, transportMode);
  };
  
  // Đảo ngược điểm đầu và điểm cuối
  const reverseRoute = async () => {
    if (!route || !route.startPoint || !route.endPoint) {
      setError('Không có thông tin đường đi');
      return null;
    }
    
    return await findRoute(route.endPoint, route.startPoint, route.transportMode);
  };
  
  return {
    route,
    loading,
    error,
    findRoute,
    clearRoute,
    changeTransportMode,
    reverseRoute
  };
}; 