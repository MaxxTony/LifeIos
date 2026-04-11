import { Stack } from 'expo-router';
import { Colors } from '@/constants/theme';

export default function HabitsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: 'modal',
        contentStyle: { backgroundColor: '#0b0b0f' },
        animation: 'slide_from_bottom',
      }}
    >
      <Stack.Screen name="templates" />
      <Stack.Screen name="config" />
      <Stack.Screen name="goal" />
    </Stack>
  );
}
