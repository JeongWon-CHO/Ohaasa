import { useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radius, spacing } from '@/src/constants/design';

/**
 * SQL의 `check (char_length(body) between 1 and 100)`와 반드시 같아야 한다.
 * 어긋나면 앱은 통과시키고 서버가 거절해 console.warn만 남고 조용히 실패한다.
 */
const MAX_LENGTH = 100;

interface ReplyComposerProps {
  /** 수정 진입 시 초기값. 최초 마운트에만 반영되므로 호출부에서 key로 리마운트시킨다. */
  initialBody?: string;
  editing: boolean;
  submitting: boolean;
  /** 별자리 미설정 등으로 작성 자체가 불가능한 상태 */
  disabled?: boolean;
  onSubmit: (body: string) => void;
  onCancelEdit?: () => void;
  /** 포커스 시 입력창 하단의 화면 좌표. 화면이 키보드 위로 스크롤을 올리는 데 쓴다. */
  onFocusBottom?: (bottomInWindow: number) => void;
}

export function ReplyComposer({
  initialBody = '',
  editing,
  submitting,
  disabled = false,
  onSubmit,
  onCancelEdit,
  onFocusBottom,
}: ReplyComposerProps) {
  const [body, setBody] = useState(initialBody);
  const inputRef = useRef<TextInput>(null);

  const canSubmit = body.trim().length > 0 && !submitting && !disabled;

  function handleFocus() {
    if (!onFocusBottom) return;
    // 키보드 애니메이션이 끝난 뒤에 재야 화면 좌표가 최종값이다.
    setTimeout(
      () => {
        inputRef.current?.measureInWindow((_x, y, _w, h) => onFocusBottom(y + h));
      },
      Platform.OS === 'ios' ? 300 : 100,
    );
  }

  function handleSubmit() {
    if (!canSubmit) return;
    onSubmit(body.trim());
    if (!editing) setBody('');
  }

  return (
    <View style={styles.container}>
      <TextInput
        ref={inputRef}
        value={body}
        onChangeText={(text) => setBody(text.slice(0, MAX_LENGTH))}
        onFocus={handleFocus}
        placeholder={disabled ? '별자리를 먼저 설정해 주세요' : '답글을 남겨보세요'}
        placeholderTextColor={colors.textSoft}
        style={styles.input}
        multiline
        editable={!disabled}
        maxLength={MAX_LENGTH}
      />

      <View style={styles.footer}>
        <Text style={styles.counter}>
          {body.length} / {MAX_LENGTH}
        </Text>

        <View style={styles.actions}>
          {editing && (
            <Pressable
              onPress={onCancelEdit}
              hitSlop={8}
              style={({ pressed }) => pressed && { opacity: 0.6 }}
              accessibilityRole="button"
            >
              <Text style={styles.cancel}>취소</Text>
            </Pressable>
          )}

          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit}
            style={({ pressed }) => [
              styles.submitBtn,
              !canSubmit && styles.submitBtnDisabled,
              pressed && canSubmit && { opacity: 0.8 },
            ]}
            accessibilityRole="button"
          >
            <Text style={styles.submitText}>{editing ? '수정' : '등록'}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.cream,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  input: {
    minHeight: 56,
    fontSize: 13,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.text,
    lineHeight: 20,
    // QuestionAnswerForm과 같은 조합 — Android 캐럿이 과하게 길어지는 것을 막는다.
    includeFontPadding: false,
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  counter: {
    fontSize: 11,
    fontFamily: 'NotoSansKR_300Light',
    color: colors.textSoft,
    lineHeight: 17,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  cancel: {
    fontSize: 12,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.textSoft,
    lineHeight: 18,
  },
  submitBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.apricotDark,
  },
  submitBtnDisabled: {
    backgroundColor: 'rgba(217,138,104,0.32)',
  },
  submitText: {
    fontSize: 12,
    fontFamily: 'NotoSansKR_600SemiBold',
    color: '#FFFDF5',
    lineHeight: 18,
  },
});
