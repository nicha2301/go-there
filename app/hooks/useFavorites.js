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
  
  // Thêm địa điểm vào danh sách yêu thích
  const addToFavorites = async (place) => {
    try {
      setLoading(true);
      setError(null);
      
      const updatedFavorites = await saveToFavorites(place);
      setFavorites(updatedFavorites);
      
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  // Xóa địa điểm khỏi danh sách yêu thích
  const removeFavorite = async (placeId) => {
    try {
      setLoading(true);
      setError(null);
      
      const updatedFavorites = await removeFromFavorites(placeId);
      setFavorites(updatedFavorites);
      
      return true;
    } catch (err) {
      setError(err.message);
      return false;
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
    const isFavorite = await checkIsFavorite(place.id);
    
    if (isFavorite) {
      return await removeFavorite(place.id);
    } else {
      return await addToFavorites(place);
    }
  };
  
  return {
    favorites,
    loading,
    error,
    loadFavorites,
    addToFavorites,
    removeFavorite,
    checkIsFavorite,
    toggleFavorite
  };
}; 