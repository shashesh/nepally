import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { MainTabParamList } from '../types/navigation';
import { HomeNavigator } from './HomeNavigator';
import { PostNavigator } from './PostNavigator';
import { ProfileNavigator } from './ProfileNavigator';
import { ChatNavigator } from './ChatNavigator';
import { useAuth } from '../hooks/useAuth';
import { getTotalUnreadCount } from '@nusa/shared';
import { supabase } from '../config/supabase';
import { colors } from '../styles/colors';
import { typography } from '../styles/typography';
import { spacing } from '../styles/spacing';

const Tab = createBottomTabNavigator<MainTabParamList>();

function ComingSoonScreen({ label }: { label: string }) {
  return (
    <View style={styles.comingSoon}>
      <Ionicons name="construct-outline" size={48} color={colors.text.disabled} />
      <Text style={styles.comingSoonTitle}>{label}</Text>
      <Text style={styles.comingSoonSubtitle}>Coming soon</Text>
    </View>
  );
}

function SearchScreen() {
  return <ComingSoonScreen label="Search" />;
}

export function MainTabNavigator() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    if (!user?.id) return;
    const result = await getTotalUnreadCount(supabase, user.id);
    setUnreadCount(result.count);
  }, [user?.id]);

  // Refresh unread count when tab navigator is focused
  useFocusEffect(
    useCallback(() => {
      refreshUnreadCount();
      const interval = setInterval(refreshUnreadCount, 30000);
      return () => clearInterval(interval);
    }, [refreshUnreadCount])
  );

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
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Post"
        component={PostNavigator}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Messages"
        component={ChatNavigator}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles" size={size} color={color} />
          ),
          tabBarBadge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.accent.red },
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileNavigator}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  comingSoon: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  comingSoonTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginTop: spacing.s,
  },
  comingSoonSubtitle: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
});
