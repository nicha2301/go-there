// Service để tìm đường đi với OSRM API

// API OSRM miễn phí của OpenStreetMap
const OSRM_BASE_URL = 'https://router.project-osrm.org/route/v1';
const DEFAULT_PROFILE = 'driving'; // các profile khác: walking, cycling

// Lấy đường đi giữa hai điểm
export const getRoute = async (startPoint, endPoint, profile = DEFAULT_PROFILE) => {
  try {
    const { latitude: startLat, longitude: startLng } = startPoint;
    const { latitude: endLat, longitude: endLng } = endPoint;
    
    const coordinates = `${startLng},${startLat};${endLng},${endLat}`;
    const url = `${OSRM_BASE_URL}/${profile}/${coordinates}?overview=full&geometries=geojson&steps=true`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      throw new Error('Không tìm thấy đường đi');
    }
    
    const route = data.routes[0];
    
    // Phân tích từng bước chỉ đường
    const steps = [];
    if (route.legs && route.legs.length > 0) {
      route.legs.forEach(leg => {
        if (leg.steps && leg.steps.length > 0) {
          leg.steps.forEach(step => {
            steps.push({
              maneuver: step.maneuver,
              instruction: step.maneuver.type,
              distance: step.distance,
              duration: step.duration,
            });
          });
        }
      });
    }
    
    return {
      distance: route.distance, // Khoảng cách (m)
      duration: route.duration, // Thời gian (giây)
      geometry: route.geometry, // Tọa độ polyline
      steps, // Các bước chỉ đường
    };
  } catch (error) {
    console.error('Error getting route:', error);
    throw error;
  }
};

// Chuyển đổi thời gian từ giây sang format đọc được
export const formatDuration = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours} giờ ${minutes} phút`;
  }
  return `${minutes} phút`;
};

// Chuyển đổi khoảng cách từ m sang format đọc được
export const formatDistance = (meters) => {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
};

// Để hỗ trợ các phiên bản cũ hơn
const routeService = {
  getRoute,
  formatDuration,
  formatDistance
};

export default routeService; 