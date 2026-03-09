import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
  Image,
  Animated,
  useWindowDimensions,
} from 'react-native';
import {
  PinchGestureHandler,
  PanGestureHandler,
  State,
  GestureHandlerRootView,
  ScrollView as GHScrollView,
  type PinchGestureHandlerStateChangeEvent,
  type HandlerStateChangeEvent,
  type PanGestureHandlerEventPayload,
} from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import {
  getPostById,
  getOrCreateConversation,
  likePost,
  unlikePost,
  getUserLikedPostIds,
  savePost,
  unsavePost,
  getUserSavedPostIds,
  getPostComments,
  createComment,
  deleteComment,
  buildSingleLevelCommentThreads,
  logClientEvent,
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
const DETAIL_CAROUSEL_CHROME_HIDE_DELAY_MS = 1500;
const DETAIL_LIGHTBOX_CHROME_HIDE_DELAY_MS = 1500;
const LIGHTBOX_MIN_SCALE = 1;
const LIGHTBOX_MAX_SCALE = 4;
const DOUBLE_TAP_ZOOM_SCALE = 2.5;

type AvatarMenuUser = {
  id: string;
  full_name: string;
  trust_level: number;
};

/**
 * Convert a hex color to an rgba string at the given alpha.
 */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function PinchableLightboxImage({
  uri,
  onInteract,
  onZoomChange,
  viewportWidth,
  viewportHeight,
}: {
  uri: string;
  onInteract: () => void;
  onZoomChange: (zoomed: boolean) => void;
  viewportWidth: number;
  viewportHeight: number;
}) {
  // Scale
  const baseScale = useRef(new Animated.Value(1)).current;
  const pinchScale = useRef(new Animated.Value(1)).current;
  // displayScale is the same Animated.multiply pattern as the original working code
  const displayScale = useMemo(() => Animated.multiply(baseScale, pinchScale), [baseScale, pinchScale]);
  const currentScale = useRef(1);

  // Pan — single Animated.Values, registered by the Animated.View transform on mount.
  // Using setOffset/flattenOffset for accumulation avoids Animated.add, which requires
  // panDelta to be registered via a live Animated.event. With single values, the transform
  // registration is sufficient.
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const currentPanX = useRef(0);
  const currentPanY = useRef(0);
  const panActive = useRef(false);

  const [isZoomed, setIsZoomed] = useState(false);
  const lastTapTime = useRef(0);

  const pinchRef = useRef<unknown>(null);
  const panRef = useRef<unknown>(null);

  const clampPan = useCallback((s: number, x: number, y: number) => {
    const maxX = Math.max(0, (viewportWidth * (s - 1)) / 2);
    const maxY = Math.max(0, (viewportHeight * (s - 1)) / 2);
    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    };
  }, [viewportWidth, viewportHeight]);

  const resetAll = useCallback((animated: boolean) => {
    currentScale.current = 1;
    currentPanX.current = 0;
    currentPanY.current = 0;
    panActive.current = false;
    pinchScale.setValue(1);
    // Collapse any offset before resetting
    translateX.flattenOffset();
    translateY.flattenOffset();
    setIsZoomed(false);
    onZoomChange(false);
    if (animated) {
      Animated.parallel([
        Animated.spring(baseScale, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 0 }),
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true, speed: 18, bounciness: 0 }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, speed: 18, bounciness: 0 }),
      ]).start();
    } else {
      baseScale.setValue(1);
      translateX.setValue(0);
      translateY.setValue(0);
    }
  }, [baseScale, pinchScale, translateX, translateY, onZoomChange]);

  useEffect(() => {
    resetAll(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uri]);

  // --- Pinch gesture (identical structure to original working code) ---
  const onPinchEvent = useMemo(
    () => Animated.event([{ nativeEvent: { scale: pinchScale } }], { useNativeDriver: true }),
    [pinchScale]
  );

  const onPinchStateChange = useCallback((event: PinchGestureHandlerStateChangeEvent) => {
    onInteract();
    if (event.nativeEvent.oldState !== State.ACTIVE) return;

    const next = Math.max(
      LIGHTBOX_MIN_SCALE,
      Math.min(LIGHTBOX_MAX_SCALE, currentScale.current * event.nativeEvent.scale)
    );
    currentScale.current = next;
    baseScale.setValue(next);
    pinchScale.setValue(1);

    const zoomed = next > 1;
    setIsZoomed(zoomed);
    onZoomChange(zoomed);

    // Collapse offset so translate values are at their true accumulated position
    translateX.flattenOffset();
    translateY.flattenOffset();

    if (!zoomed) {
      currentPanX.current = 0;
      currentPanY.current = 0;
      Animated.parallel([
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 0 }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 0 }),
      ]).start();
    } else {
      // Clamp pan position for new scale; re-set offset for next pan
      const clamped = clampPan(next, currentPanX.current, currentPanY.current);
      currentPanX.current = clamped.x;
      currentPanY.current = clamped.y;
      translateX.setValue(clamped.x);
      translateY.setValue(clamped.y);
    }
  }, [baseScale, pinchScale, translateX, translateY, onInteract, onZoomChange, clampPan]);

  // --- Pan gesture (setOffset for accumulation) ---
  const onPanEvent = useMemo(
    () => Animated.event(
      [{ nativeEvent: { translationX: translateX, translationY: translateY } }],
      { useNativeDriver: true }
    ),
    [translateX, translateY]
  );

  const onPanStateChange = useCallback((event: HandlerStateChangeEvent<PanGestureHandlerEventPayload>) => {
    const { state, oldState } = event.nativeEvent;

    // Set offset at gesture start so Animated.event delta is relative to current position.
    // iOS fires BEGAN first; Android may go straight to ACTIVE.
    if (!panActive.current && (state === State.BEGAN || state === State.ACTIVE)) {
      panActive.current = true;
      translateX.setOffset(currentPanX.current);
      translateY.setOffset(currentPanY.current);
      translateX.setValue(0);
      translateY.setValue(0);
    }

    if (oldState === State.ACTIVE) {
      panActive.current = false;
      const rawX = currentPanX.current + event.nativeEvent.translationX;
      const rawY = currentPanY.current + event.nativeEvent.translationY;

      // Collapse offset → value = rawX/rawY
      translateX.flattenOffset();
      translateY.flattenOffset();

      const clamped = clampPan(currentScale.current, rawX, rawY);
      currentPanX.current = clamped.x;
      currentPanY.current = clamped.y;

      if (rawX !== clamped.x || rawY !== clamped.y) {
        Animated.parallel([
          Animated.spring(translateX, { toValue: clamped.x, useNativeDriver: true, speed: 20, bounciness: 0 }),
          Animated.spring(translateY, { toValue: clamped.y, useNativeDriver: true, speed: 20, bounciness: 0 }),
        ]).start();
      }
    }
  }, [translateX, translateY, clampPan]);

  // Double-tap via manual timing on a Pressable.
  const handlePress = useCallback(() => {
    const now = Date.now();
    if (now - lastTapTime.current < 300) {
      lastTapTime.current = 0;
      onInteract();
      if (currentScale.current > 1) {
        resetAll(true);
      } else {
        currentScale.current = DOUBLE_TAP_ZOOM_SCALE;
        setIsZoomed(true);
        onZoomChange(true);
        Animated.spring(baseScale, {
          toValue: DOUBLE_TAP_ZOOM_SCALE,
          useNativeDriver: true,
          speed: 18,
          bounciness: 0,
        }).start();
      }
    } else {
      lastTapTime.current = now;
      onInteract();
    }
  }, [baseScale, resetAll, onInteract, onZoomChange]);

  // Structure: PanGestureHandler (outer) → PinchGestureHandler (inner, direct parent of
  // transform view). Matches the RNGH recommended pattern for simultaneous pinch+pan.
  // PinchGestureHandler's direct child has the transform — same as the original working code.
  return (
    <PanGestureHandler
      ref={panRef}
      simultaneousHandlers={pinchRef}
      onGestureEvent={onPanEvent}
      onHandlerStateChange={onPanStateChange}
      enabled={isZoomed}
    >
      <Animated.View style={styles.lightboxImagePinchWrap}>
        <PinchGestureHandler
          ref={pinchRef}
          simultaneousHandlers={panRef}
          onGestureEvent={onPinchEvent}
          onHandlerStateChange={onPinchStateChange}
        >
          <Animated.View
            style={[
              styles.lightboxImagePinchWrap,
              { transform: [{ scale: displayScale }, { translateX }, { translateY }] },
            ]}
          >
            <Pressable style={styles.lightboxImage} onPress={handlePress}>
              <Image source={{ uri }} style={styles.lightboxImage} resizeMode="contain" />
            </Pressable>
          </Animated.View>
        </PinchGestureHandler>
      </Animated.View>
    </PanGestureHandler>
  );
}

