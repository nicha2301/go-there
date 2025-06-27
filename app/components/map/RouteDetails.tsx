import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from 'react-native';
import { getTheme } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { RouteType } from '../../types/map.types';

interface RouteDetailsProps {
  route: RouteType | null;
  isLoading: boolean;
  routeLoading: boolean;
  routeError: string | null;
  isNavigating: boolean;
  currentStepIndex: number;
  distanceToNextStep: number | null;
  startNavigation: () => void;
  stopNavigation: () => void;
}

const RouteDetails: React.FC<RouteDetailsProps> = ({
  route,
  isLoading,
  routeLoading,
  routeError,
  isNavigating,
  currentStepIndex,
  distanceToNextStep,
  startNavigation,
  stopNavigation
}) => {
  const { theme } = useTheme();
  const currentTheme = getTheme(theme);

  if (isLoading || routeLoading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="small" color={currentTheme.colors.primary} />
        <Text 
          className="mt-2"
          style={{ color: currentTheme.colors.textSecondary }}
        >
          Đang tìm đường...
        </Text>
      </View>
    );
  }

  return (
    <>
      {/* Nút Bắt đầu điều hướng */}
      {!isNavigating && route && route.legs && route.legs.length > 0 && (
        <TouchableOpacity
          className="mb-4 py-3 px-4 rounded-full items-center"
          style={{ backgroundColor: currentTheme.colors.primary }}
          onPress={startNavigation}
        >
          <Text className="text-white font-bold text-base">
            Bắt đầu điều hướng
          </Text>
        </TouchableOpacity>
      )}
      
      {/* Nút Dừng điều hướng */}
      {isNavigating && (
        <TouchableOpacity
          className="mb-4 py-3 px-4 rounded-full items-center"
          style={{ backgroundColor: currentTheme.colors.error }}
          onPress={stopNavigation}
        >
          <Text className="text-white font-bold text-base">
            Dừng điều hướng
          </Text>
        </TouchableOpacity>
      )}
      
      {/* Hiển thị bước hiện tại khi đang điều hướng */}
      {isNavigating && route && route.legs && route.legs[0]?.steps && currentStepIndex < route.legs[0].steps.length && (
        <View 
          className="mb-4 p-4 rounded-xl"
          style={{ backgroundColor: currentTheme.colors.backgroundHighlight }}
        >
          <Text 
            className="text-lg font-bold mb-1"
            style={{ color: currentTheme.colors.text }}
          >
            {route.legs[0].steps[currentStepIndex].name || 'Tiếp tục đi thẳng'}
          </Text>
          
          {distanceToNextStep !== null && (
            <Text 
              className="text-base"
              style={{ color: currentTheme.colors.primary }}
            >
              {distanceToNextStep < 1000 
                ? `${Math.round(distanceToNextStep)} m` 
                : `${(distanceToNextStep / 1000).toFixed(1)} km`}
            </Text>
          )}
          
          {currentStepIndex < route.legs[0].steps.length - 1 && (
            <Text 
              className="text-sm mt-2"
              style={{ color: currentTheme.colors.textSecondary }}
            >
              Tiếp theo: {route.legs[0].steps[currentStepIndex + 1].name || 'Tiếp tục đi thẳng'}
            </Text>
          )}
        </View>
      )}
      
      {(route && route.legs && Array.isArray(route.legs) && route.legs.length > 0 && route.legs[0]?.steps) ? (
        <FlatList
          data={(route.legs && route.legs[0] && route.legs[0].steps) ? route.legs[0].steps : []}
          renderItem={({ item, index }) => (
            <View 
              className="flex-row py-3 border-b"
              style={{ borderBottomColor: currentTheme.colors.border }}
            >
              <View className="mr-3 items-center">
                <View 
                  className="w-10 h-10 rounded-full justify-center items-center"
                  style={{ backgroundColor: currentTheme.colors.backgroundHighlight }}
                >
                  <Ionicons 
                    name="navigate" 
                    size={18} 
                    color={currentTheme.colors.primary} 
                  />
                </View>
                {index < ((route.legs && route.legs[0] && route.legs[0].steps) ? route.legs[0].steps.length - 1 : 0) && (
                  <View 
                    className="w-[2px] h-8 mt-1"
                    style={{ backgroundColor: currentTheme.colors.border }}
                  />
                )}
              </View>
              
              <View className="flex-1">
                <Text 
                  className="text-base font-semibold"
                  style={{ color: currentTheme.colors.text }}
                >
                  {item.name || (index === 0 ? 'Xuất phát' : 'Tiếp tục đi thẳng')}
                </Text>
                
                {item.distance > 0 && (
                  <Text 
                    className="text-sm mt-1"
                    style={{ color: currentTheme.colors.textSecondary }}
                  >
                    {item.distance < 1000 
                      ? `${Math.round(item.distance)} m` 
                      : `${(item.distance / 1000).toFixed(1)} km`}
                    {item.duration > 0 && ` (${Math.ceil(item.duration / 60)} phút)`}
                  </Text>
                )}
              </View>
            </View>
          )}
          keyExtractor={(item, index) => `step-${index}`}
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}
          onTouchStart={(e) => {
            // Ngăn sự kiện chạm lan tỏa lên PanGestureHandler khi người dùng scroll trong FlatList
            e.stopPropagation();
          }}
        />
      ) : (
        <View className="flex-1 justify-center items-center">
          <Ionicons name="information-circle-outline" size={36} color={currentTheme.colors.grey} />
          <Text 
            className="mt-2 text-center"
            style={{ color: currentTheme.colors.textSecondary }}
          >
            {routeError || 'Hướng dẫn chi tiết sẽ hiển thị ở đây khi tìm thấy đường đi.'}
          </Text>
        </View>
      )}
    </>
  );
};

export default RouteDetails; 