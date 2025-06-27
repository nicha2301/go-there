import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { getTheme } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { RouteType, TRANSPORT_MODES } from '../../types/map.types';

interface BottomSheetHeaderProps {
  route: RouteType | null;
  isExpanded: boolean;
  onToggleExpand: () => void;
  transportMode: string;
  onTransportModeChange: (mode: string) => void;
  startPlaceName: string;
  endPlaceName: string;
  onSearchPress: () => void;
  showDirectionsUI: boolean;
}

const BottomSheetHeader: React.FC<BottomSheetHeaderProps> = ({ 
  route, 
  isExpanded, 
  onToggleExpand, 
  transportMode, 
  onTransportModeChange,
  startPlaceName,
  endPlaceName,
  onSearchPress,
  showDirectionsUI
}) => {
  const { theme } = useTheme();
  const currentTheme = getTheme(theme);
  
  return (
    <View className="px-4 pt-2 pb-3">
      {/* Nút mở rộng / thu gọn - làm rộng hơn */}
      <TouchableOpacity 
        className="p-2 items-center"
        onPress={onToggleExpand}
        activeOpacity={0.7}
      >
        <View 
          className="w-12 h-1 rounded-full mb-2" 
          style={{ backgroundColor: currentTheme.colors.border }}
        />
      </TouchableOpacity>
      
      {showDirectionsUI && route ? (
        <View className="mt-1">
          <Text 
            className="text-xl font-bold"
            style={{ color: currentTheme.colors.text }}
          >
            {route.formattedDistance} ({route.formattedDuration})
          </Text>
          <Text 
            className="text-base mb-2"
            style={{ color: currentTheme.colors.textSecondary }}
          >
            {startPlaceName} → {endPlaceName}
          </Text>
        </View>
      ) : showDirectionsUI ? (
        <View className="h-12 justify-center">
          <Text 
            className="text-base"
            style={{ color: currentTheme.colors.textSecondary }}
          >
            Đang tìm đường...
          </Text>
        </View>
      ) : (
        <TouchableOpacity 
          className="flex-row items-center rounded-md p-3 my-2 shadow-sm"
          onPress={onSearchPress}
          style={{
            backgroundColor: currentTheme.colors.card,
            shadowColor: currentTheme.colors.text,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <View 
            className="w-8 h-8 rounded-full justify-center items-center mr-2"
            style={{ backgroundColor: currentTheme.colors.backgroundHighlight }}
          >
            <Ionicons name="search" size={18} color={currentTheme.colors.primary} />
          </View>
          <Text 
            className="flex-1"
            style={{ color: currentTheme.colors.textSecondary }}
          >
            Tìm kiếm địa điểm...
          </Text>
        </TouchableOpacity>
      )}
      
      {/* Transport modes */}
      {showDirectionsUI && (
        <View className="flex-row justify-around py-">
          {TRANSPORT_MODES.map(mode => (
            <TouchableOpacity
              key={mode.id}
              className={`items-center p-3 ${transportMode === mode.id ? 'rounded-xl' : ''}`}
              onPress={() => onTransportModeChange(mode.id)}
              style={{ 
                minWidth: 70,
                backgroundColor: transportMode === mode.id ? currentTheme.colors.backgroundHighlight : 'transparent'
              }}
            >
              <FontAwesome5 
                name={mode.icon} 
                size={20} 
                color={transportMode === mode.id ? currentTheme.colors.primary : currentTheme.colors.text} 
              />
              <Text 
                className={`text-sm mt-1 ${transportMode === mode.id ? 'font-bold' : ''}`}
                style={{ 
                  color: transportMode === mode.id ? currentTheme.colors.primary : currentTheme.colors.textSecondary 
                }}
              >
                {mode.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

export default BottomSheetHeader; 