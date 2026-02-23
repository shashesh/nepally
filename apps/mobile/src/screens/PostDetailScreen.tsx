import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Share,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  buildSingleLevelCommentThreads,
  TrustLevel,
  TAG_EMOJI,
  TAG_COLORS,
  DEFAULT_TAG_COLOR,
} from '@nusa/shared';
import type { Post, PostComment } from '@nusa/shared';
import { Avatar } from '../components/Avatar';
import { HomeStackParamList } from '../types/navigation';
import { supabase } from '../config/supabase';
import { colors } from '../styles/colors';
import { typography } from '../styles/typography';
import { spacing, borderRadius } from '../styles/spacing';

type DetailRouteProp = RouteProp<HomeStackParamList, 'PostDetail'>;

/**
 * Convert a hex color to an rgba string at the given alpha.
 */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
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
  const [avatarMenuVisible, setAvatarMenuVisible] = useState(false);

  // Like state
  const [isLiked, setIsLiked] = useState(false);
  const [localLikesCount, setLocalLikesCount] = useState(0);

  // Comments state
  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [replyTarget, setReplyTarget] = useState<PostComment | null>(null);
  const [expandedReplyParents, setExpandedReplyParents] = useState<Record<string, boolean>>({});

  const isLevel0 = user?.trust_level === TrustLevel.NEW;
  const isOwnPost = post?.author_id === user?.id;
  const commentThreads = useMemo(() => buildSingleLevelCommentThreads(comments), [comments]);

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
    const result = await createComment(supabase, postId, commentText, replyTarget?.id);
    setSubmittingComment(false);

    if (result.data) {
      setComments((prev) => [...prev, result.data!]);
      setCommentText('');
      setReplyTarget(null);
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
            setComments((prev) => prev.filter((c) => c.id !== comment.id && c.parent_comment_id !== comment.id));
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

  const handleAvatarChat = async () => {
    if (!user || !post?.author) return;

    if (isLevel0) {
      Alert.alert(
        'Verify to Message',
        'Please verify your phone number to message others.',
        [{ text: 'OK' }]
      );
      return;
    }

    const result = await getOrCreateConversation(
      supabase,
      user.id,
      user.full_name,
      post.author.id,
      post.author.full_name
    );

    if (result.data) {
      const tabNav = navigation.getParent();
      if (tabNav) {
        tabNav.navigate('Chat', {
          screen: 'MessageThread',
          params: {
            conversationId: result.data.conversationId,
            otherUserId: post.author.id,
            otherUserName: post.author.full_name,
            otherUserTrustLevel: post.author.trust_level,
          },
        });
      }
    } else if (result.error) {
      Alert.alert('Error', 'Failed to start conversation. Please try again.');
    }
  };

  const handleSharePost = async () => {
    if (!post) return;

    const locationLabel = post.location_city ? ` (${post.location_city}, ${post.location_state})` : '';
    await Share.share({
      message: `${post.title}${locationLabel}\n\n${post.description}`,
      title: post.title,
    });
  };

  const toggleReplies = (parentId: string) => {
    setExpandedReplyParents((prev) => ({
      ...prev,
      [parentId]: !prev[parentId],
    }));
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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

        <ScrollView ref={scrollViewRef} contentContainerStyle={styles.scrollContent}>
          {post.author && (
            <View style={styles.authorRowTop}>
              <TouchableOpacity
                onPress={() => { if (!isOwnPost) setAvatarMenuVisible(true); }}
                activeOpacity={isOwnPost ? 1 : 0.7}
              >
                <Avatar
                  name={post.author.full_name}
                  photoUrl={post.author.profile_photo}
                  trustLevel={post.author.trust_level}
                  size="medium"
                />
              </TouchableOpacity>
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
                </View>
                <Text style={styles.authorMeta}>{getRelativeTime(post.created_at)}</Text>
              </View>
            </View>
          )}

          <Text style={styles.title}>{post.title}</Text>

          {post.description ? <Text style={styles.description}>{post.description}</Text> : null}

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionButton} onPress={handleLikePress} activeOpacity={0.7}>
              <Ionicons
                name={isLiked ? 'heart' : 'heart-outline'}
                size={20}
                color={isLiked ? colors.accent.red : colors.text.secondary}
              />
              <Text style={[styles.actionText, isLiked && { color: colors.accent.red }]}> {localLikesCount}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                commentsRef.current?.measureLayout(
                  scrollViewRef.current as any,
                  (_x: number, y: number) => {
                    scrollViewRef.current?.scrollTo({ y, animated: true });
                  },
                  () => undefined
                );
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="chatbubble-outline" size={20} color={colors.text.secondary} />
              <Text style={styles.actionText}> {comments.length}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonDisabled]}
              onPress={() => Alert.alert('Coming soon', 'Saved posts will be available soon.')}
              activeOpacity={0.7}
            >
              <Ionicons name="bookmark-outline" size={20} color={colors.text.disabled} />
              <Text style={[styles.actionText, styles.actionTextDisabled]}> Save</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleSharePost} activeOpacity={0.7}>
              <Ionicons name="share-social-outline" size={20} color={colors.text.secondary} />
              <Text style={styles.actionText}> Share</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.metaRow}>
            <View style={[styles.metaBadge, { backgroundColor: post.is_global ? '#E3F2FD' : '#E8F5E9' }]}> 
              <Text style={{ fontSize: 12, color: post.is_global ? '#1565C0' : '#388E3C', fontWeight: '500' }}>
                {post.is_global ? '🌐 Global' : '📍 Local'}
              </Text>
            </View>

            {post.tags?.map((tag) => {
              const tagColor = TAG_COLORS[tag.slug] || DEFAULT_TAG_COLOR;
              const emoji = TAG_EMOJI[tag.slug] || '';
              return (
                <View
                  key={tag.id}
                  style={[
                    styles.metaTag,
                    {
                      backgroundColor: hexToRgba(tagColor, 0.15),
                    },
                  ]}
                >
                  <Text style={{ fontSize: 12, fontWeight: '500', color: tagColor }}>
                    {emoji ? `${emoji} ${tag.name}` : tag.name}
                  </Text>
                </View>
              );
            })}

            {post.location_city ? (
              <Text style={styles.locationText}>{post.location_city}, {post.location_state}</Text>
            ) : null}
          </View>

          <View ref={commentsRef} style={styles.commentsSection}>
            <Text style={styles.commentsTitle}>Comments ({comments.length})</Text>

            {commentsLoading ? (
              <ActivityIndicator size="small" color={colors.primary.main} style={{ marginVertical: 16 }} />
            ) : commentThreads.length === 0 ? (
              <Text style={styles.emptyComments}>No comments yet. Be the first to comment!</Text>
            ) : (
              commentThreads.map((thread) => {
                const showReplies = expandedReplyParents[thread.parent.id] ?? false;

                return (
                  <View key={thread.parent.id} style={styles.commentThread}>
                    <View style={styles.commentItem}>
                      <Avatar
                        name={thread.parent.author?.full_name || 'User'}
                        photoUrl={thread.parent.author?.profile_photo}
                        trustLevel={thread.parent.author?.trust_level ?? 0}
                        size="small"
                      />
                      <View style={styles.commentContent}>
                        <View style={styles.commentHeader}>
                          <Text style={styles.commentAuthorName}>{thread.parent.author?.full_name || 'User'}</Text>
                          {(thread.parent.author?.trust_level ?? 0) >= TrustLevel.VERIFIED && (
                            <Ionicons name="checkmark-circle" size={14} color={colors.success} style={{ marginLeft: 3 }} />
                          )}
                          {thread.parent.author_id === post.author_id && (
                            <View style={styles.authorBadge}>
                              <Text style={styles.authorBadgeText}>Author</Text>
                            </View>
                          )}
                          <Text style={styles.commentTime}>{getRelativeTime(thread.parent.created_at)}</Text>
                        </View>
                        <Text style={styles.commentText}>{thread.parent.content}</Text>
                        <View style={styles.commentActionsInline}>
                          <TouchableOpacity onPress={() => setReplyTarget(thread.parent)}>
                            <Text style={styles.replyActionText}>Reply</Text>
                          </TouchableOpacity>
                          {thread.replies.length > 0 && (
                            <TouchableOpacity onPress={() => toggleReplies(thread.parent.id)}>
                              <Text style={styles.replyActionText}>
                                {showReplies ? 'Hide replies' : `Show replies (${thread.replies.length})`}
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                      {thread.parent.author_id === user?.id && (
                        <TouchableOpacity
                          onPress={() => handleDeleteComment(thread.parent)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          style={styles.deleteButton}
                        >
                          <Ionicons name="trash-outline" size={16} color={colors.text.disabled} />
                        </TouchableOpacity>
                      )}
                    </View>

                    {showReplies &&
                      thread.replies.map((reply) => (
                        <View key={reply.id} style={styles.replyItem}>
                          <Avatar
                            name={reply.author?.full_name || 'User'}
                            photoUrl={reply.author?.profile_photo}
                            trustLevel={reply.author?.trust_level ?? 0}
                            size="small"
                          />
                          <View style={styles.commentContent}>
                            <View style={styles.commentHeader}>
                              <Text style={styles.commentAuthorName}>{reply.author?.full_name || 'User'}</Text>
                              <Text style={styles.commentTime}>{getRelativeTime(reply.created_at)}</Text>
                            </View>
                            <Text style={styles.commentText}>{reply.content}</Text>
                          </View>
                          {reply.author_id === user?.id && (
                            <TouchableOpacity
                              onPress={() => handleDeleteComment(reply)}
                              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                              style={styles.deleteButton}
                            >
                              <Ionicons name="trash-outline" size={16} color={colors.text.disabled} />
                            </TouchableOpacity>
                          )}
                        </View>
                      ))}
                  </View>
                );
              })
            )}
          </View>

          <Text style={styles.footer}>
            Posted {new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            {post.location_city ? ` • ${post.location_city}, ${post.location_state}` : ''}
          </Text>
        </ScrollView>

        {/* Avatar Tap Menu */}
        <Modal
          visible={avatarMenuVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setAvatarMenuVisible(false)}
        >
          <Pressable style={styles.menuOverlay} onPress={() => setAvatarMenuVisible(false)}>
            <View style={styles.avatarMenu}>
              <TouchableOpacity
                style={styles.avatarMenuItem}
                onPress={() => {
                  setAvatarMenuVisible(false);
                  Alert.alert('Coming Soon', 'User profiles will be available in a future update.');
                }}
              >
                <Ionicons name="person-outline" size={20} color={colors.text.primary} />
                <Text style={styles.avatarMenuText}>View Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.avatarMenuItem}
                onPress={() => {
                  setAvatarMenuVisible(false);
                  handleAvatarChat();
                }}
              >
                <Ionicons name="chatbubble-outline" size={20} color={colors.primary.main} />
                <Text style={[styles.avatarMenuText, { color: colors.primary.main }]}>Chat</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>

        {!isLevel0 ? (
          <View style={styles.commentInputContainer}>
            {replyTarget && (
              <View style={styles.replyTargetBar}>
                <Text style={styles.replyTargetText}>Replying to {replyTarget.author?.full_name || 'user'}</Text>
                <TouchableOpacity onPress={() => setReplyTarget(null)}>
                  <Text style={styles.replyCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.commentComposerRow}>
              <TextInput
                style={styles.commentInput}
                placeholder={replyTarget ? 'Write a reply...' : 'Add a comment...'}
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
          </View>
        ) : (
          <View style={styles.commentInputContainer}>
            <Text style={styles.verifyPrompt}>Verify your account to comment</Text>
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
  authorRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: spacing.s,
  },
  title: {
    ...typography.h2,
    color: colors.text.primary,
    marginBottom: spacing.s,
  },
  description: {
    fontSize: 16,
    color: colors.text.primary,
    lineHeight: 24,
    marginBottom: spacing.s,
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
  authorMeta: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    marginBottom: spacing.s,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.background,
  },
  actionButtonDisabled: {
    opacity: 0.85,
  },
  actionText: {
    fontSize: 13,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  actionTextDisabled: {
    color: colors.text.disabled,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing.m,
  },
  metaBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  metaTag: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  locationText: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarMenu: {
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 180,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  avatarMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  avatarMenuText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.primary,
  },
  footer: {
    ...typography.caption,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.s,
  },
  commentsSection: {
    marginBottom: spacing.s,
  },
  commentsTitle: {
    ...typography.body,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.s,
  },
  emptyComments: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingVertical: spacing.m,
  },
  commentThread: {
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
    paddingBottom: spacing.xs,
    marginBottom: spacing.xs,
  },
  commentItem: {
    flexDirection: 'row',
    paddingVertical: 8,
    gap: 10,
  },
  replyItem: {
    flexDirection: 'row',
    marginLeft: 20,
    paddingVertical: 6,
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
  commentActionsInline: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  replyActionText: {
    fontSize: 12,
    color: colors.primary.main,
    fontWeight: '500',
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
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
  replyTargetBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    backgroundColor: colors.background,
    marginBottom: 8,
  },
  replyTargetText: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  replyCancelText: {
    fontSize: 13,
    color: colors.primary.main,
    fontWeight: '600',
  },
  commentComposerRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    paddingVertical: 8,
  },
});
