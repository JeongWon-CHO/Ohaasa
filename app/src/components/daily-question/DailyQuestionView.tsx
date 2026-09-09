import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
  useWindowDimensions,
} from "react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FinalHeader } from "@/src/components/final/FinalHeader";
import { AnswerCard } from "@/src/components/daily-question/AnswerCard";
import { AnswerFeedTabs } from "@/src/components/daily-question/AnswerFeedTabs";
import { AnswerModerationSheet } from "@/src/components/daily-question/AnswerModerationSheet";
import { AnswerSortToggle } from "@/src/components/daily-question/AnswerSortToggle";
import { MyAnswerCard } from "@/src/components/daily-question/MyAnswerCard";
import { QuestionAnswerForm } from "@/src/components/daily-question/QuestionAnswerForm";
import { ReplyThread } from "@/src/components/daily-question/ReplyThread";
import { ZodiacFilterSheet } from "@/src/components/daily-question/ZodiacFilterSheet";
import { ConfirmDialog } from "@/src/components/common/ConfirmDialog";
import { ResponsiveContainer } from "@/src/components/common/ResponsiveContainer";
import { Toast } from "@/src/components/common/Toast";
import { getQuestionByDate } from "@/src/constants/dailyQuestions";
import { colors, gradients, spacing } from "@/src/constants/design";
import type { ZodiacSign } from "@/src/constants/zodiac";
import {
  useAnswerFeed,
  type AnswerFeedScope,
  type AnswerFeedSort,
  type AnswerFeedTab,
} from "@/src/hooks/useAnswerFeed";
import { useAnswerReplies } from "@/src/hooks/useAnswerReplies";
import { useNewReplyBadge } from "@/src/hooks/useNewReplyBadge";
import { useQuestionAnswerForm } from "@/src/hooks/useQuestionAnswerForm";
import { useToast } from "@/src/hooks/useToast";
import { useZodiac } from "@/src/hooks/useZodiac";
import type { ReportReason } from "@/src/lib/moderation";
import { getOrCreateDeviceId } from "@/src/lib/storage";
import type { PublicReply } from "@/src/lib/supabase";

type Step = "answer" | "community";

/** repliesByAnswer.get()이 비었을 때 매 렌더 새 배열이 생기지 않게 고정 참조를 쓴다. */
const NO_REPLIES: PublicReply[] = [];

function todayLocalDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

interface DailyQuestionViewProps {
  /**
   * YYYY-MM-DD. 오하아사 방송일(`horoscopes.date`)이다 — 로컬 "오늘"이 아니다.
   *
   * `question_answers`가 `unique(question_date, device_id)`라 이 값이 갈리면
   * 같은 날 글이 두 벌 생기고 서로 안 보인다. 안드로이드 v1이 방송일로 쓰고 있으므로
   * 커뮤니티 탭도 같은 기준(HoroscopeDateContext.latestDate)을 넘겨야 피드가 안 쪼개진다.
   */
  date?: string;
  /** 과거 글 수정 진입(기록 탭 "수정하기"). 저장하면 피드로 넘어가지 않고 화면을 닫는다. */
  editMode?: boolean;
  /**
   * 화면 껍데기. 탭에서는 뒤로 갈 곳이 없고, 바닥 안전영역은 탭바가 대신 먹는다.
   *
   * 탭바 높이를 따로 받지 않는다 — `tabBarStyle`에 `position: 'absolute'`가 없어서
   * 탭바는 레이아웃 공간을 차지하고 이 화면은 **이미 탭바 위에서 끝난다.**
   * 더하면 탭바 높이만큼 빈 띠가 한 겹 더 생긴다(→ `(tabs)/settings.tsx`의 같은 주석).
   */
  chrome?: "stack" | "tab";
}

/**
 * 오늘의 질문 — 작성 단계와 커뮤니티 피드를 한 화면에서 단계로 오간다.
 *
 * 화면이 아니라 컴포넌트인 이유: 진입 경로가 둘이다.
 *   - 커뮤니티 탭      `(tabs)/community.tsx` — 파라미터 없이 오늘(방송일)
 *   - 스택 라우트      `daily-question.tsx`   — date·mode 파라미터로 과거 글 수정
 * 탭은 언마운트되지 않아 파라미터 진입이 어긋나므로(아래 stepInitialized 가드에 막힌다)
 * 둘을 한 라우트로 합치지 않는다.
 *
 * 여기서 다루는 "질문"은 `dailyQuestions.ts`(글로 답하는 오하아사 질문)다.
 * 홈의 그림 질문(`drawingPrompts.ts`)과는 풀도 회전 로직도 별개이며 절대 섞지 않는다 —
 * 순서가 밀리면 안드로이드 v1 사용자가 보던 질문이 전부 달라진다.
 */