export default function PostDetailScreen() {
  const { user } = useAuth();
  const route = useRoute<DetailRouteProp>();
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList, 'PostDetail'>>();
  const { postId } = route.params;
  const scrollViewRef = useRef<ScrollView>(null);
  const commentsRef = useRef<View>(null);
  const detailCarouselRef = useRef<ScrollView>(null);
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [avatarMenuVisible, setAvatarMenuVisible] = useState(false);
  const [avatarMenuUser, setAvatarMenuUser] = useState<AvatarMenuUser | null>(null);
  const [avatarMenuPos, setAvatarMenuPos] = useState({ top: 0, left: 0 });

  // Like state
  const [isLiked, setIsLiked] = useState(false);
  const [localLikesCount, setLocalLikesCount] = useState(0);

  // Save state
  const [isSaved, setIsSaved] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const saveToastOpacity = useRef(new Animated.Value(0)).current;
  const saveToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Comments state
  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [replyTarget, setReplyTarget] = useState<PostComment | null>(null);
  const [expandedReplyParents, setExpandedReplyParents] = useState<Record<string, boolean>>({});
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [detailCarouselChromeVisible, setDetailCarouselChromeVisible] = useState(true);
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxChromeVisible, setLightboxChromeVisible] = useState(true);
  const [lightboxIsZoomed, setLightboxIsZoomed] = useState(false);
  const detailCarouselChromeHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lightboxChromeHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lightboxScrollRef = useRef<ScrollView>(null);

  const isLevel0 = user?.trust_level === TrustLevel.NEW;
  const isOwnPost = post?.author_id === user?.id;
  const commentThreads = useMemo(() => buildSingleLevelCommentThreads(comments), [comments]);
  const postPhotos = (post?.photos || []).filter(Boolean).slice(0, 3);
  const detailCarouselWidth = Math.max(viewportWidth - spacing.s * 2, 1);

  useEffect(() => {
    loadPost();
    loadComments();
    loadLikeState();
    loadSaveState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  useEffect(() => {
    setCurrentPhotoIndex(0);
  }, [post?.id]);

  const clearDetailCarouselChromeTimer = useCallback(() => {
    if (detailCarouselChromeHideTimeoutRef.current) {
      clearTimeout(detailCarouselChromeHideTimeoutRef.current);
      detailCarouselChromeHideTimeoutRef.current = null;
    }
  }, []);

  const resetDetailCarouselChromeTimer = useCallback(() => {
    setDetailCarouselChromeVisible(true);
    if (postPhotos.length <= 1) return;
    clearDetailCarouselChromeTimer();
    detailCarouselChromeHideTimeoutRef.current = setTimeout(() => {
      setDetailCarouselChromeVisible(false);
    }, DETAIL_CAROUSEL_CHROME_HIDE_DELAY_MS);
  }, [clearDetailCarouselChromeTimer, postPhotos.length]);

  useEffect(() => {
    return () => {
      clearDetailCarouselChromeTimer();
      if (lightboxChromeHideTimeoutRef.current) {
        clearTimeout(lightboxChromeHideTimeoutRef.current);
      }
    };
  }, [clearDetailCarouselChromeTimer]);

  useEffect(() => {
    if (postPhotos.length <= 1) {
      clearDetailCarouselChromeTimer();
      setDetailCarouselChromeVisible(true);
      return;
    }

    resetDetailCarouselChromeTimer();
  }, [post?.id, postPhotos.length, clearDetailCarouselChromeTimer, resetDetailCarouselChromeTimer]);

  const clearLightboxChromeTimer = useCallback(() => {
    if (lightboxChromeHideTimeoutRef.current) {
      clearTimeout(lightboxChromeHideTimeoutRef.current);
      lightboxChromeHideTimeoutRef.current = null;
    }
  }, []);

  const resetLightboxChromeTimer = useCallback(() => {
    setLightboxChromeVisible(true);
    clearLightboxChromeTimer();
    lightboxChromeHideTimeoutRef.current = setTimeout(() => {
      setLightboxChromeVisible(false);
    }, DETAIL_LIGHTBOX_CHROME_HIDE_DELAY_MS);
  }, [clearLightboxChromeTimer]);

  useEffect(() => {
    if (!lightboxVisible) {
      clearLightboxChromeTimer();
      setLightboxChromeVisible(true);
      return;
    }

    resetLightboxChromeTimer();
  }, [lightboxVisible, clearLightboxChromeTimer, resetLightboxChromeTimer]);

  const handleOpenLightbox = useCallback(
    (startIndex: number) => {
      const normalizedIndex = Math.min(Math.max(startIndex, 0), Math.max(postPhotos.length - 1, 0));
      setLightboxIndex(normalizedIndex);
      setLightboxVisible(true);
      setTimeout(() => {
        lightboxScrollRef.current?.scrollTo({
          x: normalizedIndex * viewportWidth,
          animated: false,
        });
      }, 0);
    },
    [postPhotos.length, viewportWidth]
  );

  const handleCloseLightbox = useCallback(() => {
    clearLightboxChromeTimer();
    setLightboxVisible(false);
    setLightboxIndex(0);
    setLightboxChromeVisible(true);
    setLightboxIsZoomed(false);
  }, [clearLightboxChromeTimer]);

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

  const loadSaveState = async () => {
    if (!user?.id) return;
    const result = await getUserSavedPostIds(supabase, user.id);
    if (result.data) {
      setIsSaved(result.data.includes(postId));
    }
  };

  const showSaveToast = (message: string) => {
    setSaveToast(message);
    saveToastOpacity.setValue(1);
    if (saveToastTimerRef.current) clearTimeout(saveToastTimerRef.current);
    saveToastTimerRef.current = setTimeout(() => {
      Animated.timing(saveToastOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setSaveToast(null));
    }, 2200);
  };

  const handleSavePress = async () => {
    const wasSaved = isSaved;
    setIsSaved(!wasSaved);

    const result = wasSaved
      ? await unsavePost(supabase, postId)
      : await savePost(supabase, postId);

    if (result.error) {
      setIsSaved(wasSaved);
      showSaveToast('Failed to update saved post.');
    } else {
      showSaveToast(wasSaved ? 'Post unsaved.' : 'Post saved.');
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
              logClientEvent({
                event: 'comment_delete_failed',
                context: {
                  platform: 'mobile',
                  commentId: comment.id,
                  userId: user?.id ?? null,
                },
                error: result.error,
              });
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
    if (!user || !avatarMenuUser) return;

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
      avatarMenuUser.id,
      avatarMenuUser.full_name
    );

    if (result.data) {
      const tabNav = navigation.getParent();
      if (tabNav) {
        tabNav.navigate('Chat', {
          screen: 'MessageThread',
          params: {
            conversationId: result.data.conversationId,
            otherUserId: avatarMenuUser.id,
            otherUserName: avatarMenuUser.full_name,
            otherUserTrustLevel: avatarMenuUser.trust_level,
          },
        });
      }
    } else if (result.error) {
      Alert.alert('Error', 'Failed to start conversation. Please try again.');
    }
  };

  const openAvatarMenu = useCallback((menuUser: AvatarMenuUser | null, pageX: number, pageY: number) => {
    if (!menuUser) return;
    if (menuUser.id === user?.id) return;

    const MENU_WIDTH = 180;
    const MENU_HEIGHT = 112;
    const EDGE_GAP = 8;
    const VERTICAL_OFFSET = 8;

    const maxLeft = Math.max(EDGE_GAP, viewportWidth - MENU_WIDTH - EDGE_GAP);
    const left = Math.min(Math.max(EDGE_GAP, pageX), maxLeft);

    const belowTop = pageY + VERTICAL_OFFSET;
    const canOpenBelow = belowTop + MENU_HEIGHT <= viewportHeight - EDGE_GAP;
    const top = canOpenBelow
      ? belowTop
      : Math.max(EDGE_GAP, pageY - MENU_HEIGHT - VERTICAL_OFFSET);

    setAvatarMenuUser(menuUser);
    setAvatarMenuPos({ top, left });
    setAvatarMenuVisible(true);
  }, [user?.id, viewportHeight, viewportWidth]);

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
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
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
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

        <ScrollView ref={scrollViewRef} contentContainerStyle={styles.scrollContent}>
          {post.author && (
            <View style={styles.authorRowTop}>
              <TouchableOpacity
                onPress={(event) => {
                  openAvatarMenu(
                    post.author
                      ? {
                          id: post.author.id,
                          full_name: post.author.full_name,
                          trust_level: post.author.trust_level,
                        }
                      : null,
                    event.nativeEvent.pageX,
                    event.nativeEvent.pageY
                  );
                }}
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

          {postPhotos.length > 0 && (
            <View style={styles.detailCarouselWrap} onTouchStart={resetDetailCarouselChromeTimer}>
              <ScrollView
                ref={detailCarouselRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScrollBeginDrag={resetDetailCarouselChromeTimer}
                onMomentumScrollEnd={(event) => {
                  resetDetailCarouselChromeTimer();
                  const nextIndex = Math.round(event.nativeEvent.contentOffset.x / detailCarouselWidth);
                  setCurrentPhotoIndex(nextIndex);
                }}
              >
                {postPhotos.map((photoUrl, index) => (
                  <View key={`${photoUrl}-${index}`} style={[styles.detailCarouselSlide, { width: detailCarouselWidth }]}>
                    <TouchableOpacity
                      style={styles.detailCarouselImageButton}
                      activeOpacity={0.95}
                      onPress={() => {
                        resetDetailCarouselChromeTimer();
                        handleOpenLightbox(index);
                      }}
                    >
                      <Image source={{ uri: photoUrl }} style={styles.detailCarouselImage} resizeMode="cover" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>

              {postPhotos.length > 1 && (
                <>
                  <TouchableOpacity
                    style={[
                      styles.detailCarouselChrome,
                      styles.detailCarouselNavBtn,
                      styles.detailCarouselPrevBtn,
                      detailCarouselChromeVisible ? styles.detailCarouselChromeVisible : styles.detailCarouselChromeHidden,
                    ]}
                    disabled={!detailCarouselChromeVisible}
                    onPress={() => {
                      resetDetailCarouselChromeTimer();
                      const nextIndex = (currentPhotoIndex - 1 + postPhotos.length) % postPhotos.length;
                      detailCarouselRef.current?.scrollTo({ x: nextIndex * detailCarouselWidth, animated: true });
                      setCurrentPhotoIndex(nextIndex);
                    }}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel="Previous image"
                  >
                    <Ionicons name="chevron-back" size={18} color={colors.white} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.detailCarouselChrome,
                      styles.detailCarouselNavBtn,
                      styles.detailCarouselNextBtn,
                      detailCarouselChromeVisible ? styles.detailCarouselChromeVisible : styles.detailCarouselChromeHidden,
                    ]}
                    disabled={!detailCarouselChromeVisible}
                    onPress={() => {
                      resetDetailCarouselChromeTimer();
                      const nextIndex = (currentPhotoIndex + 1) % postPhotos.length;
                      detailCarouselRef.current?.scrollTo({ x: nextIndex * detailCarouselWidth, animated: true });
                      setCurrentPhotoIndex(nextIndex);
                    }}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel="Next image"
                  >
                    <Ionicons name="chevron-forward" size={18} color={colors.white} />
                  </TouchableOpacity>

                  <View
                    style={[
                      styles.detailCarouselChrome,
                      styles.detailCarouselDots,
                      detailCarouselChromeVisible ? styles.detailCarouselChromeVisible : styles.detailCarouselChromeHidden,
                    ]}
                    pointerEvents={detailCarouselChromeVisible ? 'auto' : 'none'}
                  >
                    {postPhotos.map((_, index) => (
                      <TouchableOpacity
                        key={`detail-dot-${index}`}
                        style={[
                          styles.detailCarouselDot,
                          index === currentPhotoIndex && styles.detailCarouselDotActive,
                        ]}
                        onPress={() => {
                          resetDetailCarouselChromeTimer();
                          detailCarouselRef.current?.scrollTo({ x: index * detailCarouselWidth, animated: true });
                          setCurrentPhotoIndex(index);
                        }}
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityLabel={`Go to image ${index + 1}`}
                      />
                    ))}
                  </View>
                </>
              )}
            </View>
          )}

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
                  scrollViewRef.current as unknown as number,
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

            {!isOwnPost && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleSavePress}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isSaved ? 'bookmark' : 'bookmark-outline'}
                  size={20}
                  color={isSaved ? colors.primary.main : colors.text.secondary}
                />
                <Text style={[styles.actionText, isSaved && { color: colors.primary.main }]}> Save</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.actionButton} onPress={handleSharePost} activeOpacity={0.7}>
              <Ionicons name="share-social-outline" size={20} color={colors.text.secondary} />
              <Text style={styles.actionText}> Share</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.metaRow}>
            <View style={[styles.metaBadge, post.is_global ? styles.metaBadgeGlobal : styles.metaBadgeLocal]}> 
              <Text style={[styles.metaBadgeText, post.is_global ? styles.metaBadgeTextGlobal : styles.metaBadgeTextLocal]}>
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
                      <TouchableOpacity
                        onPress={(event) => {
                          openAvatarMenu(
                            thread.parent.author
                              ? {
                                  id: thread.parent.author_id,
                                  full_name: thread.parent.author.full_name,
                                  trust_level: thread.parent.author.trust_level,
                                }
                              : null,
                            event.nativeEvent.pageX,
                            event.nativeEvent.pageY
                          );
                        }}
                        activeOpacity={thread.parent.author_id === user?.id ? 1 : 0.7}
                      >
                        <Avatar
                          name={thread.parent.author?.full_name || 'User'}
                          photoUrl={thread.parent.author?.profile_photo}
                          trustLevel={thread.parent.author?.trust_level ?? 0}
                          size="small"
                        />
                      </TouchableOpacity>
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
                          <TouchableOpacity
                            onPress={(event) => {
                              openAvatarMenu(
                                reply.author
                                  ? {
                                      id: reply.author_id,
                                      full_name: reply.author.full_name,
                                      trust_level: reply.author.trust_level,
                                    }
                                  : null,
                                event.nativeEvent.pageX,
                                event.nativeEvent.pageY
                              );
                            }}
                            activeOpacity={reply.author_id === user?.id ? 1 : 0.7}
                          >
                            <Avatar
                              name={reply.author?.full_name || 'User'}
                              photoUrl={reply.author?.profile_photo}
                              trustLevel={reply.author?.trust_level ?? 0}
                              size="small"
                            />
                          </TouchableOpacity>
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

        <Modal
          visible={lightboxVisible}
          transparent
          animationType="fade"
          onRequestClose={handleCloseLightbox}
        >
          {/* GestureHandlerRootView is required inside Modal on Android —
              React Native Modals render in a separate native window that the
              app-level GestureHandlerRootView in App.tsx does not cover. */}
          <GestureHandlerRootView style={styles.gestureRootFill}>
          <View style={styles.lightboxOverlay}>
            <Pressable style={styles.lightboxBackdrop} onPress={handleCloseLightbox} />
            <View
              style={[
                styles.lightboxChrome,
                styles.lightboxTopRight,
                lightboxChromeVisible ? styles.lightboxChromeVisible : styles.lightboxChromeHidden,
              ]}
              pointerEvents="box-none"
            >
              {postPhotos.length > 1 && (
                <View style={styles.lightboxCounterPill}>
                  <Text style={styles.lightboxCounterText}>{lightboxIndex + 1} / {postPhotos.length}</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.lightboxCloseBtn}
                onPress={handleCloseLightbox}
                accessibilityRole="button"
                accessibilityLabel="Close image viewer"
              >
                <Ionicons name="close" size={24} color={colors.white} />
              </TouchableOpacity>
            </View>

            <View
              style={styles.lightboxViewport}
              onTouchStart={resetLightboxChromeTimer}
            >
              <GHScrollView
                ref={lightboxScrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                scrollEnabled={!lightboxIsZoomed}
                onScrollBeginDrag={resetLightboxChromeTimer}
                onMomentumScrollEnd={(event) => {
                  resetLightboxChromeTimer();
                  const nextIndex = Math.round(event.nativeEvent.contentOffset.x / viewportWidth);
                  setLightboxIndex(nextIndex);
                }}
              >
                {postPhotos.map((photoUrl, index) => (
                  <View key={`${photoUrl}-${index}`} style={[styles.lightboxSlide, { width: viewportWidth }]}>
                    <View style={styles.lightboxZoomContent}>
                      <PinchableLightboxImage
                        uri={photoUrl}
                        onInteract={resetLightboxChromeTimer}
                        onZoomChange={setLightboxIsZoomed}
                        viewportWidth={viewportWidth}
                        viewportHeight={viewportHeight * 0.82}
                      />
                    </View>
                  </View>
                ))}
              </GHScrollView>
            </View>
          </View>
          </GestureHandlerRootView>
        </Modal>

        {/* Avatar Tap Menu */}
        <Modal
          visible={avatarMenuVisible}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setAvatarMenuVisible(false);
            setAvatarMenuUser(null);
          }}
        >
          <View style={styles.menuOverlay}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => {
                setAvatarMenuVisible(false);
                setAvatarMenuUser(null);
              }}
            />
            <View style={[styles.avatarMenu, { top: avatarMenuPos.top, left: avatarMenuPos.left }]}>
              <TouchableOpacity
                style={styles.avatarMenuItem}
                onPress={() => {
                  const targetId = avatarMenuUser?.id;
                  setAvatarMenuVisible(false);
                  setAvatarMenuUser(null);
                  if (!targetId) return;
                  if (targetId === user?.id) {
                    navigation.getParent()?.navigate('Profile');
                  } else {
                    navigation.navigate('PublicProfileView', { userId: targetId });
                  }
                }}
              >
                <Ionicons name="person-outline" size={20} color={colors.text.primary} />
                <Text style={styles.avatarMenuText}>View Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.avatarMenuItem}
                onPress={() => {
                  setAvatarMenuVisible(false);
                  setAvatarMenuUser(null);
                  handleAvatarChat();
                }}
              >
                <Ionicons name="chatbubble-outline" size={20} color={colors.primary.main} />
                <Text style={[styles.avatarMenuText, { color: colors.primary.main }]}>Chat</Text>
              </TouchableOpacity>
            </View>
          </View>
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

        {saveToast && (
          <Animated.View style={[styles.saveToast, { opacity: saveToastOpacity }]} pointerEvents="none">
            <Text style={styles.saveToastText}>{saveToast}</Text>
          </Animated.View>
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
    paddingHorizontal: spacing.s,
    paddingTop: spacing.xs,
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
  detailCarouselWrap: {
    position: 'relative',
    borderRadius: borderRadius.input,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    marginBottom: spacing.s,
    aspectRatio: 16 / 10,
  },
  detailCarouselSlide: {
    height: '100%',
  },
  detailCarouselImageButton: {
    width: '100%',
    height: '100%',
  },
  detailCarouselImage: {
    width: '100%',
    height: '100%',
  },
  detailCarouselChrome: {
    opacity: 1,
  },
  detailCarouselChromeVisible: {
    opacity: 1,
  },
  detailCarouselChromeHidden: {
    opacity: 0,
  },
  detailCarouselNavBtn: {
    position: 'absolute',
    top: '50%',
    marginTop: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.overlayMedium,
  },
  detailCarouselPrevBtn: {
    left: spacing.xs,
  },
  detailCarouselNextBtn: {
    right: spacing.xs,
  },
  detailCarouselDots: {
    position: 'absolute',
    bottom: spacing.xs,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  detailCarouselDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  detailCarouselDotActive: {
    backgroundColor: colors.white,
  },
  gestureRootFill: {
    flex: 1,
  },
  lightboxOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  lightboxTopRight: {
    position: 'absolute',
    top: spacing.xl,
    right: spacing.s,
    zIndex: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  lightboxChrome: {
    opacity: 1,
  },
  lightboxChromeVisible: {
    opacity: 1,
  },
  lightboxChromeHidden: {
    opacity: 0,
  },
  lightboxCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.overlayMedium,
  },
  lightboxViewport: {
    width: '100%',
    height: '82%',
    justifyContent: 'center',
    zIndex: 2,
  },
  lightboxSlide: {
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.s,
  },
  lightboxZoomContent: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
  },
  lightboxImage: {
    width: '100%',
    height: '100%',
  },
  lightboxImagePinchWrap: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
  },
  lightboxCounterPill: {
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 4,
    backgroundColor: colors.overlayMedium,
    marginRight: spacing.xs,
  },
  lightboxCounterText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
    color: colors.white,
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
  metaBadgeLocal: {
    backgroundColor: colors.badge.localBg,
  },
  metaBadgeGlobal: {
    backgroundColor: colors.badge.globalBg,
  },
  metaBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  metaBadgeTextLocal: {
    color: colors.badge.localText,
  },
  metaBadgeTextGlobal: {
    color: colors.badge.globalText,
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
    backgroundColor: colors.overlayLight,
  },
  avatarMenu: {
    position: 'absolute',
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
  saveToast: {
    position: 'absolute',
    bottom: 90,
    alignSelf: 'center',
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    zIndex: 999,
  },
  saveToastText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});
