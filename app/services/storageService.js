import AsyncStorage from '@react-native-async-storage/async-storage';

// Keys cho lưu trữ
const STORAGE_KEYS = {
  FAVORITES: 'go-there:favorites',
  HISTORY: 'go-there:history',
  SETTINGS: 'go-there:settings'
};

// Giới hạn số lượng lịch sử
const MAX_HISTORY_ITEMS = 50;

// Lưu trữ danh sách
export const saveData = async (key, data) => {
  try {
    const jsonValue = JSON.stringify(data);
    await AsyncStorage.setItem(key, jsonValue);
    return true;
  } catch (error) {
    console.error(`Error saving data for ${key}:`, error);
    return false;
  }
};

// Lấy danh sách
export const getData = async (key) => {
  try {
    const jsonValue = await AsyncStorage.getItem(key);
    return jsonValue ? JSON.parse(jsonValue) : [];
  } catch (error) {
    console.error(`Error getting data for ${key}:`, error);
    return [];
  }
};

// Lấy danh sách yêu thích
export const getFavorites = async () => {
  return await getData(STORAGE_KEYS.FAVORITES);
};

// Lưu địa điểm vào danh sách yêu thích
export const saveToFavorites = async (place) => {
  // Kiểm tra xem đã có trong danh sách chưa
  const favorites = await getFavorites();
  const existingIndex = favorites.findIndex(item => item.id === place.id);
  
  if (existingIndex !== -1) {
    // Cập nhật thông tin nếu đã tồn tại
    favorites[existingIndex] = place;
  } else {
    // Thêm mới nếu chưa tồn tại
    favorites.push(place);
  }
  
  await saveData(STORAGE_KEYS.FAVORITES, favorites);
  return favorites;
};

// Xóa địa điểm khỏi danh sách yêu thích
export const removeFromFavorites = async (placeId) => {
  const favorites = await getFavorites();
  const updatedFavorites = favorites.filter(item => item.id !== placeId);
  
  await saveData(STORAGE_KEYS.FAVORITES, updatedFavorites);
  return updatedFavorites;
};

// Kiểm tra xem địa điểm có trong danh sách yêu thích không
export const isInFavorites = async (placeId) => {
  const favorites = await getFavorites();
  return favorites.some(item => item.id === placeId);
};

// Lấy lịch sử tìm kiếm
export const getHistory = async () => {
  return await getData(STORAGE_KEYS.HISTORY);
};

// Lưu địa điểm vào lịch sử
export const saveToHistory = async (place) => {
  const history = await getHistory();
  
  // Loại bỏ nếu đã tồn tại (để thêm lại vào đầu danh sách)
  const filteredHistory = history.filter(item => item.id !== place.id);
  
  // Thêm vào đầu danh sách
  const updatedHistory = [
    { ...place, timestamp: new Date().toISOString() },
    ...filteredHistory
  ];
  
  // Giới hạn số lượng
  const limitedHistory = updatedHistory.slice(0, MAX_HISTORY_ITEMS);
  
  await saveData(STORAGE_KEYS.HISTORY, limitedHistory);
  return limitedHistory;
};

// Xóa một địa điểm khỏi lịch sử
export const removeFromHistory = async (placeId) => {
  const history = await getHistory();
  const updatedHistory = history.filter(item => item.id !== placeId);
  
  await saveData(STORAGE_KEYS.HISTORY, updatedHistory);
  return updatedHistory;
};

// Xóa toàn bộ lịch sử
export const clearHistory = async () => {
  await saveData(STORAGE_KEYS.HISTORY, []);
  return [];
};

// Lưu cài đặt
export const saveSettings = async (settings) => {
  return await saveData(STORAGE_KEYS.SETTINGS, settings);
};

// Lấy cài đặt
export const getSettings = async () => {
  return await getData(STORAGE_KEYS.SETTINGS);
};

const storageService = {
  saveData,
  getData,
  getFavorites,
  saveToFavorites,
  removeFromFavorites,
  isInFavorites,
  getHistory,
  saveToHistory,
  removeFromHistory,
  clearHistory,
  saveSettings,
  getSettings
};

export default storageService; 