import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  StatusBar,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../hooks/useAuth';
import { ConversationItem } from '../../components/chat/ConversationItem';
import { getConversations } from '@nepally/shared';
import type { ConversationWithParticipant } from '@nepally/shared';
import { ChatStackParamList } from '../../types/navigation';
import { supabase } from '../../config/supabase';
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
    const result = await getConversations(supabase, user.id);
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
      otherUserTrustLevel: conv.other_user_trust_level ?? 0,
      otherUserPhotoUrl: conv.other_user_photo,
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
        Tap any user&apos;s avatar on a post to start chatting.
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

      <FlatList
        data={conversations}
        renderItem={({ item }) => (
          <ConversationItem
            otherUserName={item.other_user_name}
            otherUserPhoto={item.other_user_photo}
            otherUserTrustLevel={item.other_user_trust_level}
            lastMessage={item.last_message}
            lastMessageTime={item.last_message_time}
            unreadCount={item.unread_count}
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
