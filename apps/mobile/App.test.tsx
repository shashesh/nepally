import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Minimal test app without navigation
export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>NUSA</Text>
      <Text style={styles.subtitle}>Test Mode</Text>
      <Text style={styles.text}>If you see this, React Native is working!</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1565C0',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 24,
    color: '#fff',
    marginBottom: 32,
  },
  text: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
  },
});
