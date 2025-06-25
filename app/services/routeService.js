// Service để tìm đường đi với OSRM API


// API OSRM miễn phí của OpenStreetMap
const OSRM_BASE_URL = 'https://router.project-osrm.org/route/v1';
const DEFAULT_PROFILE = 'driving'; // các profile khác: walking, cycling

// Cấu hình API OpenStreetMap
const OSM_API_URL = 'https://routing.openstreetmap.de/routed-car/route/v1';

// API URLs
const OSRM_API_URL = 'https://router.project-osrm.org/route/v1';
const NOMINATIM_API = 'https://nominatim.openstreetmap.org';

// Cấu hình retry
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 giây
const REQUEST_TIMEOUT = 10000; // 10 giây thay vì 15 giây

/**
 * Hàm tiện ích để chờ một khoảng thời gian
 * @param {number} ms - Thời gian chờ tính bằng milliseconds
 * @returns {Promise<void>}
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Hàm fetch với cơ chế retry và timeout
 * @param {string} url - URL cần gọi
 * @param {Object} options - Tùy chọn fetch
 * @param {number} retries - Số lần thử lại còn lại
 * @returns {Promise<Response>}
 */
const fetchWithRetry = async (url, options = {}, retries = MAX_RETRIES) => {
  try {
    // Thêm AbortController để có thể hủy request nếu quá thời gian
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout || REQUEST_TIMEOUT);
    
    const enhancedOptions = {
      ...options,
      signal: controller.signal
    };
    
    try {
      const response = await fetch(url, enhancedOptions);
      // Xóa timeout khi request thành công
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      return response;
    } catch (error) {
      // Xóa timeout nếu có lỗi
      clearTimeout(timeoutId);
      
      // Nếu lỗi do abort thì đây là lỗi timeout
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      throw error;
    }
  } catch (error) {
    if (retries <= 0) {
      throw error;
    }
    
    console.log(`[routeService] Retry fetch (${MAX_RETRIES - retries + 1}/${MAX_RETRIES}): ${url}`);
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
 * Tìm đường đi giữa hai điểm
 * @param {number} startLat - Vĩ độ điểm bắt đầu
 * @param {number} startLng - Kinh độ điểm bắt đầu
 * @param {number} endLat - Vĩ độ điểm kết thúc
 * @param {number} endLng - Kinh độ điểm kết thúc
 * @param {string} mode - Phương tiện di chuyển (driving, walking, cycling)
 * @returns {Promise<Object|null>} Thông tin tuyến đường
 */
export const findRoute = async (startLat, startLng, endLat, endLng, mode = 'driving') => {
  try {
    console.log(`[routeService] Finding route from ${startLat},${startLng} to ${endLat},${endLng} by ${mode}`);
    
    // Kiểm tra tính hợp lệ của các tham số
    if (!startLat || !startLng || !endLat || !endLng) {
      throw new Error('Tọa độ không hợp lệ');
    }
    
    // Kiểm tra kết nối mạng trước khi gọi API
    const isConnected = await checkNetworkConnection();
    if (!isConnected) {
      throw new Error('Không có kết nối mạng');
    }
    
    // Xác định profile dựa trên phương tiện
    let profile;
    switch (mode) {
      case 'walking':
        profile = 'foot';
        break;
      case 'cycling':
        profile = 'bike';
        break;
      case 'driving':
      default:
        profile = 'car';
        break;
    }
    
    // Mã hóa tọa độ để tránh các ký tự đặc biệt
    const encodedStartLng = encodeURIComponent(startLng.toString());
    const encodedStartLat = encodeURIComponent(startLat.toString());
    const encodedEndLng = encodeURIComponent(endLng.toString());
    const encodedEndLat = encodeURIComponent(endLat.toString());
    
    // Tạo URL API
    const url = `${OSRM_API_URL}/${profile}/${encodedStartLng},${encodedStartLat};${encodedEndLng},${encodedEndLat}?overview=full&geometries=geojson&steps=true`;
    
    console.log(`[routeService] Calling OSRM API: ${url}`);
    
    // Gọi API với retry và timeout
    const response = await fetchWithRetry(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'GoThereApp/1.0'
      },
      timeout: REQUEST_TIMEOUT
    });
    
    const data = await response.json();
    
    // Kiểm tra kết quả
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      console.error('[routeService] API returned invalid response:', data);
      throw new Error('Không tìm thấy đường đi');
    }
    
    // Lấy tuyến đường đầu tiên
    const route = data.routes[0];
    console.log(`[routeService] Route found: ${formatDistance(route.distance)} - ${formatDuration(route.duration)}`);
    
    // Định dạng kết quả
    return {
      distance: route.distance, // mét
      duration: route.duration, // giây
      formattedDistance: formatDistance(route.distance),
      formattedDuration: formatDuration(route.duration),
      geometry: route.geometry,
      legs: route.legs,
      startPoint: { latitude: startLat, longitude: startLng },
      endPoint: { latitude: endLat, longitude: endLng },
      transportMode: mode
    };
  } catch (error) {
    console.error('[routeService] Error finding route:', error);
    
    // Kiểm tra loại lỗi để trả về thông báo phù hợp
    if (error.message.includes('timeout') || error.message.includes('abort')) {
      throw new Error('Thời gian tìm đường quá lâu. Vui lòng thử lại sau.');
    }
    
    throw new Error(`Không thể tìm đường đi: ${error.message}`);
  }
};

