import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    getFavorites,
    isInFavorites,
    removeFromFavorites,
    saveToFavorites
} from '../services/storageService';

/**
 * Hook quản lý các địa điểm yêu thích
 * @returns {Object} Các trạng thái và hàm xử lý địa điểm yêu thích
 */
const useFavorites = () => {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  /**
   * Lấy danh sách địa điểm yêu thích
   * @returns {Promise<Array>} Danh sách địa điểm yêu thích
   */
  const loadFavorites = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const favoritesData = await getFavorites();
      setFavorites(favoritesData);
      
      return favoritesData;
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);
  
  /**
   * Kiểm tra xem địa điểm có trong danh sách yêu thích không
   * @param {string|number} placeId - ID của địa điểm cần kiểm tra
   * @returns {Promise<boolean>} true nếu địa điểm đã được yêu thích
   */
  const checkIsFavorite = useCallback(async (placeId) => {
    try {
      return await isInFavorites(placeId);
    } catch (err) {
      console.error('Error checking favorite status:', err);
      return false;
    }
  }, []);
  
  /**
   * Toggle trạng thái yêu thích của một địa điểm
   * @param {Object} place - Thông tin địa điểm cần toggle
   * @returns {Promise<boolean>} true nếu thao tác thành công
   */
  const toggleFavorite = useCallback(async (place) => {
    try {
      const isFavorite = await isInFavorites(place.id);
      
      let updatedFavorites;
      if (isFavorite) {
        updatedFavorites = await removeFromFavorites(place.id);
      } else {
        updatedFavorites = await saveToFavorites(place);
      }
      
      setFavorites(updatedFavorites);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }, []);
  
  // Tự động tải danh sách yêu thích khi component mount
  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);
  
  // Trả về các trạng thái và hàm xử lý
  return useMemo(() => ({
    favorites,
    loading,
    error,
    loadFavorites,
    checkIsFavorite,
    toggleFavorite
  }), [
    favorites,
    loading,
    error,
    loadFavorites,
    checkIsFavorite,
    toggleFavorite
  ]);
};

export default useFavorites; 