import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  ActivityIndicator,
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

import { AnswerCard } from "@/src/components/daily-question/AnswerCard";
import { AnswerFeedTabs } from "@/src/components/daily-question/AnswerFeedTabs";
import { AnswerSortToggle } from "@/src/components/daily-question/AnswerSortToggle";
import { MyAnswerCard } from "@/src/components/daily-question/MyAnswerCard";
import { QuestionAnswerForm } from "@/src/components/daily-question/QuestionAnswerForm";
import { ZodiacFilterSheet } from "@/src/components/daily-question/ZodiacFilterSheet";
import { ResponsiveContainer } from "@/src/components/common/ResponsiveContainer";
import { Toast } from "@/src/components/common/Toast";
import { getQuestionByDate } from "@/src/constants/dailyQuestions";
import { colors, gradients, spacing } from "@/src/constants/design";
import { ZODIAC_MAP, type ZodiacSign } from "@/src/constants/zodiac";
import { useAnswerFeed, type AnswerFeedScope, type AnswerFeedSort } from "@/src/hooks/useAnswerFeed";
import { useQuestionAnswerForm } from "@/src/hooks/useQuestionAnswerForm";
import { useToast } from "@/src/hooks/useToast";
import { useZodiac } from "@/src/hooks/useZodiac";
import { getOrCreateDeviceId } from "@/src/lib/storage";

type Step = "answer" | "community";

function todayLocalDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

