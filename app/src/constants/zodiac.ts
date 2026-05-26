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
  dateRange: string;
}

export const ZODIAC_LIST: ZodiacInfo[] = [
  { sign: 'aries',       emoji: '♈', ko: '양자리',     ja: 'おひつじ座', dateRange: '3/21-4/19' },
  { sign: 'taurus',      emoji: '♉', ko: '황소자리',   ja: 'おうし座',   dateRange: '4/20-5/20' },
  { sign: 'gemini',      emoji: '♊', ko: '쌍둥이자리', ja: 'ふたご座',   dateRange: '5/21-6/21' },
  { sign: 'cancer',      emoji: '♋', ko: '게자리',     ja: 'かに座',     dateRange: '6/22-7/22' },
  { sign: 'leo',         emoji: '♌', ko: '사자자리',   ja: 'しし座',     dateRange: '7/23-8/22' },
  { sign: 'virgo',       emoji: '♍', ko: '처녀자리',   ja: 'おとめ座',   dateRange: '8/23-9/22' },
  { sign: 'libra',       emoji: '♎', ko: '천칭자리',   ja: 'てんびん座', dateRange: '9/23-10/23' },
  { sign: 'scorpio',     emoji: '♏', ko: '전갈자리',   ja: 'さそり座',   dateRange: '10/24-11/22' },
  { sign: 'sagittarius', emoji: '♐', ko: '사수자리',   ja: 'いて座',     dateRange: '11/23-12/21' },
  { sign: 'capricorn',   emoji: '♑', ko: '염소자리',   ja: 'やぎ座',     dateRange: '12/22-1/19' },
  { sign: 'aquarius',    emoji: '♒', ko: '물병자리',   ja: 'みずがめ座', dateRange: '1/20-2/18' },
  { sign: 'pisces',      emoji: '♓', ko: '물고기자리', ja: 'うお座',     dateRange: '2/19-3/20' },
];

export const ZODIAC_MAP = Object.fromEntries(
  ZODIAC_LIST.map((z) => [z.sign, z]),
) as Record<ZodiacSign, ZodiacInfo>;
