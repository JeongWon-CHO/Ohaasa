import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COMMUNITY_GUIDELINES_URL } from '@ohaasa/shared/constants/links';
import { getHasSeenOnboarding, getZodiacSign } from '@ohaasa/shared/lib/storage';
import { BottomSheet } from '@/src/components/common/BottomSheet';
import { WelcomeScreen } from '@/src/components/WelcomeScreen';
import { useAcceptCommunityTerms } from '@/src/context/CommunityTermsContext';
import { colors } from '@/src/constants/design';

export default function TermsScreen() {
  const accept = useAcceptCommunityTerms();
  const [visible, setVisible] = useState(false);
  const [returning, setReturning] = useState(false);
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const existing = (await getHasSeenOnboarding()) || (await getZodiacSign()) !== null;
        if (active && existing) {
          setReturning(true);
          setVisible(true);
        }
      } catch {
        // 저장소를 읽지 못해도 시작 버튼으로 동의를 진행할 수 있다.
      }
    })();
    return () => { active = false; };
  }, []);

  async function handleAccept() {
    if (!checked || saving) return;
    setSaving(true);
    setError('');
    try { await accept(); }
    catch { setError('동의를 저장하지 못했어요. 다시 시도해 주세요.'); }
    finally { setSaving(false); }
  }

  async function openLink(url: string) {
    try { await Linking.openURL(url); }
    catch { setError('문서를 열지 못했어요. 네트워크 연결을 확인해 주세요.'); }
  }

  return (
    <>
      <WelcomeScreen onStart={() => setVisible(true)} />
      <BottomSheet visible={visible} onClose={saving ? undefined : () => setVisible(false)}>
        <View style={{ maxHeight: Math.max(180, height - insets.top - insets.bottom - 100) }}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <Text style={styles.title}>{returning ? '새 이용약관에 동의해 주세요' : '이용약관에 동의해 주세요'}</Text>
            <View style={styles.row}>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityLabel="이용약관 및 커뮤니티 가이드라인 동의 (필수)"
                accessibilityState={{ checked, disabled: saving }}
                disabled={saving}
                hitSlop={4}
                onPress={() => setChecked(value => !value)}
                style={styles.checkTarget}
              >
                <View style={[styles.checkbox, checked && styles.checked]}>
                  <Ionicons name="checkmark" size={17} color={checked ? colors.cream : colors.textSoft} />
                </View>
              </Pressable>
              <Pressable accessibilityRole="link" onPress={() => void openLink(COMMUNITY_GUIDELINES_URL)} style={styles.termsLink}>
                <Text style={styles.checkText}>[필수] 이용약관 · 커뮤니티 규칙</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textSoft} />
              </Pressable>
            </View>
            <Text style={styles.summary}>욕설·혐오·음란물·괴롭힘은 허용하지 않아요.</Text>
            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          </ScrollView>
          <Pressable accessibilityRole="button" accessibilityState={{ disabled: !checked || saving }} disabled={!checked || saving} onPress={() => void handleAccept()} style={[styles.button, (!checked || saving) && styles.disabled]}>
            {saving ? <ActivityIndicator color={colors.cream} /> : <Text style={styles.buttonText}>동의하고 계속하기</Text>}
          </Pressable>
        </View>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 24 },
  title: { fontFamily: 'NotoSansKR_600SemiBold', fontSize: 20, lineHeight: 29, color: colors.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24 },
  checkTarget: { width: 44, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  checkbox: { width: 25, height: 25, borderRadius: 13, borderWidth: 1, borderColor: colors.cream3, alignItems: 'center', justifyContent: 'center' },
  checked: { backgroundColor: colors.text, borderColor: colors.text },
  termsLink: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  checkText: { flex: 1, fontFamily: 'NotoSansKR_500Medium', fontSize: 14, lineHeight: 23, color: colors.text },
  summary: { marginLeft: 52, marginTop: 8, fontSize: 12, lineHeight: 20, color: colors.textMid },
  button: { backgroundColor: colors.text, borderRadius: 28, minHeight: 56, justifyContent: 'center', alignItems: 'center' },
  disabled: { backgroundColor: colors.cream3 },
  buttonText: { fontSize: 15, color: colors.cream, fontFamily: 'NotoSansKR_500Medium' },
  error: { color: '#A33232', fontSize: 13, lineHeight: 22 },
});
