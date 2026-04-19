import { Stack } from 'expo-router';

export default function DataCollectionLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="new-participant"
        options={{
          headerTitle: 'Register Participant',
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTitleStyle: { color: '#0F172A', fontWeight: 'bold' },
          headerTintColor: '#14B8A6',
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="tasks"
        options={{
          headerTitle: 'Collection Tasks',
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTitleStyle: { color: '#0F172A', fontWeight: 'bold' },
          headerTintColor: '#14B8A6',
          headerShadowVisible: false,
        }}
      />
    </Stack>
  );
}
