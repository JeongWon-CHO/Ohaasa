import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useEffect, useRef, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BoardingPassNoteInput } from "@/src/components/daily-review/BoardingPassNoteInput";
import { MemorableItemChips } from "@/src/components/daily-review/MemorableItemChips";
import { StarRatingInput } from "@/src/components/daily-review/StarRatingInput";
import { ResponsiveContainer } from "@/src/components/common/ResponsiveContainer";
import { ZODIAC_MAP } from "@/src/constants/zodiac";
import { useHoroscopeDateContext } from "@/src/context/HoroscopeDateContext";
import { useAllHoroscopes } from "@/src/hooks/useHoroscope";
import { useDailyReview } from "@/src/hooks/useDailyReview";
import { useZodiac } from "@/src/hooks/useZodiac";
import { colors, gradients, spacing } from "@/src/constants/design";

function formatKoreanDate(dateStr: string | null): string {
  if (!dateStr) {
    const now = new Date();
    return `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일`;
  }
  const [y, m, d] = dateStr.split("-").map(Number);
  return `${y}년 ${m}월 ${d}일`;
}

function formatShortDate(dateStr: string | null): string {
  if (!dateStr) {
    const now = new Date();
    return `${now.getFullYear()}.${now.getMonth() + 1}.${now.getDate()}`;
  }
  const [y, m, d] = dateStr.split("-").map(Number);
  return `${y}.${m}.${d}`;
}

export default function DailyReviewScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [androidKeyboardHeight, setAndroidKeyboardHeight] = useState(0);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", (e) => {
      if (Platform.OS === "android") setAndroidKeyboardHeight(e.endCoordinates.height);
      setKeyboardVisible(true);
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 50);
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      if (Platform.OS === "android") setAndroidKeyboardHeight(0);
      setKeyboardVisible(false);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);
  const { zodiacSign } = useZodiac();
  const { selectedDate } = useHoroscopeDateContext();
  const { horoscopes } = useAllHoroscopes({ date: selectedDate });

  const zodiac = zodiacSign ? ZODIAC_MAP[zodiacSign] : null;
  const horoscope = zodiacSign
    ? (horoscopes.find((h) => h.zodiac_sign === zodiacSign) ?? null)
    : null;

  const horoscopeDate = horoscope?.date ?? null;

  const metaParts = [
    formatKoreanDate(horoscopeDate),
    zodiac?.ko,
    horoscope ? `오늘의 운세 ${horoscope.rank}위` : null,
  ].filter(Boolean) as string[];

  const { form, setForm, save, isSaving, existingReview } = useDailyReview({
    date: horoscopeDate,
    zodiacSign: zodiacSign ?? null,
    horoscopeRank: horoscope?.rank ?? null,
  });

  const hasChanges = existingReview === null || (
    form.rating !== existingReview.rating ||
    form.note !== existingReview.note ||
    JSON.stringify([...form.memorableItems].sort()) !== JSON.stringify([...existingReview.memorableItems].sort())
  );

  const canSave = form.rating !== null && form.note.trim().length > 0 && hasChanges;

  async function handleSave() {
    await save();
    router.back();
  }

  return (
    <LinearGradient colors={gradients.screen} style={styles.fill}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={[styles.fill, { paddingBottom: androidKeyboardHeight }]}
      >
      <ResponsiveContainer>
        {/* ── 스크롤 컨텐츠 ── */}
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + 16, paddingBottom: keyboardVisible ? 40 : 32 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View>
              {/* 헤더 */}
              <View style={styles.header}>
                <Pressable
                  onPress={() => router.back()}
                  style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.6 }]}
                  hitSlop={12}
                >
                  <Feather name="chevron-left" size={24} color={colors.text} />
                </Pressable>

                <View style={styles.headerCenter}>
                  <Text style={styles.headerTitle}>오늘의 운세 리뷰</Text>
                  {metaParts.length > 0 && (
                    <Text style={styles.headerMeta} numberOfLines={1}>
                      {metaParts.join(" · ")}
                    </Text>
                  )}
                </View>

                {/* 우측 균형용 빈 영역 */}
                <View style={styles.headerBtn} />
              </View>

              {/* 섹션들 */}
              <View style={styles.sections}>
                <StarRatingInput
                  rating={form.rating}
                  onChange={(rating) => setForm((f) => ({ ...f, rating }))}
                />
                <MemorableItemChips
                  selected={form.memorableItems}
                  onChange={(memorableItems) => setForm((f) => ({ ...f, memorableItems }))}
                  showCardChip={false}
                />
                <BoardingPassNoteInput
                  value={form.note}
                  onChange={(note) => setForm((f) => ({ ...f, note }))}
                  dateLabel={formatShortDate(horoscopeDate)}
                  zodiacLabel={zodiac?.ko ?? ""}
                  rank={horoscope?.rank ?? null}
                />
              </View>
            </View>
          </TouchableWithoutFeedback>
        </ScrollView>

        {/* ── 하단 저장 영역 (스크롤 밖, 고정) ── */}
        <View style={[styles.saveArea, { paddingBottom: insets.bottom + 16 }]}>
          {!canSave && (
            <Text style={styles.saveHint}>
              별점과 한 줄 기록을 남기면 저장할 수 있어요
            </Text>
          )}
          <Pressable
            onPress={handleSave}
            disabled={!canSave || isSaving}
            style={({ pressed }) => [
              styles.saveBtn,
              (!canSave || isSaving) && styles.saveBtnDisabled,
              pressed && canSave && !isSaving && { opacity: 0.8 },
            ]}
          >
            <Text style={styles.saveBtnText}>
              {isSaving ? "저장 중..." : existingReview ? "수정하기" : "저장하기"}
            </Text>
          </Pressable>
        </View>
      </ResponsiveContainer>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 24,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: 24,
  },
  headerBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: "NotoSansKR_600SemiBold",
    color: colors.text,
    lineHeight: 24,
  },
  headerMeta: {
    fontSize: 11,
    fontFamily: "NotoSansKR_300Light",
    color: colors.textSoft,
    lineHeight: 17,
  },

  sections: {
    gap: 16,
  },

  saveArea: {
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  saveHint: {
    fontSize: 12,
    fontFamily: "NotoSansKR_300Light",
    color: colors.textSoft,
    textAlign: "center",
    lineHeight: 18,
  },
  saveBtn: {
    backgroundColor: colors.apricotDark,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
  },
  saveBtnDisabled: {
    backgroundColor: "rgba(217,138,104,0.32)",
  },
  saveBtnText: {
    fontSize: 15,
    fontFamily: "NotoSansKR_500Medium",
    color: "#FFFDF5",
    lineHeight: 22,
  },
});
