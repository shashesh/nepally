import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { getMetroArea } from '../../utils/storage';
import { supabase } from '../../config/supabase';
import { ProfileStackParamList } from '../../types/navigation';
import { TrustLevel } from '@nusa/shared';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { spacing, borderRadius } from '../../styles/spacing';

type Navigation = NativeStackNavigationProp<ProfileStackParamList, 'ProfileView'>;

function getTrustLabel(level: number): string {
  switch (level) {
    case TrustLevel.NEW:
      return 'New Member';
    case TrustLevel.VERIFIED:
      return 'Verified';
    case TrustLevel.CONTRIBUTOR:
      return 'Contributor';
    default:
      return 'Unknown';
  }
}

function getTrustColor(level: number): string {
  switch (level) {
    case TrustLevel.NEW:
      return colors.badge.level0;
    case TrustLevel.VERIFIED:
      return colors.badge.level1;
    case TrustLevel.CONTRIBUTOR:
      return colors.badge.level2;
    default:
      return colors.badge.level0;
  }
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function ProfileScreen() {
  const navigation = useNavigation<Navigation>();
  const { user, signOut } = useAuth();
  const [metroName, setMetroName] = useState<string | null>(null);

  useEffect(() => {
    loadMetroArea();
  }, [user?.metro_area_id]);

  const loadMetroArea = async () => {
    // Try cached first
    const cached = await getMetroArea();
    if (cached) {
      setMetroName(`${cached.name}, ${cached.state}`);
      return;
    }

    // Fallback to Supabase
    if (user?.metro_area_id) {
      const { data } = await supabase
        .from('metro_areas')
        .select('name, state')
        .eq('id', user.metro_area_id)
        .single();
      if (data) {
        setMetroName(`${data.name}, ${data.state}`);
      }
    }
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const trustLevel = user?.trust_level ?? 0;
  const trustColor = getTrustColor(trustLevel);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Avatar & Basic Info */}
        <View style={styles.header}>
          <View style={[styles.avatar, { borderColor: trustColor }]}>
            <Text style={styles.avatarText}>
              {user?.full_name ? getInitials(user.full_name) : '?'}
            </Text>
          </View>
          <Text style={styles.name}>{user?.full_name || 'User'}</Text>
          <Text style={styles.email}>{user?.email}</Text>

          {/* Trust Badge */}
          <View style={[styles.trustBadge, { backgroundColor: trustColor }]}>
            <Ionicons name="shield-checkmark" size={14} color={colors.white} />
            <Text style={styles.trustText}>
              Level {trustLevel} — {getTrustLabel(trustLevel)}
            </Text>
          </View>
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          <View style={styles.infoRow}>
            <Ionicons name="location" size={20} color={colors.text.secondary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>
                {metroName || 'No metro area set'}
              </Text>
              {user?.zip_code && (
                <Text style={styles.infoSubtext}>ZIP {user.zip_code}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Account Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('EditProfile')}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={22} color={colors.text.primary} />
            <Text style={styles.menuLabel}>Edit Profile</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.text.disabled} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('ChangePassword')}
            activeOpacity={0.7}
          >
            <Ionicons name="lock-closed-outline" size={22} color={colors.text.primary} />
            <Text style={styles.menuLabel}>Change Password</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.text.disabled} />
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={20} color={colors.error} />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: spacing.l,
  },
  header: {
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingTop: spacing.l,
    paddingBottom: spacing.m,
    paddingHorizontal: spacing.l,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary.light,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.s,
  },
  avatarText: {
    ...typography.h2,
    color: colors.primary.main,
  },
  name: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.xxs,
  },
  email: {
    ...typography.body,
    color: colors.text.secondary,
    marginBottom: spacing.s,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.badge,
  },
  trustText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '600',
  },
  section: {
    backgroundColor: colors.white,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.s,
  },
  sectionTitle: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.s,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    ...typography.body,
    color: colors.text.primary,
  },
  infoSubtext: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.s,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  menuLabel: {
    ...typography.body,
    color: colors.text.primary,
    flex: 1,
    marginLeft: spacing.s,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.s,
    borderRadius: borderRadius.button,
    borderWidth: 1,
    borderColor: colors.error,
  },
  logoutText: {
    ...typography.button,
    color: colors.error,
  },
});
