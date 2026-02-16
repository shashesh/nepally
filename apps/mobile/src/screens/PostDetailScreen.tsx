import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { getPostById, Post } from '../services/api/posts';
import { getOrCreateConversation } from '../services/api/conversations';
import { HomeStackParamList } from '../types/navigation';
import { colors } from '../styles/colors';
import { typography } from '../styles/typography';
import { spacing, borderRadius } from '../styles/spacing';
import { TRUST_LEVELS } from '../config/constants';

type DetailRouteProp = RouteProp<HomeStackParamList, 'PostDetail'>;

const categoryIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  housing: 'home',
  jobs: 'briefcase',
  emergency: 'warning',
  travel: 'airplane',
};

const categoryColors: Record<string, string> = {
  housing: colors.primary.main,
  jobs: colors.success,
  emergency: colors.error,
  travel: colors.accent.red,
};

function getFieldRows(post: Post): { icon: string; label: string; value: string }[] {
  const fields = post.fields || {};
  const rows: { icon: string; label: string; value: string }[] = [];

  switch (post.category) {
    case 'housing':
      if (fields.rentAmount) rows.push({ icon: 'cash', label: 'Rent', value: `$${fields.rentAmount}/month` });
      if (fields.moveInDate) rows.push({ icon: 'calendar', label: 'Move-in', value: new Date(fields.moveInDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) });
      if (fields.roomType) rows.push({ icon: 'bed', label: 'Room Type', value: fields.roomType });
      break;
    case 'jobs':
      if (fields.payRate) rows.push({ icon: 'cash', label: 'Pay', value: `$${fields.payRate.min}–$${fields.payRate.max} ${fields.payRate.type}` });
      if (fields.employmentType) rows.push({ icon: 'briefcase', label: 'Type', value: fields.employmentType });
      if (fields.company) rows.push({ icon: 'business', label: 'Company', value: fields.company });
      break;
    case 'emergency':
      if (fields.emergencyType) rows.push({ icon: 'warning', label: 'Type', value: fields.emergencyType });
      if (fields.urgency) rows.push({ icon: 'alert-circle', label: 'Urgency', value: fields.urgency });
      break;
    case 'travel':
      if (fields.travelDate) rows.push({ icon: 'calendar', label: 'Date', value: new Date(fields.travelDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) });
      if (fields.route) rows.push({ icon: 'navigate', label: 'Route', value: `${fields.route.from} → ${fields.route.to}` });
      if (fields.airline) rows.push({ icon: 'airplane', label: 'Airline', value: fields.airline });
      break;
  }

  // Location
  if (post.location_city) {
    rows.push({ icon: 'location', label: 'Location', value: `${post.location_city}, ${post.location_state}` });
  }

  // Expiry
  const expiryDate = new Date(post.expiry_date);
  const now = new Date();
  const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / 86400000);
  if (daysLeft > 0) {
    rows.push({ icon: 'time', label: 'Expires', value: `in ${daysLeft} days` });
  } else {
    rows.push({ icon: 'time', label: 'Status', value: 'Expired' });
  }

  return rows;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

