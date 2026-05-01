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
  lavender: '#D4C5E8',
  text: '#2C2416',
  textMid: '#6B5C48',
  textSoft: '#9C8B78',
  card: 'rgba(255,253,249,0.75)',
  border: 'rgba(237,227,214,0.7)',
} as const;

export const gradients = {
  screen: ['#FAF6F0', '#F5EBD8', '#EDD9C4', '#EAD5CE'] as const,
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
    fontWeight: '300' as const,
    color: colors.text,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '400' as const,
    color: colors.text,
  },
  body: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: colors.textMid,
  },
  label: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: colors.textSoft,
    letterSpacing: 1.6,
    textTransform: 'uppercase' as const,
  },
  fortune: {
    fontSize: 13,
    fontWeight: '300' as const,
    color: colors.text,
    lineHeight: 27,
  },
} as const;

export const zodiacColors = {
  aries:       '#F9C5BD',
  taurus:      '#C5E8C5',
  gemini:      '#FFF0B3',
  cancer:      '#C5D8F0',
  leo:         '#FFD9A0',
  virgo:       '#D5E8D0',
  libra:       '#E8D0F0',
  scorpio:     '#D0B8C8',
  sagittarius: '#FFD4A0',
  capricorn:   '#C8D8C8',
  aquarius:    '#A8D8EA',
  pisces:      '#B8D0F0',
} as const;

export const shadows = {
  card: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 2 },
    },
    android: {
      elevation: 2,
    },
    default: {
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 2 },
    },
  }),
} as const;