export function DailyQuestionView({
  date,
  editMode = false,
  chrome = "stack",
}: DailyQuestionViewProps) {
  const isTab = chrome === "tab";
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [androidKeyboardHeight, setAndroidKeyboardHeight] = useState(0);
  // 답글 작성창을 키보드 위로 올릴 때 쓰는 높이. androidKeyboardHeight와 분리해 둔다 —
  // 저쪽은 KeyboardAvoidingView 대신 쓰는 안드로이드 전용 패딩이라 iOS 값을 넣으면 이중 패딩이 된다.
  const keyboardHeightRef = useRef(0);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", (e) => {
      if (Platform.OS === "android") setAndroidKeyboardHeight(e.endCoordinates.height);
      keyboardHeightRef.current = e.endCoordinates.height;
      setKeyboardVisible(true);
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      if (Platform.OS === "android") setAndroidKeyboardHeight(0);
      keyboardHeightRef.current = 0;
      setKeyboardVisible(false);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // date는 항상 호출부가 명시적으로 넘긴다 — 이 안에서 horoscope를 다시 조회해
  // 날짜를 재계산하면 레이스 컨디션으로 다른 날짜에 저장될 수 있다.
  // broadcastDate("2026년 4월 29일 (화) 오하아사")는 DatePill 표시 전용 포맷 문자열이라 여기선 쓰면 안 된다.
  const isEditMode = editMode;
  const { zodiacSign } = useZodiac();

  if (!date) {
    // 파라미터 유실·방송일 조회 실패 같은 예외 상황에서도 화면이 완전히 비어버리지 않게 한다.
    console.warn("[DailyQuestionView] date missing — falling back to today");
  }
  const questionDate = date ?? todayLocalDate();
  const questionText = getQuestionByDate(questionDate);

  const { form, setForm, save, remove, isSaving, existingAnswer, isLoaded } = useQuestionAnswerForm({
    date: questionDate,
    zodiacSign: zodiacSign ?? null,
    questionText,
  });

  const [step, setStep] = useState<Step>("answer");
  const [stepInitialized, setStepInitialized] = useState(false);
  const [returnToCommunity, setReturnToCommunity] = useState(false);

  // 탭은 언마운트되지 않아 방송일 경계(KST 05:59)를 넘겨도 상태가 그대로 남는다 —
  // 어제 답을 썼다는 이유로 오늘 질문에서 피드가 먼저 열린다. 날짜가 바뀌면 처음부터 다시 판정한다.
  // effect가 아니라 렌더 중 조정인 이유: effect로 하면 낡은 단계가 한 프레임 보였다가 바뀐다.
  const [lastDate, setLastDate] = useState(date);
  if (lastDate !== date) {
    setLastDate(date);
    setStepInitialized(false);
    setStep("answer");
    setReturnToCommunity(false);
  }

  // 답을 이미 남겼으면 피드부터 연다. 위 lastDate 블록과 같은 이유로 렌더 중에 정한다 —
  // effect면 작성 화면이 한 프레임 보였다가 피드로 바뀐다.
  if (!stepInitialized && isLoaded) {
    setStepInitialized(true);
    if (!isEditMode && existingAnswer) setStep("community");
  }

  const [deviceId, setDeviceId] = useState<string | null>(null);
  useEffect(() => {
    getOrCreateDeviceId().then(setDeviceId);
  }, []);

  // 세그먼트 탭(전체/내 별자리)과 별자리 필터는 독립 state로 관리한다 —
  // 필터를 걸어도 상단 탭 선택이 풀리지 않게 하기 위함.
  const [tab, setTab] = useState<AnswerFeedTab>("all");
  const [filterSign, setFilterSign] = useState<ZodiacSign | null>(null);
  const [sort, setSort] = useState<AnswerFeedSort>("latest");
  const [filterVisible, setFilterVisible] = useState(false);

  // 필터가 걸려 있으면 필터가 우선, 없으면 탭 기준.
  const scope: AnswerFeedScope =
    filterSign ?? (tab === "mine" && zodiacSign ? zodiacSign : "all");

  function handleChangeTab(next: AnswerFeedTab) {
    setTab(next);
    setFilterSign(null);
  }

  function handleSelectFilter(sign: ZodiacSign | null) {
    setFilterSign(sign);
    // 별자리 필터는 전체 답변 중 골라 보는 동작이므로 탭은 '전체'로 맞춘다.
    if (sign) setTab("all");
    setFilterVisible(false);
  }

  const {
    answers,
    likedIds,
    myAnswerId,
    toggleLike,
    report,
    blockAuthor,
    blockedAuthors,
    loading: feedLoading,
    refetch: refetchFeed,
  } = useAnswerFeed(step === "community" ? questionDate : null, scope, sort, deviceId);

  // 내 답변은 상단 고정 카드가 전담하므로 목록에서는 뺀다 — 남겨두면 같은 글이 두 번 나오고,
  // 정작 답글이 달린 쪽이 스크롤해야 나오는 쪽이 된다.
  const feedAnswers = useMemo(
    () => (myAnswerId ? answers.filter((a) => a.id !== myAnswerId) : answers),
    [answers, myAnswerId],
  );
  const myServerAnswer = useMemo(
    () => (myAnswerId ? (answers.find((a) => a.id === myAnswerId) ?? null) : null),
    [answers, myAnswerId],
  );

  // 답글 조회는 feedAnswers가 아니라 answers(내 답변을 빼기 전) 기준이다 — 상단 고정 카드도
  // 답글을 보여줘야 한다. 다른 별자리로 필터를 걸면 answers에서도 내 답변이 빠지지만 카드는
  // 그대로 남으므로, 그때는 id를 따로 얹어 그 카드의 답글까지 사라지지 않게 한다.
  const answerIds = useMemo(() => {
    const ids = answers.map((a) => a.id);
    if (myAnswerId && !ids.includes(myAnswerId)) ids.push(myAnswerId);
    return ids;
  }, [answers, myAnswerId]);
  const {
    repliesByAnswer,
    likedReplyIds,
    myReplyIdByAnswer,
    loaded: repliesLoaded,
    loading: repliesLoading,
    saveReply,
    deleteReply,
    toggleReplyLike,
    reportReply,
    refetch: refetchReplies,
  } = useAnswerReplies(answerIds, deviceId, zodiacSign ?? null, blockedAuthors);

  const { showToast, toastProps } = useToast();

  /**
   * 당겨서 새로고침.
   *
   * 답변/답글 모두 작성한 기기에서만 즉시 반영되고 남의 기기는 재진입해야 보였다.
   * 실시간 구독 없이 사용자가 직접 갱신할 수 있는 최소 수단이다.
   *
   * 스피너를 내리는 판단에 sawBusy가 필요한 이유: refetch는 tick만 올리는 동기 함수라
   * 이번 렌더의 feedLoading은 아직 false다. 그대로 비교하면 로딩이 시작되기도 전에
   * 스피너가 꺼진다. 로딩이 true였던 걸 한 번 본 뒤에만 내린다.
   */
  const [refreshing, setRefreshing] = useState(false);
  const sawBusyRef = useRef(false);

  function handleRefresh() {
    setRefreshing(true);
    sawBusyRef.current = false;
    refetchFeed();
    refetchReplies();
  }

  useEffect(() => {
    if (!refreshing) return;
    if (feedLoading || repliesLoading) {
      sawBusyRef.current = true;
      return;
    }
    if (sawBusyRef.current) setRefreshing(false);
  }, [refreshing, feedLoading, repliesLoading]);

  // 답변/답글 어느 쪽이든 같은 시트를 쓴다. 행 전체가 아니라 필요한 세 값만 들고 있으면
  // 핸들러가 kind만 보면 되고, 낡은 타깃이 이미 바뀐 행을 붙들 일도 없다.
  type ModerationTarget = { kind: "answer" | "reply"; id: string; authorHash: string };

  // 신고·차단 메뉴의 대상. 시트는 하나만 두고 대상만 바꿔 끼운다.
  // 확인 단계까지 시트 안에서 끝내므로 여기서 Modal을 추가로 띄우지 않는다.
  const [moderationTarget, setModerationTarget] = useState<ModerationTarget | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [pendingDeleteReplyId, setPendingDeleteReplyId] = useState<string | null>(null);

  const myReplies = myAnswerId ? (repliesByAnswer.get(myAnswerId) ?? NO_REPLIES) : NO_REPLIES;
  const myReplyToMyAnswer = myAnswerId ? (myReplyIdByAnswer.get(myAnswerId) ?? null) : null;
  const myAnswerExpanded = myAnswerId !== null && expandedIds.has(myAnswerId);
  const newReplyCount = useNewReplyBadge({
    answerId: myAnswerId,
    replies: myReplies,
    myReplyId: myReplyToMyAnswer,
    expanded: myAnswerExpanded,
    loaded: repliesLoaded,
  });

  async function handleReport(reason: ReportReason) {
    if (!moderationTarget) return;
    const target = moderationTarget;
    setModerationTarget(null);

    const result =
      target.kind === "answer"
        ? await report(target.id, reason)
        : await reportReply(target.id, reason);
    if (result.ok) {
      showToast("신고했어요. 24시간 내에 검토할게요");
      return;
    }
    // 서버에 닿지도 못한 경우에만 네트워크를 안내한다. 서버가 거절한 건 사용자가 할 수 있는 게 없다.
    const message = result.offline
      ? "신고를 보내지 못했어요. 네트워크 연결을 확인해 주세요"
      : "신고를 보내지 못했어요. 잠시 후 다시 시도해 주세요";
    // 개발 빌드에서는 원인을 뒤에 덧붙인다 — 콘솔을 못 보는 실기기 QA에서 필요하다.
    // 사용자에게 보이는 문장을 대체하지는 않는다.
    showToast(__DEV__ && result.error ? `${message} (${result.error})` : message);
  }

  function handleBlock() {
    if (!moderationTarget) return;
    // 답변·답글이 같은 차단 Set(useAnswerFeed 소유)을 보므로 한 번 호출로 양쪽이 함께 사라진다.
    blockAuthor(moderationTarget.authorHash);
    setModerationTarget(null);
    showToast("차단했어요. 이 사용자의 글이 보이지 않아요");
  }

  function handleToggleReplies(answerId: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(answerId)) {
        next.delete(answerId);
        // 작성창에 포커스가 있는 채로 접히면 키보드만 덩그러니 남는다.
        Keyboard.dismiss();
      } else {
        next.add(answerId);
      }
      return next;
    });
  }

  async function handleSaveReply(answerId: string, body: string): Promise<boolean> {
    const ok = await saveReply(answerId, body);
    if (ok) {
      Keyboard.dismiss();
    } else {
      showToast("답글을 저장하지 못했어요. 잠시 후 다시 시도해 주세요");
    }
    return ok;
  }

  async function confirmDeleteReply() {
    const replyId = pendingDeleteReplyId;
    setPendingDeleteReplyId(null);
    if (!replyId) return;

    const ok = await deleteReply(replyId);
    showToast(ok ? "삭제했어요" : "답글을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요");
  }

  /**
   * iOS의 KeyboardAvoidingView(behavior="padding")는 컨테이너만 줄이고 포커스된 입력창을
   * 스크롤해주지 않는다. 피드 아래쪽 카드의 작성창은 그대로 키보드 뒤에 가리므로 직접 올린다.
   */
  function handleComposerFocusBottom(bottomInWindow: number) {
    const visibleBottom = windowHeight - keyboardHeightRef.current - 24;
    if (bottomInWindow <= visibleBottom) return;
    scrollRef.current?.scrollTo({
      y: scrollYRef.current + (bottomInWindow - visibleBottom),
      animated: true,
    });
  }

  const canSave = form.body.trim().length > 0;

  // 탭에는 나갈 곳이 없어 평소엔 뒤로가기를 감춘다. 단 수정 중에는 피드로 돌아갈
  // 유일한 수단이라 그때만 띄운다 — 없으면 저장 말고는 빠져나올 길이 없다.
  const showBack = !isTab || returnToCommunity;

  async function handleSave() {
    const saved = await save();
    if (!saved) return;

    if (isEditMode) {
      router.back();
      return;
    }

    setStep("community");
    setReturnToCommunity(false);
    refetchFeed();
  }

  async function handleDeleteMine() {
    await remove();
    showToast("삭제했어요");
    // 탭에는 나갈 곳이 없다. 글을 지웠으니 다시 쓰는 자리로 되돌린다.
    if (isTab) {
      setStep("answer");
      setReturnToCommunity(false);
      return;
    }
    router.back();
  }

  function confirmDeleteMine() {
    setDeleteDialogVisible(false);
    void handleDeleteMine();
  }

  function handleEditMine() {
    setReturnToCommunity(true);
    setStep("answer");
  }

  function handleBack() {
    if (step === "answer" && returnToCommunity) {
      Keyboard.dismiss();
      setStep("community");
      setReturnToCommunity(false);
      return;
    }

    if (isTab) return;
    router.back();
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
            contentContainerStyle={{
              // 상단 안전영역은 FinalHeader가 자기 paddingTop으로 처리한다 — 여기서 또 주면 이중이다.
              paddingTop: 0,
              paddingBottom: keyboardVisible ? 40 : 32,
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            // 답글 작성창을 키보드 위로 올릴 때 현재 오프셋이 필요하다. ref라 리렌더가 없다.
            onScroll={(e) => {
              scrollYRef.current = e.nativeEvent.contentOffset.y;
            }}
            scrollEventThrottle={16}
            // 답변 작성 단계에는 갱신할 목록이 없다.
            refreshControl={
              step === "community" ? (
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor={colors.apricotDark}
                  colors={[colors.apricotDark]}
                />
              ) : undefined
            }
          >
            <View>
              <View style={styles.headerWrap}>
                <FinalHeader
                  onBackPress={showBack ? handleBack : undefined}
                  subtitle="오늘의 질문"
                />
              </View>

              <View style={styles.body}>
                {step === "answer" ? (
                  // 빈 곳을 눌러 키보드를 내리는 동작은 답변 작성 단계에만 건다.
                  // 커뮤니티 단계까지 감싸면 답글 작성창의 여백·카운터를 눌러도 키보드가 내려간다.
                  <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View>
                      {questionText && (
                        <QuestionAnswerForm
                          questionText={questionText}
                          body={form.body}
                          onChangeBody={(body) => setForm((f) => ({ ...f, body }))}
                          isPublic={form.visibility === "public"}
                          onChangeIsPublic={(isPublic) =>
                            setForm((f) => ({
                              ...f,
                              visibility: isPublic ? "public" : "private",
                            }))
                          }
                        />
                      )}
                    </View>
                  </TouchableWithoutFeedback>
                ) : (
                  <View style={styles.communitySection}>
                    <AnswerFeedTabs
                      tab={tab}
                      mySign={zodiacSign}
                      onChangeTab={handleChangeTab}
                    />

                    <View style={styles.sortRow}>
                      <AnswerSortToggle
                        sort={sort}
                        onChangeSort={setSort}
                        isFiltered={filterSign !== null}
                        onOpenFilter={() => setFilterVisible(true)}
                      />
                    </View>

                    {questionText && (
                      <View style={styles.questionSummary}>
                        <Text style={styles.questionSummaryLabel}>오늘의 질문</Text>
                        <Text style={styles.questionSummaryText}>{questionText}</Text>
                      </View>
                    )}

                    {existingAnswer && (
                      <MyAnswerCard
                        answer={existingAnswer}
                        onEdit={handleEditMine}
                        onDelete={() => setDeleteDialogVisible(true)}
                        likeCount={myServerAnswer?.like_count ?? null}
                        // 비공개 답변은 서버에 행이 없어 답글이 달릴 수 없다 → 영역 자체를 붙이지 않는다.
                        replies={
                          myAnswerId === null
                            ? undefined
                            : {
                                count: repliesLoaded ? myReplies.length : null,
                                newCount: newReplyCount,
                                expanded: myAnswerExpanded,
                                onToggle: () => handleToggleReplies(myAnswerId),
                                thread: (
                                  <ReplyThread
                                    replies={myReplies}
                                    likedReplyIds={likedReplyIds}
                                    myReplyId={myReplyToMyAnswer}
                                    canWrite={zodiacSign !== null}
                                    onToggleLike={toggleReplyLike}
                                    onOpenModeration={(reply) =>
                                      setModerationTarget({
                                        kind: "reply",
                                        id: reply.id,
                                        authorHash: reply.author_hash,
                                      })
                                    }
                                    onSave={(body) => handleSaveReply(myAnswerId, body)}
                                    onRequestDelete={setPendingDeleteReplyId}
                                    onComposerFocusBottom={handleComposerFocusBottom}
                                  />
                                ),
                              }
                        }
                      />
                    )}

                    {feedLoading ? (
                      <View style={styles.feedLoading}>
                        <ActivityIndicator color={colors.apricotDark} />
                      </View>
                    ) : feedAnswers.length === 0 ? (
                      <View style={styles.feedEmpty}>
                        <Text style={styles.feedEmptyText}>
                          {myServerAnswer
                            ? "아직 다른 사람의 생각이 없어요"
                            : "아직 남겨진 생각이 없어요"}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.answerList}>
                        {feedAnswers.map((answer) => {
                          const replies = repliesByAnswer.get(answer.id) ?? [];
                          return (
                            <AnswerCard
                              key={answer.id}
                              answer={answer}
                              isMine={answer.id === myAnswerId}
                              liked={likedIds.has(answer.id)}
                              onToggleLike={() => toggleLike(answer.id)}
                              onOpenModeration={() =>
                                setModerationTarget({
                                  kind: "answer",
                                  id: answer.id,
                                  authorHash: answer.author_hash,
                                })
                              }
                              replyCount={repliesLoaded ? replies.length : null}
                              repliesExpanded={expandedIds.has(answer.id)}
                              onToggleReplies={() => handleToggleReplies(answer.id)}
                            >
                              <ReplyThread
                                replies={replies}
                                likedReplyIds={likedReplyIds}
                                myReplyId={myReplyIdByAnswer.get(answer.id) ?? null}
                                canWrite={zodiacSign !== null}
                                onToggleLike={toggleReplyLike}
                                onOpenModeration={(reply) =>
                                  setModerationTarget({
                                    kind: "reply",
                                    id: reply.id,
                                    authorHash: reply.author_hash,
                                  })
                                }
                                onSave={(body) => handleSaveReply(answer.id, body)}
                                onRequestDelete={setPendingDeleteReplyId}
                                onComposerFocusBottom={handleComposerFocusBottom}
                              />
                            </AnswerCard>
                          );
                        })}
                      </View>
                    )}
                  </View>
                )}
              </View>
            </View>
          </ScrollView>

          {step === "answer" && (
            <View
              style={[
                styles.saveArea,
                // 탭에서는 바닥 안전영역을 탭바가 이미 먹었다.
                { paddingBottom: (isTab ? 0 : insets.bottom) + 16 },
              ]}
            >
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
        selectedId={filterSign}
        onClose={() => setFilterVisible(false)}
        onSelect={handleSelectFilter}
      />

      <AnswerModerationSheet
        visible={moderationTarget !== null}
        onClose={() => setModerationTarget(null)}
        onReport={handleReport}
        onBlock={handleBlock}
        subject={moderationTarget?.kind === "reply" ? "답글" : "글"}
      />

      <ConfirmDialog
        visible={deleteDialogVisible}
        title="답변을 삭제할까요?"
        description="삭제한 답변은 되돌릴 수 없어요."
        confirmLabel="삭제"
        onCancel={() => setDeleteDialogVisible(false)}
        onConfirm={confirmDeleteMine}
      />

      {/*
        Modal 두 개가 동시에 present되면 iOS가 뒤엣것을 조용히 무시한다(BottomSheet 240ms 규칙과 같은 이유).
        현재 경로상 겹칠 일은 없지만, 답변 삭제 다이얼로그가 떠 있으면 이쪽은 아예 뜨지 않게 구조로 막아둔다.
      */}
      <ConfirmDialog
        visible={pendingDeleteReplyId !== null && !deleteDialogVisible}
        title="답글을 삭제할까요?"
        description="삭제한 답글은 되돌릴 수 없어요."
        confirmLabel="삭제"
        onCancel={() => setPendingDeleteReplyId(null)}
        onConfirm={() => void confirmDeleteReply()}
      />

      <Toast {...toastProps} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { flex: 1 },
  body: {
    paddingHorizontal: 24,
  },

  headerWrap: {
    marginBottom: 24,
  },
  communitySection: {
    gap: spacing.lg,
  },
  sortRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  questionSummary: {
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    backgroundColor: "rgba(240,184,154,0.12)",
  },
  questionSummaryLabel: {
    fontSize: 11,
    fontFamily: "NotoSansKR_600SemiBold",
    color: colors.apricotDark,
    lineHeight: 16,
  },
  questionSummaryText: {
    fontSize: 13,
    fontFamily: "NotoSansKR_400Regular",
    color: colors.text,
    lineHeight: 20,
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
