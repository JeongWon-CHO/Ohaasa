import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { BottomSheet } from '@/src/components/common/BottomSheet';
import { colors, radius, spacing } from '@/src/constants/design';
import { COMMUNITY_GUIDELINES_URL } from '@/src/constants/links';
import { REPORT_REASONS, type ReportReason } from '@/src/lib/moderation';

interface AnswerModerationSheetProps {
  visible: boolean;
  onClose: () => void;
  onReport: (reason: ReportReason) => void;
  /** 차단 확정. 확인 단계는 시트 안에서 처리하므로 호출부는 바로 차단하면 된다. */
  onBlock: () => void;
}

/**
 * 차단 확인을 별도 ConfirmDialog(Modal)로 띄우지 않고 시트 안의 단계로 두는 이유:
 * BottomSheet는 닫기 애니메이션(240ms)이 끝난 뒤에야 내부 Modal을 언마운트한다. 그 사이에
 * 두 번째 Modal을 present하면 iOS가 조용히 무시해서 다이얼로그가 아예 뜨지 않는다.
 */
type Step = 'menu' | 'reason' | 'confirmBlock';

export function AnswerModerationSheet({
  visible,
  onClose,
  onReport,
  onBlock,
}: AnswerModerationSheetProps) {
  const [step, setStep] = useState<Step>('menu');
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);

  // 시트를 닫았다 다시 열면 항상 메뉴부터, 선택도 비운 상태로 시작한다.
  useEffect(() => {
    if (!visible) return;
    setStep('menu');
    setSelectedReason(null);
  }, [visible]);

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>
          {step === 'menu'
            ? '이 글이 불편하신가요?'
            : step === 'reason'
              ? '신고 사유를 알려주세요'
              : '이 사용자를 차단할까요?'}
        </Text>
        <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="닫기">
          <Feather name="x" size={20} color={colors.textSoft} />
        </Pressable>
      </View>

      {step === 'confirmBlock' ? (
        <>
          <Text style={styles.description}>
            앞으로 이 사용자가 남기는 글이 보이지 않아요.{'\n'}
            설정 &gt; 커뮤니티에서 언제든 해제할 수 있어요.
          </Text>

          <View style={styles.actions}>
            <Pressable
              onPress={() => setStep('menu')}
              style={({ pressed }) => [styles.cancelButton, pressed && { opacity: 0.72 }]}
              accessibilityRole="button"
            >
              <Text style={styles.cancelButtonText}>취소</Text>
            </Pressable>
            <Pressable
              onPress={onBlock}
              style={({ pressed }) => [styles.confirmButton, pressed && { opacity: 0.72 }]}
              accessibilityRole="button"
            >
              <Text style={styles.confirmButtonText}>차단</Text>
            </Pressable>
          </View>
        </>
      ) : step === 'menu' ? (
        <>
          <Text style={styles.description}>
            신고하거나 차단하면 이 글은 바로 보이지 않게 돼요.
          </Text>

          <View style={styles.list}>
            <Pressable
              onPress={() => setStep('reason')}
              style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
              accessibilityRole="button"
            >
              <Feather name="flag" size={18} color={colors.textMid} />
              <View style={styles.itemCopy}>
                <Text style={styles.itemLabel}>신고하기</Text>
                <Text style={styles.itemSub}>가이드라인 위반 여부를 24시간 내에 검토해요</Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => setStep('confirmBlock')}
              style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
              accessibilityRole="button"
            >
              <Feather name="user-x" size={18} color={colors.textMid} />
              <View style={styles.itemCopy}>
                <Text style={styles.itemLabel}>이 사용자 차단</Text>
                <Text style={styles.itemSub}>앞으로 이 사람의 글이 보이지 않아요</Text>
              </View>
            </Pressable>
          </View>

          <Pressable
            onPress={() => Linking.openURL(COMMUNITY_GUIDELINES_URL)}
            style={({ pressed }) => [styles.guidelineLink, pressed && { opacity: 0.6 }]}
            accessibilityRole="link"
          >
            <Text style={styles.guidelineLinkText}>커뮤니티 가이드라인 보기</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={styles.description}>
            선택한 사유는 검토에만 사용되고, 상대방에게는 알려지지 않아요.
          </Text>

          <View style={styles.list}>
            {REPORT_REASONS.map((reason) => {
              const selected = reason.value === selectedReason;
              return (
                <Pressable
                  key={reason.value}
                  onPress={() => setSelectedReason(reason.value)}
                  style={({ pressed }) => [
                    styles.item,
                    selected && styles.itemSelected,
                    pressed && styles.itemPressed,
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                >
                  <View style={[styles.radio, selected && styles.radioSelected]}>
                    {selected && <View style={styles.radioDot} />}
                  </View>
                  <View style={styles.itemCopy}>
                    <Text style={[styles.itemLabel, selected && styles.itemLabelSelected]}>
                      {reason.label}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* 사유를 고르는 즉시 신고되면 오조작을 되돌릴 수 없다. 확정 버튼을 한 번 더 거친다. */}
          <View style={[styles.actions, styles.actionsAfterList]}>
            <Pressable
              onPress={() => setStep('menu')}
              style={({ pressed }) => [styles.cancelButton, pressed && { opacity: 0.72 }]}
              accessibilityRole="button"
            >
              <Text style={styles.cancelButtonText}>뒤로</Text>
            </Pressable>
            <Pressable
              onPress={() => selectedReason && onReport(selectedReason)}
              disabled={selectedReason === null}
              style={({ pressed }) => [
                styles.confirmButton,
                selectedReason === null && styles.confirmButtonDisabled,
                pressed && selectedReason !== null && { opacity: 0.72 },
              ]}
              accessibilityRole="button"
              accessibilityState={{ disabled: selectedReason === null }}
            >
              <Text style={styles.confirmButtonText}>신고</Text>
            </Pressable>
          </View>
        </>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 18,
    fontFamily: 'NotoSansKR_700Bold',
    color: colors.text,
    lineHeight: 25,
  },
  description: {
    fontSize: 13,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.textMid,
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 20,
  },
  list: {
    gap: spacing.sm,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.cardSolid,
  },
  itemPressed: {
    backgroundColor: 'rgba(44,36,22,0.05)',
  },
  itemSelected: {
    borderColor: colors.apricotDark,
    backgroundColor: 'rgba(240,184,154,0.12)',
  },
  itemLabelSelected: {
    fontFamily: 'NotoSansKR_600SemiBold',
    color: colors.apricotDark,
  },
  radio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.apricotDark,
  },
  radioDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.apricotDark,
  },
  itemCopy: {
    flex: 1,
    gap: 2,
  },
  itemLabel: {
    fontSize: 14,
    fontFamily: 'NotoSansKR_500Medium',
    color: colors.text,
    lineHeight: 21,
  },
  itemSub: {
    fontSize: 11,
    fontFamily: 'NotoSansKR_300Light',
    color: colors.textSoft,
    lineHeight: 16,
  },
  guidelineLink: {
    alignSelf: 'center',
    paddingVertical: 14,
    marginTop: 4,
  },
  guidelineLinkText: {
    fontSize: 12,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.textSoft,
    lineHeight: 18,
    textDecorationLine: 'underline',
  },

  // 차단 확인 단계 — ConfirmDialog와 같은 생김새를 시트 안에서 재현한다.
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  // 사유 목록 바로 아래에 붙는 경우 — 위쪽에 description의 marginBottom이 없어서 따로 띄운다.
  actionsAfterList: {
    marginTop: spacing.xl,
  },
  cancelButton: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cream3,
    backgroundColor: colors.cream,
  },
  cancelButtonText: {
    fontSize: 14,
    fontFamily: 'NotoSansKR_500Medium',
    color: colors.textMid,
    lineHeight: 21,
  },
  confirmButton: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.apricotDark,
  },
  confirmButtonDisabled: {
    backgroundColor: 'rgba(217,138,104,0.32)',
  },
  confirmButtonText: {
    fontSize: 14,
    fontFamily: 'NotoSansKR_600SemiBold',
    color: colors.cardSolid,
    lineHeight: 21,
  },
});
