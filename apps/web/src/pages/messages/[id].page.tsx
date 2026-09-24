import React, { useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Button, Text } from '@mantine/core';
import { formatPublicName } from '@nepally/shared';
import { useAuth } from '../../hooks/useAuth';
import { useMessageThread } from '../../hooks/useMessageThread';
import { EmptyState, ErrorState, LoadingState, PageHeader } from '../../components/ui';
import { MessageComposer } from '../../components/messages/MessageComposer';
import { MessageLog } from '../../components/messages/MessageLog';
import { ThreadHeader } from '../../components/messages/ThreadHeader';
import styles from './messages.module.css';

export default function MessageThreadPage() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);

  if (!user) return null;
  // Before the router parses the URL there is no id, and the page must not
  // decide the conversation is missing on that basis.
  const conversationId = router.isReady && typeof router.query.id === 'string' ? router.query.id : null;
  return <ThreadView conversationId={conversationId} viewerId={user.id} />;
}

function ThreadView({ conversationId, viewerId }: { conversationId: string | null; viewerId: string }) {
  const thread = useMessageThread(conversationId, viewerId);
  const { partner } = thread;

  if (partner) {
    const name = formatPublicName(partner.other_user_name);
    return (
      <>
        <Head>
          <title>{`${name} - Messages - Nepally`}</title>
        </Head>
        <div className={styles.page}>
          <ThreadHeader partner={partner} />
          {thread.messages.length > 0 ? (
            <MessageLog messages={thread.messages} viewerId={viewerId} partner={partner} />
          ) : (
            <Text className={styles.firstMessage}>No messages yet. Say hello!</Text>
          )}
          <MessageComposer partnerName={name} onSend={thread.send} />
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Messages - Nepally</title>
      </Head>
      <div className={styles.page}>
        <PageHeader title="Conversation" backHref="/messages" backLabel="Messages" />
        {thread.error ? (
          <ErrorState message={thread.error} onRetry={thread.reload} />
        ) : thread.notFound ? (
          <EmptyState
            title="Conversation not found"
            description="It may have been removed, or you may not have access to it."
            action={
              <Button component={Link} href="/messages">
                Back to Messages
              </Button>
            }
          />
        ) : (
          <LoadingState variant="detail" label="Loading conversation…" />
        )}
      </div>
    </>
  );
}
