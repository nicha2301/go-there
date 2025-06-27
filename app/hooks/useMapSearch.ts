import { useCallback, useRef, useState } from 'react';
import { Animated, Easing, Keyboard } from 'react-native';
import { Place, PlacesHook } from '../types/map.types';

export const useMapSearch = (
  search: PlacesHook['search'],
  loadHistory: PlacesHook['loadHistory'],
  clearSearchResults: PlacesHook['clearSearchResults'],
  history: Place[]
) => {
  // State cho tìm kiếm trực tiếp
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [localSearchResults, setLocalSearchResults] = useState<Place[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  
  // Animation cho thanh search và kết quả tìm kiếm
  const searchBarAnimation = useRef(new Animated.Value(0)).current;
  const historySlideAnimation = useRef(new Animated.Value(50)).current; // Bắt đầu từ 50px bên dưới
  const historyOpacityAnimation = useRef(new Animated.Value(0)).current; // Bắt đầu với opacity 0

  // Hàm thực hiện tìm kiếm
  const performSearch = useCallback(async (query: string, location: any) => {
    if (!query.trim()) return;
    
    setSearchLoading(true);
    
    try {
      const results = await search(
        query, 
        location,
        null
      );
      setLocalSearchResults(results);
    } catch (error) {
      console.error('Error searching places:', error);
    } finally {
      setSearchLoading(false);
    }
  }, [search]);

  // Hàm xử lý khi focus vào ô tìm kiếm
  const handleSearchFocus = useCallback(() => {
    // Hiển thị màn hình tìm kiếm
    setShowSearchResults(true);
    
    // Animation hiển thị màn hình tìm kiếm
    Animated.timing(searchBarAnimation, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
      easing: Easing.out(Easing.ease)
    }).start();
    
    // Animation cho component history
    Animated.parallel([
      Animated.timing(historySlideAnimation, {
        toValue: 0,
        duration: 400,
        delay: 100,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease)
      }),
      Animated.timing(historyOpacityAnimation, {
        toValue: 1,
        duration: 400,
        delay: 100,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease)
      })
    ]).start();
    
    // Load lịch sử tìm kiếm
    loadHistory().catch(error => {
      console.error('Error loading history:', error);
    });
  }, [searchBarAnimation, historySlideAnimation, historyOpacityAnimation, loadHistory]);
  
  // Hàm xử lý khi nhấn tìm kiếm
  const handleSearch = useCallback(() => {
    if (searchQuery.trim().length >= 2) {
      performSearch(searchQuery, null);
    }
    Keyboard.dismiss();
  }, [searchQuery, performSearch]);
  
  // Hàm xử lý khi đóng tìm kiếm
  const handleCloseSearch = useCallback(() => {
    // Ẩn kết quả tìm kiếm với animation
    Animated.parallel([
      Animated.timing(searchBarAnimation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.in(Easing.ease)
      }),
      Animated.timing(historySlideAnimation, {
        toValue: 50,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.in(Easing.ease)
      }),
      Animated.timing(historyOpacityAnimation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.in(Easing.ease)
      })
    ]).start(() => {
      setShowSearchResults(false);
      // Xóa kết quả tìm kiếm
      setSearchQuery('');
      clearSearchResults();
    });
    
    // Ẩn bàn phím
    Keyboard.dismiss();
  }, [searchBarAnimation, historySlideAnimation, historyOpacityAnimation, clearSearchResults]);

  return {
    searchQuery,
    setSearchQuery,
    showSearchResults,
    setShowSearchResults,
    localSearchResults,
    setLocalSearchResults,
    searchLoading,
    searchBarAnimation,
    historySlideAnimation,
    historyOpacityAnimation,
    performSearch,
    handleSearchFocus,
    handleSearch,
    handleCloseSearch
  };
}; 