import { Redirect, useLocalSearchParams } from 'expo-router';
import React, { useEffect } from 'react';
 
// Redirect để sử dụng file trong thư mục screens/RouteDirections/index.tsx
export default function RouteRedirect() {
  // Lấy tham số và chuyển tiếp đến màn hình chỉ đường thực sự
  const params = useLocalSearchParams();
  
  useEffect(() => {
    console.log('[RouteRedirect] Redirecting with params:', params);
  }, [params]);
  
  return (
    <Redirect 
      href={{
        pathname: "/screens/RouteDirections",
        params
      }} 
    />
  );
} 