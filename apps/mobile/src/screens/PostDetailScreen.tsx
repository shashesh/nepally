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
  Keyboard,
  Platform,
  Share,
  Modal,
  Pressable,
  Animated,
  findNodeHandle,
  useAnimatedValue,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
  formatRelativeTime,
  logClientEvent,
  TrustLevel,
  TAG_EMOJI,
  TAG_COLORS,
  DEFAULT_TAG_COLOR,
} from '@nepally/shared';
import type { Post, PostComment } from '@nepally/shared';
import { Avatar } from '../components/Avatar';
import { HomeStackParamList } from '../types/navigation';
import { supabase } from '../config/supabase';
import { colors } from '../styles/colors';
import { typography } from '../styles/typography';
import { spacing, borderRadius } from '../styles/spacing';

type DetailRouteProp = RouteProp<HomeStackParamList, 'PostDetail'>;
const DETAIL_LIGHTBOX_CHROME_HIDE_DELAY_MS = 1500;

// Tracks whether the current Like interaction was triggered via long-press,
// so we can suppress the subsequent onPress that fires on release.
let likeLongPressActive = false;
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
  const baseScale = useAnimatedValue(1);
  const pinchScale = useAnimatedValue(1);
  // displayScale is the same Animated.multiply pattern as the original working code
  const displayScale = useMemo(() => Animated.multiply(baseScale, pinchScale), [baseScale, pinchScale]);
  const currentScale = useRef(1);

  // Pan — single Animated.Values, registered by the Animated.View transform on mount.
  // Using setOffset/flattenOffset for accumulation avoids Animated.add, which requires
  // panDelta to be registered via a live Animated.event. With single values, the transform
  // registration is sufficient.
  const translateX = useAnimatedValue(0);
  const translateY = useAnimatedValue(0);
  const currentPanX = useRef(0);
  const currentPanY = useRef(0);
  const panActive = useRef(false);

  const [isZoomed, setIsZoomed] = useState(false);
  const lastTapTime = useRef(0);

  const pinchRef = useRef<PinchGestureHandler | null>(null);
  const panRef = useRef<PanGestureHandler | null>(null);

  const clampPan = useCallback((s: number, x: number, y: number) => {
    const maxX = Math.max(0, (viewportWidth * (s - 1)) / 2);
    const maxY = Math.max(0, (viewportHeight * (s - 1)) / 2);
    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    };
  }, [viewportWidth, viewportHeight]);

  // Animated reset back to 1x, centred. There is no reset-on-uri effect: the lightbox keys
  // each slide by its uri, so a different image always mounts a fresh, unzoomed instance.
  const resetAll = useCallback(() => {
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
    Animated.parallel([
      Animated.spring(baseScale, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 0 }),
      Animated.spring(translateX, { toValue: 0, useNativeDriver: true, speed: 18, bounciness: 0 }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, speed: 18, bounciness: 0 }),
    ]).start();
  }, [baseScale, pinchScale, translateX, translateY, onZoomChange]);

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
        resetAll();
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
              <Image source={uri} style={styles.lightboxImage} contentFit="contain" />
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
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const keyboardPadding = useAnimatedValue(0);
  // Android: track viewport height to detect whether adjustResize compensated
  const baseViewportHeightRef = useRef(viewportHeight);
  const currentViewportHeightRef = useRef(viewportHeight);
  const isKeyboardVisibleRef = useRef(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const [post, setPost] = useState<Post | null>(null);
  // Which postId each outcome belongs to, so a new postId is loading again by
  // definition rather than by a reset the effect has to remember to do. The
  // comments below already work this way.
  const [loadedPostId, setLoadedPostId] = useState<string | null>(null);
  const [failedPostId, setFailedPostId] = useState<string | null>(null);
  // Bumped by the Retry button to re-run the post fetch effect.
  const [reloadKey, setReloadKey] = useState(0);
  const [avatarMenuVisible, setAvatarMenuVisible] = useState(false);
  const [avatarMenuUser, setAvatarMenuUser] = useState<AvatarMenuUser | null>(null);
  const [avatarMenuPos, setAvatarMenuPos] = useState({ top: 0, left: 0 });

  // Like state
  const [isLiked, setIsLiked] = useState(false);
  const [localLikesCount, setLocalLikesCount] = useState(0);

  // Save state
  const [isSaved, setIsSaved] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const saveToastOpacity = useAnimatedValue(0);
  const saveToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Comments state
  const [comments, setComments] = useState<PostComment[]>([]);
  // Comments count as loading until the fetch for the current postId has settled.
  const [commentsLoadedForPostId, setCommentsLoadedForPostId] = useState<string | null>(null);
  const commentsLoading = commentsLoadedForPostId !== postId;
  // A failure belongs to the postId that hit it, so navigating away from it is
  // already a fresh load and the old error cannot linger over the new post.
  const loadFailed = failedPostId === postId;
  const loading = !loadFailed && loadedPostId !== postId;
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [replyTarget, setReplyTarget] = useState<PostComment | null>(null);
  const [expandedReplyParents, setExpandedReplyParents] = useState<Record<string, boolean>>({});
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxChromeVisible, setLightboxChromeVisible] = useState(true);
  const [lightboxIsZoomed, setLightboxIsZoomed] = useState(false);
  const [reactionVisible, setReactionVisible] = useState(false);
  const lightboxChromeHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lightboxScrollRef = useRef<ScrollView>(null);

  const userId = user?.id;
  const isLevel0 = user?.trust_level === TrustLevel.NEW;
  const isOwnPost = post?.author_id === userId;
  const commentThreads = useMemo(() => buildSingleLevelCommentThreads(comments), [comments]);
  const allPostPhotos = (post?.photos || []).filter(Boolean) as string[];
  const photoCount = allPostPhotos.length;
  const postPhotos = allPostPhotos.slice(0, 4);
  const extraPhotoCount = photoCount - 4;
  const contentWidth = Math.max(viewportWidth - spacing.s * 2, 1);

  // Load the post and its comments whenever the post changes.
  useEffect(() => {
    let cancelled = false;

    getPostById(supabase, postId).then((result) => {
      if (cancelled) return;
      if (result.error) {
        // A lookup that failed is not a post that was deleted: saying so would
        // send the reader away from a post that is still there.
        setFailedPostId(postId);
        return;
      }
      // A missing post clears the previous one, so the screen shows "Post not found"
      // instead of the last post for the new postId.
      setFailedPostId(null);
      setPost(result.data ?? null);
      setLocalLikesCount(result.data?.likes_count ?? 0);
      setLoadedPostId(postId);
    });

    getPostComments(supabase, postId).then((result) => {
      if (cancelled) return;
      setComments(result.data ?? []);
      setCommentsLoadedForPostId(postId);
    });

    return () => {
      cancelled = true;
    };
  }, [postId, reloadKey]);

  // Load the viewer's like/save state for this post.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    getUserLikedPostIds(supabase, userId).then((result) => {
      if (!cancelled && result.data) {
        setIsLiked(result.data.includes(postId));
      }
    });

    getUserSavedPostIds(supabase, userId).then((result) => {
      if (!cancelled && result.data) {
        setIsSaved(result.data.includes(postId));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [postId, userId]);


  useEffect(() => {
    currentViewportHeightRef.current = viewportHeight;
    // Refresh the baseline whenever the viewport changes while the keyboard is hidden
    // (e.g. rotation, split-screen) so alreadyShrunk stays accurate.
    if (!isKeyboardVisibleRef.current) {
      baseViewportHeightRef.current = viewportHeight;
    }
  }, [viewportHeight]);

  useEffect(() => {
    if (Platform.OS === 'ios') {
      const showSub = Keyboard.addListener('keyboardWillChangeFrame', (e) => {
        if (e.endCoordinates.height > 0) setIsKeyboardVisible(true);
        Animated.timing(keyboardPadding, {
          toValue: e.endCoordinates.height,
          duration: e.duration ?? 250,
          useNativeDriver: false,
        }).start(() => {
          // Scroll after keyboard is fully raised so viewport is at final size
          scrollViewRef.current?.scrollToEnd({ animated: true });
        });
      });
      const hideSub = Keyboard.addListener('keyboardWillHide', (e) => {
        setIsKeyboardVisible(false);
        Animated.timing(keyboardPadding, {
          toValue: 0,
          duration: e.duration ?? 250,
          useNativeDriver: false,
        }).start();
      });
      return () => {
        showSub.remove();
        hideSub.remove();
      };
    } else {
      // Android: adjustResize in app.json resizes the window on older Android.
      // On Android 15 edge-to-edge, adjustResize is ignored so we apply manual padding.
      // Detect how much the window already shrank (adjustResize) and add the remainder.
      const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
        isKeyboardVisibleRef.current = true;
        setIsKeyboardVisible(true);
        const keyboardH = e.endCoordinates.height;
        const alreadyShrunk = baseViewportHeightRef.current - currentViewportHeightRef.current;
        keyboardPadding.setValue(Math.max(0, keyboardH - alreadyShrunk));
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 50);
      });
      const hideSub = Keyboard.addListener('keyboardDidHide', () => {
        isKeyboardVisibleRef.current = false;
        setIsKeyboardVisible(false);
        keyboardPadding.setValue(0);
        // Refresh baseline now that keyboard is gone; viewport may have changed
        // (e.g. adjustResize restored it) and this becomes the new reference point.
        baseViewportHeightRef.current = currentViewportHeightRef.current;
      });
      return () => {
        showSub.remove();
        hideSub.remove();
      };
    }
  }, [keyboardPadding]);

  useEffect(() => {
    return () => {
      if (lightboxChromeHideTimeoutRef.current) {
        clearTimeout(lightboxChromeHideTimeoutRef.current);
      }
    };
  }, []);

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

  // Opening shows the chrome and starts its auto-hide timer; handleCloseLightbox
  // clears the timer and restores the chrome for next time.
  const handleOpenLightbox = useCallback(
    (startIndex: number) => {
      const normalizedIndex = Math.min(Math.max(startIndex, 0), Math.max(photoCount - 1, 0));
      setLightboxIndex(normalizedIndex);
      setLightboxVisible(true);
      resetLightboxChromeTimer();
      setTimeout(() => {
        lightboxScrollRef.current?.scrollTo({
          x: normalizedIndex * viewportWidth,
          animated: false,
        });
      }, 0);
    },
    [photoCount, viewportWidth, resetLightboxChromeTimer]
  );

  const handleCloseLightbox = useCallback(() => {
    clearLightboxChromeTimer();
    setLightboxVisible(false);
    setLightboxIndex(0);
    setLightboxChromeVisible(true);
    setLightboxIsZoomed(false);
  }, [clearLightboxChromeTimer]);

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

  const handleRetryLoad = () => {
    setFailedPostId(null);
    setReloadKey((key) => key + 1);
  };

  if (loadFailed) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Couldn&apos;t load this post</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetryLoad}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <Animated.View style={[styles.container, { paddingBottom: keyboardPadding }]}>

        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollFlex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'none'}
        >
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
                  <TouchableOpacity
                    onPress={(event) => {
                      openAvatarMenu(
                        post.author
                          ? { id: post.author.id, full_name: post.author.full_name, trust_level: post.author.trust_level }
                          : null,
                        event.nativeEvent.pageX,
                        event.nativeEvent.pageY
                      );
                    }}
                    activeOpacity={isOwnPost ? 1 : 0.6}
                    disabled={isOwnPost}
                  >
                    <Text style={styles.authorName}>{post.author.full_name}</Text>
                  </TouchableOpacity>
                  {post.author.trust_level >= TrustLevel.VERIFIED && (
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color={post.author.trust_level >= TrustLevel.CONTRIBUTOR ? colors.primary.main : colors.success}
                      style={{ marginLeft: 4 }}
                    />
                  )}
                </View>
                <Text style={styles.authorMeta}>{formatRelativeTime(new Date(post.created_at))}</Text>
              </View>
            </View>
          )}

          <Text style={styles.title}>{post.title}</Text>

          {post.description ? <Text style={styles.description}>{post.description}</Text> : null}

          {postPhotos.length > 0 && (
            <View style={styles.detailMediaWrap}>
              {postPhotos.length === 1 && (
                <TouchableOpacity activeOpacity={0.9} onPress={() => handleOpenLightbox(0)}>
                  <Image source={postPhotos[0]} style={[styles.detailMediaSingle, { width: contentWidth }]} contentFit="cover" />
                </TouchableOpacity>
              )}

              {postPhotos.length === 2 && (
                <View style={[styles.detailMediaRow, { gap: 2 }]}>
                  {postPhotos.map((url, i) => (
                    <TouchableOpacity key={i} activeOpacity={0.9} onPress={() => handleOpenLightbox(i)}>
                      <Image source={url} style={{ width: (contentWidth - 2) / 2, height: (contentWidth - 2) / 2 }} contentFit="cover" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {postPhotos.length === 3 && (() => {
                const leftW = contentWidth * 0.6 - 1;
                const rightW = contentWidth * 0.4 - 1;
                const h = leftW;
                return (
                  <View style={[styles.detailMediaRow, { gap: 2 }]}>
                    <TouchableOpacity activeOpacity={0.9} onPress={() => handleOpenLightbox(0)}>
                      <Image source={postPhotos[0]} style={{ width: leftW, height: h }} contentFit="cover" />
                    </TouchableOpacity>
                    <View style={[styles.detailMediaCol, { gap: 2 }]}>
                      {[1, 2].map((i) => (
                        <TouchableOpacity key={i} activeOpacity={0.9} onPress={() => handleOpenLightbox(i)}>
                          <Image source={postPhotos[i]} style={{ width: rightW, height: (h - 2) / 2 }} contentFit="cover" />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                );
              })()}

              {postPhotos.length === 4 && (
                <View style={[styles.detailMediaGrid, { gap: 2 }]}>
                  <View style={[styles.detailMediaRow, { gap: 2 }]}>
                    {[0, 1].map((i) => (
                      <TouchableOpacity key={i} activeOpacity={0.9} onPress={() => handleOpenLightbox(i)}>
                        <Image source={postPhotos[i]} style={{ width: (contentWidth - 2) / 2, height: (contentWidth - 2) / 2 }} contentFit="cover" />
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={[styles.detailMediaRow, { gap: 2 }]}>
                    {[2, 3].map((i) => (
                      <TouchableOpacity key={i} activeOpacity={0.9} style={{ position: 'relative' }} onPress={() => handleOpenLightbox(i)}>
                        <Image source={postPhotos[i]} style={{ width: (contentWidth - 2) / 2, height: (contentWidth - 2) / 2 }} contentFit="cover" />
                        {i === 3 && extraPhotoCount > 0 && (
                          <View style={styles.detailMediaOverlay}>
                            <Text style={styles.detailMediaOverlayText}>+{extraPhotoCount}</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Counts Row */}
          {(localLikesCount > 0 || comments.length > 0) && (
            <View style={styles.countsRow}>
              {localLikesCount > 0 && (
                <Text style={styles.countText}>
                  {localLikesCount} {localLikesCount === 1 ? 'like' : 'likes'}
                </Text>
              )}
              {comments.length > 0 && (
                <Text style={styles.countText}>
                  {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
                </Text>
              )}
            </View>
          )}

          {/* Action Bar */}
          <View style={styles.actionRowWrap}>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  // If this press follows a long-press, suppress the like toggle
                  // because the reaction picker will handle the final state.
                  if (likeLongPressActive) {
                    likeLongPressActive = false;
                    return;
                  }
                  handleLikePress();
                }}
                onLongPress={() => {
                  likeLongPressActive = true;
                  setReactionVisible(true);
                }}
                delayLongPress={400}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isLiked ? 'heart' : 'heart-outline'}
                  size={20}
                  color={isLiked ? colors.accent.red : colors.text.secondary}
                />
                <Text style={[styles.actionText, isLiked && { color: colors.accent.red }]}>Like</Text>
              </TouchableOpacity>

              <View style={styles.actionDivider} />

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  if (!scrollViewRef.current) return;
                  const scrollViewNode = findNodeHandle(scrollViewRef.current);
                  if (!scrollViewNode) return;
                  commentsRef.current?.measureLayout(
                    scrollViewNode,
                    (_x: number, y: number) => {
                      scrollViewRef.current?.scrollTo({ y, animated: true });
                    },
                    () => undefined
                  );
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="chatbubble-outline" size={20} color={colors.text.secondary} />
                <Text style={styles.actionText}>Comment</Text>
              </TouchableOpacity>

              {!isOwnPost && (
                <>
                  <View style={styles.actionDivider} />
                  <TouchableOpacity style={styles.actionButton} onPress={handleSavePress} activeOpacity={0.7}>
                    <Ionicons
                      name={isSaved ? 'bookmark' : 'bookmark-outline'}
                      size={20}
                      color={isSaved ? colors.primary.main : colors.text.secondary}
                    />
                    <Text style={[styles.actionText, isSaved && { color: colors.primary.main }]}>Save</Text>
                  </TouchableOpacity>
                </>
              )}

              <View style={styles.actionDivider} />

              <TouchableOpacity style={styles.actionButton} onPress={handleSharePost} activeOpacity={0.7}>
                <Ionicons name="share-social-outline" size={20} color={colors.text.secondary} />
                <Text style={styles.actionText}>Share</Text>
              </TouchableOpacity>
            </View>

            {/* Reaction Picker */}
            {reactionVisible && (
              <>
                <Pressable
                  testID="reaction-dismiss-overlay"
                  style={styles.reactionDismissOverlay}
                  onPress={() => setReactionVisible(false)}
                />
                <View style={styles.reactionPicker}>
                  <TouchableOpacity
                    style={styles.reactionOption}
                    onPress={() => { setReactionVisible(false); handleLikePress(); }}
                  >
                    <Text style={styles.reactionEmoji}>❤️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.reactionOption}
                    onPress={() => { setReactionVisible(false); handleLikePress(); }}
                  >
                    <Text style={styles.reactionEmoji}>🙏</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
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
                          <Text style={styles.commentTime}>{formatRelativeTime(new Date(thread.parent.created_at))}</Text>
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
                              <Text style={styles.commentTime}>{formatRelativeTime(new Date(reply.created_at))}</Text>
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
              {photoCount > 1 && (
                <View style={styles.lightboxCounterPill}>
                  <Text style={styles.lightboxCounterText}>{lightboxIndex + 1} / {photoCount}</Text>
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
                {allPostPhotos.map((photoUrl, index) => (
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
          <View style={[styles.commentInputContainer, !isKeyboardVisible && insets.bottom > 0 && { paddingBottom: 12 + insets.bottom }]}>
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
                textAlignVertical="top"
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
          <View style={[styles.commentInputContainer, !isKeyboardVisible && insets.bottom > 0 && { paddingBottom: 12 + insets.bottom }]}>
            <Text style={styles.verifyPrompt}>Verify your account to comment</Text>
          </View>
        )}

        {saveToast && (
          <Animated.View style={[styles.saveToast, { opacity: saveToastOpacity }]} pointerEvents="none">
            <Text style={styles.saveToastText}>{saveToast}</Text>
          </Animated.View>
        )}
      </Animated.View>
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
  retryButton: {
    marginTop: spacing.s,
    backgroundColor: colors.primary.main,
    borderRadius: 10,
    paddingHorizontal: spacing.m,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: {
    ...typography.button,
    color: colors.white,
  },
  scrollFlex: {
    flex: 1,
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
  detailMediaWrap: {
    marginBottom: spacing.s,
    overflow: 'hidden',
    borderRadius: borderRadius.input,
  },
  detailMediaSingle: {
    aspectRatio: 16 / 10,
    backgroundColor: colors.background,
  },
  detailMediaRow: {
    flexDirection: 'row',
  },
  detailMediaCol: {
    flexDirection: 'column',
  },
  detailMediaGrid: {
    flexDirection: 'column',
  },
  detailMediaOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.overlayMedium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailMediaOverlayText: {
    color: colors.white,
    fontSize: 24,
    fontWeight: '700',
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
    ...StyleSheet.absoluteFill,
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
  countsRow: {
    flexDirection: 'row',
    gap: spacing.s,
    paddingHorizontal: spacing.s,
    paddingTop: spacing.xs,
    paddingBottom: 4,
  },
  countText: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  actionRowWrap: {
    position: 'relative',
    marginBottom: spacing.s,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  actionDivider: {
    width: 1,
    height: 20,
    backgroundColor: colors.border,
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
  reactionDismissOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 10,
  },
  reactionPicker: {
    position: 'absolute',
    bottom: 50,
    left: spacing.s,
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 28,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 4,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 11,
  },
  reactionOption: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionEmoji: {
    fontSize: 30,
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
