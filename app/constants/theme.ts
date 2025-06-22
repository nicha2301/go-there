export const COLORS = {
  // Màu chính
  primary: '#3B82F6',     // Xanh dương hiện đại
  secondary: '#10B981',   // Xanh lá mát mắt
  background: '#FFFFFF',  // Nền trắng sáng
  card: '#FFFFFF',
  text: '#1F2937',        // Xám đậm, không phải đen hoàn toàn
  border: '#E5E7EB',      // Xám nhẹ
  notification: '#EF4444', // Đỏ hiện đại
  accent: '#F59E0B',      // Cam vàng
  
  // Màu bổ sung
  lightBackground: '#F9FAFB', // Xám nhẹ cho nền phụ
  darkText: '#111827',      // Gần đen cho văn bản quan trọng
  grayText: '#6B7280',      // Xám cho văn bản phụ
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  
  // Màu bản đồ
  mapMarker: '#3B82F6',
  mapRoute: '#3B82F6',
  mapMarkerSelected: '#EF4444',
  
  // Gradient
  gradientStart: '#3B82F6',
  gradientEnd: '#2563EB', 
};

export const SHADOW = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 3,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  }
};

export const FONT_SIZES = {
  xs: 12,
  small: 14,
  medium: 16,
  large: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const SPACING = {
  xs: 4,
  small: 8,
  medium: 16,
  large: 24,
  xl: 32,
  xxl: 40,
};

export const BORDER_RADIUS = {
  small: 6,
  medium: 12,
  large: 16,
  xl: 24,
  round: 9999,
};

export const ICON_SIZES = {
  small: 16,
  medium: 24,
  large: 32,
  xl: 40,
};

export const CATEGORY_ICONS = {
  restaurant: 'silverware-fork-knife',
  cafe: 'coffee',
  atm: 'credit-card-outline',
  gas_station: 'gas-station',
  hospital: 'hospital',
  pharmacy: 'medical-bag',
  shopping_mall: 'shopping-outline',
  supermarket: 'cart',
  bank: 'bank',
  hotel: 'bed',
  bar: 'glass-cocktail',
};

// Default export cho theme
const theme = {
  COLORS,
  SHADOW,
  FONT_SIZES,
  SPACING,
  BORDER_RADIUS,
  ICON_SIZES,
  CATEGORY_ICONS
};

export default theme; 