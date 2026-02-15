import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PostStackParamList } from '../../types/navigation';
import { useAuth } from '../../hooks/useAuth';
import { TRUST_LEVELS } from '../../config/constants';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { spacing, borderRadius, shadows } from '../../styles/spacing';

type Props = NativeStackScreenProps<PostStackParamList, 'CategorySelect'>;

const CATEGORIES = [
  {
    id: 'housing' as const,
    label: 'Housing',
    description: 'Rooms, apartments, roommate searches',
    icon: 'home',
    color: colors.primary.main,
  },
  {
    id: 'jobs' as const,
    label: 'Jobs',
    description: 'Job listings, gig work, hiring',
    icon: 'briefcase',
    color: colors.success,
  },
  {
    id: 'emergency' as const,
    label: 'Emergency',
    description: 'Urgent help needed from the community',
    icon: 'warning',
    color: colors.error,
  },
  {
    id: 'travel' as const,
    label: 'Travel',
    description: 'Travel buddies, ride shares, packages',
    icon: 'airplane',
    color: colors.accent.red,
  },
];

export default function CategorySelectScreen({ navigation }: Props) {
  const { user } = useAuth();
  const isLevel0 = user?.trust_level === TRUST_LEVELS.NEW;

  if (isLevel0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.gateContainer}>
          <Ionicons name="shield-checkmark-outline" size={64} color={colors.text.disabled} />
          <Text style={styles.gateTitle}>Verification Required</Text>
          <Text style={styles.gateSubtitle}>
            Please verify your phone number to create posts. This helps keep our community safe.
          </Text>
          <TouchableOpacity
            style={styles.gateButton}
            onPress={() =>
              Alert.alert(
                'Phone Verification',
                'Phone verification will be implemented in Journey #02',
                [{ text: 'OK' }]
              )
            }
            activeOpacity={0.8}
          >
            <Text style={styles.gateButtonText}>Verify Now</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>What are you posting?</Text>
        <Text style={styles.subheading}>
          Choose a category for your post
        </Text>

        <View style={styles.grid}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('CreatePost', { category: cat.id })}
            >
              <View style={[styles.iconCircle, { backgroundColor: cat.color + '15' }]}>
                <Ionicons name={cat.icon as any} size={28} color={cat.color} />
              </View>
              <Text style={styles.cardLabel}>{cat.label}</Text>
              <Text style={styles.cardDescription}>{cat.description}</Text>
            </TouchableOpacity>
          ))}
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
  content: {
    padding: spacing.s,
  },
  heading: {
    ...typography.h2,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subheading: {
    ...typography.body,
    color: colors.text.secondary,
    marginBottom: spacing.m,
  },
  grid: {
    gap: spacing.s,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.card,
    padding: spacing.m,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  cardLabel: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.xxs,
  },
  cardDescription: {
    ...typography.body,
    color: colors.text.secondary,
    fontSize: 14,
  },
  gateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.l,
  },
  gateTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginTop: spacing.s,
  },
  gateSubtitle: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.m,
  },
  gateButton: {
    backgroundColor: colors.primary.main,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    borderRadius: borderRadius.button,
  },
  gateButtonText: {
    ...typography.button,
    color: colors.white,
  },
});
