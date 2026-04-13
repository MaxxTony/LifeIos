import { useThemeColors } from '@/hooks/useThemeColors';
import { Stack } from 'expo-router';

export default function HabitsLayout() {
  const colors = useThemeColors();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_bottom',
      }}
    >
      <Stack.Screen name="templates" options={{ presentation: "modal" }} />
      <Stack.Screen name="config" options={{ presentation: "modal" }} />
      <Stack.Screen name="goal" options={{ presentation: "modal" }} />
    </Stack>
  );
}
