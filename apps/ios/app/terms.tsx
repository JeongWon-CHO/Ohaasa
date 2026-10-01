import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COMMUNITY_GUIDELINES_URL, PRIVACY_POLICY_URL } from '@ohaasa/shared/constants/links';
import { useAcceptCommunityTerms } from '@/src/context/CommunityTermsContext';
import { colors } from '@/src/constants/design';

export default function TermsScreen() {
  const accept = useAcceptCommunityTerms();
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>오하아사에 오신 것을 환영해요</Text>
        <Text style={styles.intro}>시작하기 전에 이용약관과 커뮤니티 이용 규칙을 확인해 주세요. 회원가입 없이 이용할 수 있어요.</Text>
        <View style={styles.card}>
          <Text style={styles.heading}>서로를 존중하는 커뮤니티</Text>
          <Text style={styles.body}>욕설, 혐오·차별, 음란한 내용, 위협, 괴롭힘과 개인정보 공개 등 부적절한 콘텐츠와 가해 행위를 용납하지 않아요.</Text>
          <Text style={styles.body}>공개 답변과 댓글에는 콘텐츠 필터가 적용돼요. 다른 사람의 글과 댓글에서 더보기(···)를 눌러 신고하거나 작성자를 차단할 수 있어요.</Text>
          <Text style={styles.body}>차단하면 해당 작성자의 글과 댓글이 즉시 숨겨지고 운영자에게 검토 요청이 전달돼요. 접수된 신고는 24시간 이내에 검토하고, 위반이 확인되면 콘텐츠를 제거하고 작성자의 커뮤니티 이용을 제한해요.</Text>
        </View>
        <Pressable accessibilityRole="link" onPress={() => void openLink(COMMUNITY_GUIDELINES_URL)}><Text style={styles.link}>이용약관 및 커뮤니티 가이드라인 전문 보기</Text></Pressable>
        <Pressable accessibilityRole="link" onPress={() => void openLink(PRIVACY_POLICY_URL)}><Text style={styles.link}>개인정보처리방침 보기</Text></Pressable>
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={() => setChecked(!checked)} style={styles.checkRow}>
          <Text style={styles.checkbox}>{checked ? '☑' : '☐'}</Text>
          <Text style={styles.checkText}>이용약관 및 커뮤니티 가이드라인에 동의합니다. (필수)</Text>
        </Pressable>
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: !checked || saving }} disabled={!checked || saving} onPress={() => void handleAccept()} style={[styles.button, (!checked || saving) && styles.disabled]}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>동의하고 시작하기</Text>}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  content: { flexGrow: 1, padding: 28, paddingVertical: 40, width: '100%', maxWidth: 600, alignSelf: 'center', gap: 18 },
  title: { fontFamily: 'NotoSansKR_700Bold', fontSize: 26, color: colors.text },
  intro: { fontSize: 16, lineHeight: 25, color: colors.textMid },
  card: { backgroundColor: colors.cardSolid, padding: 22, borderRadius: 20, gap: 16 },
  heading: { fontFamily: 'NotoSansKR_600SemiBold', fontSize: 19, color: colors.text },
  body: { fontSize: 15, lineHeight: 25, color: colors.textMid },
  link: { color: colors.ink, textDecorationLine: 'underline', fontSize: 15, paddingVertical: 4 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  checkbox: { fontSize: 28, color: colors.ink },
  checkText: { flex: 1, fontSize: 16, lineHeight: 25, color: colors.text },
  button: { backgroundColor: colors.ink, borderRadius: 18, padding: 18, alignItems: 'center' },
  disabled: { opacity: 0.4 },
  buttonText: { fontSize: 17, color: '#fff', fontFamily: 'NotoSansKR_600SemiBold' },
  error: { color: '#A33232', lineHeight: 22 },
});
