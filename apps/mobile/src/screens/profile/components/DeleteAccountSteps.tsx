import React, { useState } from 'react';
import { Linking, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SUPPORT_EMAIL, formatDeletionDate } from '@nepally/shared';
import { PrimaryButton } from '../../../components/buttons/PrimaryButton';
import { SecondaryButton } from '../../../components/buttons/SecondaryButton';
import { colors } from '../../../styles/colors';
import { typography } from '../../../styles/typography';
import { spacing, borderRadius } from '../../../styles/spacing';

const REMOVED = [
  'your profile and photos',
  'your posts and comments',
  'the messages you sent (messages other members sent you stay in their chats)',
  'your listings and events (active promotions end with the listings)',
];

function StepHeader({ title, description }: { title: string; description: string }) {
  return (
    <View style={styles.header}>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

function ErrorText({ message }: { message: string }) {
  if (!message) return null;
  return (
    <Text style={styles.error} accessibilityRole="alert">
      {message}
    </Text>
  );
}

/** Says which account is about to go, so a Google chooser slip can't go unnoticed. */
function SignedInAs({ email }: { email: string }) {
  if (!email) return null;
  return <Text style={styles.signedInAs}>{`Signed in as ${email}`}</Text>;
}

function GoogleButton({ busy, onPress }: { busy: boolean; onPress: () => void }) {
  return (
    <SecondaryButton
      title="Continue with Google"
      onPress={onPress}
      loading={busy}
      disabled={busy}
    />
  );
}

interface ExplainStepProps {
  email: string;
  scheduledDate: string;
  busy: boolean;
  onContinue: () => void;
  onCancel: () => void;
}

export function ExplainStep({
  email,
  scheduledDate,
  busy,
  onContinue,
  onCancel,
}: ExplainStepProps) {
  return (
    <View style={styles.step}>
      <StepHeader
        title="Delete your account"
        description="Read this first. After the grace period it can't be undone."
      />
      <SignedInAs email={email} />
      <Text style={styles.body}>Deleting your account removes:</Text>
      {REMOVED.map((item) => (
        <View key={item} style={styles.listItem}>
          <Text style={styles.body}>{'\u2022'}</Text>
          <Text style={[styles.body, styles.listText]}>{item}</Text>
        </View>
      ))}
      <Text style={styles.body}>
        {`Your account is hidden from other members right away and deleted on ${formatDeletionDate(scheduledDate)}. Sign in before then to restore it.`}
      </Text>
      <PrimaryButton title="Continue" onPress={onContinue} loading={busy} disabled={busy} />
      <SecondaryButton title="Cancel" onPress={onCancel} disabled={busy} />
    </View>
  );
}

interface PasswordConfirmStepProps {
  notice: string;
  error: string;
  password: string;
  busy: boolean;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
  /** Set when the account has Google too, which can stand in for a forgotten password. */
  onGoogle?: () => void;
}

export function PasswordConfirmStep({
  notice,
  error,
  password,
  busy,
  onPasswordChange,
  onSubmit,
  onGoogle,
}: PasswordConfirmStepProps) {
  const [showPassword, setShowPassword] = useState(false);

  function openSupportEmail() {
    // No mail app: the address is on screen to copy, so there is nothing to report.
    Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() => undefined);
  }

  return (
    <View style={styles.step}>
      <StepHeader
        title="Confirm it's you"
        description={notice || 'Enter your password to continue.'}
      />
      <ErrorText message={error} />
      <Text style={styles.label}>Password</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, error ? styles.inputError : null]}
          accessibilityLabel="Password"
          value={password}
          onChangeText={onPasswordChange}
          secureTextEntry={!showPassword}
          autoComplete="current-password"
          autoCapitalize="none"
          returnKeyType="done"
          onSubmitEditing={onSubmit}
          editable={!busy}
        />
        <TouchableOpacity
          style={styles.eyeButton}
          onPress={() => setShowPassword((shown) => !shown)}
          accessibilityRole="button"
          accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
            size={22}
            color={colors.text.secondary}
          />
        </TouchableOpacity>
      </View>
      <PrimaryButton title="Confirm" onPress={onSubmit} loading={busy} disabled={busy} />
      {onGoogle ? (
        <>
          <Text style={styles.or}>or</Text>
          <GoogleButton busy={busy} onPress={onGoogle} />
        </>
      ) : null}
      <Text style={styles.help}>
        {'Forgot your password? Email '}
        <Text style={styles.link} accessibilityRole="link" onPress={openSupportEmail}>
          {SUPPORT_EMAIL}
        </Text>
        {" from your account's email address and we'll delete it for you."}
      </Text>
    </View>
  );
}

interface GoogleConfirmStepProps {
  notice: string;
  error: string;
  busy: boolean;
  onGoogle: () => void;
}

export function GoogleConfirmStep({ notice, error, busy, onGoogle }: GoogleConfirmStepProps) {
  return (
    <View style={styles.step}>
      <StepHeader
        title="Confirm it's you"
        description={notice || 'Sign in with Google again to continue.'}
      />
      <ErrorText message={error} />
      <GoogleButton busy={busy} onPress={onGoogle} />
    </View>
  );
}

interface FinalStepProps {
  email: string;
  scheduledDate: string;
  error: string;
  busy: boolean;
  onDelete: () => void;
  onCancel: () => void;
}

export function FinalStep({
  email,
  scheduledDate,
  error,
  busy,
  onDelete,
  onCancel,
}: FinalStepProps) {
  return (
    <View style={styles.step}>
      <StepHeader
        title="Delete your account?"
        description={`Your account will be hidden now and deleted on ${formatDeletionDate(scheduledDate)}.`}
      />
      <SignedInAs email={email} />
      <ErrorText message={error} />
      <PrimaryButton
        title="Delete my account"
        onPress={onDelete}
        loading={busy}
        disabled={busy}
        style={styles.dangerButton}
      />
      <SecondaryButton title="Cancel" onPress={onCancel} disabled={busy} />
    </View>
  );
}

const styles = StyleSheet.create({
  step: {
    gap: spacing.s,
  },
  header: {
    gap: spacing.xs,
  },
  title: {
    ...typography.h2,
    color: colors.text.primary,
  },
  description: {
    ...typography.body,
    color: colors.text.secondary,
  },
  signedInAs: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  body: {
    ...typography.body,
    color: colors.text.primary,
  },
  listItem: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingLeft: spacing.xs,
  },
  listText: {
    flex: 1,
  },
  label: {
    ...typography.caption,
    color: colors.text.primary,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.input,
    paddingHorizontal: spacing.s,
    paddingRight: 48,
    ...typography.body,
    color: colors.text.primary,
  },
  inputError: {
    borderColor: colors.error,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    height: 48,
    justifyContent: 'center',
  },
  or: {
    ...typography.caption,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  help: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  link: {
    color: colors.primary.main,
    textDecorationLine: 'underline',
  },
  error: {
    ...typography.caption,
    color: colors.error,
  },
  dangerButton: {
    backgroundColor: colors.error,
  },
});
