import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { ConversationItem } from '../../components/chat/ConversationItem';
import {
  getConversations,
  ConversationWithParticipant,
} from '../../services/api/conversations';
import { ChatStackParamList } from '../../types/navigation';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { spacing } from '../../styles/spacing';

type ChatNavProp = NativeStackNavigationProp<ChatStackParamList>;

export default function ConversationListScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<ChatNavProp>();
  const [conversations, setConversations] = useState<ConversationWithParticipant[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadConversations = useCallback(async () => {
    if (!user?.id) return;
    const result = await getConversations(user.id);
    if (result.data) {
      setConversations(result.data);
    }
    setLoading(false);
    setRefreshing(false);
  }, [user?.id]);

  // Reload whenever screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [loadConversations])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadConversations();
  };

  const handleConversationPress = (conv: ConversationWithParticipant) => {
    navigation.navigate('MessageThread', {
      conversationId: conv.id,
      otherUserId: conv.other_user_id,
      otherUserName: conv.other_user_name,
      otherUserTrustLevel: 1, // We don't have this in the list query; default to verified
      postId: conv.post_id || undefined,
      postTitle: conv.post_title,
      postCategory: conv.post_category,
    });
  };

  const handleBrowsePosts = () => {
    // Navigate to Home tab
    const parent = navigation.getParent();
    parent?.navigate('Home');
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="chatbubbles-outline" size={64} color={colors.text.disabled} />
      <Text style={styles.emptyTitle}>No messages yet</Text>
      <Text style={styles.emptySubtitle}>
        Browse posts and tap the message icon to start a conversation.
      </Text>
      <TouchableOpacity
        style={styles.browseCta}
        onPress={handleBrowsePosts}
        activeOpacity={0.7}
      >
        <Text style={styles.browseCtaText}>Browse Posts</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>

      <FlatList
        data={conversations}
        renderItem={({ item }) => (
          <ConversationItem
            otherUserName={item.other_user_name}
            lastMessage={item.last_message}
            lastMessageTime={item.last_message_time}
            unreadCount={item.unread_count}
            postTitle={item.post_title}
            postCategory={item.post_category}
            onPress={() => handleConversationPress(item)}
          />
        )}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary.main}
          />
        }
        ListEmptyComponent={loading ? null : renderEmptyState}
        contentContainerStyle={conversations.length === 0 ? styles.emptyList : undefined}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    paddingHorizontal: spacing.s,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text.primary,
  },
  emptyList: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.l,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginTop: spacing.s,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  browseCta: {
    marginTop: spacing.m,
    paddingHorizontal: spacing.m,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.primary.main,
    borderRadius: 8,
  },
  browseCtaText: {
    ...typography.button,
    color: colors.primary.main,
  },
});
