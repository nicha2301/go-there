import { useCallback, useRef, useState } from 'react';
import { Animated } from 'react-native';

const BOTTOM_SHEET_MIN_HEIGHT = 150;
const BOTTOM_SHEET_MAX_HEIGHT = 500; // Điều chỉnh theo kích thước màn hình

export const useBottomSheet = () => {
  const [isBottomSheetExpanded, setIsBottomSheetExpanded] = useState(false);
  const bottomSheetAnimation = useRef(new Animated.Value(BOTTOM_SHEET_MIN_HEIGHT)).current;
  const panY = useRef(new Animated.Value(0)).current;

  // Animate bottom sheet
  const toggleBottomSheet = useCallback(() => {
    const toValue = isBottomSheetExpanded ? BOTTOM_SHEET_MIN_HEIGHT : BOTTOM_SHEET_MAX_HEIGHT;
    
    Animated.spring(bottomSheetAnimation, {
      toValue,
      friction: 10,
      useNativeDriver: false
    }).start();
    
    setIsBottomSheetExpanded(!isBottomSheetExpanded);
  }, [isBottomSheetExpanded, bottomSheetAnimation]);

  // Xử lý gesture kéo thả cho bottom sheet
  const handleGesture = useCallback(
    Animated.event(
      [{ nativeEvent: { translationY: panY } }],
      { useNativeDriver: false }
    ),
    [panY]
  );

  // Sử dụng any để tránh lỗi TypeScript khi không có kiểu cụ thể cho event
  const handleGestureStateChange = useCallback(({ nativeEvent }: any) => {
    // Chỉ xử lý gesture khi người dùng kéo từ phần header của bottom sheet
    // hoặc khi đang ở trạng thái thu gọn
    if (!isBottomSheetExpanded || (nativeEvent && nativeEvent.y < 200)) {
      // Nếu có thuộc tính translationY
      if (nativeEvent && typeof nativeEvent.translationY === 'number') {
        // Kéo lên (translationY < 0), mở rộng bottom sheet
        if (nativeEvent.translationY < -50 && !isBottomSheetExpanded) {
          toggleBottomSheet();
        } 
        // Kéo xuống (translationY > 0), thu nhỏ bottom sheet
        else if (nativeEvent.translationY > 50 && isBottomSheetExpanded) {
          toggleBottomSheet();
        }
      }
    }

    // Reset giá trị panY
    Animated.spring(panY, {
      toValue: 0,
      useNativeDriver: false,
      tension: 40,
      friction: 5
    }).start();
  }, [isBottomSheetExpanded, panY, toggleBottomSheet]);

  return {
    isBottomSheetExpanded,
    setIsBottomSheetExpanded,
    bottomSheetAnimation,
    panY,
    toggleBottomSheet,
    handleGesture,
    handleGestureStateChange,
    BOTTOM_SHEET_MIN_HEIGHT,
    BOTTOM_SHEET_MAX_HEIGHT
  };
}; 