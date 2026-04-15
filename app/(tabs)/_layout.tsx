import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
/** @ts-ignore - experimental API */
import { Typography } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Custom Animated Tab Bar for Android and Legacy iOS
 * FIX M-3: Uses colors.isDark to support both light and dark themes
 */
function CustomTabBar({ state, descriptors, navigation, solid = false }: any) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();

  return (
    // FIX M-3: backgroundColor and borderColor now respond to theme
    <View style={[
      styles.tabBarContainer,
      {
        bottom: insets.bottom + 16,
        backgroundColor: solid
          ? (colors.isDark ? '#12121A' : '#FFFFFF')
          : (colors.isDark ? 'rgba(18, 18, 26, 0.9)' : 'rgba(255, 255, 255, 0.9)'),
        borderColor: colors.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
      }
    ]}>
      {/* FIX M-3: tint responds to theme instead of hardcoded "dark" */}
      <BlurView intensity={solid ? 0 : 40} tint={colors.isDark ? 'dark' : 'light'} style={styles.tabBarBlur}>
        <View style={styles.tabBarItems}>
          {state.routes.map((route: any, index: number) => {
            const { options } = descriptors[route.key];
            const label = options.tabBarLabel ?? options.title ?? route.name;
            const isFocused = state.index === index;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            const getIcon = (focused: boolean) => {
              switch (route.name) {
                case 'index': return focused ? 'grid' : 'grid-outline';
                case 'progress': return focused ? 'stats-chart' : 'stats-chart-outline';
                case 'profile': return focused ? 'person' : 'person-outline';
                default: return 'help-outline';
              }
            };

            return (
              <TouchableOpacity
                key={route.key}
                onPress={onPress}
                style={styles.tabItem}
                activeOpacity={0.7}
                accessibilityLabel={label}
                accessibilityRole="tab"
                accessibilityState={{ selected: isFocused }}
              >
                <View style={styles.iconWrapper}>
                  <Ionicons
                    name={getIcon(isFocused) as any}
                    size={22}
                    color={isFocused ? colors.primary : colors.textSecondary}
                  />
                </View>
                <Text style={[
                  styles.tabLabel,
                  { color: isFocused ? colors.primary : colors.textSecondary }
                ]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

/**
 * Android-specific Tab Bar implementation with Solid Premium Design.
 */
function AndroidTabs() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}

/**
 * iOS-specific implementation using Native Apple Tab Bar and SF Symbols.
 */
function IOSTabs() {
  const colors = useThemeColors();

  return (
    <NativeTabs tintColor={colors.primary}>
      <NativeTabs.Trigger name="index">
        <Icon sf="house.fill" />
        <Label>Home</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="progress">
        <Icon sf="chart.bar.fill" />
        <Label>Progress</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <Icon sf="person.fill" />
        <Label>Profile</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

/**
 * Legacy iOS implementation for devices < iOS 18 (e.g., iPhone SE)
 * Uses the solid-background premium floating bar.
 */
function LegacyIOSTabs() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} solid={true} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}

export default function TabsLayout() {
  const iosVersion = Platform.OS === 'ios' ? parseInt(Platform.Version as string, 10) : 0;
  const isModernIOS = Platform.OS === 'ios' && iosVersion == 26;

  if (Platform.OS === 'android') {
    return <AndroidTabs />;
  }

  if (isModernIOS) {
    return <IOSTabs />;
  }

  return <LegacyIOSTabs />;
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: 70,
    borderRadius: 35,
    overflow: 'hidden',
    borderWidth: 1,
    // FIX M-3: backgroundColor and borderColor moved to inline style (theme-aware)
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
  },
  tabBarBlur: {
    flex: 1,
  },
  tabBarItems: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: '100%',
  },
  iconWrapper: {
    width: 44,
    height: 38,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  // FIX M-4: Removed dead activeDot style that was defined but never rendered
  tabLabel: {
    ...Typography.caption,
    fontSize: 11,
    fontWeight: '500',
  },
});
