import { useCallback, useEffect, useRef, useState } from 'react';
import { findRoute, getRouteInstructions } from '../services/routeService';

/**
 * Hook quản lý tìm đường
 * @returns {Object} Các hàm và trạng thái liên quan đến tìm đường
 */
const useRoute = () => {
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Sử dụng ref để theo dõi request mới nhất
  const pendingRequestRef = useRef(null);
  const routeResultRef = useRef(null);
  const timeoutIdRef = useRef(null);
  
  // Hàng đợi cho các yêu cầu tìm đường
  const [requestQueue, setRequestQueue] = useState([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  
  // Log lại mỗi khi hook được render
  console.log('[useRoute] Hook initialized/re-rendered');
  
  /**
   * Thêm yêu cầu tìm đường vào hàng đợi
   * @param {Object} request - Yêu cầu tìm đường
   */
  const addToQueue = useCallback((request) => {
    console.log('[useRoute] Adding request to queue', request);
    
    // Xóa các request cũ có cùng điểm đầu/cuối và phương tiện
    setRequestQueue(prevQueue => {
      // Lọc bỏ các request trùng lặp dựa trên các điểm đầu/cuối và phương tiện
      const filteredQueue = prevQueue.filter(item => {
        // Nếu request mới có cùng startLocation, endLocation và transportMode,
        // loại bỏ request cũ này
        const isSimilar = 
          Math.abs(item.startLocation.latitude - request.startLocation.latitude) < 0.0001 &&
          Math.abs(item.startLocation.longitude - request.startLocation.longitude) < 0.0001 &&
          Math.abs(item.endLocation.latitude - request.endLocation.latitude) < 0.0001 &&
          Math.abs(item.endLocation.longitude - request.endLocation.longitude) < 0.0001 &&
          item.transportMode === request.transportMode;
        
        // Giữ lại request nếu khác với request mới
        return !isSimilar;
      });
      
      // Chỉ giữ lại tối đa 3 request trong hàng đợi để tránh tràn
      const limitedQueue = filteredQueue.slice(-2);
      
      // Thêm request mới vào cuối hàng đợi
      return [...limitedQueue, request];
    });
  }, []);
  
  /**
   * Thực hiện tìm đường
   * @param {Object} startLocation - Vị trí bắt đầu
   * @param {Object} endLocation - Vị trí kết thúc
   * @param {string} transportMode - Phương tiện di chuyển
   * @returns {Promise<Object>} Thông tin tuyến đường
   */
  const getRoute = useCallback(async (startLocation, endLocation, transportMode = 'driving') => {
    try {
      console.log('[useRoute] getRoute called with', { startLocation, endLocation, transportMode });
      
      // Kiểm tra dữ liệu đầu vào
      if (!startLocation || !endLocation) {
        setError('Thiếu thông tin vị trí');
        return null;
      }
      
      // Tạo request key để theo dõi
      const requestKey = `${startLocation.latitude},${startLocation.longitude}-${endLocation.latitude},${endLocation.longitude}-${transportMode}-${Date.now()}`;
      
      // Thêm request vào hàng đợi
      const request = { startLocation, endLocation, transportMode, requestKey };
      addToQueue(request);
      
      // Bắt đầu xử lý hàng đợi nếu chưa chạy
      if (!isProcessingQueue) {
        console.log('[useRoute] Starting queue processing');
        setIsProcessingQueue(true);
      }
      
      // Lưu lại requestKey hiện tại
      pendingRequestRef.current = requestKey;
      
      // Xóa timeout cũ nếu có
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
      
      // Thiết lập timeout ngắn hơn để tránh đợi quá lâu
      const timeoutPromise = new Promise((_, reject) => {
        timeoutIdRef.current = setTimeout(() => {
          console.log('[useRoute] Request timeout after 8s');
          reject(new Error('Thời gian tìm đường quá lâu'));
        }, 8000);
      });
      
      // Trả về Promise đợi kết quả hoặc timeout
      try {
        const result = await Promise.race([
          // Promise đợi kết quả
          new Promise((resolve) => {
            // Thiết lập interval để kiểm tra kết quả
            const checkInterval = setInterval(() => {
              // Nếu đã có kết quả và request key khớp
              if (routeResultRef.current && pendingRequestRef.current === requestKey) {
                console.log('[useRoute] Route found, resolving promise');
                clearInterval(checkInterval);
                
                // Xóa timeout
                if (timeoutIdRef.current) {
                  clearTimeout(timeoutIdRef.current);
                  timeoutIdRef.current = null;
                }
                
                resolve(routeResultRef.current);
                
                // Reset result ref sau khi đã resolve
                routeResultRef.current = null;
              }
            }, 200); // Kiểm tra mỗi 200ms
            
            // Sau 10s nếu vẫn chưa tìm thấy route, clear interval
            setTimeout(() => {
              clearInterval(checkInterval);
            }, 10000);
          }),
          // Promise timeout
          timeoutPromise
        ]);
        
        return result;
      } catch (error) {
        console.error('[useRoute] Error in promise race:', error);
        setError(error.message);
        return null;
      }
    } catch (error) {
      console.error('[useRoute] Error in getRoute:', error);
      setError(error.message);
      return null;
    }
  }, [addToQueue, isProcessingQueue]);
  
  /**
   * Xử lý hàng đợi yêu cầu tìm đường
   */
  useEffect(() => {
    // Nếu không có request nào trong hàng đợi hoặc đang xử lý request khác, không làm gì
    if (requestQueue.length === 0 || loading || !isProcessingQueue) {
      return;
    }
    
    const processQueue = async () => {
      console.log('[useRoute] Processing queue, length:', requestQueue.length);
      
      // Lấy request mới nhất thay vì cũ nhất
      const currentRequest = requestQueue[requestQueue.length - 1];
      const remainingQueue = requestQueue.slice(0, -1);
      
      console.log('[useRoute] Processing request:', currentRequest);
      
      try {
        setLoading(true);
        setError(null);
        
        const { startLocation, endLocation, transportMode, requestKey } = currentRequest;
        
        // Lưu lại request key hiện tại
        pendingRequestRef.current = requestKey;
        
        // Log thông tin tìm đường
        console.log('[useRoute] Finding route from', startLocation, 'to', endLocation);
        
        // Tìm đường
        const result = await findRoute(
          startLocation.latitude,
          startLocation.longitude,
          endLocation.latitude,
          endLocation.longitude,
          transportMode
        );
        
        // Lưu kết quả vào ref để có thể truy cập trong promise
        routeResultRef.current = result;
        
        // Cập nhật kết quả nếu request key vẫn là hiện tại
        if (pendingRequestRef.current === requestKey) {
          console.log('[useRoute] Route found successfully');
          setRoute(result);
          
          // Cập nhật trạng thái
          console.log('[useRoute] Route state changed: Route available');
        } else {
          console.log('[useRoute] Request superseded, discarding result');
        }
      } catch (error) {
        console.error('[useRoute] Error processing queue:', error);
        setError(error.message);
        console.log('[useRoute] Route state changed: Error');
        
        // Reset refs khi có lỗi
        routeResultRef.current = null;
      } finally {
        setLoading(false);
        
        // Cập nhật hàng đợi - xóa tất cả vì chúng ta đã xử lý request mới nhất
        setRequestQueue([]);
        
        // Dừng xử lý hàng đợi vì đã xử lý xong request mới nhất
        console.log('[useRoute] Queue empty, stopping processing');
        setIsProcessingQueue(false);
      }
    };
    
    processQueue();
  }, [requestQueue, loading, isProcessingQueue]);
  
  /**
   * Xóa tuyến đường hiện tại
   */
  const clearRoute = useCallback(() => {
    console.log('[useRoute] Clearing route and refs');
    setRoute(null);
    setError(null);
    
    pendingRequestRef.current = null;
    routeResultRef.current = null;
    
    // Xóa timeout nếu có
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
  }, []);
  
  /**
   * Lấy hướng dẫn chỉ đường chi tiết
   * @param {Object} routeData - Thông tin tuyến đường
   * @returns {Promise<Array>} Danh sách hướng dẫn chỉ đường
   */
  const getInstructions = useCallback(async (routeData) => {
    try {
      console.log('[useRoute] Getting route instructions');
      return await getRouteInstructions(routeData);
    } catch (error) {
      console.error('[useRoute] Error getting instructions:', error);
      return [];
    }
  }, []);
  
  // Cleanup khi component unmount
  useEffect(() => {
    return () => {
      console.log('[useRoute] Cleanup on unmount');
      // Xóa timeout khi unmount
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
    };
  }, []);
  
  return {
    route,
    loading,
    error,
    getRoute,
    clearRoute,
    getInstructions
  };
};

export default useRoute; 