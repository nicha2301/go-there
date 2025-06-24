import { useCallback, useEffect, useMemo, useState } from 'react';
import { searchPlaces } from '../services/locationService';
import { getHistory, saveToHistory } from '../services/storageService';

/**
 * Hook quản lý tìm kiếm và lịch sử địa điểm
 * @returns {Object} Các trạng thái và hàm xử lý địa điểm
 */
const usePlaces = () => {
  const [searchResults, setSearchResults] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  /**
   * Tìm kiếm địa điểm theo từ khóa
   * @param {string} query - Từ khóa tìm kiếm
   * @param {Object} location - Vị trí hiện tại (tùy chọn)
   * @param {string} category - Danh mục tìm kiếm (tùy chọn)
   * @returns {Promise<Array>} Danh sách kết quả tìm kiếm
   */
  const search = useCallback(async (query, location = null, category = null) => {
    try {
      setLoading(true);
      setError(null);
      
      // Đảm bảo vị trí có định dạng đúng
      const locationCoords = location ? {
        lat: location.latitude, 
        lng: location.longitude
      } : undefined;
      
      // Tìm kiếm địa điểm
      const results = await searchPlaces(query, locationCoords, category);
      setSearchResults(results);
      
      return results;
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);
  
  /**
   * Tìm kiếm địa điểm gần vị trí hiện tại
   * @param {Object} location - Vị trí hiện tại
   * @param {string} category - Danh mục tìm kiếm (tùy chọn)
   * @returns {Promise<Array>} Danh sách kết quả tìm kiếm
   */
  const searchNearby = useCallback(async (location, category) => {
    if (!location) {
      setError('Không có vị trí hiện tại');
      return [];
    }
    
    // Tìm kiếm với query rỗng, chỉ dựa theo vị trí và category
    return search('', location, category);
  }, [search]);
  
  /**
   * Lưu địa điểm vào lịch sử
   * @param {Object} place - Thông tin địa điểm cần lưu
   * @returns {Promise<boolean>} true nếu thao tác thành công
   */
  const savePlace = useCallback(async (place) => {
    try {
      const updatedHistory = await saveToHistory(place);
      setHistory(updatedHistory);
      return true;
    } catch (err) {
      console.error('Error saving place:', err);
      return false;
    }
  }, []);
  
  /**
   * Lấy lịch sử tìm kiếm
   * @returns {Promise<Array>} Danh sách lịch sử tìm kiếm
   */
  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      const historyData = await getHistory();
      setHistory(historyData);
      return historyData;
    } catch (err) {
      console.error('Error loading history:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);
  
  /**
   * Xóa kết quả tìm kiếm hiện tại
   */
  const clearSearchResults = useCallback(() => {
    setSearchResults([]);
  }, []);
  
  /**
   * Chọn một địa điểm từ kết quả tìm kiếm
   * @param {Object} place - Địa điểm được chọn
   * @returns {Promise<Object>} Thông tin địa điểm đã chọn
   */
  const selectPlace = useCallback(async (place) => {
    await savePlace(place);
    return place;
  }, [savePlace]);
  
  // Tự động tải lịch sử khi component mount
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);
  
  // Trả về các trạng thái và hàm xử lý
  return useMemo(() => ({
    searchResults,
    history,
    loading,
    error,
    search,
    searchNearby,
    savePlace,
    loadHistory,
    clearSearchResults,
    selectPlace
  }), [
    searchResults,
    history,
    loading,
    error,
    search,
    searchNearby,
    savePlace,
    loadHistory,
    clearSearchResults,
    selectPlace
  ]);
};

export default usePlaces; 