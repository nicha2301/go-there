import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { TextInput, TouchableOpacity, View } from 'react-native';
import { getTheme } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmitEditing: () => void;
  onFocus?: () => void;
  placeholder: string;
  autoFocus?: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({ 
  value, 
  onChangeText, 
  onSubmitEditing, 
  onFocus,
  placeholder, 
  autoFocus = false
}) => {
  const { theme } = useTheme();
  const currentTheme = getTheme(theme);
  
  return (
    <View 
      className="flex-row items-center rounded-full p-2 shadow-sm"
      style={{
        backgroundColor: currentTheme.colors.card,
        borderColor: currentTheme.colors.border,
        borderWidth: 1,
        shadowColor: currentTheme.colors.text,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      <View 
        className="w-8 h-8 rounded-full justify-center items-center mr-2"
        style={{ backgroundColor: currentTheme.colors.backgroundHighlight }}
      >
        <Ionicons name="search" size={18} color={currentTheme.colors.primary} />
      </View>
      
      <TextInput
        className="flex-1"
        placeholder={placeholder}
        placeholderTextColor={currentTheme.colors.textSecondary}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmitEditing}
        onFocus={onFocus}
        returnKeyType="search"
        autoFocus={autoFocus}
        style={{
          color: currentTheme.colors.text,
        }}
      />
      
      {value.length > 0 && (
        <TouchableOpacity
          onPress={() => onChangeText('')}
        >
          <Ionicons name="close-circle" size={20} color={currentTheme.colors.grey} />
        </TouchableOpacity>
      )}
    </View>
  );
};

export default SearchBar; 