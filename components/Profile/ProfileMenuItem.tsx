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
  destructive = false
}: { 
  icon: any; 
  label: string; 
  value?: string;
  onPress: () => void;
  isLast?: boolean;
  destructive?: boolean;
}) {
  const colors = useThemeColors();
  
  return (
    <TouchableOpacity 
      style={[
        styles.container, 
        { borderBottomColor: colors.border, borderBottomWidth: isLast ? 0 : 1 }
      ]} 
      onPress={onPress}
    >
      <View style={styles.left}>
        <View style={[styles.iconWrapper, { backgroundColor: destructive ? colors.danger + '10' : colors.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }]}>
          <Icon size={18} color={destructive ? colors.danger : colors.text} />
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
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    ...Typography.body,
    fontSize: 15,
    fontWeight: '600',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  value: {
    ...Typography.body,
    fontSize: 13,
  }
});
