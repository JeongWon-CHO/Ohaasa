import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { colors } from '@/src/constants/design';

interface FinalHeaderProps {
  subtitle?: string;
  onSharePress?: () => void;
  sharing?: boolean;
}

export function FinalHeader({
  subtitle = '오늘도 좋은 하루 되세요 ☀️',
  onSharePress,
  sharing = false,
}: FinalHeaderProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
      <View style={styles.copy}>
        <Text style={styles.title}>ohaasa</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {onSharePress && (
        <TouchableOpacity
          onPress={onSharePress}
          disabled={sharing}
          style={styles.shareButton}
        >
          <View style={styles.shareIconWrap}>
            {sharing ? (
              <ActivityIndicator size="small" color={colors.apricotDark} />
            ) : (
              <Feather name="share-2" size={18} color={colors.apricotDark} />
            )}
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
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
  shareButton: {
    padding: 6,
  },
  shareIconWrap: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
