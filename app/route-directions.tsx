import { Redirect, useLocalSearchParams } from 'expo-router';
import React from 'react';
 
// Redirect để sử dụng file trong thư mục screens/RouteDirections/index.tsx
export default function RouteRedirect() {
  // Lấy tham số và chuyển tiếp đến màn hình chỉ đường thực sự
  const params = useLocalSearchParams();
  
  return (
    <Redirect 
      href={{
        pathname: "/screens/RouteDirections",
        params
      }} 
    />
  );
} 