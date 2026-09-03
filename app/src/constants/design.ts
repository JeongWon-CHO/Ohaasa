import { Platform } from 'react-native';

export const colors = {
  cream: '#FAF6F0',
  cream2: '#F4EDE3',
  cream3: '#EDE3D6',
  sky: '#B8D8E8',
  skyDark: '#7BAEC7',
  yellow: '#F5D98B',
  apricot: '#F0B89A',
  apricotDark: '#D98A68',
  // 주 버튼. 기존 앱이 쓰던 주황(apricotDark)을 그대로 쓴다.
  // 흰 글자와의 대비는 2.65:1로 WCAG 본문 기준(4.5:1)에 못 미친다 —
  // 브랜드 일관성을 택한 결과이므로, 접근성 지적이 들어오면 여기부터 본다.
  action: '#D98A68',
  actionText: '#FFFDF9',
  /** 진한 갈색. MoodFace의 이목구비와 같은 값이라 라벨·손글씨가 표정과 한 세트로 읽힌다. */
  ink: '#5A4636',
  lavender: '#D4C5E8',
  text: '#2C2416',
  textMid: '#6B5C48',
  textSoft: '#9C8B78',
  card: 'rgba(255,253,249,0.75)',
  border: 'rgba(237,227,214,0.7)',
  trendUp: '#5BA17A',
  trendDown: '#CC8F86',
  cardSolid: '#FFFDF9',
  // 달력 종이. cardSolid보다 살짝 베이지를 먹였다.
  // 배경 그라데이션(#F5EBD8 부근)보다는 밝아야 카드로 읽힌다 — 더 어둡게 가면 종이가 배경에 묻는다.
  paper: '#FBF7EE',
  chartBaseline: 'rgba(156,139,120,0.5)',
  segmentTrack: 'rgba(240,184,154,0.22)',
} as const;

export const gradients = {
  screen: ['#FAF6F0', '#F5EBD8', '#EDD9C4', '#EAD5CE'] as const,
} as const;

export const layout = {
  // maxContentWidth: 480,
  maxContentWidth: 600,
  /**
   * 헤더(앱 이름 · 화면 이름 줄)의 좌우 여백. 본문보다 조금 더 들여 쓴다.
   *
   * 화면마다 헤더 컴포넌트가 다르다(`FinalHeader` · `JournalHeader` · 보관함 자체 헤더).
   * 각자 값을 들고 있으면 탭을 옮길 때 제목만 좌우로 흔들리므로 여기 하나로 묶는다.
   */
  headerPaddingH: 28,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 36,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
  pill: 999,
} as const;

export const typography = {
  appName: {
    fontSize: 28,
    fontFamily: 'NotoSansKR_300Light',
    color: colors.text,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.text,
  },
  body: {
    fontSize: 14,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.textMid,
  },
  label: {
    fontSize: 11,
    fontFamily: 'NotoSansKR_500Medium',
    color: colors.textSoft,
    letterSpacing: 1.6,
    textTransform: 'uppercase' as const,
  },
  fortune: {
    fontSize: 13,
    fontFamily: 'NotoSansKR_300Light',
    color: colors.text,
    lineHeight: 22,
  },
} as const;

export const zodiacColors = {
  aries: '#F9C5BD',
  taurus: '#C5E8C5',
  gemini: '#FFF0B3',
  cancer: '#C5D8F0',
  leo: '#FFD9A0',
  virgo: '#D5E8D0',
  libra: '#E8D0F0',
  scorpio: '#D0B8C8',
  sagittarius: '#FFD4A0',
  capricorn: '#C8D8C8',
  aquarius: '#A8D8EA',
  pisces: '#B8D0F0',
} as const;

export const shadows = {
  card: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 2 },
    },
    android: {},
    default: {
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 2 },
    },
  }),
} as const;
