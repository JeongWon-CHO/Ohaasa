import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ResponsiveContainer } from '@/src/components/common/ResponsiveContainer';
import { ScreenBackground } from '@/src/components/final/ScreenBackground';
import { MoodStep } from '@/src/components/journal/MoodStep';
import { SummaryStep } from '@/src/components/journal/SummaryStep';
import { DrawingCanvas } from '@/src/components/sketch/DrawingCanvas';
import { MoodFace } from '@/src/components/sketch/MoodFace';
import { ColorPickerSheet } from '@/src/components/sketch/ColorPickerSheet';
import { SketchThumbnail } from '@/src/components/sketch/SketchThumbnail';
import {
  SKETCH_COLORS,
  SketchToolbar,
} from '@/src/components/sketch/SketchToolbar';
import { colors, layout, radius, spacing } from '@/src/constants/design';
import { useJournal } from '@/src/hooks/useJournal';
import { BRUSH_WIDTH_DEFAULT, type BrushKind, type Stroke } from '@/src/lib/sketch';
import { toDateString } from '@/src/lib/sketchbook';

const STEPS = ['mood', 'sketch', 'summary', 'done'] as const;
type Step = (typeof STEPS)[number];

const MAX_CANVAS = 420;

function formatKoreanDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const weekday = ['일', '월', '화', '수', '목', '금', '토'][
    new Date(y, m - 1, d).getDay()
  ];
  return `${m}월 ${d}일 ${weekday}요일`;
}

