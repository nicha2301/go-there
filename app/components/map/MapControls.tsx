import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { getTheme } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

interface MapControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
}

const MapControls: React.FC<MapControlsProps> = ({ onZoomIn, onZoomOut }) => {
  const { theme } = useTheme();
  const currentTheme = getTheme(theme);
  
  return (
    <View 
      className="absolute right-4 top-1/4 rounded-full shadow-md overflow-hidden"
      style={{
        backgroundColor: currentTheme.colors.card,
        shadowColor: currentTheme.colors.text,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      }}
    >
      <TouchableOpacity 
        className="p-3 border-b"
        onPress={onZoomIn}
        style={{ borderBottomColor: currentTheme.colors.border }}
      >
        <Ionicons name="add" size={22} color={currentTheme.colors.primary} />
      </TouchableOpacity>
      <TouchableOpacity 
        className="p-3"
        onPress={onZoomOut}
      >
        <Ionicons name="remove" size={22} color={currentTheme.colors.primary} />
      </TouchableOpacity>
    </View>
  );
};

export default MapControls; 