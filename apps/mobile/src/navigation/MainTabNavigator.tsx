import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { MainTabParamList } from '../types/navigation';
import { HomeNavigator } from './HomeNavigator';
import { PostNavigator } from './PostNavigator';
import { ProfileNavigator } from './ProfileNavigator';
import { EventsNavigator } from './EventsNavigator';
import { MarketplaceNavigator } from './MarketplaceNavigator';
import { colors } from '../styles/colors';
import { spacing } from '../styles/spacing';

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary.main,
        tabBarInactiveTintColor: colors.text.secondary,
        tabBarStyle: {
          paddingBottom: spacing.xs,
          paddingTop: spacing.xs,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeNavigator}
        options={{
          tabBarLabel: 'Home',
          tabBarAccessibilityLabel: 'Home tab',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Post"
        component={PostNavigator}
        options={{
          tabBarLabel: 'Post',
          tabBarAccessibilityLabel: 'Create post tab',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Events"
        component={EventsNavigator}
        options={{
          tabBarLabel: 'Events',
          tabBarAccessibilityLabel: 'Events tab',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Marketplace"
        component={MarketplaceNavigator}
        options={{
          tabBarLabel: 'Marketplace',
          tabBarAccessibilityLabel: 'Marketplace tab',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="storefront-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileNavigator}
        options={{
          tabBarLabel: 'Profile',
          tabBarAccessibilityLabel: 'Profile tab',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