export default function JournalWriteScreen() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { date: dateParam } = useLocalSearchParams<{ date?: string }>();
  const date = dateParam ?? toDateString(new Date());

  const scrollRef = useRef<ScrollView>(null);
  const [androidKeyboardHeight, setAndroidKeyboardHeight] = useState(0);
  const [step, setStep] = useState<Step>('mood');
  const [color, setColor] = useState<string>(SKETCH_COLORS[0]);
  // 직접 고른 색은 팔레트 마지막 칸에 남는다 — 한 그림 안에서 다시 집으려고
  // 매번 시트를 여는 일이 없게 한다.
  const [customColor, setCustomColor] = useState<string | null>(null);
  const [colorSheetOpen, setColorSheetOpen] = useState(false);
  const [picking, setPicking] = useState(false);

  // 손을 뗄 때 확정되고 스포이드는 바로 꺼진다 — 켜둔 채 그리려다 획이 안 그어지는 게
  // 이 모드에서 제일 헷갈리는 지점이다. 빈 종이를 짚었을 때도 끈다(짚기는 끝난 것).
  const handlePickColor = useCallback((picked: string | null) => {
    setPicking(false);
    if (!picked) return;
    setColor(picked);
    // 프리셋에 없는 색이면 팔레트 마지막 칸에 남겨 다시 집을 수 있게 한다.
    if (!(SKETCH_COLORS as readonly string[]).includes(picked)) setCustomColor(picked);
  }, []);

  const [strokeWidth, setStrokeWidth] = useState<number>(BRUSH_WIDTH_DEFAULT);
  const [brush, setBrush] = useState<BrushKind>('pen');

  const { draft, setDraft, isLoaded, isSaving, save } = useJournal(date);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const show = Keyboard.addListener('keyboardDidShow', (e) =>
      setAndroidKeyboardHeight(e.endCoordinates.height),
    );
    const hide = Keyboard.addListener('keyboardDidHide', () =>
      setAndroidKeyboardHeight(0),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // 그리기 단계는 스크롤이 없으므로 툴바·버튼까지 한 화면에 들어가야 한다.
  // 헤더·질문·툴바(팔레트 2줄 + 슬라이더 + 브러시)·하단 버튼이 쓰는 높이를 빼고 남은 만큼만 준다.
  const CHROME_HEIGHT = 430;
  const canvasSize = Math.max(
    220,
    Math.min(
      Math.min(width, layout.maxContentWidth) - spacing.xl * 2,
      height - insets.top - insets.bottom - CHROME_HEIGHT,
      MAX_CANVAS,
    ),
  );

  const handleStrokeEnd = useCallback(
    (stroke: Stroke) => {
      setDraft((d) => ({ ...d, sketch: { ...d.sketch, strokes: [...d.sketch.strokes, stroke] } }));
    },
    [setDraft],
  );

  const handleUndo = useCallback(() => {
    setDraft((d) => ({ ...d, sketch: { ...d.sketch, strokes: d.sketch.strokes.slice(0, -1) } }));
  }, [setDraft]);

  const handleClear = useCallback(() => {
    setDraft((d) => ({ ...d, sketch: { ...d.sketch, strokes: [] } }));
  }, [setDraft]);

  const index = STEPS.indexOf(step);
  const hasDrawing = draft.sketch.strokes.length > 0;

  const goNext = useCallback(async () => {
    if (step === 'summary') {
      await save();
      setStep('done');
      return;
    }
    setStep(STEPS[index + 1]);
  }, [step, index, save]);

  const goBack = useCallback(() => {
    if (index === 0) {
      router.back();
      return;
    }
    setStep(STEPS[index - 1]);
  }, [index]);

  // 그리기 단계에서는 캔버스가 제스처를 잡아야 하므로 바깥 탭으로 키보드를 내리지 않는다.
  const dismissesKeyboard = step === 'summary';

  const nextLabel =
    step === 'mood' ? '다음' : step === 'sketch' ? '다음' : '오늘을 남기기';
  const nextDisabled = step === 'sketch' && !hasDrawing;

  const body = (
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={[
        styles.content,
        // 짧은 일기는 줄 세 개뿐이라 가운데 정렬하면 화면 한복판에 덩그러니 뜬다.
        // 질문을 헤더 바로 아래에 붙여 읽는 순서대로 내려가게 한다.
        step === 'summary' && styles.contentTop,
        { paddingBottom: insets.bottom + spacing.xxxl },
      ]}
      keyboardShouldPersistTaps="handled"
      // 그리기 단계에서는 스크롤을 끈다. iOS ScrollView의 네이티브 pan은
      // PanResponder의 capture 핸들러로 막히지 않아서, 켜두면 선을 그으려 할 때
      // 스크롤이 이기고 점만 찍힌다. 대신 캔버스 크기를 남은 높이에 맞춰 줄인다.
      scrollEnabled={step !== 'sketch'}
    >
      {!isLoaded ? (
        <View style={styles.loading} />
      ) : step === 'mood' ? (
        <MoodStep
          mood={draft.mood}
          onChange={(mood) => setDraft((d) => ({ ...d, mood }))}
        />
      ) : step === 'sketch' ? (
        <View style={styles.sketchStep}>
          <Text style={styles.question}>오늘은 어떤 하루였나요?</Text>
          <DrawingCanvas
            size={canvasSize}
            strokes={draft.sketch.strokes}
            color={color}
            strokeWidth={strokeWidth}
            brush={brush}
            onStrokeEnd={handleStrokeEnd}
            picking={picking}
            onPickColor={handlePickColor}
          />
          <SketchToolbar
            color={color}
            customColor={customColor}
            strokeWidth={strokeWidth}
            canUndo={hasDrawing}
            onSelectColor={setColor}
            canvasSize={canvasSize}
            onSelectWidth={setStrokeWidth}
            brush={brush}
            onSelectBrush={setBrush}
            onOpenColorPicker={() => setColorSheetOpen(true)}
            picking={picking}
            onTogglePick={() => setPicking((v) => !v)}
            onUndo={handleUndo}
            onClear={handleClear}
          />
        </View>
      ) : step === 'summary' ? (
        <SummaryStep
          summary={draft.summary}
          onChange={(summary) => setDraft((d) => ({ ...d, summary }))}
          onFocus={() => scrollRef.current?.scrollTo({ y: 120, animated: true })}
        />
      ) : (
        <View style={styles.done}>
          <Text style={styles.doneTitle}>오늘을 남겼어요</Text>
          <SketchThumbnail sketch={draft.sketch} size={canvasSize * 0.62} />
          <View style={styles.doneMeta}>
            <MoodFace mood={draft.mood} size={28} />
            <Text style={styles.doneSummary}>
              {draft.summary || formatKoreanDate(date)}
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
  );

  return (
    <ScreenBackground>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.fill, { paddingBottom: androidKeyboardHeight }]}
      >
        <ResponsiveContainer>
          <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
            {step !== 'done' && (
              <Pressable onPress={goBack} hitSlop={12} style={styles.iconBtn}>
                <Feather name="chevron-left" size={22} color={colors.text} />
              </Pressable>
            )}
            <Text style={styles.date}>{formatKoreanDate(date)}</Text>
            <View style={styles.spacer} />
            {step !== 'done' && (
              <View style={styles.dots}>
                {STEPS.slice(0, 3).map((s, i) => (
                  <View key={s} style={[styles.dot, i === index && styles.dotActive]} />
                ))}
              </View>
            )}
          </View>

          {dismissesKeyboard ? (
            <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
              {body}
            </TouchableWithoutFeedback>
          ) : (
            body
          )}

          <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
            {step === 'done' ? (
              <Pressable
                // 다 쓰고 나면 홈으로 보낸다. 방금 쓴 걸 다시 읽히는 것보다
                // 달력에 오늘이 채워진 걸 보여주는 게 흐름의 끝으로 맞다.
                onPress={() => router.replace('/(tabs)')}
                style={styles.primaryBtn}
              >
                <Text style={styles.primaryText}>다 남겼어요</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={goNext}
                disabled={nextDisabled || isSaving}
                style={[styles.primaryBtn, (nextDisabled || isSaving) && styles.disabled]}
              >
                <Text style={styles.primaryText}>{nextLabel}</Text>
              </Pressable>
            )}
          </View>
        </ResponsiveContainer>
      </KeyboardAvoidingView>

      <ColorPickerSheet
        visible={colorSheetOpen}
        onClose={() => setColorSheetOpen(false)}
        onSelect={(picked) => {
          setCustomColor(picked);
          setColor(picked);
        }}
      />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  spacer: { flex: 1 },
  iconBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  date: {
    fontSize: 14,
    fontFamily: 'NotoSansKR_500Medium',
    color: colors.textMid,
  },
  dots: {
    flexDirection: 'row',
    gap: 5,
    paddingRight: spacing.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(156,139,120,0.3)',
  },
  dotActive: {
    backgroundColor: colors.apricotDark,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentTop: {
    justifyContent: 'flex-start',
  },
  loading: { height: 200 },
  question: {
    fontSize: 19,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.text,
    textAlign: 'center',
  },
  sketchStep: {
    alignItems: 'center',
    gap: spacing.lg,
  },
  done: {
    alignItems: 'center',
    gap: spacing.xl,
  },
  doneTitle: {
    fontSize: 20,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.text,
  },
  doneMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  doneSummary: {
    fontSize: 15,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.textMid,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  primaryBtn: {
    paddingVertical: spacing.lg,
    borderRadius: radius.pill,
    alignItems: 'center',
    backgroundColor: colors.action,
  },
  disabled: { opacity: 0.4 },
  primaryText: {
    fontSize: 15,
    fontFamily: 'NotoSansKR_500Medium',
    color: colors.actionText,
  },
});
