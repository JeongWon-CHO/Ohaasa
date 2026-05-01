import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { colors } from '@/src/constants/design';

interface FinalHeaderProps {
  subtitle?: string;
  onAvatarPress?: () => void;
}

export function FinalHeader({
  subtitle = '오늘도 좋은 하루 되세요 ☀️',
  onAvatarPress,
}: FinalHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.copy}>
        <Text style={styles.title}>ohaasa</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <View style={styles.avatar}>
        <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="8" r="4" stroke={colors.textMid} strokeWidth="2" />
          <Path
            d="M4 20c0-4 3.6-7 8-7s8 3 8 7"
            stroke={colors.textMid}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  copy: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '300',
    color: colors.text,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 11,
    color: colors.textSoft,
    marginTop: 2,
  },
  avatar: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: 'rgba(255,253,249,0.85)',
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
});
