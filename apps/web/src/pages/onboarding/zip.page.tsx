import { useEffect, useRef, useState, type FormEvent, type ReactNode, type RefObject } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Alert, Button, Divider, Group, Loader, Paper, Stack, Text, TextInput } from '@mantine/core';
import { IconMapPin } from '@tabler/icons-react';
import {
  addSavedLocation,
  cleanZipCode,
  getMetroByZip,
  isValidZipCode,
  logClientEvent,
  updateUserLocation,
} from '@nepally/shared';
import type { MetroArea } from '@nepally/shared';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useRedirectWhen } from '../../hooks/useRedirectWhen';
import { detectLocationMetro } from '../../lib/location';
import { AuthCard } from '../../components/auth/AuthCard';
import styles from './onboarding.module.css';

const INVALID_ZIP = 'Please enter a valid 5-digit ZIP code.';
const UNKNOWN_ZIP = 'ZIP code not found. Please double-check and try again.';
const DETECT_FAILED = "Couldn't detect your location. Please enter your ZIP code instead.";
const SAVE_FAILED = 'Failed to save location. Please try again.';

type ZipBusy = 'lookup' | 'detect' | null;

/** The busy-controls rule: focusable while locked, a Loader on the one that's running. */
function busyButtonProps(locked: boolean, running: boolean, icon?: ReactNode) {
  return {
    'aria-disabled': locked || undefined,
    'data-disabled': locked || undefined,
    'aria-busy': running || undefined,
    leftSection: running ? <Loader size={16} color="currentColor" aria-hidden="true" /> : icon,
  };
}

function zipFieldError(zipCode: string, submitted: boolean, unknownZip: boolean): string | undefined {
  if (submitted && !isValidZipCode(zipCode)) return INVALID_ZIP;
  if (unknownZip) return UNKNOWN_ZIP;
  return undefined;
}

interface ZipStepProps {
  titleRef: RefObject<HTMLHeadingElement | null>;
  zipRef: RefObject<HTMLInputElement | null>;
  zipCode: string;
  zipError?: string;
  alert: string;
  busy: ZipBusy;
  onZipChange: (value: string) => void;
  onLookup: (e: FormEvent) => void;
  onDetect: () => void;
}

function ZipStep({ titleRef, zipRef, zipCode, zipError, alert, busy, onZipChange, onLookup, onDetect }: ZipStepProps) {
  const locked = busy !== null;
  return (
    <AuthCard
      title="Where are you?"
      titleRef={titleRef}
      description="Enter your ZIP code so we can show you local community posts."
    >
      {alert && (
        <Alert color="red" variant="light">
          {alert}
        </Alert>
      )}

      <form noValidate onSubmit={onLookup}>
        <Stack gap="sm">
          <TextInput
            ref={zipRef}
            label="ZIP code"
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={5}
            value={zipCode}
            onChange={(e) => onZipChange(e.target.value)}
            placeholder="e.g. 10001"
            error={zipError}
            autoFocus
          />
          <Button type="submit" fullWidth {...busyButtonProps(locked, busy === 'lookup')}>
            Find my area
          </Button>
        </Stack>
      </form>

      <Divider label="or" labelPosition="center" />

      <Button
        variant="default"
        fullWidth
        onClick={onDetect}
        {...busyButtonProps(locked, busy === 'detect', <IconMapPin size={18} aria-hidden="true" />)}
      >
        Detect my location
      </Button>
    </AuthCard>
  );
}

interface ConfirmStepProps {
  titleRef: RefObject<HTMLHeadingElement | null>;
  metro: MetroArea;
  alert: string;
  completing: boolean;
  onChangeZip: () => void;
  onConfirm: () => void;
}

