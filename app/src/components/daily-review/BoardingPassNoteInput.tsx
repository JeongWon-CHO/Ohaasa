import { useRef, useState } from "react";
import {
  Animated,
  Easing,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { colors, radius, spacing } from "@/src/constants/design";

const MAX_LENGTH = 100;
const PASS_BG = "#FFFDF5";
const BORDER_COLOR = "rgba(205,185,155,0.55)";
const SCREEN_BG = "#EDD9C4";
const CARD_HEIGHT = 172;
const STUB_WIDTH = 44;
const DASH_W = 8;
const NOTCH = 16;
const NOTCH_RIGHT = STUB_WIDTH + DASH_W / 2 - NOTCH / 2; // 40

interface BoardingPassNoteInputProps {
  value: string;
  onChange: (text: string) => void;
  dateLabel: string;
  zodiacLabel: string;
  rank?: number | null;
}

function VerticalDashLine() {
  return (
    <View style={vd.line}>
      {Array.from({ length: 50 }).map((_, i) => (
        <View key={i} style={vd.tick} />
      ))}
    </View>
  );
}

const vd = StyleSheet.create({
  line: {
    width: DASH_W,
    alignSelf: "stretch",
    flexDirection: "column",
    alignItems: "center",
    overflow: "hidden",
  },
  tick: {
    width: 1,
    height: 4,
    backgroundColor: BORDER_COLOR,
    marginBottom: 3,
  },
});

export function BoardingPassNoteInput({
  value,
  onChange,
  dateLabel,
  zodiacLabel,
  rank,
}: BoardingPassNoteInputProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const frontAnim = useRef(new Animated.Value(0)).current;
  const backAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);

  const frontRotateY = frontAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "-90deg"],
  });
  const backRotateY = backAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["90deg", "0deg"],
  });

  function flip(toBack: boolean) {
    if (toBack) {
      setIsFlipped(true);
      Animated.sequence([
        Animated.timing(frontAnim, {
          toValue: 1,
          duration: 210,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(backAnim, {
          toValue: 1,
          duration: 210,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start(() => {
        inputRef.current?.focus();
      });
    } else {
      Animated.sequence([
        Animated.timing(backAnim, {
          toValue: 0,
          duration: 210,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(frontAnim, {
          toValue: 0,
          duration: 210,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIsFlipped(false);
        inputRef.current?.blur();
      });
    }
  }

  const hasNote = value.trim().length > 0;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>오늘의 운세 티켓</Text>

      <View style={styles.cardWrapper}>
        {/* ── 앞면: 공연 티켓 ── */}
        <Animated.View
          pointerEvents={isFlipped ? "none" : "auto"}
          style={[
            styles.face,
            {
              zIndex: isFlipped ? 0 : 1,
              transform: [{ perspective: 1200 }, { rotateY: frontRotateY }],
            },
          ]}
        >
          <Pressable onPress={() => flip(true)} style={styles.faceInner}>
            <View style={styles.ticketRow}>
              {/* 메인 영역 */}
              <View style={styles.ticketMain}>
                {/* 공연 이름 (subtitle) */}
                <Text style={styles.eventSubtitle}>✦  오늘의 별자리</Text>

                {/* 메인: 별자리 이름 */}
                <Text style={styles.eventTitle}>{zodiacLabel}</Text>

                {/* DATE + RANKING */}
                <View style={styles.infoRow}>
                  <View style={styles.infoField}>
                    <Text style={styles.fieldLabel}>DATE</Text>
                    <Text style={styles.infoValue}>{dateLabel}</Text>
                  </View>
                  {rank != null && (
                    <View style={styles.infoField}>
                      <Text style={styles.fieldLabel}>RANKING</Text>
                      <Text style={styles.infoValue}>{rank}등</Text>
                    </View>
                  )}
                </View>

                {/* 힌트 or 기록 미리보기 */}
                {hasNote ? (
                  <Text style={styles.notePreview} numberOfLines={1}>
                    "{value}"
                  </Text>
                ) : (
                  <Text style={styles.tapHint}>탭하여 오늘을 기록해요 →</Text>
                )}
              </View>

              {/* 세로 절취선 */}
              <VerticalDashLine />

              {/* 스텁: ADMIT ONE 세로 */}
              <View style={styles.stub}>
                {"OHAASA".split("").map((char, i) => (
                  <Text key={i} style={styles.admitChar}>
                    {char}
                  </Text>
                ))}
              </View>
            </View>

            {/* notch 원 */}
            <View style={[styles.notchCircle, styles.notchTop]} />
            <View style={[styles.notchCircle, styles.notchBottom]} />
          </Pressable>
        </Animated.View>

        {/* ── 뒷면: 입력 ── */}
        <Animated.View
          pointerEvents={isFlipped ? "auto" : "none"}
          style={[
            styles.face,
            {
              zIndex: isFlipped ? 1 : 0,
              transform: [{ perspective: 1200 }, { rotateY: backRotateY }],
            },
          ]}
        >
          <View style={styles.faceInner}>
            {/* 앞면과 동일한 티켓 외곽 구조 유지 */}
            <View style={styles.ticketRow}>
              <View style={styles.backMain}>
                <TextInput
                  ref={inputRef}
                  style={styles.input}
                  value={value}
                  onChangeText={(t) => onChange(t.slice(0, MAX_LENGTH))}
                  placeholder="오늘의 별 조각을 남겨보세요"
                  placeholderTextColor={colors.textSoft}
                  multiline
                  textAlignVertical="top"
                  scrollEnabled
                  autoFocus={false}
                />
                <View style={styles.backFooter}>
                  <Text style={styles.charCount}>
                    {value.length}/{MAX_LENGTH}
                  </Text>
                  <Pressable
                    onPress={() => {
                      Keyboard.dismiss();
                      flip(false);
                    }}
                    hitSlop={12}
                  >
                    <Text style={styles.doneBtn}>완료</Text>
                  </Pressable>
                </View>
              </View>

              <VerticalDashLine />

              <View style={styles.stub}>
                {"OHAASA".split("").map((char, i) => (
                  <Text key={i} style={styles.admitChar}>
                    {char}
                  </Text>
                ))}
              </View>
            </View>

            <View style={[styles.notchCircle, styles.notchTop]} />
            <View style={[styles.notchCircle, styles.notchBottom]} />
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md, marginTop: spacing.lg },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "NotoSansKR_400Regular",
    color: colors.textMid,
    lineHeight: 18,
  },

  cardWrapper: {
    height: CARD_HEIGHT,
    ...Platform.select({
      android: { elevation: 3 },
    }),
  },

  face: {
    ...StyleSheet.absoluteFill,
    backgroundColor: PASS_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: radius.md,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 3 },
      },
    }),
  },

  faceInner: { flex: 1 },

  // ── 앞면: 공연 티켓 ──
  ticketRow: {
    flex: 1,
    flexDirection: "row",
  },
  ticketMain: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    justifyContent: "space-between",
  },

  eventSubtitle: {
    fontSize: 8,
    fontFamily: "NotoSansKR_500Medium",
    color: colors.textSoft,
    letterSpacing: 1.5,
    lineHeight: 12,
  },
  eventTitle: {
    fontSize: 20,
    fontFamily: "NotoSansKR_400Regular",
    lineHeight: 28,
    color: colors.apricotDark,
    letterSpacing: -0.5,
  },

  infoRow: {
    flexDirection: "row",
    gap: spacing.xl,
  },
  infoField: { gap: 2 },
  fieldLabel: {
    fontSize: 7,
    fontFamily: "NotoSansKR_500Medium",
    color: colors.textSoft,
    letterSpacing: 1.5,
    lineHeight: 11,
  },
  infoValue: {
    fontSize: 12,
    fontFamily: "NotoSansKR_500Medium",
    color: colors.textMid,
    lineHeight: 18,
  },

  notePreview: {
    fontSize: 10,
    fontFamily: "NotoSansKR_300Light",
    color: colors.textMid,
    fontStyle: "italic",
    lineHeight: 16,
  },
  tapHint: {
    fontSize: 10,
    fontFamily: "NotoSansKR_300Light",
    color: colors.textSoft,
    letterSpacing: 0.3,
    lineHeight: 16,
  },

  // 스텁
  stub: {
    width: STUB_WIDTH,
    alignItems: "center",
    justifyContent: "center",
  },
  admitChar: {
    fontSize: 8,
    fontFamily: "NotoSansKR_500Medium",
    color: colors.textSoft,
    lineHeight: 11,
    letterSpacing: 0.5,
    textAlign: "center",
  },

  // notch
  notchCircle: {
    position: "absolute",
    width: NOTCH,
    height: NOTCH,
    borderRadius: NOTCH / 2,
    backgroundColor: SCREEN_BG,
    right: NOTCH_RIGHT,
  },
  notchTop: { top: -(NOTCH / 2) },
  notchBottom: { bottom: -(NOTCH / 2) },

  // ── 뒷면 ──
  backMain: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  backFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  doneBtn: {
    fontSize: 12,
    fontFamily: "NotoSansKR_500Medium",
    color: colors.apricotDark,
    lineHeight: 18,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: "NotoSansKR_300Light",
    color: colors.text,
    lineHeight: 22,
    includeFontPadding: false,
    paddingTop: spacing.xs,
  },
  charCount: {
    fontSize: 11,
    fontFamily: "NotoSansKR_300Light",
    color: colors.textSoft,
    textAlign: "right",
    lineHeight: 17,
  },
});
