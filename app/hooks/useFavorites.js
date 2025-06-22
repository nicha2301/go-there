import { useState } from 'react';
import {
  getFavorites,
  isInFavorites,
  removeFromFavorites,
  saveToFavorites
} from '../services/storageService';

export const useFavorites = () => {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Lấy danh sách địa điểm yêu thích
  const loadFavorites = async () => {
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
  };
  
  // Kiểm tra xem địa điểm có trong danh sách yêu thích không
  const checkIsFavorite = async (placeId) => {
    try {
      return await isInFavorites(placeId);
    } catch (err) {
      console.error('Error checking favorite status:', err);
      return false;
    }
  };
  
  // Toggle trạng thái yêu thích
  const toggleFavorite = async (place) => {
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
  };
  
  return {
    favorites,
    loading,
    error,
    loadFavorites,
    checkIsFavorite,
    toggleFavorite
  };
};

export default useFavorites; 