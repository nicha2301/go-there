import React from 'react';
import { Polyline } from 'react-native-maps';
import { getTheme } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { useRouteAnimation } from '../../hooks/useRouteAnimation';
import { RouteType } from '../../types/map.types';

interface AnimatedRouteProps {
  route: RouteType | null;
  strokeWidth?: number;
  strokeColor?: string;
  lineCap?: 'butt' | 'round' | 'square';
  lineJoin?: 'bevel' | 'miter' | 'round';
}

/**
 * Component hiển thị đường đi với animation
 */
const AnimatedRoute: React.FC<AnimatedRouteProps> = ({
  route,
  strokeWidth = 5,
  strokeColor,
  lineCap = 'round',
  lineJoin = 'round'
}) => {
  const { theme } = useTheme();
  const currentTheme = getTheme(theme);
  
  // Sử dụng hook animation
  const { getVisibleCoordinates, isAnimating } = useRouteAnimation(route);
  
  // Lấy màu sắc từ theme nếu không được cung cấp
  const finalStrokeColor = strokeColor || currentTheme.colors.primary;
  
  // Lấy danh sách tọa độ hiển thị
  const visibleCoordinates = getVisibleCoordinates();
  
  // Không hiển thị gì nếu không có đường đi
  if (!route || !route.geometry || !route.geometry.coordinates || route.geometry.coordinates.length === 0) {
    return null;
  }

  return (
    <>
      {/* Polyline hiển thị đường đi với animation */}
      <Polyline
        coordinates={visibleCoordinates.map(coord => ({
          latitude: coord[1],
          longitude: coord[0]
        }))}
        strokeWidth={strokeWidth}
        strokeColor={finalStrokeColor}
        lineCap={lineCap}
        lineJoin={lineJoin}
      />
      
      {/* Hiển thị điểm đích với opacity thấp khi đang animation */}
      {isAnimating && route.geometry.coordinates.length > 0 && (
        <Polyline
          coordinates={route.geometry.coordinates.map(coord => ({
            latitude: coord[1],
            longitude: coord[0]
          }))}
          strokeWidth={strokeWidth}
          strokeColor={`${finalStrokeColor}40`} // Thêm 40 (25% opacity) vào màu
          lineCap={lineCap}
          lineJoin={lineJoin}
        />
      )}
    </>
  );
};

export default AnimatedRoute; 