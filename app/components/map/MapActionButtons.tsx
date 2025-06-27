import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { TouchableOpacity } from 'react-native';
import { MapType } from 'react-native-maps';
import { getTheme } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { CompassMode } from '../../types/map.types';
import ThemeToggleButton from '../ThemeToggleButton';

interface MapActionButtonsProps {
  centerMapOnUser: () => void;
  toggleCompassMode: () => void;
  toggleMapType: () => void;
  compassMode: CompassMode;
  mapType: MapType;
}

const MapActionButtons: React.FC<MapActionButtonsProps> = ({
  centerMapOnUser,
  toggleCompassMode,
  toggleMapType,
  compassMode,
  mapType
}) => {
  const { theme } = useTheme();
  const currentTheme = getTheme(theme);

  return (
    <>
      {/* Nút vị trí hiện tại */}
      <TouchableOpacity 
        className="absolute right-4 bottom-32 p-3 rounded-full shadow-md z-10"
        onPress={centerMapOnUser}
        style={{
          backgroundColor: currentTheme.colors.card,
          shadowColor: currentTheme.colors.text,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}
      >
        <Ionicons name="locate" size={24} color={currentTheme.colors.primary} />
      </TouchableOpacity>
      
      {/* Nút theo dõi hướng */}
      <TouchableOpacity 
        className={`absolute right-4 bottom-48 p-3 rounded-full shadow-md z-10 ${
          compassMode === 'off' ? '' : 
          compassMode === 'follow' ? '' : ''
        }`}
        onPress={toggleCompassMode}
        style={{
          backgroundColor: compassMode === 'rotate' ? currentTheme.colors.primary : currentTheme.colors.card,
          shadowColor: currentTheme.colors.text,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}
      >
        <Ionicons 
          name="compass" 
          size={24} 
          color={compassMode === 'rotate' ? '#FFF' : currentTheme.colors.primary} 
        />
      </TouchableOpacity>
      
      {/* Nút chuyển đổi kiểu bản đồ */}
      <TouchableOpacity 
        className="absolute right-4 bottom-64 p-3 rounded-full shadow-md z-10"
        onPress={toggleMapType}
        style={{
          backgroundColor: currentTheme.colors.card,
          shadowColor: currentTheme.colors.text,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}
      >
        <Ionicons name="layers" size={24} color={currentTheme.colors.primary} />
      </TouchableOpacity>
      
      {/* Nút chuyển đổi theme */}
      <ThemeToggleButton 
        className="absolute right-4 bottom-80 z-10"
      />
    </>
  );
};

export default MapActionButtons; 