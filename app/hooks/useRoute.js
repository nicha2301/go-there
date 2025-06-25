import { useCallback, useEffect, useRef, useState } from 'react';
import { findRoute, getRouteInstructions } from '../services/routeService';

/**
 * Hook quản lý tìm đường và chỉ đường
 * @returns {Object} Thông tin về tuyến đường và các hàm liên quan
 */
const useRoute = () => {
  console.log('[useRoute] Hook initialized/re-rendered');
  
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

  // Thêm ref để theo dõi các tham số gọi gần đây để tránh gọi lặp lại
  const lastRequestParamsRef = useRef(null);

  /**
   * Tìm đường đi giữa hai điểm
   * @param {Object} startLocation - Điểm bắt đầu {latitude, longitude}
   * @param {Object} endLocation - Điểm kết thúc {latitude, longitude}
   * @param {string} transportMode - Phương tiện di chuyển (walking, cycling, driving)
   * @returns {Promise<Object|null>} Thông tin tuyến đường hoặc null nếu có lỗi
   */
  const getRoute = useCallback(async (startLocation, endLocation, transportMode = 'driving') => {
    console.log('[useRoute] getRoute called with', { startLocation, endLocation, transportMode });
    
    // Kiểm tra tham số đầu vào
    if (!startLocation || !endLocation) {
      console.log('[useRoute] Missing start or end location');
      setError('Thiếu thông tin điểm bắt đầu hoặc điểm kết thúc');
      return null;
    }
    
    // Tạo key cho request
    const requestKey = JSON.stringify({ startLocation, endLocation, transportMode });
    
    // Kiểm tra nếu request này giống với request trước đó
    if (lastRequestParamsRef.current === requestKey) {
      console.log('[useRoute] Duplicate request detected, returning current route');
      return route;
    }
    
    // Lưu tham số request hiện tại
    lastRequestParamsRef.current = requestKey;
    
    // Nếu đang có request với cùng tham số, hủy request đó
    if (pendingRequestRef.current === requestKey) {
      console.log('[useRoute] Request already pending with same parameters');
      return null;
    }
    
    // Thêm vào hàng đợi
    console.log('[useRoute] Adding request to queue');
    requestQueueRef.current.push({
      startLocation,
      endLocation,
      transportMode,
      requestKey
    });
    
    // Xử lý hàng đợi nếu chưa có quá trình nào đang chạy
    if (!isProcessingRef.current) {
      console.log('[useRoute] Starting queue processing');
      processQueue();
    } else {
      console.log('[useRoute] Queue is already being processed');
    }
    
    return new Promise((resolve) => {
      // Kiểm tra kết quả sau một khoảng thời gian
      const checkInterval = setInterval(() => {
        if (route && pendingRequestRef.current === requestKey) {
          console.log('[useRoute] Route found, resolving promise');
          clearInterval(checkInterval);
          resolve(route);
        }
      }, 500);
      
      // Timeout sau 30 giây
      setTimeout(() => {
        console.log('[useRoute] Request timeout after 30s');
        clearInterval(checkInterval);
        resolve(null);
      }, 30000);
    });
  }, [route]);

  /**
   * Xử lý hàng đợi yêu cầu tìm đường
   */
  const processQueue = useCallback(async () => {
    console.log('[useRoute] Processing queue, length:', requestQueueRef.current.length);
    
    if (requestQueueRef.current.length === 0) {
      console.log('[useRoute] Queue empty, stopping processing');
      isProcessingRef.current = false;
      return;
    }
    
    isProcessingRef.current = true;
    
    // Lấy yêu cầu tiếp theo từ hàng đợi
    const { startLocation, endLocation, transportMode, requestKey } = requestQueueRef.current.shift();
    console.log('[useRoute] Processing request:', { startLocation, endLocation, transportMode });
    
    // Đánh dấu request hiện tại
    pendingRequestRef.current = requestKey;
    
    try {
      setLoading(true);
      setError(null);
      
      console.log(`[useRoute] Finding route from ${JSON.stringify(startLocation)} to ${JSON.stringify(endLocation)}`);
      
      const routeData = await findRoute(
        startLocation.latitude,
        startLocation.longitude,
        endLocation.latitude,
        endLocation.longitude,
        transportMode
      );
      
      if (routeData) {
        console.log('[useRoute] Route found successfully');
        setRoute(routeData);
        
        // Lấy chỉ đường chi tiết
        console.log('[useRoute] Getting route instructions');
        const routeInstructions = await getRouteInstructions(routeData);
        setInstructions(routeInstructions);
        
        retryCountRef.current = 0; // Reset retry counter on success
      } else {
        console.log('[useRoute] No route data returned');
        throw new Error('Không tìm thấy đường đi');
      }
    } catch (err) {
      console.error('[useRoute] Error finding route:', err);
      
      if (retryCountRef.current < MAX_RETRIES) {
        // Thử lại nếu chưa đạt số lần tối đa
        retryCountRef.current++;
        console.log(`[useRoute] Retrying route request (${retryCountRef.current}/${MAX_RETRIES})...`);
        
        // Thêm lại vào đầu hàng đợi
        requestQueueRef.current.unshift({
          startLocation, 
          endLocation, 
          transportMode,
          requestKey
        });
        
        // Chờ một khoảng thời gian trước khi thử lại
        setTimeout(() => {
          console.log('[useRoute] Executing retry');
          processQueue();
        }, RETRY_DELAY);
        
        return;
      }
      
      console.log('[useRoute] Max retries reached, setting error');
      setError('Không thể tìm đường đi. Vui lòng kiểm tra kết nối mạng và thử lại sau.');
      setRoute(null);
      setInstructions([]);
    } finally {
      setLoading(false);
      
      // Xử lý yêu cầu tiếp theo trong hàng đợi
      setTimeout(() => {
        console.log('[useRoute] Processing next request in queue');
        processQueue();
      }, 500);
    }
  }, []);

  /**
   * Xóa tuyến đường hiện tại
   */
  const clearRoute = useCallback(() => {
    console.log('[useRoute] Clearing route');
    setRoute(null);
    setInstructions([]);
    setError(null);
    
    // Xóa tất cả các yêu cầu đang chờ
    requestQueueRef.current = [];
    pendingRequestRef.current = null;
    retryCountRef.current = 0;
    lastRequestParamsRef.current = null;
  }, []);

  // Log khi route thay đổi
  useEffect(() => {
    console.log('[useRoute] Route state changed:', route ? 'Route available' : 'No route');
  }, [route]);

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