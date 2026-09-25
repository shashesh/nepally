import React, { useEffect, useRef } from 'react';
import { Button, Text, Title } from '@mantine/core';
import { IconRocket } from '@tabler/icons-react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { PROMOTION_BLOCKER_MESSAGES, PROMOTION_TIERS, type PromotionViewer } from '@nepally/shared';
import { useAuth } from '../../../../hooks/useAuth';
import { usePromoteWizard, type WizardStep } from '../../../../hooks/usePromoteWizard';
import { EmptyState, ErrorState, LoadingState, PageHeader } from '../../../../components/ui';
import { PromoteSteps } from '../../../../components/marketplace/promote/PromoteSteps';
import { PromotionTierPicker } from '../../../../components/marketplace/promote/PromotionTierPicker';
import { PromotionDurationStep } from '../../../../components/marketplace/promote/PromotionDurationStep';
import { PromotionReview } from '../../../../components/marketplace/promote/PromotionReview';
import styles from '../promote.module.css';

const MY_LISTINGS = '/marketplace/my-listings';
const STEP_LABELS = ['Type', 'Duration', 'Review & pay'] as const;
const STEP_COPY: Record<WizardStep, { heading: string; intro?: string }> = {
  1: { heading: 'Choose a promotion type', intro: 'Select how you want to boost your listing.' },
  2: { heading: 'Set duration', intro: 'How long should your promotion run?' },
  3: { heading: 'Review and pay' },
};

export default function PromoteListingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const listingId = typeof router.query.id === 'string' ? router.query.id : undefined;

  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);

  if (!user) return null;
  // Keyed by id: the Pages Router keeps this page mounted from one listing to
  // the next, and a wizard half-filled for one must not carry to another.
  return <PromoteWizardView key={listingId ?? ''} listingId={listingId} viewer={user} />;
}

interface PromoteWizardViewProps {
  listingId: string | undefined;
  viewer: PromotionViewer;
}

function PromoteWizardView({ listingId, viewer }: PromoteWizardViewProps) {
  const wizard = usePromoteWizard(listingId, viewer);

  return (
    <>
      <Head>
        <title>Promote Listing — Nepally</title>
      </Head>
      <div className={styles.container}>
        <PageHeader title="Promote listing" backHref={MY_LISTINGS} backLabel="My Listings" />
        {!listingId || wizard.loading ? (
          <LoadingState variant="detail" label="Loading your listing…" />
        ) : wizard.error ? (
          <ErrorState title="Couldn't load this listing" message={wizard.error} onRetry={wizard.reload} />
        ) : wizard.notFound || !wizard.listing ? (
          <EmptyState
            titleOrder={2}
            title="Listing not found"
            description="It may have been deleted."
            action={<GoToMyListings />}
          />
        ) : wizard.blocker ? (
          <EmptyState
            titleOrder={2}
            icon={<IconRocket size={40} />}
            title={PROMOTION_BLOCKER_MESSAGES[wizard.blocker].title}
            description={PROMOTION_BLOCKER_MESSAGES[wizard.blocker].message}
            action={<GoToMyListings />}
          />
        ) : (
          <WizardSteps wizard={wizard} />
        )}
      </div>
    </>
  );
}

function GoToMyListings() {
  return (
    <Button component={Link} href={MY_LISTINGS} variant="default">
      Go to My Listings
    </Button>
  );
}

function WizardSteps({ wizard }: { wizard: ReturnType<typeof usePromoteWizard> }) {
  const { step, tier, listing } = wizard;
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Set by Back / Continue, so focus moves only when the member changed step,
  // not when the wizard first opens.
  const movedRef = useRef(false);

  // The button just pressed unmounts with its step, so focus would fall to
  // <body>. Land it on the new step's heading instead.
  useEffect(() => {
    if (!movedRef.current) return;
    movedRef.current = false;
    headingRef.current?.focus();
  }, [step]);

  const go = (move: () => void) => {
    movedRef.current = true;
    move();
  };
  const canContinue = step !== 1 || tier !== null;
  const copy = STEP_COPY[step];

  return (
    <div className={styles.body}>
      <PromoteSteps labels={STEP_LABELS} current={step} />

      <section className={styles.step} aria-labelledby="promote-step-heading">
        <Title order={2} id="promote-step-heading" ref={headingRef} tabIndex={-1} className={styles.stepHeading}>
          {copy.heading}
        </Title>
        {copy.intro ? <Text className={styles.stepIntro}>{copy.intro}</Text> : null}

        {step === 1 && (
          <PromotionTierPicker tiers={PROMOTION_TIERS} value={tier?.type ?? null} onChange={wizard.setTier} />
        )}
        {step === 2 && tier && (
          <PromotionDurationStep
            tier={tier}
            days={wizard.days}
            onDaysChange={wizard.setDays}
            totalCents={wizard.totalCents}
            endDate={wizard.endDate}
          />
        )}
        {step === 3 && tier && listing && (
          <PromotionReview
            listing={listing}
            tier={tier}
            days={wizard.days}
            startDate={wizard.startDate}
            endDate={wizard.endDate}
            totalCents={wizard.totalCents}
            paying={wizard.paying}
            payError={wizard.payError}
            onPay={() => void wizard.pay()}
          />
        )}
      </section>

      <div className={styles.actions}>
        {step === 1 ? (
          <Button component={Link} href={MY_LISTINGS} variant="default">
            Back
          </Button>
        ) : (
          <Button variant="default" onClick={() => go(wizard.back)}>
            Back
          </Button>
        )}
        {step < 3 && (
          <Button
            onClick={() => {
              if (canContinue) go(wizard.next);
            }}
            aria-disabled={!canContinue || undefined}
            data-disabled={!canContinue || undefined}
          >
            Continue
          </Button>
        )}
      </div>
    </div>
  );
}
