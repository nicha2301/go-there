import { useCallback, useState } from 'react';
import { Coordinates, Place } from '../types/map.types';

export const useMapRoute = (
  mapRef: React.RefObject<any>,
  getRoute: (start: Coordinates, end: Coordinates, mode: string) => Promise<any>,
  reverseGeocode: (coords: Coordinates) => Promise<Place | null>,
  savePlaceToHistory: (place: Place) => Promise<boolean>
) => {
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [markerCoords, setMarkerCoords] = useState<Coordinates | null>(null);
  const [transportMode, setTransportMode] = useState<string>('driving');
  const [showBackButton, setShowBackButton] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [isLoadingReverseGeocode, setIsLoadingReverseGeocode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [startPlaceName, setStartPlaceName] = useState<string>('');
  const [endPlaceName, setEndPlaceName] = useState<string>('');
  const [showDirectionsUI, setShowDirectionsUI] = useState(false);

  // Hàm tìm đường
  const findRoute = useCallback(async (start: Coordinates, end: Coordinates, mode: string) => {
    try {
      setIsLoading(true);
      setRouteError(null);
      
      const routeData = await getRoute(start, end, mode);
      
      if (routeData) {
        // Zoom đến khu vực hiển thị đường đi
        setTimeout(() => {
          if (mapRef.current) {
            mapRef.current.fitToCoordinates(
              [
                { latitude: start.latitude, longitude: start.longitude },
                { latitude: end.latitude, longitude: end.longitude }
              ],
              {
                edgePadding: { top: 70, right: 70, bottom: 200, left: 70 },
                animated: true
              }
            );
          }
        }, 200);
      }

      return routeData;
    } catch (error) {
      console.error('Error finding route:', error);
      setRouteError('Không thể tìm đường đi. Vui lòng thử lại sau.');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [mapRef, getRoute]);

  // Xử lý khi chọn một địa điểm
  const handleSelectPlace = useCallback(async (place: Place, location: Coordinates | null) => {
    try {
      // Lưu địa điểm vào lịch sử
      await savePlaceToHistory(place);
      
      // Thiết lập địa điểm đã chọn
      setSelectedPlace(place);
      setMarkerCoords({
        latitude: place.latitude,
        longitude: place.longitude
      });
      setEndPlaceName(place.name);
      setShowBackButton(true);
      setShowDirectionsUI(true);
      
      // Nếu có vị trí hiện tại, tìm đường
      if (location) {
        findRoute(
          { latitude: location.latitude, longitude: location.longitude },
          { latitude: place.latitude, longitude: place.longitude },
          transportMode
        );
      }

      return true;
    } catch (error) {
      console.error('Error selecting place:', error);
      return false;
    }
  }, [findRoute, savePlaceToHistory, transportMode]);

  // Xử lý khi chọn phương tiện di chuyển
  const handleTransportModeChange = useCallback((mode: string, location: Coordinates | null) => {
    if (mode !== transportMode) {
      setTransportMode(mode);
      
      // Nếu đã có điểm đi và điểm đến, tìm đường lại với phương tiện mới
      if (location && selectedPlace) {
        findRoute(
          { latitude: location.latitude, longitude: location.longitude },
          { latitude: selectedPlace.latitude, longitude: selectedPlace.longitude },
          mode
        );
      }
    }
  }, [transportMode, selectedPlace, findRoute]);

  // Xử lý khi nhấp vào bản đồ
  const handleMapPress = useCallback(async (coords: Coordinates, location: Coordinates | null) => {
    setMarkerCoords(coords);
    
    // Hiển thị loading indicator tại vị trí được chọn
    setIsLoadingReverseGeocode(true);
    
    try {
      const place = await reverseGeocode(coords);
      if (place) {
        setSelectedPlace(place);
        setEndPlaceName(place.name);
        setShowDirectionsUI(true);
        
        // Nếu có vị trí hiện tại, tìm đường
        if (location) {
          findRoute(
            { latitude: location.latitude, longitude: location.longitude },
            { latitude: place.latitude, longitude: place.longitude },
            transportMode
          );
        }
      }
    } catch (error) {
      console.error('Error in map press:', error);
    } finally {
      setIsLoadingReverseGeocode(false);
    }
  }, [findRoute, reverseGeocode, transportMode]);

  // Xử lý khi nhấn nút quay lại
  const handleBackPress = useCallback((clearRoute: () => void) => {
    setShowDirectionsUI(false);
    setSelectedPlace(null);
    setMarkerCoords(null);
    setEndPlaceName('');
    setShowBackButton(false);
    clearRoute();
  }, []);

  return {
    selectedPlace,
    markerCoords,
    transportMode,
    showBackButton,
    routeError,
    isLoadingReverseGeocode,
    isLoading,
    startPlaceName,
    setStartPlaceName,
    endPlaceName,
    showDirectionsUI,
    findRoute,
    handleSelectPlace,
    handleTransportModeChange,
    handleMapPress,
    handleBackPress
  };
}; 