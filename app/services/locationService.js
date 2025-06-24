import * as Location from 'expo-location';

// Cấu hình API
const NOMINATIM_API = 'https://nominatim.openstreetmap.org';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 giây

/**
 * Hàm tiện ích để chờ một khoảng thời gian
 * @param {number} ms - Thời gian chờ tính bằng milliseconds
 * @returns {Promise<void>}
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Hàm fetch với cơ chế retry
 * @param {string} url - URL cần gọi
 * @param {Object} options - Tùy chọn fetch
 * @param {number} retries - Số lần thử lại còn lại
 * @returns {Promise<Response>}
 */
const fetchWithRetry = async (url, options = {}, retries = MAX_RETRIES) => {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return response;
  } catch (error) {
    if (retries <= 0) {
      throw error;
    }
    
    console.log(`Retry fetch (${MAX_RETRIES - retries + 1}/${MAX_RETRIES}): ${url}`);
    await delay(RETRY_DELAY);
    return fetchWithRetry(url, options, retries - 1);
  }
};

/**
 * Kiểm tra kết nối internet
 * @returns {Promise<boolean>} true nếu có kết nối internet
 */
export const checkNetworkConnection = async () => {
  try {
    const response = await fetch('https://www.google.com', { 
      method: 'HEAD',
      timeout: 5000
    });
    return response.ok;
  } catch (error) {
    console.log('Network connection check failed:', error);
    return false;
  }
};

/**
 * Lấy vị trí hiện tại của người dùng
 * @returns {Promise<Object>} Vị trí hiện tại
 */
export const getCurrentLocation = async () => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      throw new Error('Quyền truy cập vị trí bị từ chối');
    }
    
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High
    });
    
    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      timestamp: location.timestamp
    };
  } catch (error) {
    console.error('Error getting current location:', error);
    throw new Error('Không thể lấy vị trí hiện tại. Vui lòng kiểm tra quyền truy cập và kết nối mạng.');
  }
};

/**
 * Lấy địa chỉ từ tọa độ
 * @param {number} latitude - Vĩ độ
 * @param {number} longitude - Kinh độ
 * @returns {Promise<string>} Địa chỉ
 */
export const getAddressFromCoordinates = async (latitude, longitude) => {
  try {
    // Kiểm tra kết nối mạng trước khi gọi API
    const isConnected = await checkNetworkConnection();
    if (!isConnected) {
      return 'Không có kết nối mạng';
    }
    
    const url = `${NOMINATIM_API}/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1&accept-language=vi`;
    const response = await fetchWithRetry(url, {
      headers: {
        'User-Agent': 'GoThereApp/1.0'
      },
      timeout: 10000
    });
    
    const data = await response.json();
    
    if (data && data.display_name) {
      return data.display_name;
    } else {
      return 'Địa chỉ không xác định';
    }
  } catch (error) {
    console.error('Error getting address:', error);
    return 'Không thể lấy địa chỉ';
  }
};

/**
 * Tìm kiếm địa điểm theo từ khóa
 * @param {string} query - Từ khóa tìm kiếm
 * @param {Object} location - Vị trí hiện tại (tùy chọn)
 * @param {string} category - Danh mục tìm kiếm (tùy chọn)
 * @returns {Promise<Array>} Danh sách kết quả tìm kiếm
 */
export const searchPlaces = async (query, location, category) => {
  try {
    // Kiểm tra kết nối mạng trước khi gọi API
    const isConnected = await checkNetworkConnection();
    if (!isConnected) {
      throw new Error('Không có kết nối mạng');
    }
    
    // Xây dựng URL tìm kiếm
    let searchUrl = `${NOMINATIM_API}/search?format=json&addressdetails=1&accept-language=vi`;
    
    if (query) {
      searchUrl += `&q=${encodeURIComponent(query)}`;
    }
    
    if (location) {
      // Tìm kiếm xung quanh vị trí hiện tại
      searchUrl += `&lat=${location.lat}&lon=${location.lng}`;
    }
    
    if (category) {
      // Thêm bộ lọc danh mục nếu có
      searchUrl += `&category=${encodeURIComponent(category)}`;
    }
    
    // Thực hiện tìm kiếm
    const response = await fetchWithRetry(searchUrl, {
      headers: {
        'User-Agent': 'GoThereApp/1.0'
      },
      timeout: 10000
    });
    
    const data = await response.json();
    
    // Chuyển đổi kết quả sang định dạng ứng dụng
    const results = data.map((item, index) => {
      // Tính khoảng cách nếu có vị trí hiện tại
      let distance = '';
      if (location) {
        const distanceInKm = calculateDistance(
          { latitude: location.lat, longitude: location.lng },
          { latitude: parseFloat(item.lat), longitude: parseFloat(item.lon) }
        );
        
        distance = distanceInKm < 1 ? 
          `${Math.round(distanceInKm * 1000)} m` : 
          `${distanceInKm.toFixed(1)} km`;
      }
      
      // Xác định danh mục
      const category = item.category || item.type || 'other';
      
      return {
        id: item.place_id || index,
        name: item.name || item.display_name.split(',')[0],
        address: item.display_name,
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
        category,
        distance,
        rating: 0,
        timestamp: new Date().toISOString()
      };
    });
    
    return results;
  } catch (error) {
    console.error('Error searching places:', error);
    throw new Error('Không thể tìm kiếm địa điểm. Vui lòng thử lại sau.');
  }
};

/**
 * Tính khoảng cách giữa hai điểm
 * @param {Object} point1 - Điểm thứ nhất {latitude, longitude}
 * @param {Object} point2 - Điểm thứ hai {latitude, longitude}
 * @returns {number} Khoảng cách tính bằng km
 */
const calculateDistance = (point1, point2) => {
  const R = 6371; // Bán kính trái đất tính bằng km
  const dLat = deg2rad(point2.latitude - point1.latitude);
  const dLon = deg2rad(point2.longitude - point1.longitude);
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(point1.latitude)) * Math.cos(deg2rad(point2.latitude)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

/**
 * Chuyển đổi độ sang radian
 * @param {number} deg - Giá trị độ
 * @returns {number} Giá trị radian
 */
const deg2rad = (deg) => {
  return deg * (Math.PI/180);
};

export default {
  getCurrentLocation,
  getAddressFromCoordinates,
  searchPlaces
}; 