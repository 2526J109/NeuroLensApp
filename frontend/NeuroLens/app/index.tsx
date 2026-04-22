import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';

export default function Index() {
  const router = useRouter();
  const { user, isAdmin, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    const frameId = requestAnimationFrame(() => {
      if (!user) {
        router.replace('/onboarding');
      } else if (isAdmin) {
        router.replace('/data-collection');
      } else {
        router.replace('/(tabs)');
      }
    });

    return () => cancelAnimationFrame(frameId);
  }, [router, user, isAdmin, loading]);

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
