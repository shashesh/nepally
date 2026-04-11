import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MarketplaceStackParamList } from '../../types/navigation';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../config/supabase';
import { colors } from '../../styles/colors';
import {
  PROMOTION_TIERS,
  DEFAULT_PROMOTION_DAYS,
  MIN_PROMOTION_DAYS,
  MAX_PROMOTION_DAYS,
  formatCurrency,
  addDays,
  formatDate,
  createPromotionCheckout,
  getPromotionById,
  getListingById,
} from '@nepally/shared';
import type { PromotionTierConfig, MarketplaceListing } from '@nepally/shared';
import Constants from 'expo-constants';

type Props = NativeStackScreenProps<MarketplaceStackParamList, 'PromoteListing'>;

const SUPABASE_URL =
  Constants.expoConfig?.extra?.supabaseUrl ||
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  '';

const SUPABASE_ANON_KEY =
  Constants.expoConfig?.extra?.supabaseAnonKey ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  '';

type WizardStep = 1 | 2 | 3 | 4;

const STEP_LABELS = ['Type', 'Duration', 'Pay', 'Done'];

export default function PromoteListingScreen({ route, navigation }: Props) {
  const { listingId } = route.params;
  const { user } = useAuth();
  const mountedRef = useRef(true);

  const [step, setStep] = useState<WizardStep>(1);
  const [selectedTier, setSelectedTier] = useState<PromotionTierConfig | null>(null);
  const [durationDays, setDurationDays] = useState(DEFAULT_PROMOTION_DAYS);
  const [listing, setListing] = useState<MarketplaceListing | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [promotionId, setPromotionId] = useState<string | null>(null);
  const [promotionActive, setPromotionActive] = useState(false);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Fetch listing details
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await getListingById(supabase, listingId);
      if (!cancelled && result.data) {
        setListing(result.data);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [listingId]);

  const totalCostCents = selectedTier
    ? selectedTier.daily_cost_cents * durationDays
    : 0;

  const projectedEndDate = addDays(new Date(), durationDays);

  const isLevel0 = (user?.trust_level ?? 0) < 1;

  const handleDurationChange = useCallback((text: string) => {
    const num = parseInt(text, 10);
    if (isNaN(num)) {
      setDurationDays(MIN_PROMOTION_DAYS);
    } else {
      setDurationDays(Math.max(MIN_PROMOTION_DAYS, Math.min(MAX_PROMOTION_DAYS, num)));
    }
  }, []);

  const handleStepperPress = useCallback((delta: number) => {
    setDurationDays((prev) =>
      Math.max(MIN_PROMOTION_DAYS, Math.min(MAX_PROMOTION_DAYS, prev + delta))
    );
  }, []);

  const handlePay = useCallback(async () => {
    if (!selectedTier || !user) return;

    setPaymentLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        Alert.alert('Error', 'Please sign in again to continue.');
        return;
      }

      const result = await createPromotionCheckout(
        SUPABASE_URL,
        session.access_token,
        SUPABASE_ANON_KEY,
        {
          listing_id: listingId,
          promotion_type: selectedTier.type,
          duration_days: durationDays,
        },
        'mobile'
      );

      if (result.error) {
        Alert.alert('Payment Error', result.error.message);
        return;
      }

      if (result.data?.promotionId) {
        setPromotionId(result.data.promotionId);
      }

      // Open Stripe Payment Sheet
      // NOTE: @stripe/stripe-react-native initPaymentSheet + presentPaymentSheet
      // would be called here. For now, simulate success for the UI flow:
      if (result.data?.clientSecret) {
        // In production, this would use:
        // const { initPaymentSheet, presentPaymentSheet } = useStripe();
        // await initPaymentSheet({ paymentIntentClientSecret: result.data.clientSecret });
        // const { error } = await presentPaymentSheet();
        // if (!error) { setStep(4); }

        // Placeholder: move to confirmation step
        if (mountedRef.current) {
          setStep(4);
        }
      }
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      if (mountedRef.current) {
        setPaymentLoading(false);
      }
    }
  }, [selectedTier, user, listingId, durationDays]);

  // Poll for promotion activation on step 4
  useEffect(() => {
    if (step !== 4 || !promotionId) return;

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 15;

    const poll = async () => {
      while (!cancelled && attempts < maxAttempts) {
        attempts++;
        const result = await getPromotionById(supabase, promotionId);
        if (!cancelled && result.data?.status === 'active') {
          setPromotionActive(true);
          return;
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, [step, promotionId]);

  const handleBack = useCallback(() => {
    if (step === 1) {
      navigation.goBack();
    } else {
      setStep((prev) => (prev - 1) as WizardStep);
    }
  }, [step, navigation]);

  const handleContinue = useCallback(() => {
    setStep((prev) => (prev + 1) as WizardStep);
  }, []);

  // ─── Render ────────────────────────────────────────────────────────────

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {STEP_LABELS.map((label, i) => {
        const stepNum = (i + 1) as WizardStep;
        const isActive = step === stepNum;
        const isCompleted = step > stepNum;
        return (
          <View key={label} style={styles.stepDot}>
            <View
              style={[
                styles.dot,
                isActive && styles.dotActive,
                isCompleted && styles.dotCompleted,
              ]}
            >
              {isCompleted ? (
                <Ionicons name="checkmark" size={12} color={colors.white} />
              ) : (
                <Text style={[styles.dotText, (isActive || isCompleted) && styles.dotTextActive]}>
                  {stepNum}
                </Text>
              )}
            </View>
            <Text style={[styles.stepLabel, isActive && styles.stepLabelActive]}>{label}</Text>
          </View>
        );
      })}
    </View>
  );

  const renderStep1 = () => (
    <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.heading}>Choose Promotion Type</Text>
      <Text style={styles.subheading}>Select how you want to boost your listing</Text>

      {PROMOTION_TIERS.map((tier) => {
        const isSelected = selectedTier?.type === tier.type;
        return (
          <Pressable
            key={tier.type}
            style={[
              styles.tierCard,
              isSelected && { borderColor: tier.color, borderWidth: 2 },
            ]}
            onPress={() => setSelectedTier(tier)}
            testID={`tier-${tier.type}`}
          >
            <View style={styles.tierHeader}>
              <View style={[styles.tierIcon, { backgroundColor: tier.color + '20' }]}>
                <Ionicons name={tier.icon as keyof typeof Ionicons.glyphMap} size={24} color={tier.color} />
              </View>
              <View style={styles.tierInfo}>
                <Text style={styles.tierName}>{tier.name}</Text>
                <Text style={styles.tierPrice}>{formatCurrency(tier.daily_cost_cents)}/day</Text>
              </View>
              {isSelected && (
                <Ionicons name="checkmark-circle" size={24} color={tier.color} />
              )}
            </View>
            <Text style={styles.tierDescription}>{tier.description}</Text>
            <View style={styles.benefitsList}>
              {tier.benefits.map((benefit) => (
                <View key={benefit} style={styles.benefitRow}>
                  <Ionicons name="checkmark" size={16} color={tier.color} />
                  <Text style={styles.benefitText}>{benefit}</Text>
                </View>
              ))}
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );

  const renderStep2 = () => (
    <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.heading}>Set Duration</Text>
      <Text style={styles.subheading}>How long should your promotion run?</Text>

      <View style={styles.durationRow}>
        <Pressable
          style={styles.stepperButton}
          onPress={() => handleStepperPress(-1)}
          disabled={durationDays <= MIN_PROMOTION_DAYS}
        >
          <Ionicons
            name="remove-circle"
            size={36}
            color={durationDays <= MIN_PROMOTION_DAYS ? colors.text.disabled : colors.primary.main}
          />
        </Pressable>

        <TextInput
          style={styles.durationInput}
          value={String(durationDays)}
          onChangeText={handleDurationChange}
          keyboardType="number-pad"
          maxLength={2}
          testID="duration-input"
        />

        <Pressable
          style={styles.stepperButton}
          onPress={() => handleStepperPress(1)}
          disabled={durationDays >= MAX_PROMOTION_DAYS}
        >
          <Ionicons
            name="add-circle"
            size={36}
            color={durationDays >= MAX_PROMOTION_DAYS ? colors.text.disabled : colors.primary.main}
          />
        </Pressable>
      </View>

      <Text style={styles.durationLabel}>day{durationDays !== 1 ? 's' : ''}</Text>

      <View style={styles.costSummary}>
        <View style={styles.costRow}>
          <Text style={styles.costLabel}>Daily rate</Text>
          <Text style={styles.costValue}>
            {selectedTier ? formatCurrency(selectedTier.daily_cost_cents) : '—'}
          </Text>
        </View>
        <View style={styles.costRow}>
          <Text style={styles.costLabel}>Duration</Text>
          <Text style={styles.costValue}>{durationDays} day{durationDays !== 1 ? 's' : ''}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.costRow}>
          <Text style={styles.totalLabel}>Total Cost</Text>
          <Text style={styles.totalValue} testID="total-cost">{formatCurrency(totalCostCents)}</Text>
        </View>
        <View style={styles.costRow}>
          <Text style={styles.costLabel}>Ends on</Text>
          <Text style={styles.costValue}>{formatDate(projectedEndDate)}</Text>
        </View>
      </View>
    </ScrollView>
  );

  const renderStep3 = () => (
    <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.heading}>Review & Pay</Text>

      {listing && (
        <View style={styles.listingPreview}>
          <Text style={styles.previewTitle}>{listing.title}</Text>
          {listing.price && <Text style={styles.previewPrice}>{listing.price}</Text>}
        </View>
      )}

      <View style={styles.reviewCard}>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Promotion</Text>
          <Text style={styles.reviewValue}>{selectedTier?.name}</Text>
        </View>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Duration</Text>
          <Text style={styles.reviewValue}>{durationDays} day{durationDays !== 1 ? 's' : ''}</Text>
        </View>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Start date</Text>
          <Text style={styles.reviewValue}>{formatDate(new Date())}</Text>
        </View>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>End date</Text>
          <Text style={styles.reviewValue}>{formatDate(projectedEndDate)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.reviewRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatCurrency(totalCostCents)}</Text>
        </View>
      </View>

      {isLevel0 ? (
        <View style={styles.verifyBanner}>
          <Ionicons name="shield-checkmark-outline" size={24} color={colors.warning} />
          <Text style={styles.verifyText}>
            Verify your account to promote listings. Only Level 1+ users can create promotions.
          </Text>
        </View>
      ) : (
        <Pressable
          style={[styles.payButton, paymentLoading && styles.buttonDisabled]}
          onPress={handlePay}
          disabled={paymentLoading}
          testID="pay-button"
        >
          {paymentLoading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.payButtonText}>
              Pay {formatCurrency(totalCostCents)}
            </Text>
          )}
        </Pressable>
      )}
    </ScrollView>
  );

  const renderStep4 = () => (
    <View style={[styles.content, styles.confirmationContent]}>
      <View style={styles.successIcon}>
        <Ionicons
          name={promotionActive ? 'checkmark-circle' : 'hourglass-outline'}
          size={72}
          color={promotionActive ? colors.success : colors.warning}
        />
      </View>
      <Text style={styles.confirmationHeading}>
        {promotionActive ? 'Boost Active!' : 'Processing Payment...'}
      </Text>
      <Text style={styles.confirmationSubtext}>
        {promotionActive
          ? `Your ${selectedTier?.name} promotion is now live for ${durationDays} days.`
          : 'Your payment is being processed. This usually takes a few seconds.'}
      </Text>

      {!promotionActive && <ActivityIndicator style={styles.pollLoader} color={colors.primary.main} />}

      {promotionActive && (
        <Pressable
          style={styles.viewListingButton}
          onPress={() => navigation.navigate('ListingDetail', { listingId })}
        >
          <Text style={styles.viewListingText}>View Listing</Text>
        </Pressable>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {step < 4 && (
          <Pressable onPress={handleBack} style={styles.backButton} testID="back-button">
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </Pressable>
        )}
        <Text style={styles.headerTitle}>Promote Listing</Text>
        {step < 4 && (
          <Pressable onPress={() => navigation.goBack()} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text.primary} />
          </Pressable>
        )}
      </View>

      {renderStepIndicator()}

      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
      {step === 4 && renderStep4()}

      {/* Footer */}
      {step < 3 && (
        <View style={styles.footer}>
          <Pressable
            style={[
              styles.continueButton,
              step === 1 && !selectedTier && styles.buttonDisabled,
            ]}
            onPress={handleContinue}
            disabled={step === 1 && !selectedTier}
            testID="continue-button"
          >
            <Text style={styles.continueText}>Continue</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    position: 'absolute',
    left: 16,
    padding: 4,
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text.primary,
  },

  // Step indicator
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 24,
  },
  stepDot: {
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotActive: {
    backgroundColor: colors.primary.main,
  },
  dotCompleted: {
    backgroundColor: colors.success,
  },
  dotText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  dotTextActive: {
    color: colors.white,
  },
  stepLabel: {
    fontSize: 11,
    color: colors.text.secondary,
  },
  stepLabelActive: {
    color: colors.primary.main,
    fontWeight: '600',
  },

  // Content
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
  },
  subheading: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 20,
  },

  // Tier cards
  tierCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    backgroundColor: colors.white,
  },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tierIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  tierInfo: {
    flex: 1,
  },
  tierName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  tierPrice: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 2,
  },
  tierDescription: {
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: 10,
  },
  benefitsList: {
    gap: 6,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  benefitText: {
    fontSize: 13,
    color: colors.text.primary,
    flex: 1,
  },

  // Duration
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginTop: 20,
  },
  stepperButton: {
    padding: 4,
  },
  durationInput: {
    fontSize: 40,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    minWidth: 80,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary.main,
    paddingVertical: 4,
  },
  durationLabel: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 24,
  },

  // Cost summary
  costSummary: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  costLabel: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  costValue: {
    fontSize: 14,
    color: colors.text.primary,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary.main,
  },

  // Review
  listingPreview: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  previewPrice: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 4,
  },
  reviewCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    gap: 10,
    marginBottom: 20,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reviewLabel: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  reviewValue: {
    fontSize: 14,
    color: colors.text.primary,
    fontWeight: '500',
  },

  // Verify banner
  verifyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 16,
  },
  verifyText: {
    fontSize: 14,
    color: '#E65100',
    flex: 1,
  },

  // Pay button
  payButton: {
    backgroundColor: colors.primary.main,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  buttonDisabled: {
    opacity: 0.5,
  },

  // Confirmation
  confirmationContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  successIcon: {
    marginBottom: 20,
  },
  confirmationHeading: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  confirmationSubtext: {
    fontSize: 15,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  pollLoader: {
    marginTop: 24,
  },
  viewListingButton: {
    backgroundColor: colors.primary.main,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 32,
  },
  viewListingText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },

  // Footer
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  continueButton: {
    backgroundColor: colors.primary.main,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  continueText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
});
