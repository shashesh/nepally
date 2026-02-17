import React, { useState, useEffect, useRef } from 'react';
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
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import {
  getPostById,
  getOrCreateConversation,
  likePost,
  unlikePost,
  getUserLikedPostIds,
  getPostComments,
  createComment,
  deleteComment,
  TrustLevel,
} from '@nusa/shared';
import type { Post, PostComment } from '@nusa/shared';
import { Avatar } from '../components/Avatar';
import { HomeStackParamList } from '../types/navigation';
import { supabase } from '../config/supabase';
import { colors } from '../styles/colors';
import { typography } from '../styles/typography';
import { spacing, borderRadius } from '../styles/spacing';

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

export default function PostDetailScreen() {
  const { user } = useAuth();
  const route = useRoute<DetailRouteProp>();
  const navigation = useNavigation();
  const { postId } = route.params;
  const scrollViewRef = useRef<ScrollView>(null);
  const commentsRef = useRef<View>(null);

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [contactLoading, setContactLoading] = useState(false);

  // Like state
  const [isLiked, setIsLiked] = useState(false);
  const [localLikesCount, setLocalLikesCount] = useState(0);

  // Comments state
  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const isLevel0 = user?.trust_level === TrustLevel.NEW;
  const isOwnPost = post?.author_id === user?.id;

  useEffect(() => {
    loadPost();
    loadComments();
    loadLikeState();
  }, [postId]);

  const loadPost = async () => {
    const result = await getPostById(supabase, postId);
    if (result.data) {
      setPost(result.data);
      setLocalLikesCount(result.data.likes_count ?? 0);
    }
    setLoading(false);
  };

  const loadComments = async () => {
    setCommentsLoading(true);
    const result = await getPostComments(supabase, postId);
    if (result.data) {
      setComments(result.data);
    }
    setCommentsLoading(false);
  };

  const loadLikeState = async () => {
    if (!user?.id) return;
    const result = await getUserLikedPostIds(supabase, user.id);
    if (result.data) {
      setIsLiked(result.data.includes(postId));
    }
  };

  const handleLikePress = async () => {
    if (isLevel0) {
      Alert.alert(
        'Verify to Like',
        'Please verify your phone number to like posts.',
        [{ text: 'OK' }]
      );
      return;
    }

    const wasLiked = isLiked;
    // Optimistic
    setIsLiked(!wasLiked);
    setLocalLikesCount((c) => c + (wasLiked ? -1 : 1));

    const result = wasLiked ? await unlikePost(supabase, postId) : await likePost(supabase, postId);
    if (result.error) {
      setIsLiked(wasLiked);
      setLocalLikesCount((c) => c + (wasLiked ? 1 : -1));
      Alert.alert('Error', 'Failed to update like.');
    }
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim() || submittingComment) return;

    if (isLevel0) {
      Alert.alert(
        'Verify to Comment',
        'Please verify your phone number to comment on posts.',
        [{ text: 'OK' }]
      );
      return;
    }

    setSubmittingComment(true);
    const result = await createComment(supabase, postId, commentText);
    setSubmittingComment(false);

    if (result.data) {
      setComments((prev) => [...prev, result.data!]);
      setCommentText('');
    } else {
      Alert.alert('Error', 'Failed to post comment. Please try again.');
    }
  };

  const handleDeleteComment = async (comment: PostComment) => {
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            // Optimistic
            setComments((prev) => prev.filter((c) => c.id !== comment.id));
            const result = await deleteComment(supabase, comment.id);
            if (result.error) {
              setComments((prev) => [...prev, comment].sort(
                (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              ));
              Alert.alert('Error', 'Failed to delete comment.');
            }
          },
        },
      ]
    );
  };

  const getRelativeTime = (dateStr: string): string => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return `${Math.floor(days / 7)}w ago`;
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
      supabase,
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

        <ScrollView ref={scrollViewRef} contentContainerStyle={styles.scrollContent}>
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
              <Avatar
                name={post.author.full_name}
                photoUrl={post.author.profile_photo}
                trustLevel={post.author.trust_level}
                size="medium"
              />
              <View style={styles.authorInfo}>
                <View style={styles.authorNameRow}>
                  <Text style={styles.authorName}>{post.author.full_name}</Text>
                  {post.author.trust_level >= TrustLevel.VERIFIED && (
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color={post.author.trust_level >= TrustLevel.CONTRIBUTOR ? colors.primary.main : colors.success}
                      style={{ marginLeft: 4 }}
                    />
                  )}
                  {post.author.trust_level >= TrustLevel.VERIFIED && (
                    <Text style={styles.trustLabel}>
                      {post.author.trust_level >= TrustLevel.CONTRIBUTOR ? 'Contributor' : 'Verified'}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Like Button */}
        <TouchableOpacity
          style={styles.likeRow}
          onPress={handleLikePress}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={24}
            color={isLiked ? colors.accent.red : colors.text.secondary}
          />
          <Text style={[styles.likeCount, isLiked && { color: colors.accent.red }]}>
            {localLikesCount} {localLikesCount === 1 ? 'like' : 'likes'}
          </Text>
        </TouchableOpacity>

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

        {/* Comments Section */}
        <View ref={commentsRef} style={styles.section}>
          <Text style={styles.sectionHeader}>
            COMMENTS ({comments.length})
          </Text>

          {commentsLoading ? (
            <ActivityIndicator size="small" color={colors.primary.main} style={{ marginVertical: 16 }} />
          ) : comments.length === 0 ? (
            <Text style={styles.emptyComments}>
              No comments yet. Be the first to comment!
            </Text>
          ) : (
            comments.map((comment) => (
              <View key={comment.id} style={styles.commentItem}>
                <Avatar
                  name={comment.author?.full_name || 'User'}
                  photoUrl={comment.author?.profile_photo}
                  trustLevel={comment.author?.trust_level ?? 0}
                  size="small"
                />
                <View style={styles.commentContent}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.commentAuthorName}>
                      {comment.author?.full_name || 'User'}
                    </Text>
                    {(comment.author?.trust_level ?? 0) >= TrustLevel.VERIFIED && (
                      <Ionicons name="checkmark-circle" size={14} color={colors.success} style={{ marginLeft: 3 }} />
                    )}
                    {comment.author_id === post?.author_id && (
                      <View style={styles.authorBadge}>
                        <Text style={styles.authorBadgeText}>Author</Text>
                      </View>
                    )}
                    <Text style={styles.commentTime}>
                      {getRelativeTime(comment.created_at)}
                    </Text>
                  </View>
                  <Text style={styles.commentText}>{comment.content}</Text>
                </View>
                {comment.author_id === user?.id && (
                  <TouchableOpacity
                    onPress={() => handleDeleteComment(comment)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={styles.deleteButton}
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.text.disabled} />
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Posted {new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          {post.location_city ? ` \u2022 ${post.location_city}, ${post.location_state}` : ''}
        </Text>
      </ScrollView>

      {/* Comment Input (sticky bottom) */}
      {!isLevel0 ? (
        <View style={styles.commentInputContainer}>
          <TextInput
            style={styles.commentInput}
            placeholder="Add a comment..."
            placeholderTextColor={colors.text.disabled}
            value={commentText}
            onChangeText={(text) => setCommentText(text.slice(0, 1000))}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            onPress={handleSubmitComment}
            disabled={!commentText.trim() || submittingComment}
            style={[
              styles.sendButton,
              (!commentText.trim() || submittingComment) && styles.sendButtonDisabled,
            ]}
          >
            {submittingComment ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Ionicons name="send" size={18} color={colors.white} />
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.commentInputContainer}>
          <Text style={styles.verifyPrompt}>
            Verify your account to comment
          </Text>
        </View>
      )}
      </SafeAreaView>
    </KeyboardAvoidingView>
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
    gap: 12,
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
  // Like row
  likeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    marginBottom: spacing.s,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  likeCount: {
    fontSize: 15,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  // Comments
  emptyComments: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingVertical: spacing.m,
  },
  commentItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
    gap: 10,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 2,
  },
  commentAuthorName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary,
  },
  commentTime: {
    fontSize: 12,
    color: colors.text.secondary,
    marginLeft: 'auto',
  },
  commentText: {
    fontSize: 14,
    color: colors.text.primary,
    lineHeight: 20,
  },
  authorBadge: {
    backgroundColor: colors.primary.light,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  authorBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary.main,
  },
  deleteButton: {
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  // Comment input
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
    gap: 8,
  },
  commentInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text.primary,
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.text.disabled,
  },
  verifyPrompt: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    color: colors.text.secondary,
    paddingVertical: 4,
  },
});
