import { useState } from 'react';
import { searchPlaces } from '../services/locationService';
import { getHistory, saveToHistory } from '../services/storageService';

const usePlaces = () => {
  const [searchResults, setSearchResults] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Tìm kiếm địa điểm
  const search = async (query, location = null, category = null) => {
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
  };
  
  // Tìm kiếm địa điểm gần đây
  const searchNearby = async (location, category) => {
    if (!location) {
      setError('Không có vị trí hiện tại');
      return [];
    }
    
    // Tìm kiếm với query rỗng, chỉ dựa theo vị trí và category
    return search('', location, category);
  };
  
  // Lưu địa điểm vào lịch sử
  const savePlace = async (place) => {
    try {
      const updatedHistory = await saveToHistory(place);
      setHistory(updatedHistory);
      return true;
    } catch (err) {
      console.error('Error saving place:', err);
      return false;
    }
  };
  
  // Lấy lịch sử tìm kiếm
  const loadHistory = async () => {
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
  };
  
  // Xóa kết quả tìm kiếm hiện tại
  const clearSearchResults = () => {
    setSearchResults([]);
  };
  
  // Dùng khi người dùng chọn một địa điểm từ kết quả
  const selectPlace = async (place) => {
    await savePlace(place);
    return place;
  };
  
  return {
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
  };
};

export default usePlaces; 