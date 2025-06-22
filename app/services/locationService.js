import * as Location from 'expo-location';

export const getCurrentLocation = async () => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Quyền truy cập vị trí bị từ chối');
    }
    
    const location = await Location.getCurrentPositionAsync({});
    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      timestamp: location.timestamp
    };
  } catch (error) {
    console.error('Error getting current location:', error);
    throw error;
  }
};

export const deg2rad = (deg) => {
  return deg * (Math.PI/180);
};

export const calculateDistance = (point1, point2) => {
  const R = 6371;
  const dLat = deg2rad(point2.latitude - point1.latitude);
  const dLon = deg2rad(point2.longitude - point1.longitude);
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(point1.latitude)) * Math.cos(deg2rad(point2.latitude)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export const searchPlaces = async (query, { lat, lng } = {}, category = null) => {
  try {
    const baseUrl = 'https://nominatim.openstreetmap.org/search';
    let searchUrl = `${baseUrl}?format=json&addressdetails=1&limit=10`;
    
    if (query && query.length > 0) {
      searchUrl += `&q=${encodeURIComponent(query)}`;
    }
    
    if (lat && lng) {
      searchUrl += `&lat=${lat}&lon=${lng}`;
    }
    
    if (category) {
      const amenityMap = {
        restaurant: 'restaurant',
        cafe: 'cafe',
        atm: 'atm',
        hospital: 'hospital',
        gas_station: 'fuel',
        pharmacy: 'pharmacy'
      };
      
      const osmCategory = amenityMap[category] || category;
      searchUrl += `&amenity=${osmCategory}`;
    }
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'GoThereApp/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    
    return data.map(item => {
      let category = 'other';
      if (item.class === 'amenity') {
        if (['restaurant', 'food_court', 'fast_food'].includes(item.type)) {
          category = 'restaurant';
        } else if (['cafe', 'coffee_shop'].includes(item.type)) {
          category = 'cafe';
        } else if (item.type === 'atm') {
          category = 'atm';
        } else if (['hospital', 'clinic'].includes(item.type)) {
          category = 'hospital';
        } else if (['pharmacy', 'drugstore'].includes(item.type)) {
          category = 'pharmacy';
        } else if (item.type === 'fuel') {
          category = 'gas_station';
        } else if (item.type === 'bank') {
          category = 'bank';
        }
      }
      
      let distance = '';
      if (lat && lng) {
        const distanceKm = calculateDistance(
          { latitude: lat, longitude: lng },
          { latitude: parseFloat(item.lat), longitude: parseFloat(item.lon) }
        );
        distance = distanceKm < 1 ? 
          `${Math.round(distanceKm * 1000)} m` : 
          `${distanceKm.toFixed(1)} km`;
      }
      
      return {
        id: item.place_id,
        name: item.name || item.display_name.split(',')[0],
        address: item.display_name,
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
        category,
        distance,
        rating: 0, // 
      };
    });
  } catch (error) {
    console.error('Error searching places:', error);
    throw error;
  }
};

export const getAddressFromCoordinates = async (latitude, longitude) => {
  try {
    const baseUrl = 'https://nominatim.openstreetmap.org/reverse';
    const url = `${baseUrl}?format=json&lat=${latitude}&lon=${longitude}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'GoThereApp/1.0'
      }
    });
    
    const data = await response.json();
    return data.display_name || '';
  } catch (error) {
    console.error('Error getting address:', error);
    return '';
  }
};

const locationService = {
  getCurrentLocation,
  searchPlaces,
  calculateDistance,
  deg2rad,
  getAddressFromCoordinates
};

export default locationService; 