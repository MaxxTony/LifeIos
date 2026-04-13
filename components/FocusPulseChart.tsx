import React from 'react';
import { View, Dimensions, StyleSheet } from 'react-native';
import Svg, { Rect, Defs, LinearGradient, Stop, G, Line, Text as SvgText } from 'react-native-svg';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';

interface FocusPulseChartProps {
  data: { day: string; hours: number }[];
  goal: number;
}

export function FocusPulseChart({ data, goal }: FocusPulseChartProps) {
  const colors = useThemeColors();
  const chartHeight = 110;
  // Account for card padding (Spacing.md * 2) and container padding (Spacing.md * 2)
  const chartWidth = Dimensions.get('window').width - (Spacing.md * 4) - 10; 
  const barWidth = 18;
  const paddingHorizontal = 10;
  const usableWidth = chartWidth - (paddingHorizontal * 2);
  const gap = (usableWidth - (barWidth * data.length)) / (data.length - 1);
  
  const maxHours = Math.max(...data.map(d => d.hours), goal, 2);
  const scale = chartHeight / maxHours;

  const yGridLines = [0.5, 1].map(p => maxHours * p);

  return (
    <View style={styles.container}>
      <Svg width={chartWidth} height={chartHeight + 25}>
        <Defs>
          <LinearGradient id="barGradActive" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={colors.primary} stopOpacity={1} />
            <Stop offset="100%" stopColor={colors.primary} stopOpacity={0.15} />
          </LinearGradient>
        </Defs>

        {/* Grid Lines */}
        {yGridLines.map((val, i) => (
          <Line
            key={i}
            x1={paddingHorizontal}
            y1={chartHeight - (val * scale)}
            x2={chartWidth - paddingHorizontal}
            y2={chartHeight - (val * scale)}
            stroke={colors.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.05)'}
            strokeWidth="1"
          />
        ))}

        {/* Goal Line - Constrained to bars area */}
        <Line
          x1={paddingHorizontal}
          y1={chartHeight - (goal * scale)}
          x2={chartWidth - paddingHorizontal}
          y2={chartHeight - (goal * scale)}
          stroke={colors.success + '40'}
          strokeWidth="1"
          strokeDasharray="4 4"
        />

        {data.map((item, index) => {
          const hasData = item.hours > 0;
          const h = hasData ? Math.max(item.hours * scale, 12) : 2; 
          const x = paddingHorizontal + index * (barWidth + gap);
          const y = chartHeight - h;

          return (
            <G key={index}>
              {/* Visual Bar */}
              <Rect
                x={x + (hasData ? 0 : barWidth/2 - 1)}
                y={y}
                width={hasData ? barWidth : 2}
                height={h}
                rx={hasData ? 6 : 1}
                fill={hasData ? "url(#barGradActive)" : (colors.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.04)')}
              />
              
              {/* Top Shine */}
              {hasData && h > 20 && (
                <Rect
                  x={x + 2}
                  y={y + 2}
                  width={barWidth - 4}
                  height={3}
                  rx={1.5}
                  fill={colors.isDark ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.4)'}
                />
              )}

              {/* Day Label - Locked to bar X coordinate */}
              <SvgText
                x={x + barWidth / 2}
                y={chartHeight + 20}
                fontSize="9"
                fill={colors.textSecondary}
                textAnchor="middle"
                fontWeight="700"
                fontFamily={Typography.labelSmall.fontFamily}
              >
                {item.day}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});



