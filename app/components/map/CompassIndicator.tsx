import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';
import { getTheme } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { CompassMode } from '../../types/map.types';

interface CompassIndicatorProps {
  compassMode: CompassMode;
  currentHeading: number;
}

const CompassIndicator: React.FC<CompassIndicatorProps> = ({
  compassMode,
  currentHeading
}) => {
  const { theme } = useTheme();
  const currentTheme = getTheme(theme);
  
  if (compassMode === 'off') return null;
  
  return (
    <View className="absolute top-40 left-4 bg-white p-2 rounded-lg shadow-md z-10 items-center">
      <Text className="text-xs text-textSecondary">Hướng</Text>
      <View className="flex-row items-center">
        <Ionicons name="compass" size={16} color={currentTheme.colors.primary} />
        <Text className="ml-1 font-bold">{Math.round(currentHeading)}°</Text>
      </View>
    </View>
  );
};

export default CompassIndicator; 