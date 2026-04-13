import { Stack } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';

export default function HabitsLayout() {
  const colors = useThemeColors();
  
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: 'modal',
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_bottom',
      }}
    >
      <Stack.Screen name="templates" />
      <Stack.Screen name="config" />
      <Stack.Screen name="goal" />
    </Stack>
  );
}
