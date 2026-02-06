import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PostCategory } from '@unhn/shared';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to UNHN</Text>
      <Text style={styles.subtitle}>US-Nepal Help Network</Text>
      <Text style={styles.description}>
        Your community platform for housing, jobs, emergencies, and travel coordination.
      </Text>
      <View style={styles.categories}>
        <Text style={styles.categoryLabel}>Categories:</Text>
        <Text style={styles.category}>🏠 {PostCategory.HOUSING}</Text>
        <Text style={styles.category}>💼 {PostCategory.JOBS}</Text>
        <Text style={styles.category}>🚨 {PostCategory.EMERGENCY}</Text>
        <Text style={styles.category}>✈️ {PostCategory.TRAVEL}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 24,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    color: '#333',
    marginBottom: 32,
    lineHeight: 24,
  },
  categories: {
    alignItems: 'flex-start',
  },
  categoryLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  category: {
    fontSize: 16,
    marginBottom: 8,
    textTransform: 'capitalize',
  },
});
