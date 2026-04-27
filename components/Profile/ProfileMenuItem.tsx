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
  accentColor,
  isLocked = false
}: { 
  icon: any; 
  label: string; 
  value?: string;
  onPress: () => void;
  isLast?: boolean;
  destructive?: boolean;
  accentColor?: string;
  isLocked?: boolean;
}) {
  const colors = useThemeColors();
  const { ShieldCheck } = require('lucide-react-native');
  const defaultAccent = destructive ? colors.danger : colors.text;
  const effectiveAccent = accentColor || defaultAccent;
  
  return (
    <TouchableOpacity 
      style={[
        styles.container, 
        !isLast && { borderBottomColor: colors.isDark ? '#1F2937' : '#F8FAFC', borderBottomWidth: 1 },
        isLocked && { opacity: 0.6 }
      ]} 
      onPress={onPress}
      activeOpacity={isLocked ? 0.9 : 0.7}
    >
      <View style={styles.left}>
        <View style={[
          styles.iconWrapper, 
          { backgroundColor: destructive ? colors.danger + '15' : accentColor ? accentColor + (colors.isDark ? '25' : '15') : colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }
        ]}>
          <Icon size={18} color={effectiveAccent} />
        </View>
        <Text style={[styles.label, { color: destructive ? colors.danger : colors.text }, isLocked && { color: colors.textSecondary }]}>{label}</Text>
        {isLocked && (
          <View style={[styles.proBadge, { backgroundColor: colors.primary + '15' }]}>
            <Text style={[styles.proBadgeText, { color: colors.primary }]}>PRO</Text>
          </View>
        )}
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
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  value: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    opacity: 0.6,
  },
  proBadge: {
    backgroundColor: 'rgba(124, 92, 255, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 2,
  },
  proBadgeText: {
    fontFamily: 'Inter-Bold',
    fontSize: 9,
    letterSpacing: 0.5,
  }
});
