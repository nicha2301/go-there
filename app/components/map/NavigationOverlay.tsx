import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { getTheme } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { RouteType } from '../../types/map.types';

interface NavigationOverlayProps {
  isNavigating: boolean;
  route: RouteType | null;
  currentStepIndex: number;
  distanceToNextStep: number | null;
  stopNavigation: () => void;
  insets: { top: number };
}

const NavigationOverlay: React.FC<NavigationOverlayProps> = ({
  isNavigating,
  route,
  currentStepIndex,
  distanceToNextStep,
  stopNavigation,
  insets
}) => {
  const { theme } = useTheme();
  const currentTheme = getTheme(theme);

  if (!isNavigating || !route || !route.legs || !route.legs[0]?.steps || currentStepIndex >= route.legs[0].steps.length) {
    return null;
  }

  return (
    <View 
      className="absolute top-0 left-0 right-0 z-30"
      style={{ 
        backgroundColor: currentTheme.colors.primary,
        paddingTop: insets.top,
        paddingBottom: 20
      }}
    >
      <View className="px-4 py-3 flex-row items-center">
        <TouchableOpacity
          onPress={stopNavigation}
          className="mr-3 p-1"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <View className="flex-1">
          <Text className="text-white text-lg font-bold">
            {route.legs[0].steps[currentStepIndex].name || 'Tiếp tục đi thẳng'}
          </Text>
          
          {distanceToNextStep !== null && (
            <Text className="text-white text-2xl font-bold mt-1">
              {distanceToNextStep < 1000 
                ? `${Math.round(distanceToNextStep)} m` 
                : `${(distanceToNextStep / 1000).toFixed(1)} km`}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

export default NavigationOverlay; 