export default function PostDetailScreen() {
  const { user } = useAuth();
  const route = useRoute<DetailRouteProp>();
  const navigation = useNavigation();
  const { postId } = route.params;

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [contactLoading, setContactLoading] = useState(false);

  const isLevel0 = user?.trust_level === TRUST_LEVELS.NEW;
  const isOwnPost = post?.author_id === user?.id;

  useEffect(() => {
    loadPost();
  }, [postId]);

  const loadPost = async () => {
    const result = await getPostById(postId);
    if (result.data) {
      setPost(result.data);
    }
    setLoading(false);
  };

  const handleContactAuthor = async () => {
    if (!user || !post?.author) return;

    if (isLevel0) {
      Alert.alert(
        'Verify to Message',
        'Please verify your phone number to message post authors.',
        [{ text: 'OK' }]
      );
      return;
    }

    setContactLoading(true);
    const result = await getOrCreateConversation(
      user.id,
      user.full_name,
      post.author.id,
      post.author.full_name,
      post.id
    );
    setContactLoading(false);

    if (result.data) {
      // Navigate to Messages tab → MessageThread
      const tabNav = navigation.getParent();
      if (tabNav) {
        tabNav.navigate('Messages', {
          screen: 'MessageThread',
          params: {
            conversationId: result.data.conversationId,
            otherUserId: post.author.id,
            otherUserName: post.author.full_name,
            otherUserTrustLevel: post.author.trust_level,
            postId: post.id,
            postTitle: post.title,
            postCategory: post.category,
          },
        });
      }
    } else if (result.error) {
      Alert.alert('Error', 'Failed to start conversation. Please try again.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Post not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const fieldRows = getFieldRows(post);
  const catColor = categoryColors[post.category] || colors.primary.main;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Category Badge */}
        <View style={[styles.categoryBadge, { backgroundColor: catColor + '1A' }]}>
          <Ionicons
            name={categoryIcons[post.category]}
            size={16}
            color={catColor}
          />
          <Text style={[styles.categoryText, { color: catColor }]}>
            {post.category.charAt(0).toUpperCase() + post.category.slice(1)}
          </Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>{post.title}</Text>

        {/* Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>DETAILS</Text>
          {fieldRows.map((row, index) => (
            <View key={index} style={styles.fieldRow}>
              <Ionicons
                name={row.icon as any}
                size={18}
                color={colors.text.secondary}
                style={styles.fieldIcon}
              />
              <Text style={styles.fieldLabel}>{row.label}</Text>
              <Text
                style={[
                  styles.fieldValue,
                  row.label === 'Expires' && {
                    color: row.value === 'Expired' ? colors.error : colors.success,
                  },
                ]}
              >
                {row.value}
              </Text>
            </View>
          ))}
        </View>

        {/* Description Section */}
        {post.description && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>DESCRIPTION</Text>
            <Text style={styles.description}>{post.description}</Text>
          </View>
        )}

        {/* Author Section */}
        {post.author && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>POSTED BY</Text>
            <View style={styles.authorRow}>
              <View style={styles.authorAvatar}>
                <Text style={styles.authorAvatarText}>
                  {getInitials(post.author.full_name)}
                </Text>
              </View>
              <View style={styles.authorInfo}>
                <View style={styles.authorNameRow}>
                  <Text style={styles.authorName}>{post.author.full_name}</Text>
                  {post.author.trust_level >= TRUST_LEVELS.VERIFIED && (
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color={post.author.trust_level >= TRUST_LEVELS.CONTRIBUTOR ? colors.primary.main : colors.success}
                      style={{ marginLeft: 4 }}
                    />
                  )}
                  {post.author.trust_level >= TRUST_LEVELS.VERIFIED && (
                    <Text style={styles.trustLabel}>
                      {post.author.trust_level >= TRUST_LEVELS.CONTRIBUTOR ? 'Contributor' : 'Verified'}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Contact Author Button */}
        {!isOwnPost && (
          <TouchableOpacity
            style={[
              styles.contactButton,
              isLevel0 && styles.contactButtonDisabled,
            ]}
            onPress={handleContactAuthor}
            disabled={contactLoading}
            activeOpacity={0.8}
          >
            {contactLoading ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <Ionicons
                  name="chatbubble"
                  size={20}
                  color={colors.white}
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.contactButtonText}>
                  {isLevel0 ? 'Verify to Message' : 'Contact Author'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          Posted {new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          {post.location_city ? ` \u2022 ${post.location_city}, ${post.location_state}` : ''}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    ...typography.body,
    color: colors.text.secondary,
  },
  scrollContent: {
    padding: spacing.s,
    paddingBottom: spacing.l,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.badge,
    gap: 4,
    marginBottom: spacing.xs,
  },
  categoryText: {
    ...typography.caption,
    fontWeight: '600',
  },
  title: {
    ...typography.h2,
    color: colors.text.primary,
    marginBottom: spacing.s,
  },
  section: {
    marginBottom: spacing.m,
  },
  sectionHeader: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.text.secondary,
    letterSpacing: 1,
    marginBottom: spacing.xs,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  fieldIcon: {
    width: 24,
    marginRight: spacing.xs,
  },
  fieldLabel: {
    fontSize: 15,
    color: colors.text.secondary,
    width: 100,
  },
  fieldValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    flex: 1,
  },
  description: {
    fontSize: 16,
    color: colors.text.primary,
    lineHeight: 24,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  authorAvatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary.main,
  },
  authorInfo: {
    flex: 1,
  },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text.primary,
  },
  trustLabel: {
    ...typography.caption,
    color: colors.success,
    marginLeft: 4,
  },
  contactButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary.main,
    paddingVertical: 14,
    borderRadius: borderRadius.button,
    marginBottom: spacing.s,
  },
  contactButtonDisabled: {
    backgroundColor: colors.text.disabled,
  },
  contactButtonText: {
    ...typography.button,
    color: colors.white,
  },
  footer: {
    ...typography.caption,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});
