import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Animated, Platform, Text, TouchableNativeFeedback, TouchableOpacity, View } from 'react-native';
import { getTheme } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { Place } from '../../types/map.types';

interface SearchResultsProps {
  searchLoading: boolean;
  searchQuery: string;
  localSearchResults: Place[];
  history: Place[];
  historySlideAnimation: Animated.Value;
  historyOpacityAnimation: Animated.Value;
  handleSelectPlace: (place: Place) => void;
  insets: { top: number; bottom: number };
}

const SearchResults: React.FC<SearchResultsProps> = ({
  searchLoading,
  searchQuery,
  localSearchResults,
  history,
  historySlideAnimation,
  historyOpacityAnimation,
  handleSelectPlace,
  insets
}) => {
  const { theme } = useTheme();
  const currentTheme = getTheme(theme);

  // Hàm tạo hiệu ứng cho từng item trong danh sách
  const getItemAnimationStyle = (index: number) => {
    return {
      opacity: historyOpacityAnimation,
      transform: [
        { 
          translateY: historySlideAnimation.interpolate({
            inputRange: [0, 50],
            outputRange: [0, 25 + index * 5]
          })
        },
        {
          scale: historyOpacityAnimation.interpolate({
            inputRange: [0, 1],
            outputRange: [0.9, 1]
          })
        }
      ]
    };
  };

  if (searchLoading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color={currentTheme.colors.primary} />
      </View>
    );
  }

  return (
    <Animated.FlatList
      data={searchQuery.length >= 2 ? localSearchResults : history}
      keyExtractor={(item) => item.id.toString()}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      style={{
        transform: [{ translateY: historySlideAnimation }],
        opacity: historyOpacityAnimation
      }}
      ListHeaderComponent={
        searchQuery.length < 2 ? (
          <View 
            className="px-4 py-4 mt-4"
            style={{ backgroundColor: currentTheme.colors.backgroundHighlight }}
          >
            <Text 
              className="text-base font-bold"
              style={{ color: currentTheme.colors.text }}
            >
              Lịch sử tìm kiếm
            </Text>
          </View>
        ) : localSearchResults.length > 0 ? (
          <View 
            className="px-4 py-3"
            style={{ backgroundColor: currentTheme.colors.backgroundHighlight }}
          >
            <Text 
              className="text-base font-bold"
              style={{ color: currentTheme.colors.text }}
            >
              Kết quả tìm kiếm
            </Text>
          </View>
        ) : null
      }
      renderItem={({ item, index }) => (
        <Animated.View
          style={getItemAnimationStyle(index)}
        >
          {Platform.OS === 'android' ? (
            <TouchableNativeFeedback
              onPress={() => handleSelectPlace(item)}
              background={TouchableNativeFeedback.Ripple(
                currentTheme.colors.primary + '20',
                false
              )}
            >
              <View 
                className="flex-row items-center px-4 py-3 border-b"
                style={{ 
                  borderBottomColor: currentTheme.colors.border,
                  backgroundColor: currentTheme.colors.card
                }}
              >
                <View 
                  className="w-10 h-10 rounded-full justify-center items-center mr-3"
                  style={{ backgroundColor: currentTheme.colors.backgroundHighlight }}
                >
                  <Ionicons 
                    name={item.category === 'history' ? 'time' : 'location'} 
                    size={20} 
                    color={currentTheme.colors.primary} 
                  />
                </View>
                
                <View className="flex-1">
                  <Text 
                    className="text-base font-semibold"
                    style={{ color: currentTheme.colors.text }}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  
                  <Text 
                    className="text-sm"
                    style={{ color: currentTheme.colors.textSecondary }}
                    numberOfLines={1}
                  >
                    {item.address}
                  </Text>
                </View>
              </View>
            </TouchableNativeFeedback>
          ) : (
            <TouchableOpacity 
              className="flex-row items-center px-4 py-3 border-b"
              style={{ 
                borderBottomColor: currentTheme.colors.border,
                backgroundColor: currentTheme.colors.card
              }}
              onPress={() => handleSelectPlace(item)}
              activeOpacity={0.7}
            >
              <View 
                className="w-10 h-10 rounded-full justify-center items-center mr-3"
                style={{ backgroundColor: currentTheme.colors.backgroundHighlight }}
              >
                <Ionicons 
                  name={item.category === 'history' ? 'time' : 'location'} 
                  size={20} 
                  color={currentTheme.colors.primary} 
                />
              </View>
              
              <View className="flex-1">
                <Text 
                  className="text-base font-semibold"
                  style={{ color: currentTheme.colors.text }}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                
                <Text 
                  className="text-sm"
                  style={{ color: currentTheme.colors.textSecondary }}
                  numberOfLines={1}
                >
                  {item.address}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </Animated.View>
      )}
      ListEmptyComponent={
        searchQuery.length >= 2 ? (
          <Animated.View 
            className="flex-1 justify-center items-center py-10"
            style={getItemAnimationStyle(0)}
          >
            <Ionicons name="search" size={64} color={currentTheme.colors.border} />
            <Text 
              className="text-lg font-bold mt-4"
              style={{ color: currentTheme.colors.text }}
            >
              Không tìm thấy kết quả
            </Text>
            <Text 
              className="text-center mt-2 px-8"
              style={{ color: currentTheme.colors.textSecondary }}
            >
              Thử tìm kiếm với từ khóa khác
            </Text>
          </Animated.View>
        ) : history.length === 0 ? (
          <Animated.View 
            className="flex-1 justify-center items-center py-10"
            style={getItemAnimationStyle(0)}
          >
            <Ionicons name="time" size={64} color={currentTheme.colors.border} />
            <Text 
              className="text-lg font-bold mt-4"
              style={{ color: currentTheme.colors.text }}
            >
              Lịch sử tìm kiếm trống
            </Text>
            <Text 
              className="text-center mt-2 px-8"
              style={{ color: currentTheme.colors.textSecondary }}
            >
              Các địa điểm bạn tìm kiếm sẽ xuất hiện ở đây
            </Text>
          </Animated.View>
        ) : null
      }
    />
  );
};

export default SearchResults; 