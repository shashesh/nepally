import React, { useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { IconMessageCircle } from '@tabler/icons-react';
import { useAuth } from '../../hooks/useAuth';
import { useConversations } from '../../hooks/useConversations';
import { EmptyState, ErrorState, LoadingState, PageHeader } from '../../components/ui';
import { ConversationRow } from '../../components/messages/ConversationRow';
import styles from './messages.module.css';

export default function MessagesPage() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);

  if (!user) return null;
  return <MessagesView userId={user.id} />;
}

function MessagesView({ userId }: { userId: string }) {
  const inbox = useConversations(userId);

  return (
    <>
      <Head>
        <title>Messages - Nepally</title>
      </Head>
      <div className={styles.page}>
        <PageHeader title="Messages" />
        {inbox.loading ? (
          <LoadingState label="Loading conversations…" />
        ) : inbox.error ? (
          <ErrorState message={inbox.error} onRetry={inbox.reload} />
        ) : inbox.conversations.length === 0 ? (
          <EmptyState
            icon={<IconMessageCircle size={32} />}
            title="No messages yet"
            description="Start a conversation from a member's profile, a post or a listing."
          />
        ) : (
          <ul className={styles.list}>
            {inbox.conversations.map((conversation) => (
              <ConversationRow key={conversation.id} conversation={conversation} />
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
