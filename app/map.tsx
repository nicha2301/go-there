import { Redirect, Stack } from 'expo-router';
import React from 'react';

export default function Page() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Redirect href="/" />
    </>
  );
} 