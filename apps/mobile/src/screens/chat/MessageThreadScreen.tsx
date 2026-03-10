import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Keyboard,
  Platform,
  Alert,
  StatusBar,
  ActivityIndicator,
  Pressable,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../hooks/useAuth';
import { MessageBubble } from '../../components/chat/MessageBubble';
import { ChatInput } from '../../components/chat/ChatInput';
import { Avatar } from '../../components/Avatar';
import {
  getMessages,
  sendMessage,
  markAsRead,
  subscribeToMessages,
  blockUser,
  TrustLevel,
} from '@nusa/shared';
import type { ChatMessage } from '@nusa/shared';
import { ChatStackParamList } from '../../types/navigation';
import { supabase } from '../../config/supabase';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { spacing } from '../../styles/spacing';

type ThreadRouteProp = RouteProp<ChatStackParamList, 'MessageThread'>;
type ThreadNavProp = NativeStackNavigationProp<ChatStackParamList, 'MessageThread'>;

export default function MessageThreadScreen() {
  const { user } = useAuth();
  const route = useRoute<ThreadRouteProp>();
  const navigation = useNavigation<ThreadNavProp>();
  const {
    conversationId,
    otherUserId,
    otherUserName,
    otherUserTrustLevel,
    otherUserPhotoUrl,
  } = route.params;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);
  const [profileMenuPos, setProfileMenuPos] = useState({ top: 0, left: 0 });
  const flatListRef = useRef<FlatList>(null);
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const keyboardPadding = useRef(new Animated.Value(0)).current;
  // Android: track viewport height to detect whether adjustResize compensated
  const baseViewportHeightRef = useRef(viewportHeight);
  const currentViewportHeightRef = useRef(viewportHeight);

  const openProfileMenuAt = useCallback((pageX: number, pageY: number) => {
    const MENU_WIDTH = 160;
    const MENU_HEIGHT = 56;
    const EDGE_GAP = 8;
    const VERTICAL_OFFSET = 8;

    const maxLeft = Math.max(EDGE_GAP, viewportWidth - MENU_WIDTH - EDGE_GAP);
    const left = Math.min(Math.max(EDGE_GAP, pageX), maxLeft);

    const belowTop = pageY + VERTICAL_OFFSET;
    const canOpenBelow = belowTop + MENU_HEIGHT <= viewportHeight - EDGE_GAP;
    const top = canOpenBelow
      ? belowTop
      : Math.max(EDGE_GAP, pageY - MENU_HEIGHT - VERTICAL_OFFSET);

    setProfileMenuPos({ top, left });
    setProfileMenuVisible(true);
  }, [viewportHeight, viewportWidth]);

  const loadMessages = useCallback(async () => {
    setLoadError(null);
    const result = await getMessages(supabase, conversationId);
    if (result.data) {
      setMessages(result.data);
    } else {
      setLoadError('Could not load messages. Please try again.');
    }
    setLoading(false);
  }, [conversationId]);

  // Load messages and subscribe to realtime
  useEffect(() => {
    loadMessages();

    const channel = subscribeToMessages(
      supabase,
      conversationId,
      (newMessage) => {
        // Skip messages from current user — already handled by optimistic UI
        if (newMessage.sender_id === user?.id) {
          // Still update if the real message replaced a temp one (to sync read status etc.)
          setMessages((prev) =>
            prev.map((m) => (m.id === newMessage.id ? newMessage : m))
          );
          return;
        }
        // Add received message if not already present
        setMessages((prev) => {
          if (prev.find((m) => m.id === newMessage.id)) return prev;
          return [...prev, newMessage];
        });
        markAsRead(supabase, conversationId, user?.id || '');
        // Scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      },
      (updatedMessage) => {
        // Update read status
        setMessages((prev) =>
          prev.map((m) => (m.id === updatedMessage.id ? updatedMessage : m))
        );
      }
    );

    return () => {
      channel.unsubscribe();
    };
  }, [conversationId, loadMessages, user?.id]);

  // Mark as read on mount
  useEffect(() => {
    if (user?.id) {
      markAsRead(supabase, conversationId, user.id);
    }
  }, [conversationId, user?.id]);

  // Track viewport height changes (Android adjustResize detection)
  useEffect(() => {
    currentViewportHeightRef.current = viewportHeight;
  }, [viewportHeight]);

  // Keyboard handling: iOS uses animation-driven padding; Android uses manual padding
  useEffect(() => {
    if (Platform.OS === 'ios') {
      const showSub = Keyboard.addListener('keyboardWillChangeFrame', (e) => {
        Animated.timing(keyboardPadding, {
          toValue: e.endCoordinates.height,
          duration: e.duration ?? 250,
          useNativeDriver: false,
        }).start(() => {
          // Scroll after keyboard is fully raised so viewport is at final size
          flatListRef.current?.scrollToEnd({ animated: true });
        });
      });
      const hideSub = Keyboard.addListener('keyboardWillHide', (e) => {
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
      // Android: adjustResize resizes the window on older Android.
      // On Android 15 edge-to-edge, adjustResize is ignored so we apply manual padding.
      // Detect how much the window already shrank (adjustResize) and add the remainder.
      const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
        const keyboardH = e.endCoordinates.height;
        const alreadyShrunk = baseViewportHeightRef.current - currentViewportHeightRef.current;
        keyboardPadding.setValue(Math.max(0, keyboardH - alreadyShrunk));
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
      });
      const hideSub = Keyboard.addListener('keyboardDidHide', () => {
        keyboardPadding.setValue(0);
      });
      return () => {
        showSub.remove();
        hideSub.remove();
      };
    }
  }, [keyboardPadding]);

  const handleRetryLoad = () => {
    setLoading(true);
    setLoadError(null);
    loadMessages();
  };

  const handleSend = useCallback(
    async (text: string) => {
      if (!user?.id) return;

      // Optimistic UI: add message immediately
      const tempMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        conversation_id: conversationId,
        sender_id: user.id,
        text,
        type: 'text',
        read: false,
        read_at: null,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempMessage]);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 50);

      const result = await sendMessage(supabase, conversationId, user.id, text);
      if (result.data) {
        // Replace temp message with real one
        setMessages((prev) =>
          prev.map((m) => (m.id === tempMessage.id ? result.data! : m))
        );
      } else if (result.error) {
        // Remove temp message on error
        setMessages((prev) => prev.filter((m) => m.id !== tempMessage.id));
        Alert.alert('Error', 'Failed to send message. Please try again.');
      }
    },
    [conversationId, user?.id]
  );

  const handleBlock = () => {
    setMenuVisible(false);
    Alert.alert(
      `Block ${otherUserName}?`,
      "They won't be able to message you. You can unblock them later in Settings.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            if (!user?.id) return;
            await blockUser(supabase, user.id, otherUserId);
            navigation.goBack();
          },
        },
      ]
    );
  };

  const renderDateSeparator = (date: string) => (
    <View style={styles.dateSeparator}>
      <View style={styles.dateLine} />
      <Text style={styles.dateText}>{date}</Text>
      <View style={styles.dateLine} />
    </View>
  );

  const formatDateLabel = (dateStr: string): string => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Group messages by date for separators
  const renderMessages = () => {
    const items: Array<
      { type: 'date'; data: string } |
      { type: 'message'; data: ChatMessage }
    > = [];
    let lastDate = '';

    for (const msg of messages) {
      const msgDate = new Date(msg.timestamp).toDateString();
      if (msgDate !== lastDate) {
        items.push({ type: 'date', data: msg.timestamp });
        lastDate = msgDate;
      }
      items.push({ type: 'message', data: msg });
    }

    return items;
  };

  const flatData = renderMessages();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.primary.main} />
        </TouchableOpacity>

        <View>
          <TouchableOpacity
            onPress={(event) => {
              openProfileMenuAt(event.nativeEvent.pageX, event.nativeEvent.pageY);
            }}
            activeOpacity={0.7}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Avatar
              name={otherUserName}
              photoUrl={otherUserPhotoUrl}
              trustLevel={otherUserTrustLevel}
              size="small"
            />
          </TouchableOpacity>
        </View>

        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>
            {otherUserName}
          </Text>
          {otherUserTrustLevel >= TrustLevel.VERIFIED && (
            <Ionicons
              name="checkmark-circle"
              size={16}
              color={colors.success}
              style={{ marginLeft: 4 }}
            />
          )}
        </View>

        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setMenuVisible(!menuVisible)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="ellipsis-vertical" size={20} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>

      {/* Kebab Menu */}
      {menuVisible && (
        <Pressable style={styles.menuOverlay} onPress={() => setMenuVisible(false)}>
          <View style={styles.menu}>
            <TouchableOpacity style={styles.menuItem} onPress={handleBlock}>
              <Ionicons name="close-circle" size={18} color={colors.error} />
              <Text style={styles.menuItemTextDanger}>Block User</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      )}

      {/* Avatar Profile Menu */}
      <Modal
        visible={profileMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setProfileMenuVisible(false)}
      >
        <View style={{ flex: 1 }}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setProfileMenuVisible(false)} />
          <View style={[styles.profileDropdown, { top: profileMenuPos.top, left: profileMenuPos.left }]}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setProfileMenuVisible(false);
                Alert.alert('Coming Soon', 'User profiles will be available in a future update.');
              }}
            >
              <Ionicons name="person-outline" size={18} color={colors.text.primary} />
              <Text style={styles.menuItemText}>View Profile</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Messages */}
      <Animated.View style={[styles.flex, { paddingBottom: keyboardPadding }]}>
        {loading ? (
          <View style={styles.threadStateContainer}>
            <ActivityIndicator size="large" color={colors.primary.main} />
            <Text style={styles.threadStateText}>Loading messages…</Text>
          </View>
        ) : loadError ? (
          <View style={styles.threadStateContainer}>
            <Ionicons name="warning-outline" size={44} color={colors.warning} />
            <Text style={styles.threadStateText}>{loadError}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRetryLoad}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={flatData}
            renderItem={({ item, index }) => {
              if (item.type === 'date') {
                return renderDateSeparator(formatDateLabel(item.data));
              }
              const msg = item.data as ChatMessage;
              const isSent = msg.sender_id === user?.id;
              const nextItem = flatData[index + 1];
              const isLastInGroup =
                !isSent &&
                (!nextItem ||
                  nextItem.type === 'date' ||
                  nextItem.data?.sender_id !== msg.sender_id);
              return (
                <MessageBubble
                  text={msg.text}
                  timestamp={msg.timestamp}
                  isSent={isSent}
                  isRead={msg.read}
                  senderName={otherUserName}
                  senderPhotoUrl={otherUserPhotoUrl}
                  senderTrustLevel={otherUserTrustLevel}
                  showAvatar={isLastInGroup}
                  onAvatarPress={(pageX, pageY) => {
                    openProfileMenuAt(pageX, pageY);
                  }}
                />
              );
            }}
            keyExtractor={(item, index) =>
              item.type === 'date' ? `date-${index}` : item.data.id
            }
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => {
              if (!loading) {
                flatListRef.current?.scrollToEnd({ animated: false });
              }
            }}
            onLayout={() => {
              flatListRef.current?.scrollToEnd({ animated: false });
            }}
            ListEmptyComponent={
              <View style={styles.threadStateContainer}>
                <Text style={styles.threadStateText}>No messages yet. Say hello!</Text>
              </View>
            }
          />
        )}

        <ChatInput onSend={handleSend} />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: 10,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.xs,
  },
  headerName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text.primary,
    flexShrink: 1,
  },
  menuButton: {
    padding: spacing.xs,
  },
  menu: {
    position: 'absolute',
    top: 56,
    right: spacing.s,
    backgroundColor: colors.white,
    borderRadius: 8,
    paddingVertical: 4,
    zIndex: 100,
    elevation: 8,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  menuOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 90,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.s,
    paddingVertical: 12,
    gap: spacing.xs,
  },
  menuItemText: {
    ...typography.body,
    fontSize: 15,
    color: colors.text.primary,
  },
  profileDropdown: {
    position: 'absolute',
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingVertical: 4,
    minWidth: 160,
    elevation: 8,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  menuItemTextDanger: {
    ...typography.body,
    fontSize: 15,
    color: colors.error,
  },
  messagesList: {
    paddingVertical: spacing.xs,
    flexGrow: 1,
  },
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.s,
    marginVertical: spacing.s,
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dateText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.text.secondary,
    paddingHorizontal: spacing.xs,
    backgroundColor: colors.background,
    overflow: 'hidden',
    borderRadius: 10,
    paddingVertical: 2,
  },
  threadStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.m,
    gap: spacing.s,
  },
  threadStateText: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.xs,
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
});
