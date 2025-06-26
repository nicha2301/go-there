import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { TouchableOpacity } from 'react-native';
import { getTheme } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

interface ThemeToggleButtonProps {
  className?: string;
}

const ThemeToggleButton: React.FC<ThemeToggleButtonProps> = ({ 
  className = "absolute right-4 bottom-80 p-3 rounded-full shadow-md z-10" 
}) => {
  const { theme, toggleTheme } = useTheme();
  const currentTheme = getTheme(theme);

  return (
    <TouchableOpacity
      className={className}
      onPress={toggleTheme}
      activeOpacity={0.7}
      style={{
        backgroundColor: currentTheme.colors.card,
        shadowColor: currentTheme.colors.text,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      }}
    >
      <Ionicons 
        name={theme === 'dark' ? 'sunny' : 'moon'} 
        size={24} 
        color={currentTheme.colors.primary} 
      />
    </TouchableOpacity>
  );
};

export default ThemeToggleButton; 