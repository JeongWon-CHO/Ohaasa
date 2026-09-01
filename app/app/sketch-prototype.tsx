import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';

import { ResponsiveContainer } from '@/src/components/common/ResponsiveContainer';
import { ScreenBackground } from '@/src/components/final/ScreenBackground';
import { DrawingCanvas } from '@/src/components/sketch/DrawingCanvas';
import {
  SKETCH_COLORS,
  SketchToolbar,
} from '@/src/components/sketch/SketchToolbar';
import { colors, radius, spacing } from '@/src/constants/design';
import {
  BRUSH_WIDTH_DEFAULT,
  countPoints,
  emptySketch,
  serializeSketch,
  type BrushKind,
  type Sketch,
  type Stroke,
} from '@/src/lib/sketch';
import { loadDaySketch, saveDaySketch, toDateString } from '@/src/lib/sketchbook';

const MAX_CANVAS = 420;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

/**
 * 그림일기 컨셉 검증용 프로토타입.
 * 확인하려는 것 세 가지:
 *   1. 손가락으로 그리는 게 실제로 할 만한가 (선이 부드러운가 · 끊기지 않는가)
 *   2. stroke 배열 저장 → 복원이 픽셀 단위로 같은 그림을 돌려주는가
 *   3. 벡터가 정말 PNG보다 훨씬 가벼운가 (egress 계산의 근거)
 */
export default function SketchPrototypeScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const canvasRef = useRef<View>(null);

  const [sketch, setSketch] = useState<Sketch>(emptySketch);
  const [color, setColor] = useState<string>(SKETCH_COLORS[0]);
  const [strokeWidth, setStrokeWidth] = useState<number>(BRUSH_WIDTH_DEFAULT);
  const [brush, setBrush] = useState<BrushKind>('crayon');
  const [pngBytes, setPngBytes] = useState<number | null>(null);

  const canvasSize = Math.min(width - spacing.xl * 2, MAX_CANVAS);

  const handleStrokeEnd = useCallback((stroke: Stroke) => {
    setSketch((prev) => ({ ...prev, strokes: [...prev.strokes, stroke] }));
    setPngBytes(null);
  }, []);

  const handleUndo = useCallback(() => {
    setSketch((prev) => ({ ...prev, strokes: prev.strokes.slice(0, -1) }));
    setPngBytes(null);
  }, []);

  const handleClear = useCallback(() => {
    setSketch(emptySketch());
    setPngBytes(null);
  }, []);

  const vectorBytes = serializeSketch(sketch).length;
  const points = countPoints(sketch);

  // 오늘 날짜로 저장 → 화면에서 지움 → 다시 불러오기.
  // 저장한 그림이 스케치북에도 그대로 쌓이므로 왕복 검증과 실사용이 같은 경로를 탄다.
  const handleRoundTrip = useCallback(async () => {
    const date = toDateString(new Date());
    await saveDaySketch(date, sketch);
    setSketch(emptySketch());
    const restored = await loadDaySketch(date);
    if (!restored) {
      Alert.alert('복원 실패', '저장된 그림을 읽지 못했습니다.');
      return;
    }
    setSketch(restored);
    Alert.alert(
      '저장 · 복원 완료',
      `${date}에 저장했습니다.\n크기: ${formatBytes(vectorBytes)}\n복원한 획: ${restored.strokes.length}개`,
      [
        { text: '확인' },
        { text: '스케치북에서 보기', onPress: () => router.push('/sketchbook') },
      ],
    );
  }, [sketch, vectorBytes]);

  // 같은 그림을 PNG로 캡처해 실제 바이트를 잰다.
  // base64 문자열 길이 × 3/4 ≈ 원본 바이트.
  const handleComparePng = useCallback(async () => {
    if (!canvasRef.current) return;
    try {
      const base64 = await captureRef(canvasRef, { format: 'png', quality: 1, result: 'base64' });
      setPngBytes(Math.ceil((base64.length * 3) / 4));
    } catch (e) {
      Alert.alert('캡처 실패', String(e));
    }
  }, []);

  return (
    <ScreenBackground>
      <ResponsiveContainer>
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <Feather name="chevron-left" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.title}>그림일기 프로토타입</Text>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + spacing.xxl },
          ]}
          // 캔버스가 제스처를 잡고 있는 동안 스크롤이 끼어들지 않게 한다.
          scrollEnabled={false}
        >
          <Text style={styles.caption}>오늘을 그려보세요</Text>

          <View ref={canvasRef} collapsable={false} style={styles.canvasWrap}>
            <DrawingCanvas
              size={canvasSize}
              strokes={sketch.strokes}
              color={color}
              strokeWidth={strokeWidth}
              brush={brush}
              onStrokeEnd={handleStrokeEnd}
            />
          </View>

          <SketchToolbar
            color={color}
            strokeWidth={strokeWidth}
            canUndo={sketch.strokes.length > 0}
            onSelectColor={setColor}
            canvasSize={canvasSize}
            onSelectWidth={setStrokeWidth}
            brush={brush}
            onSelectBrush={setBrush}
            onUndo={handleUndo}
            onClear={handleClear}
          />

          <View style={styles.stats}>
            <Stat label="획" value={`${sketch.strokes.length}`} />
            <Stat label="점" value={`${points}`} />
            <Stat label="벡터" value={formatBytes(vectorBytes)} />
            <Stat
              label="PNG"
              value={pngBytes === null ? '—' : formatBytes(pngBytes)}
            />
          </View>

          {pngBytes !== null && vectorBytes > 0 && (
            <Text style={styles.ratio}>
              PNG가 벡터보다 {(pngBytes / vectorBytes).toFixed(1)}배 큽니다
            </Text>
          )}

          <View style={styles.actions}>
            <Pressable
              onPress={handleRoundTrip}
              disabled={sketch.strokes.length === 0}
              style={[styles.btn, sketch.strokes.length === 0 && styles.btnDisabled]}
            >
              <Text style={styles.btnText}>오늘 날짜로 저장</Text>
            </Pressable>
            <Pressable
              onPress={handleComparePng}
              disabled={sketch.strokes.length === 0}
              style={[styles.btn, sketch.strokes.length === 0 && styles.btnDisabled]}
            >
              <Text style={styles.btnText}>PNG 크기 재기</Text>
            </Pressable>
          </View>
        </ScrollView>
      </ResponsiveContainer>
    </ScreenBackground>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
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
  backBtn: {
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
  content: {
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
    alignItems: 'center',
  },
  caption: {
    fontSize: 13,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.textSoft,
  },
  canvasWrap: {
    borderRadius: radius.md,
  },
  stats: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignSelf: 'stretch',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.textSoft,
  },
  statValue: {
    fontSize: 14,
    fontFamily: 'NotoSansKR_500Medium',
    color: colors.text,
  },
  ratio: {
    fontSize: 12,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.textMid,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignSelf: 'stretch',
  },
  btn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    alignItems: 'center',
    backgroundColor: colors.apricot,
  },
  btnDisabled: {
    opacity: 0.4,
  },
  btnText: {
    fontSize: 13,
    fontFamily: 'NotoSansKR_500Medium',
    color: colors.cardSolid,
  },
});
