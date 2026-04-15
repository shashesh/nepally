import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';
import { typography } from '../../styles/typography';
import { warmSurface } from '../../styles/warmTokens';

const RULES: { heading: string; body: string }[] = [
  {
    heading: 'Be honest',
    body: 'Describe what you are selling clearly. Real photos, real prices, real location.',
  },
  {
    heading: 'Be respectful',
    body: 'This marketplace serves the Nepali diaspora — treat every buyer and seller with respect.',
  },
  {
    heading: 'No prohibited items',
    body: 'No weapons, drugs, counterfeits, stolen goods, or anything illegal under US federal or state law.',
  },
  {
    heading: 'Keep scams out',
    body: 'Never pay upfront for items you have not inspected. Report suspicious activity.',
  },
];

export default function MarketplaceRulesScreen() {
  return (
    <SafeAreaView style={styles.wrap}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.pageTitle}>Marketplace Rules</Text>
        {RULES.map((rule) => (
          <View key={rule.heading} style={styles.section}>
            <Text style={styles.heading}>{rule.heading}</Text>
            <Text style={styles.body}>{rule.body}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: warmSurface.canvas },
  content: { padding: spacing.m, gap: spacing.m },
  pageTitle: { ...typography.h2, color: colors.text.primary, marginBottom: spacing.xs },
  section: { gap: 4 },
  heading: { ...typography.h3, color: colors.text.primary },
  body: { ...typography.body, color: colors.text.secondary, lineHeight: 22 },
});
