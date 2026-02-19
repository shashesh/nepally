import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MarketplaceStackParamList } from '../types/navigation';
import { colors } from '../styles/colors';
import { typography } from '../styles/typography';
import { spacing } from '../styles/spacing';

const Stack = createNativeStackNavigator<MarketplaceStackParamList>();

function MarketplaceScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Marketplace</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="storefront-outline" size={64} color={colors.primary.main} />
        </View>
        <Text style={styles.title}>Coming Soon</Text>
        <Text style={styles.subtitle}>
          Discover local Nepalese businesses, restaurants, and professional services in your community.
        </Text>
        <View style={styles.featureList}>
          <Text style={styles.featureItem}>Find local businesses</Text>
          <Text style={styles.featureItem}>Read reviews and ratings</Text>
          <Text style={styles.featureItem}>Connect with service providers</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

export function MarketplaceNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.white },
        headerTintColor: colors.primary.main,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="MarketplaceMain"
        component={MarketplaceScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text.primary,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.l,
  },
  title: {
    ...typography.h2,
    color: colors.text.primary,
    marginBottom: spacing.s,
  },
  subtitle: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.l,
  },
  featureList: {
    alignItems: 'flex-start',
  },
  featureItem: {
    ...typography.body,
    color: colors.text.secondary,
    marginVertical: spacing.xs,
  },
});
