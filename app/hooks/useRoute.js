import { useCallback, useRef, useState } from 'react';
import { findRoute, getRouteInstructions } from '../services/routeService';

/**
 * Hook quản lý tìm đường và chỉ đường
 * @returns {Object} Thông tin về tuyến đường và các hàm liên quan
 */
const useRoute = () => {
  const [route, setRoute] = useState(null);
  const [instructions, setInstructions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Sử dụng useRef để theo dõi yêu cầu tìm đường đang chờ xử lý
  const pendingRequestRef = useRef(null);
  const requestQueueRef = useRef([]);
  const isProcessingRef = useRef(false);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 3000; // 3 giây

  /**
   * Tìm đường đi giữa hai điểm
   * @param {Object} startLocation - Điểm bắt đầu {latitude, longitude}
   * @param {Object} endLocation - Điểm kết thúc {latitude, longitude}
   * @param {string} transportMode - Phương tiện di chuyển (walking, cycling, driving)
   * @returns {Promise<Object|null>} Thông tin tuyến đường hoặc null nếu có lỗi
   */
  const getRoute = useCallback(async (startLocation, endLocation, transportMode = 'driving') => {
    // Kiểm tra tham số đầu vào
    if (!startLocation || !endLocation) {
      setError('Thiếu thông tin điểm bắt đầu hoặc điểm kết thúc');
      return null;
    }
    
    // Tạo key cho request
    const requestKey = JSON.stringify({ startLocation, endLocation, transportMode });
    
    // Nếu đang có request với cùng tham số, hủy request đó
    if (pendingRequestRef.current === requestKey) {
      return null;
    }
    
    // Thêm vào hàng đợi
    requestQueueRef.current.push({
      startLocation,
      endLocation,
      transportMode,
      requestKey
    });
    
    // Xử lý hàng đợi nếu chưa có quá trình nào đang chạy
    if (!isProcessingRef.current) {
      processQueue();
    }
    
    return new Promise((resolve) => {
      // Kiểm tra kết quả sau một khoảng thời gian
      const checkInterval = setInterval(() => {
        if (route && pendingRequestRef.current === requestKey) {
          clearInterval(checkInterval);
          resolve(route);
        }
      }, 500);
      
      // Timeout sau 30 giây
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve(null);
      }, 30000);
    });
  }, [route]);

  /**
   * Xử lý hàng đợi yêu cầu tìm đường
   */
  const processQueue = useCallback(async () => {
    if (requestQueueRef.current.length === 0) {
      isProcessingRef.current = false;
      return;
    }
    
    isProcessingRef.current = true;
    
    // Lấy yêu cầu tiếp theo từ hàng đợi
    const { startLocation, endLocation, transportMode, requestKey } = requestQueueRef.current.shift();
    
    // Đánh dấu request hiện tại
    pendingRequestRef.current = requestKey;
    
    try {
      setLoading(true);
      setError(null);
      
      console.log(`Finding route from ${JSON.stringify(startLocation)} to ${JSON.stringify(endLocation)}`);
      
      const routeData = await findRoute(
        startLocation.latitude,
        startLocation.longitude,
        endLocation.latitude,
        endLocation.longitude,
        transportMode
      );
      
      if (routeData) {
        setRoute(routeData);
        
        // Lấy chỉ đường chi tiết
        const routeInstructions = await getRouteInstructions(routeData);
        setInstructions(routeInstructions);
        
        retryCountRef.current = 0; // Reset retry counter on success
      } else {
        throw new Error('Không tìm thấy đường đi');
      }
    } catch (err) {
      console.error('Error finding route:', err);
      
      if (retryCountRef.current < MAX_RETRIES) {
        // Thử lại nếu chưa đạt số lần tối đa
        retryCountRef.current++;
        console.log(`Retrying route request (${retryCountRef.current}/${MAX_RETRIES})...`);
        
        // Thêm lại vào đầu hàng đợi
        requestQueueRef.current.unshift({
          startLocation, 
          endLocation, 
          transportMode,
          requestKey
        });
        
        // Chờ một khoảng thời gian trước khi thử lại
        setTimeout(() => {
          processQueue();
        }, RETRY_DELAY);
        
        return;
      }
      
      setError('Không thể tìm đường đi. Vui lòng kiểm tra kết nối mạng và thử lại sau.');
      setRoute(null);
      setInstructions([]);
    } finally {
      setLoading(false);
      
      // Xử lý yêu cầu tiếp theo trong hàng đợi
      setTimeout(() => {
        processQueue();
      }, 500);
    }
  }, []);

  /**
   * Xóa tuyến đường hiện tại
   */
  const clearRoute = useCallback(() => {
    setRoute(null);
    setInstructions([]);
    setError(null);
    
    // Xóa tất cả các yêu cầu đang chờ
    requestQueueRef.current = [];
    pendingRequestRef.current = null;
    retryCountRef.current = 0;
  }, []);

  return {
    route,
    instructions,
    loading,
    error,
    getRoute,
    clearRoute
  };
};

export default useRoute; 