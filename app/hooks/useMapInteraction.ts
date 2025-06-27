import { useCallback, useRef, useState } from 'react';
import { MapType } from 'react-native-maps';
import { CompassMode } from '../types/map.types';

export const useMapInteraction = (mapRef: React.RefObject<any>) => {
  const [compassMode, setCompassMode] = useState<CompassMode>('off');
  const [mapType, setMapType] = useState<MapType>('standard');
  const [currentHeading, setCurrentHeading] = useState(0);
  
  // Animation ref để tránh tạo animation mới khi đang có animation
  const animationInProgressRef = useRef(false);
  
  // Zoom in và out
  const handleZoomIn = useCallback(() => {
    mapRef.current?.getCamera().then((camera) => {
      if (camera.zoom) {
        camera.zoom += 1;
        mapRef.current?.animateCamera(camera, { duration: 300 });
      }
    });
  }, [mapRef]);

  const handleZoomOut = useCallback(() => {
    mapRef.current?.getCamera().then((camera) => {
      if (camera.zoom) {
        camera.zoom -= 1;
        mapRef.current?.animateCamera(camera, { duration: 300 });
      }
    });
  }, [mapRef]);

  // Nút chuyển đổi chế độ theo dõi hướng
  const toggleCompassMode = useCallback(() => {
    // Xoay qua các chế độ: off -> follow -> rotate -> off
    const modes: CompassMode[] = ['off', 'follow', 'rotate'];
    const currentIndex = modes.indexOf(compassMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    const newMode = modes[nextIndex];
    
    setCompassMode(newMode);
  }, [compassMode]);

  // Thêm hàm để cập nhật vị trí người dùng mà không cần animation
  const centerMapOnUser = useCallback((location: any, getCurrentHeading: () => number) => {
    if (location) {
      mapRef.current?.animateCamera({
        center: {
          latitude: location.latitude,
          longitude: location.longitude
        },
        heading: compassMode === 'rotate' ? getCurrentHeading() : 0,
        zoom: compassMode !== 'off' ? 18 : 16,
        pitch: 0
      }, { duration: 300 });
    }
  }, [mapRef, compassMode]);

  // Chuyển đổi kiểu bản đồ
  const toggleMapType = useCallback(() => {
    // Chuyển đổi giữa các kiểu bản đồ: standard, satellite, hybrid
    const mapTypes: MapType[] = ['standard', 'satellite', 'hybrid'];
    const currentIndex = mapTypes.indexOf(mapType);
    const nextIndex = (currentIndex + 1) % mapTypes.length;
    setMapType(mapTypes[nextIndex]);
  }, [mapType]);

  return {
    compassMode,
    setCompassMode,
    mapType,
    currentHeading,
    setCurrentHeading,
    animationInProgressRef,
    handleZoomIn,
    handleZoomOut,
    toggleCompassMode,
    centerMapOnUser,
    toggleMapType
  };
}; 