export type ZodiacSign =
  | 'aries'
  | 'taurus'
  | 'gemini'
  | 'cancer'
  | 'leo'
  | 'virgo'
  | 'libra'
  | 'scorpio'
  | 'sagittarius'
  | 'capricorn'
  | 'aquarius'
  | 'pisces';

export interface ZodiacInfo {
  sign: ZodiacSign;
  emoji: string;
  ko: string;
  ja: string;
}

export const ZODIAC_LIST: ZodiacInfo[] = [
  { sign: 'aries',       emoji: '♈', ko: '양자리',     ja: 'おひつじ座' },
  { sign: 'taurus',      emoji: '♉', ko: '황소자리',   ja: 'おうし座' },
  { sign: 'gemini',      emoji: '♊', ko: '쌍둥이자리', ja: 'ふたご座' },
  { sign: 'cancer',      emoji: '♋', ko: '게자리',     ja: 'かに座' },
  { sign: 'leo',         emoji: '♌', ko: '사자자리',   ja: 'しし座' },
  { sign: 'virgo',       emoji: '♍', ko: '처녀자리',   ja: 'おとめ座' },
  { sign: 'libra',       emoji: '♎', ko: '천칭자리',   ja: 'てんびん座' },
  { sign: 'scorpio',     emoji: '♏', ko: '전갈자리',   ja: 'さそり座' },
  { sign: 'sagittarius', emoji: '♐', ko: '사수자리',   ja: 'いて座' },
  { sign: 'capricorn',   emoji: '♑', ko: '염소자리',   ja: 'やぎ座' },
  { sign: 'aquarius',    emoji: '♒', ko: '물병자리',   ja: 'みずがめ座' },
  { sign: 'pisces',      emoji: '♓', ko: '물고기자리', ja: 'うお座' },
];

export const ZODIAC_MAP = Object.fromEntries(
  ZODIAC_LIST.map((z) => [z.sign, z]),
) as Record<ZodiacSign, ZodiacInfo>;
