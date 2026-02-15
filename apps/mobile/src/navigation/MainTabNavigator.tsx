import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { MainTabParamList } from '../types/navigation';
import HomeScreen from '../screens/HomeScreen';
import { PostNavigator } from './PostNavigator';
import { useAuth } from '../hooks/useAuth';
import { colors } from '../styles/colors';
import { typography } from '../styles/typography';
import { spacing, borderRadius } from '../styles/spacing';

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

function MessagesScreen() {
  return <ComingSoonScreen label="Messages" />;
}

function ProfileScreen() {
  const { user, signOut } = useAuth();

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <View style={styles.comingSoon}>
      <Ionicons name="person-circle-outline" size={64} color={colors.text.disabled} />
      <Text style={styles.comingSoonTitle}>{user?.full_name || 'Profile'}</Text>
      <Text style={styles.comingSoonSubtitle}>{user?.email}</Text>
      <Text style={styles.comingSoonSubtitle}>
        Trust Level {user?.trust_level} · {user?.zip_code || 'No ZIP'}
      </Text>
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
        <Ionicons name="log-out-outline" size={20} color={colors.error} />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );
}

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
        component={HomeScreen}
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
        component={MessagesScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
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
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.m,
    paddingVertical: spacing.s,
    paddingHorizontal: spacing.m,
    borderRadius: borderRadius.button,
    borderWidth: 1,
    borderColor: colors.error,
  },
  logoutText: {
    ...typography.button,
    color: colors.error,
  },
});
