import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';

import { colors } from '@/src/constants/design';

interface SettingsRowProps {
  title: string;
  description?: string;
  right?: ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  chevronExpanded?: boolean;
  style?: StyleProp<ViewStyle>;
}

function Chevron({ expanded }: { expanded: boolean }) {
  const rotation = useRef(new Animated.Value(expanded ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(rotation, {
      toValue: expanded ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [expanded, rotation]);

  return (
    <Animated.View
      style={{ transform: [{ rotate: rotation.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '90deg'],
      }) }] }}
    >
      <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
        <Polyline
          points="9 18 15 12 9 6"
          stroke={colors.textSoft}
          strokeWidth="2"
          fill="none"
        />
      </Svg>
    </Animated.View>
  );
}

export function SettingsRow({
  title,
  description,
  right,
  onPress,
  showChevron,
  chevronExpanded,
  style,
}: SettingsRowProps) {
  const content = (
    <>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      <View style={styles.right}>
        {right}
        {(showChevron ?? !!onPress) ? (
          <Chevron expanded={chevronExpanded === true} />
        ) : null}
      </View>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={chevronExpanded === undefined ? undefined : { expanded: chevronExpanded }}
        onPress={onPress}
        style={({ pressed }) => [styles.row, style, pressed && styles.pressed]}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={[styles.row, style]}>{content}</View>;
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pressed: {
    opacity: 0.68,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'NotoSansKR_400Regular',
    includeFontPadding: false,
  },
  description: {
    color: colors.textSoft,
    fontSize: 11,
    lineHeight: 16,
    fontFamily: 'NotoSansKR_400Regular',
    includeFontPadding: false,
    marginTop: 2,
  },
  right: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
});
