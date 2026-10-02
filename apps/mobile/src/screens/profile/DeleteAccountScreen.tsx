import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDeleteAccountFlow } from '../../hooks/useDeleteAccountFlow';
import type { DeleteAccountFlowState } from '../../hooks/useDeleteAccountFlow';
import {
  ExplainStep,
  FinalStep,
  GoogleConfirmStep,
  PasswordConfirmStep,
} from './components/DeleteAccountSteps';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';

function CurrentStep({ flow, onCancel }: { flow: DeleteAccountFlowState; onCancel: () => void }) {
  switch (flow.step) {
    case 'explain':
      return (
        <ExplainStep
          email={flow.email}
          scheduledDate={flow.scheduledDate}
          busy={flow.busy}
          onContinue={() => void flow.handleContinue()}
          onCancel={onCancel}
        />
      );
    case 'confirm':
      return flow.reauthMethod === 'password' ? (
        <PasswordConfirmStep
          notice={flow.notice}
          error={flow.error}
          password={flow.password}
          busy={flow.busy}
          onPasswordChange={flow.setPassword}
          onSubmit={() => void flow.handlePassword()}
          onGoogle={flow.offersGoogle ? () => void flow.handleGoogle() : undefined}
        />
      ) : (
        <GoogleConfirmStep
          notice={flow.notice}
          error={flow.error}
          busy={flow.busy}
          onGoogle={() => void flow.handleGoogle()}
        />
      );
    case 'final':
      return (
        <FinalStep
          email={flow.email}
          scheduledDate={flow.scheduledDate}
          error={flow.error}
          busy={flow.busy}
          onDelete={() => void flow.handleDelete()}
          onCancel={onCancel}
        />
      );
  }
}

/** Profile → Delete Account: explain, confirm it's you, delete (spec §5.2). */
export function DeleteAccountScreen() {
  const navigation = useNavigation();
  const flow = useDeleteAccountFlow();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.flex}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <CurrentStep flow={flow} onCancel={() => navigation.goBack()} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    padding: spacing.l,
  },
});
