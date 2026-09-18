import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  FlatList,
  ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList, RootStackParamList } from '../../types/navigation';
import { TutorialCard } from '../../components/tutorial/TutorialCard';
import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import { TextButton } from '../../components/buttons/TextButton';
import { useOnboarding } from '../../hooks/useOnboarding';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';

const TUTORIAL_CARDS = [
  {
    id: '1',
    icon: 'location',
    title: 'Metro-First Community',
    description: 'See posts only from your metro area. No algorithm, just local content that matters to you.',
    iconColor: colors.primary.main,
  },
  {
    id: '2',
    icon: 'shield-checkmark',
    title: 'Trust Levels',
    description: 'Start at Level 0 (view-only). Verify your phone to reach Level 1 and post/message freely.',
    iconColor: colors.success,
  },
  {
    id: '3',
    icon: 'grid',
    title: 'Structured Categories',
    description: 'Housing, Jobs, Emergency, Travel. Each category has required fields and auto-expiry.',
    iconColor: colors.accent.red,
  },
];

// FlatList does not support changing viewabilityConfig after mount, so it lives at module scope.
const VIEWABILITY_CONFIG = {
  itemVisiblePercentThreshold: 50,
};

export function TutorialScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<OnboardingStackParamList, 'Tutorial'>>();
  const { completeOnboarding } = useOnboarding();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  // FlatList throws if onViewableItemsChanged changes identity, so this must stay stable
  // (it only uses the state setter, hence the empty deps).
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0) {
        setCurrentIndex(viewableItems[0].index || 0);
      }
    },
    []
  );

  const handleNext = () => {
    if (currentIndex < TUTORIAL_CARDS.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      handleGetStarted();
    }
  };

  const handleGetStarted = async () => {
    await completeOnboarding();
    // Navigate to main app (HomeScreen will be in tab navigator)
    navigation
      .getParent<NativeStackNavigationProp<RootStackParamList>>()
      ?.replace('Main', { screen: 'Home', params: { screen: 'HomeMain' } });
  };

  const handleSkip = async () => {
    await completeOnboarding();
    navigation
      .getParent<NativeStackNavigationProp<RootStackParamList>>()
        ?.replace('Main', { screen: 'Home', params: { screen: 'HomeMain' } });
  };

  const renderDot = (index: number) => (
    <View
      key={index}
      style={[
        styles.dot,
        index === currentIndex && styles.dotActive,
      ]}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

      <View style={styles.content}>
        {/* Tutorial Cards */}
        <FlatList
          ref={flatListRef}
          data={TUTORIAL_CARDS}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={VIEWABILITY_CONFIG}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TutorialCard
              icon={item.icon}
              title={item.title}
              description={item.description}
              iconColor={item.iconColor}
            />
          )}
          style={styles.list}
        />

        {/* Progress Dots */}
        <View style={styles.dotsContainer}>
          {TUTORIAL_CARDS.map((_, index) => renderDot(index))}
        </View>

        {/* Buttons */}
        <View style={styles.buttonsContainer}>
          <PrimaryButton
            title={currentIndex === TUTORIAL_CARDS.length - 1 ? 'Get Started' : 'Next'}
            onPress={handleNext}
          />

          <View style={styles.skipContainer}>
            <TextButton
              title="Skip Tutorial"
              onPress={handleSkip}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.m,
    gap: spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.primary.main,
    width: 24,
  },
  buttonsContainer: {
    paddingHorizontal: spacing.l,
    paddingBottom: spacing.m,
    gap: spacing.s,
  },
  skipContainer: {
    alignItems: 'center',
  },
});
