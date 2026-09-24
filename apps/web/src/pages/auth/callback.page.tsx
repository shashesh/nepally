import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Button, Group, Loader, Text } from '@mantine/core';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { finishSignIn } from '../../lib/authCallback';
import { AuthCard } from '../../components/auth/AuthCard';

type CallbackState = { kind: 'working' } | { kind: 'expired' } | { kind: 'failed'; message: string };

/** How long to wait for Supabase to hand over a session before calling the link expired. */
const SESSION_TIMEOUT_MS = 10_000;

function ExpiredCard() {
  return (
    <>
      <Head>
        <title>Link expired - Nepally</title>
      </Head>
      <AuthCard
        title="Link expired"
        description="This verification link may have expired or already been used."
      >
        <Text ta="center">
          <Link href="/signup">Sign up</Link> or <Link href="/login">Log in</Link>
        </Text>
      </AuthCard>
    </>
  );
}

function FailedCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <>
      <Head>
        <title>Sign-in failed - Nepally</title>
      </Head>
      <AuthCard title="Couldn't finish signing you in" description={message}>
        <Button fullWidth onClick={onRetry}>
          Try again
        </Button>
      </AuthCard>
    </>
  );
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const [state, setState] = useState<CallbackState>({ kind: 'working' });

  useEffect(() => {
    // Stops a second concurrent run: SIGNED_IN and getSession can both deliver the session.
    let started = false;
    let mounted = true;

    const timeout = setTimeout(() => {
      if (!started) setState({ kind: 'expired' });
    }, SESSION_TIMEOUT_MS);

    async function run(session: Session) {
      if (started) return;
      started = true;
      // A slow profile write must not flip a working page to expired.
      clearTimeout(timeout);
      const result = await finishSignIn(supabase, session);
      if (!mounted) return;
      if ('error' in result) {
        setState({ kind: 'failed', message: result.error });
        return;
      }
      void router.push(result.destination);
    }

    // The email link's token arrives as an auth event.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) void run(session);
    });

    // An OAuth redirect (Google) may have exchanged the code before this mounted.
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) void run(session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
    // Subscribe once. Next hands out a fresh router object on router-driven renders,
    // and re-running would reset `started` and could finish sign-in twice. Its push
    // delegates to the router singleton, so the first render's object stays usable.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see above
  }, []);

  if (state.kind === 'expired') return <ExpiredCard />;
  // The session persists, so a reload runs finishSignIn again.
  if (state.kind === 'failed') return <FailedCard message={state.message} onRetry={() => router.reload()} />;

  return (
    <>
      <Head>
        <title>Signing in - Nepally</title>
      </Head>
      <AuthCard title="Signing you in…">
        <Group justify="center">
          <Loader aria-hidden="true" />
        </Group>
      </AuthCard>
    </>
  );
}
