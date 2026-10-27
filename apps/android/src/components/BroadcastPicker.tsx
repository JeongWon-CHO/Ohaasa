import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { BottomSheet } from '@/src/components/common/BottomSheet';
import { colors } from '@/src/constants/design';
import { useBroadcastHoroscopes } from '@ohaasa/shared/hooks/useBroadcastHoroscopes';
import { BROADCAST_SOURCES } from '@ohaasa/shared/lib/broadcastHoroscopes';
import { HOROSCOPE_SOURCE_LABELS, type HoroscopeSource } from '@ohaasa/shared/types/horoscope';

function BroadcastRow({ source, currentSource, visible, onSelect }: {
  source: HoroscopeSource;
  currentSource?: HoroscopeSource;
  visible: boolean;
  onSelect: () => void;
}) {
  const { horoscopes, loading, error, retry } = useBroadcastHoroscopes(source, visible);
  const date = horoscopes[0]?.date;
  const selected = currentSource === source;
  const disabled = loading || (!date && !error);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${HOROSCOPE_SOURCE_LABELS[source]}${error ? ' 다시 시도' : ''}`}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={error ? retry : onSelect}
      style={({ pressed }) => [styles.row, selected && styles.selected, pressed && styles.pressed]}
    >
      <Feather name="tv" size={20} color={disabled ? colors.textSoft : colors.apricotDark} />
      <View style={styles.copy}>
        <Text style={styles.name}>{HOROSCOPE_SOURCE_LABELS[source]}</Text>
        <Text style={styles.date}>
          {loading ? '불러오는 중' : error ? '불러오지 못했어요 · 다시 시도' : date ? `${date.replaceAll('-', '.')} 방송` : '저장된 운세가 없어요'}
        </Text>
      </View>
      {loading ? <ActivityIndicator color={colors.apricotDark} /> : (
        <Feather name={selected ? 'check' : 'chevron-right'} size={18} color={colors.textSoft} />
      )}
    </Pressable>
  );
}

export function BroadcastPicker({ currentSource }: { currentSource?: HoroscopeSource }) {
  const [visible, setVisible] = useState(false);
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="방송별 운세 보기"
        accessibilityState={{ expanded: visible }}
        hitSlop={4}
        onPress={() => setVisible(true)}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Feather name="tv" size={17} color={colors.apricotDark} />
      </Pressable>
      <BottomSheet visible={visible} onClose={() => setVisible(false)}>
        <View style={styles.handle} />
        {BROADCAST_SOURCES.map(source => (
          <BroadcastRow key={source} source={source} currentSource={currentSource} visible={visible}
            onSelect={() => {
              setVisible(false);
              router.push({ pathname: '/broadcast/[source]', params: { source } });
            }} />
        ))}
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  button: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,253,249,0.7)', alignItems: 'center', justifyContent: 'center' },
  handle: { width: 32, height: 4, borderRadius: 2, backgroundColor: colors.cream3, alignSelf: 'center', marginTop: -12, marginBottom: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 14, paddingVertical: 16, borderRadius: 16, marginBottom: 6 },
  selected: { backgroundColor: colors.cream2 },
  pressed: { opacity: 0.65 },
  copy: { flex: 1 },
  name: { fontFamily: 'NotoSansKR_500Medium', fontSize: 15, lineHeight: 23, color: colors.textMid },
  date: { fontFamily: 'NotoSansKR_400Regular', fontSize: 11, lineHeight: 18, color: colors.textSoft, marginTop: 2 },
});
