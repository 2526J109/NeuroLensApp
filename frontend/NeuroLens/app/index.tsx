import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    // Use requestAnimationFrame to ensure navigation happens after render
    const frameId = requestAnimationFrame(() => {
      // Check if onboarding is completed (you can use AsyncStorage or similar)
      // For now, always show onboarding first
      // TODO: Add logic to check if user has completed onboarding
      const hasCompletedOnboarding = false; // Replace with actual check

      if (hasCompletedOnboarding) {
        router.replace('/login');
      } else {
        router.replace('/onboarding');
      }
    });

    return () => cancelAnimationFrame(frameId);
  }, [router]);

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

