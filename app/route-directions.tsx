import { Redirect } from 'expo-router';
import React from 'react';

// Redirect để sử dụng file trong thư mục screens/RouteDirections/index.tsx
export default function RouteRedirect() {
  return <Redirect href="/screens/RouteDirections" />;
} 