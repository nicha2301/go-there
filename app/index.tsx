import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import theme from './constants/theme';

// Màn hình
import FavoritesScreen from './screens/favorites';
import HistoryScreen from './screens/history';
import MapScreen from './screens/map';
import SearchScreen from './screens/search';

// Tạo tab navigator
const Tab = createBottomTabNavigator();

const AppLayout = () => {
  const insets = useSafeAreaInsets();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.grey,
        tabBarStyle: {
          backgroundColor: theme.colors.card,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 10,
          borderTopColor: theme.colors.border,
          ...theme.shadow.small
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          
          if (route.name === 'map') {
            iconName = focused ? 'map' : 'map-outline';
          } else if (route.name === 'search') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'history') {
            iconName = focused ? 'time' : 'time-outline';
          } else if (route.name === 'favorites') {
            iconName = focused ? 'heart' : 'heart-outline';
          }
          
          return <Ionicons name={iconName} size={24} color={color} />;
        },
        tabBarLabelStyle: {
          fontSize: 12,
          marginBottom: 5
        }
      })}
    >
      <Tab.Screen
        name="map"
        component={MapScreen}
        options={{
          title: 'Bản đồ'
        }}
      />
      <Tab.Screen
        name="search"
        component={SearchScreen}
        options={{
          title: 'Tìm kiếm'
        }}
      />
      <Tab.Screen
        name="history"
        component={HistoryScreen}
        options={{
          title: 'Lịch sử'
        }}
      />
      <Tab.Screen
        name="favorites"
        component={FavoritesScreen}
        options={{
          title: 'Yêu thích'
        }}
      />
    </Tab.Navigator>
  );
};

export default AppLayout;
