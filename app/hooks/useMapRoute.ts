import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { Coordinates, RouteType } from '../types/map.types';

export const useMapRoute = () => {
  const [route, setRoute] = useState<RouteType | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [routeDistance, setRouteDistance] = useState<number | null>(null);
  const [routeDuration, setRouteDuration] = useState<number | null>(null);

  /**
   * Tìm đường đi từ điểm bắt đầu đến điểm kết thúc
   */
  const findRoute = useCallback(async (
    getRoute: (start: Coordinates, end: Coordinates) => Promise<RouteType | null>,
    startCoords: Coordinates, 
    endCoords: Coordinates
  ) => {
    try {
      setIsLoadingRoute(true);
      
      // Reset route trước khi tìm đường mới để kích hoạt animation
      setRoute(null);

      const routeResult = await getRoute(startCoords, endCoords);
      
      if (routeResult) {
        setRoute(routeResult);
        
        // Lưu thông tin khoảng cách và thời gian
        if (routeResult.properties && routeResult.properties.segments && routeResult.properties.segments.length > 0) {
          const segment = routeResult.properties.segments[0];
          setRouteDistance(segment.distance);
          setRouteDuration(segment.duration);
        }
        
        return routeResult;
      }
      
      return null;
    } catch (error) {
      console.error('Error finding route:', error);
      Alert.alert('Lỗi', 'Không thể tìm đường đi. Vui lòng thử lại sau.');
      return null;
    } finally {
      setIsLoadingRoute(false);
    }
  }, []);

  /**
   * Xóa đường đi hiện tại
   */
  const clearRoute = useCallback(() => {
    setRoute(null);
    setRouteDistance(null);
    setRouteDuration(null);
  }, []);

  return {
    route,
    isLoadingRoute,
    routeDistance,
    routeDuration,
    findRoute,
    clearRoute,
  };
}; 