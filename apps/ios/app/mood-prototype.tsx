import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ResponsiveContainer } from '@/src/components/common/ResponsiveContainer';
import { ScreenBackground } from '@/src/components/final/ScreenBackground';
import { MOOD_LEVELS, MoodFace } from '@/src/components/sketch/MoodFace';
import { colors, radius, spacing } from '@/src/constants/design';

/** 숫자 안은 1~10을 쓰고 저장할 때 ×10 한다 */
const NUMBER_STEPS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

type Mode = 'face' | 'number';

/**
 * "기분을 어떻게 받을까"를 눈으로 비교하려고 만든 화면.
 * 저장 형식(0~100 숫자)은 어느 쪽이든 같으므로, 결정해야 하는 건 입력 위젯뿐이다.
 */
export default function MoodPrototypeScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [mode, setMode] = useState<Mode>('face');
  const [mood, setMood] = useState<number | null>(null);

  const innerWidth = Math.min(width, 600) - spacing.xl * 2;
  const faceSize = Math.min((innerWidth - spacing.sm * 4) / 5, 68);

  return (
    <ScreenBackground>
      <ResponsiveContainer>
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.iconBtn}>
            <Feather name="chevron-left" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.title}>기분 입력 비교</Text>

          <View style={styles.spacer} />

          <View style={styles.segment}>
            {(['face', 'number'] as Mode[]).map((m) => (
              <Pressable
                key={m}
                onPress={() => {
                  setMode(m);
                  setMood(null);
                }}
                style={[styles.segmentBtn, mode === m && styles.segmentBtnActive]}
              >
                <Text style={[styles.segmentText, mode === m && styles.segmentTextActive]}>
                  {m === 'face' ? '표정' : '숫자'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + spacing.xxl },
          ]}
        >
          <Text style={styles.question}>오늘 하루, 어떤 기분이 가장 컸나요?</Text>

          {mode === 'face' ? (
            <View style={styles.faceRow}>
              {MOOD_LEVELS.map((level) => {
                const active = mood === level.value;
                return (
                  <Pressable
                    key={level.value}
                    onPress={() => setMood(level.value)}
                    style={styles.faceBtn}
                  >
                    <MoodFace mood={level.value} size={faceSize} dimmed={!active} />
                    <Text style={[styles.faceLabel, active && styles.faceLabelActive]}>
                      {level.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View style={styles.numberWrap}>
              <View style={styles.numberRow}>
                {NUMBER_STEPS.map((n) => {
                  const value = n * 10;
                  const active = mood === value;
                  return (
                    <Pressable
                      key={n}
                      onPress={() => setMood(value)}
                      style={[styles.numberBtn, active && styles.numberBtnActive]}
                    >
                      <Text style={[styles.numberText, active && styles.numberTextActive]}>
                        {n}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.numberLabels}>
                <Text style={styles.faceLabel}>별로였어</Text>
                <Text style={styles.faceLabel}>최고였어</Text>
              </View>
            </View>
          )}

          <View style={styles.result}>
            <Text style={styles.resultLabel}>저장될 값</Text>
            <Text style={styles.resultValue}>
              {mood === null ? '—' : `mood: ${mood}`}
            </Text>
          </View>

          {/* 같은 값을 얼굴로도 보여준다 — 숫자로 골라도 표현은 얼마든지 가능하다는 확인 */}
          {mood !== null && (
            <View style={styles.preview}>
              <MoodFace mood={mood} size={120} />
              <Text style={styles.previewNote}>
                저장 형식은 두 방식이 똑같습니다. 다른 건 고르는 경험뿐이에요.
              </Text>
            </View>
          )}
        </ScrollView>
      </ResponsiveContainer>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  spacer: { flex: 1 },
  iconBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontFamily: 'NotoSansKR_500Medium',
    color: colors.text,
  },
  segment: {
    flexDirection: 'row',
    borderRadius: radius.pill,
    backgroundColor: colors.segmentTrack,
    padding: 2,
  },
  segmentBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  segmentBtnActive: { backgroundColor: colors.cardSolid },
  segmentText: {
    fontSize: 11,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.textSoft,
  },
  segmentTextActive: {
    fontFamily: 'NotoSansKR_500Medium',
    color: colors.text,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
  },
  question: {
    fontSize: 17,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  faceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  faceBtn: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  faceLabel: {
    fontSize: 10,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.textSoft,
  },
  faceLabelActive: {
    fontFamily: 'NotoSansKR_500Medium',
    color: colors.text,
  },
  numberWrap: {
    gap: spacing.sm,
  },
  numberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  numberBtn: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  numberBtnActive: {
    backgroundColor: colors.apricot,
    borderColor: colors.apricot,
  },
  numberText: {
    fontSize: 13,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.textMid,
  },
  numberTextActive: {
    fontFamily: 'NotoSansKR_500Medium',
    color: colors.cardSolid,
  },
  numberLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  result: {
    marginTop: spacing.xxxl,
    alignItems: 'center',
    gap: spacing.xs,
  },
  resultLabel: {
    fontSize: 10,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.textSoft,
  },
  resultValue: {
    fontSize: 16,
    fontFamily: 'NotoSansKR_500Medium',
    color: colors.text,
  },
  preview: {
    marginTop: spacing.xxl,
    alignItems: 'center',
    gap: spacing.md,
  },
  previewNote: {
    fontSize: 11,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.textSoft,
    textAlign: 'center',
  },
});