function ConfirmStep({ titleRef, metro, alert, completing, onChangeZip, onConfirm }: ConfirmStepProps) {
  return (
    <AuthCard title="Confirm your area" titleRef={titleRef} description="We found your metro area:">
      <Paper className={styles.metro}>
        {metro.name}, {metro.state}
      </Paper>

      {alert && (
        <Alert color="red" variant="light">
          {alert}
        </Alert>
      )}

      <Group gap="sm" grow>
        <Button variant="default" onClick={onChangeZip}>
          Change ZIP
        </Button>
        <Button onClick={onConfirm} {...busyButtonProps(completing, completing)}>
          Confirm and continue
        </Button>
      </Group>
    </AuthCard>
  );
}

export default function ZipCodePage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [zipCode, setZipCode] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [unknownZip, setUnknownZip] = useState(false);
  const [metro, setMetro] = useState<MetroArea | null>(null);
  const [alert, setAlert] = useState('');
  const [busy, setBusy] = useState<ZipBusy>(null);
  // Set by handleConfirm, whose own push to /feed must win over the has-a-metro redirect.
  const [completing, setCompleting] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const zipRef = useRef<HTMLInputElement>(null);
  const stepChanged = useRef(false);
  const step = metro ? 'confirm' : 'zip';

  // The pressed button leaves with its step, so focus would fall to <body>.
  // Land it on the new step's h1 instead — but not on first mount, where the
  // ZIP field's autoFocus wins.
  useEffect(() => {
    if (!stepChanged.current) return;
    stepChanged.current = false;
    titleRef.current?.focus();
  }, [step]);

  const signedOut = useRedirectWhen(!user, '/login');
  const hasMetro = useRedirectWhen(!!user?.metro_area_id && !completing, '/feed');
  if (signedOut || hasMetro || !user) return null;
  const userId = user.id;

  function showStep(next: MetroArea | null) {
    stepChanged.current = true;
    setMetro(next);
    setAlert('');
  }

  function handleZipChange(value: string) {
    setZipCode(cleanZipCode(value));
    setUnknownZip(false);
  }

  async function handleLookup(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setSubmitted(true);
    setUnknownZip(false);
    setAlert('');
    if (!isValidZipCode(zipCode)) {
      zipRef.current?.focus();
      return;
    }

    setBusy('lookup');
    const result = await getMetroByZip(supabase, zipCode);
    setBusy(null);
    if (result.data) {
      showStep(result.data);
      return;
    }
    setUnknownZip(true);
    zipRef.current?.focus();
  }

  async function handleDetect() {
    if (busy) return;
    setBusy('detect');
    setAlert('');
    const result = await detectLocationMetro();
    setBusy(null);
    if (!result) {
      setAlert(DETECT_FAILED);
      return;
    }
    setZipCode(result.zip_code);
    showStep({ id: result.metro_area_id, name: result.metro_name, state: result.metro_state, population: null });
  }

  async function handleConfirm() {
    if (!metro || completing) return;
    setCompleting(true);
    setAlert('');
    const result = await updateUserLocation(supabase, userId, zipCode, metro.id);
    if (result.error) {
      setCompleting(false);
      setAlert(SAVE_FAILED);
      return;
    }

    // The metro is saved on the profile now, so a failed Home entry doesn't
    // block the member: Manage Locations can add it later.
    const home = await addSavedLocation(supabase, userId, metro.id, 'Home', zipCode, true);
    if (home.error) {
      logClientEvent({
        event: 'onboarding_home_location_failed',
        context: { platform: 'web', userId },
        error: home.error,
      });
    }
    await refreshUser();
    void router.push('/feed');
  }

  return (
    <>
      <Head>
        <title>Set your location - Nepally</title>
      </Head>
      {metro ? (
        <ConfirmStep
          titleRef={titleRef}
          metro={metro}
          alert={alert}
          completing={completing}
          onChangeZip={() => showStep(null)}
          onConfirm={handleConfirm}
        />
      ) : (
        <ZipStep
          titleRef={titleRef}
          zipRef={zipRef}
          zipCode={zipCode}
          zipError={zipFieldError(zipCode, submitted, unknownZip)}
          alert={alert}
          busy={busy}
          onZipChange={handleZipChange}
          onLookup={handleLookup}
          onDetect={handleDetect}
        />
      )}
    </>
  );
}
