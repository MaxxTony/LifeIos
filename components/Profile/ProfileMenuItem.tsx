import { Typography } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { ChevronRight } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export function ProfileMenuItem({ 
  icon: Icon, 
  label, 
  value, 
  onPress,
  isLast = false,
  destructive = false,
  accentColor
}: { 
  icon: any; 
  label: string; 
  value?: string;
  onPress: () => void;
  isLast?: boolean;
  destructive?: boolean;
  accentColor?: string;
}) {
  const colors = useThemeColors();
  const defaultAccent = destructive ? colors.danger : colors.text;
  const effectiveAccent = accentColor || defaultAccent;
  
  return (
    <TouchableOpacity 
      style={[
        styles.container, 
        !isLast && { borderBottomColor: colors.isDark ? '#1F2937' : '#F8FAFC', borderBottomWidth: 1 }
      ]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.left}>
        <View style={[
          styles.iconWrapper, 
          { backgroundColor: destructive ? colors.danger + '15' : accentColor ? accentColor + (colors.isDark ? '25' : '15') : colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }
        ]}>
          <Icon size={18} color={effectiveAccent} />
        </View>
        <Text style={[styles.label, { color: destructive ? colors.danger : colors.text }]}>{label}</Text>
      </View>
      <View style={styles.right}>
        {value && <Text style={[styles.value, { color: colors.textSecondary }]}>{value}</Text>}
        <ChevronRight size={16} color={colors.textSecondary} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    ...Typography.bodyBold,
    fontSize: 16,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  value: {
    ...Typography.body,
    fontSize: 14,
    opacity: 0.8,
  }
});
