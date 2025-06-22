import AsyncStorage from '@react-native-async-storage/async-storage';

// Key để lưu trữ dữ liệu
const STORAGE_KEYS = {
  HISTORY: 'go_there_history',
  FAVORITES: 'go_there_favorites',
  SETTINGS: 'go_there_settings'
};

// Lưu địa điểm vào lịch sử
export const saveToHistory = async (place) => {
  try {
    // Format thời gian hiện tại
    const timestamp = new Date().getTime();
    const placeWithTimestamp = { ...place, timestamp };
    
    // Lấy lịch sử hiện tại
    const existingHistory = await getHistory();
    
    // Nếu địa điểm đã có trong lịch sử, xóa nó đi
    const filteredHistory = existingHistory.filter(item => item.id !== place.id);
    
    // Thêm địa điểm mới vào đầu danh sách, giới hạn ở 50 địa điểm
    const newHistory = [placeWithTimestamp, ...filteredHistory].slice(0, 50);
    
    // Lưu vào storage
    await AsyncStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(newHistory));
    return newHistory;
  } catch (error) {
    console.error('Error saving to history:', error);
    return [];
  }
};

// Lấy danh sách lịch sử
export const getHistory = async () => {
  try {
    const historyString = await AsyncStorage.getItem(STORAGE_KEYS.HISTORY);
    return historyString ? JSON.parse(historyString) : [];
  } catch (error) {
    console.error('Error getting history:', error);
    return [];
  }
};

// Xóa một địa điểm khỏi lịch sử
export const removeFromHistory = async (placeId) => {
  try {
    const history = await getHistory();
    const newHistory = history.filter(place => place.id !== placeId);
    await AsyncStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(newHistory));
    return newHistory;
  } catch (error) {
    console.error('Error removing from history:', error);
    return null;
  }
};

// Xóa toàn bộ lịch sử
export const clearHistory = async () => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify([]));
    return true;
  } catch (error) {
    console.error('Error clearing history:', error);
    return false;
  }
};

// Lưu địa điểm vào danh sách yêu thích
export const saveToFavorites = async (place) => {
  try {
    // Thêm thời gian lưu
    const timestamp = new Date().getTime();
    const placeWithTimestamp = { ...place, timestamp };
    
    // Lấy danh sách yêu thích hiện tại
    const favorites = await getFavorites();
    
    // Kiểm tra xem địa điểm đã có trong danh sách chưa
    if (!favorites.some(item => item.id === place.id)) {
      // Nếu chưa có, thêm vào
      const newFavorites = [placeWithTimestamp, ...favorites];
      await AsyncStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(newFavorites));
      return newFavorites;
    }
    
    return favorites;
  } catch (error) {
    console.error('Error saving to favorites:', error);
    return [];
  }
};

// Lấy danh sách yêu thích
export const getFavorites = async () => {
  try {
    const favoritesString = await AsyncStorage.getItem(STORAGE_KEYS.FAVORITES);
    return favoritesString ? JSON.parse(favoritesString) : [];
  } catch (error) {
    console.error('Error getting favorites:', error);
    return [];
  }
};

// Xóa một địa điểm khỏi danh sách yêu thích
export const removeFromFavorites = async (placeId) => {
  try {
    const favorites = await getFavorites();
    const newFavorites = favorites.filter(place => place.id !== placeId);
    await AsyncStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(newFavorites));
    return newFavorites;
  } catch (error) {
    console.error('Error removing from favorites:', error);
    return null;
  }
};

// Kiểm tra xem một địa điểm có trong danh sách yêu thích không
export const isInFavorites = async (placeId) => {
  try {
    const favorites = await getFavorites();
    return favorites.some(place => place.id === placeId);
  } catch (error) {
    console.error('Error checking favorites:', error);
    return false;
  }
};

// Lưu cài đặt
export const saveSettings = async (settings) => {
  try {
    const currentSettings = await getSettings();
    const newSettings = { ...currentSettings, ...settings };
    await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(newSettings));
    return newSettings;
  } catch (error) {
    console.error('Error saving settings:', error);
    return null;
  }
};

// Lấy cài đặt
export const getSettings = async () => {
  try {
    const settingsString = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
    return settingsString ? JSON.parse(settingsString) : {
      // Cài đặt mặc định
      mapType: 'standard',
      navigationMode: 'driving',
      language: 'vi',
      darkMode: false
    };
  } catch (error) {
    console.error('Error getting settings:', error);
    return null;
  }
}; 