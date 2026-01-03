import { Redirect } from 'expo-router'; // CHANGED: Added Redirect import
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export default function Index() {
  // CHANGED: Set to 'true' temporarily so you go straight to the Home Screen (Tabs) to test your game
  const hasCompletedOnboarding = true; 

  // CHANGED: Replaced the crashing useEffect logic with safe <Redirect> components
  if (hasCompletedOnboarding) {
    return <Redirect href="/(tabs)" />;
  } else {
    return <Redirect href="/onboarding" />;
  }

  // This UI is technically skipped now, but kept to preserve your styling code
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#14B8A6" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
});