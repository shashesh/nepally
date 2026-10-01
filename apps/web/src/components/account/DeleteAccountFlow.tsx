import React from 'react';
import Head from 'next/head';
import { getReauthMethod, hasGoogleIdentity } from '@nepally/shared';
import { useDeleteAccountFlow } from '../../hooks/useDeleteAccountFlow';
import {
  ExplainStep,
  FinalStep,
  GoogleConfirmStep,
  PasswordConfirmStep,
  WrongAccountStep,
} from './DeleteAccountSteps';

export { REAUTH_USER_KEY } from '../../hooks/useDeleteAccountFlow';

/**
 * Deleting a signed-in member's account (spec §5.2): explain, confirm it's
 * them, delete. /delete-account renders it for any session, so a Google
 * re-auth as a different account, even one with no profile, still lands
 * here and is signed out.
 */
export function DeleteAccountFlow() {
  const flow = useDeleteAccountFlow();
  const { step, scheduledDate, notice, error, busy, supabaseUser } = flow;
  const email = supabaseUser?.email;

  let content: React.ReactNode;
  if (step === 'wrong-account') {
    content = <WrongAccountStep />;
  } else if (step === 'explain') {
    content = (
      <ExplainStep
        email={email}
        scheduledDate={scheduledDate}
        busy={busy}
        onContinue={() => void flow.handleContinue()}
      />
    );
  } else if (step === 'confirm' && supabaseUser && getReauthMethod(supabaseUser) === 'password') {
    content = (
      <PasswordConfirmStep
        notice={notice}
        error={error}
        password={flow.password}
        busy={busy}
        onPasswordChange={flow.setPassword}
        onSubmit={(event) => void flow.handlePassword(event)}
        onGoogle={hasGoogleIdentity(supabaseUser) ? () => void flow.handleGoogle() : undefined}
      />
    );
  } else if (step === 'confirm') {
    content = (
      <GoogleConfirmStep
        notice={notice}
        error={error}
        busy={busy}
        onGoogle={() => void flow.handleGoogle()}
      />
    );
  } else {
    content = (
      <FinalStep
        email={email}
        scheduledDate={scheduledDate}
        error={error}
        busy={busy}
        onDelete={() => void flow.handleDelete()}
      />
    );
  }

  return (
    <>
      <Head>
        <title>Delete account - Nepally</title>
      </Head>
      {content}
    </>
  );
}