export default function DailyQuestionScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [androidKeyboardHeight, setAndroidKeyboardHeight] = useState(0);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", (e) => {
      if (Platform.OS === "android") setAndroidKeyboardHeight(e.endCoordinates.height);
      setKeyboardVisible(true);
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

  // date(YYYY-MM-DD, horoscope.date)는 항상 호출부(홈 배너 · 기록 탭 수정하기)에서 명시적으로 넘긴다 —
  // 이 화면에서 horoscope를 다시 조회해 날짜를 재계산하면 레이스 컨디션으로 다른 날짜에 저장될 수 있다.
  // broadcastDate("2026년 4월 29일 (화) 오하아사")는 DatePill 표시 전용 포맷 문자열이라 여기선 쓰면 안 된다.
  const { date: dateParam, mode } = useLocalSearchParams<{ date?: string; mode?: string }>();
  const isEditMode = mode === "edit";
  const { zodiacSign } = useZodiac();

  if (!dateParam) {
    // 정상 흐름이라면 항상 호출부(홈 배너 · 기록 탭 수정하기)에서 date를 넘긴다.
    // 라우팅 파라미터가 유실된 예외 상황에서도 화면이 완전히 비어버리지 않도록 오늘 날짜로 대체한다.
    console.warn("[daily-question] date param missing — falling back to today");
  }
  const questionDate = dateParam ?? todayLocalDate();
  const questionText = getQuestionByDate(questionDate);

  const { form, setForm, save, remove, isSaving, existingAnswer, isLoaded } = useQuestionAnswerForm({
    date: questionDate,
    zodiacSign: zodiacSign ?? null,
    questionText,
  });

  const [step, setStep] = useState<Step>("answer");
  const [stepInitialized, setStepInitialized] = useState(false);

  useEffect(() => {
    if (stepInitialized || !isLoaded) return;
    if (!isEditMode && existingAnswer) setStep("community");
    setStepInitialized(true);
  }, [isLoaded, existingAnswer, isEditMode, stepInitialized]);

  const [deviceId, setDeviceId] = useState<string | null>(null);
  useEffect(() => {
    getOrCreateDeviceId().then(setDeviceId);
  }, []);

  const [scope, setScope] = useState<AnswerFeedScope>("all");
  const [sort, setSort] = useState<AnswerFeedSort>("latest");
  const [filterVisible, setFilterVisible] = useState(false);

  const {
    answers,
    likedIds,
    myAnswerId,
    toggleLike,
    loading: feedLoading,
    refetch: refetchFeed,
  } = useAnswerFeed(step === "community" ? questionDate : null, scope, sort, deviceId);

  const { showToast, toastProps } = useToast();

  const zodiac = zodiacSign ? ZODIAC_MAP[zodiacSign] : null;
  const canSave = form.body.trim().length > 0;

  async function handleSave() {
    const saved = await save();
    if (!saved) return;

    if (isEditMode) {
      router.back();
      return;
    }

    setStep("community");
    refetchFeed();
  }

  async function handleDeleteMine() {
    await remove();
    showToast("삭제했어요");
    router.back();
  }

  function handleEditMine() {
    setStep("answer");
  }

  return (
    <LinearGradient colors={gradients.screen} style={styles.fill}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={[styles.fill, { paddingBottom: androidKeyboardHeight }]}
      >
        <ResponsiveContainer>
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
                <View style={styles.header}>
                  <Pressable
                    onPress={() => router.back()}
                    style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.6 }]}
                    hitSlop={12}
                  >
                    <Feather name="chevron-left" size={24} color={colors.text} />
                  </Pressable>

                  <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>
                      {step === "answer" ? "오늘의 질문" : "다른 사람들의 생각"}
                    </Text>
                    {zodiac && (
                      <Text style={styles.headerMeta} numberOfLines={1}>
                        {zodiac.ko}
                      </Text>
                    )}
                  </View>

                  <View style={styles.headerBtn} />
                </View>

                {step === "answer" ? (
                  questionText && (
                    <QuestionAnswerForm
                      questionText={questionText}
                      body={form.body}
                      onChangeBody={(body) => setForm((f) => ({ ...f, body }))}
                      isPublic={form.visibility === "public"}
                      onChangeIsPublic={(isPublic) =>
                        setForm((f) => ({ ...f, visibility: isPublic ? "public" : "private" }))
                      }
                    />
                  )
                ) : (
                  <View style={styles.communitySection}>
                    {existingAnswer && (
                      <MyAnswerCard
                        answer={existingAnswer}
                        onEdit={handleEditMine}
                        onDelete={handleDeleteMine}
                      />
                    )}

                    <AnswerFeedTabs
                      scope={scope}
                      mySign={zodiacSign}
                      onChangeScope={setScope}
                      onOpenFilter={() => setFilterVisible(true)}
                    />

                    <View style={styles.sortRow}>
                      <AnswerSortToggle sort={sort} onChangeSort={setSort} />
                    </View>

                    {feedLoading ? (
                      <View style={styles.feedLoading}>
                        <ActivityIndicator color={colors.apricotDark} />
                      </View>
                    ) : answers.length === 0 ? (
                      <View style={styles.feedEmpty}>
                        <Text style={styles.feedEmptyText}>아직 남겨진 생각이 없어요</Text>
                      </View>
                    ) : (
                      <View style={styles.answerList}>
                        {answers.map((answer) => (
                          <AnswerCard
                            key={answer.id}
                            answer={answer}
                            isMine={answer.id === myAnswerId}
                            liked={likedIds.has(answer.id)}
                            onToggleLike={() => toggleLike(answer.id)}
                          />
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </View>
            </TouchableWithoutFeedback>
          </ScrollView>

          {step === "answer" && (
            <View style={[styles.saveArea, { paddingBottom: insets.bottom + 16 }]}>
              {!canSave && <Text style={styles.saveHint}>생각을 적으면 저장할 수 있어요</Text>}
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
                  {isSaving ? "저장 중..." : existingAnswer ? "수정하기" : "완료"}
                </Text>
              </Pressable>
            </View>
          )}
        </ResponsiveContainer>
      </KeyboardAvoidingView>

      <ZodiacFilterSheet
        visible={filterVisible}
        selectedId={scope !== "all" ? (scope as ZodiacSign) : null}
        onClose={() => setFilterVisible(false)}
        onSelect={(sign) => {
          setScope(sign);
          setFilterVisible(false);
        }}
      />

      <Toast {...toastProps} />
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

  communitySection: {
    gap: spacing.lg,
  },
  sortRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  feedLoading: {
    paddingVertical: 40,
    alignItems: "center",
  },
  feedEmpty: {
    paddingVertical: 40,
    alignItems: "center",
  },
  feedEmptyText: {
    fontSize: 13,
    fontFamily: "NotoSansKR_300Light",
    color: colors.textSoft,
    lineHeight: 20,
  },
  answerList: {
    gap: spacing.md,
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