/**
 * Lấy chỉ đường chi tiết từ thông tin tuyến đường
 * @param {Object} routeData - Thông tin tuyến đường
 * @returns {Promise<Array>} Danh sách chỉ đường
 */
export const getRouteInstructions = async (routeData) => {
  try {
    if (!routeData || !routeData.legs || routeData.legs.length === 0) {
      return [];
    }
    
    // Lấy tất cả các bước từ các chặng
    let allSteps = [];
    routeData.legs.forEach(leg => {
      if (leg.steps && leg.steps.length > 0) {
        allSteps = [...allSteps, ...leg.steps];
      }
    });
    
    // Chuyển đổi các bước thành chỉ đường
    const instructions = allSteps.map((step, index) => {
      // Định dạng khoảng cách
      const distance = formatDistance(step.distance);
      
      // Định dạng hướng
      let direction = 'Đi thẳng';
      if (step.maneuver) {
        if (step.maneuver.type === 'turn') {
          if (step.maneuver.modifier === 'right') {
            direction = 'Rẽ phải';
          } else if (step.maneuver.modifier === 'left') {
            direction = 'Rẽ trái';
          } else if (step.maneuver.modifier === 'slight right') {
            direction = 'Rẽ nhẹ phải';
          } else if (step.maneuver.modifier === 'slight left') {
            direction = 'Rẽ nhẹ trái';
          } else if (step.maneuver.modifier === 'sharp right') {
            direction = 'Rẽ phải gắt';
          } else if (step.maneuver.modifier === 'sharp left') {
            direction = 'Rẽ trái gắt';
          } else if (step.maneuver.modifier === 'uturn') {
            direction = 'Quay đầu';
          }
        } else if (step.maneuver.type === 'roundabout') {
          direction = 'Đi vào vòng xoay';
        } else if (step.maneuver.type === 'arrive') {
          direction = 'Đến nơi';
        } else if (step.maneuver.type === 'depart') {
          direction = 'Xuất phát';
        }
      }
      
      // Tạo mô tả
      let description = step.name ? `${direction} vào ${step.name}` : direction;
      
      // Thêm khoảng cách
      description += ` (${distance})`;
      
      return {
        id: index,
        direction,
        description,
        distance: step.distance,
        duration: step.duration,
        name: step.name || '',
        coordinates: step.geometry ? step.geometry.coordinates : []
      };
    });
    
    return instructions;
  } catch (error) {
    console.error('Error getting route instructions:', error);
    return [];
  }
};

/**
 * Định dạng khoảng cách thành chuỗi dễ đọc
 * @param {number} distanceInMeters - Khoảng cách tính bằng mét
 * @returns {string} Chuỗi khoảng cách đã định dạng
 */
const formatDistance = (distanceInMeters) => {
  if (distanceInMeters < 1000) {
    return `${Math.round(distanceInMeters)} m`;
  } else {
    const km = distanceInMeters / 1000;
    return `${km.toFixed(1)} km`;
  }
};

/**
 * Định dạng thời gian thành chuỗi dễ đọc
 * @param {number} durationInSeconds - Thời gian tính bằng giây
 * @returns {string} Chuỗi thời gian đã định dạng
 */
const formatDuration = (durationInSeconds) => {
  const hours = Math.floor(durationInSeconds / 3600);
  const minutes = Math.floor((durationInSeconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours} giờ ${minutes} phút`;
  } else {
    return `${minutes} phút`;
  }
};

// Để hỗ trợ các phiên bản cũ hơn
const routeService = {
  findRoute,
  getRouteInstructions
};

export default routeService; 