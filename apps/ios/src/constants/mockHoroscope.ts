import type { ZodiacSign } from '@/src/constants/zodiac';

export interface MockHoroscope {
  zodiacSign: ZodiacSign;
  rank: number;
  advice: string;
  luckyColor: string;
  luckyItem: string;
  luckyNumber: number;
  mood: number;
  love: number;
  work: number;
  money: number;
}

const ADVICE_BY_SIGN: Record<ZodiacSign, string> = {
  aries: '작은 결정을 빠르게 내리면 하루의 흐름이 가벼워집니다. 오래 미뤄둔 메시지에 답해보세요.',
  taurus: '익숙한 루틴 안에서 좋은 힌트를 발견하는 날입니다. 천천히 움직일수록 실수가 줄어듭니다.',
  gemini: '대화 속에서 반가운 기회가 보입니다. 생각을 짧게 정리해 먼저 건네보세요.',
  cancer: '마음이 편한 사람과 보내는 시간이 힘이 됩니다. 무리한 약속은 줄여도 괜찮습니다.',
  leo: '존재감이 자연스럽게 드러나는 날입니다. 자신 있는 일을 먼저 처리하면 리듬이 살아납니다.',
  virgo: '정돈과 확인이 행운을 부릅니다. 작은 체크리스트가 예상보다 큰 도움을 줍니다.',
  libra: '균형을 잡는 감각이 빛납니다. 의견을 조율할 때 부드러운 표현을 선택해보세요.',
  scorpio: '집중력이 깊어지는 날입니다. 혼자 몰입할 시간을 확보하면 만족스러운 결과가 납니다.',
  sagittarius: '새로운 장소나 정보에서 기분 좋은 자극을 받습니다. 가벼운 산책도 잘 맞습니다.',
  capricorn: '꾸준히 쌓아온 일이 눈에 보이기 시작합니다. 오늘은 성급히 방향을 바꾸지 마세요.',
  aquarius: '독특한 아이디어가 좋은 반응을 얻습니다. 평소와 다른 방식으로 제안해보세요.',
  pisces: '감성이 섬세해지는 날입니다. 음악이나 글처럼 조용한 취향이 마음을 안정시킵니다.',
};

const LUCKY_COLORS: Record<ZodiacSign, string> = {
  aries: '코랄',
  taurus: '세이지',
  gemini: '하늘색',
  cancer: '펄',
  leo: '골드',
  virgo: '아이보리',
  libra: '하늘색',
  scorpio: '와인',
  sagittarius: '코발트',
  capricorn: '모카',
  aquarius: '민트',
  pisces: '라벤더',
};

const LUCKY_ITEMS: Record<ZodiacSign, string> = {
  aries: '작은 노트',
  taurus: '따뜻한 차',
  gemini: '이어폰',
  cancer: '손수건',
  leo: '골드 액세서리',
  virgo: '체크리스트',
  libra: '흰 꽃',
  scorpio: '블랙 펜',
  sagittarius: '운동화',
  capricorn: '캘린더',
  aquarius: '텀블러',
  pisces: '엽서',
};

const LUCKY_NUMBERS: Record<ZodiacSign, number> = {
  aries: 9,
  taurus: 6,
  gemini: 3,
  cancer: 8,
  leo: 1,
  virgo: 5,
  libra: 7,
  scorpio: 4,
  sagittarius: 2,
  capricorn: 6,
  aquarius: 11,
  pisces: 3,
};

const RANKS: Record<ZodiacSign, number> = {
  aries: 5,
  taurus: 8,
  gemini: 3,
  cancer: 10,
  leo: 2,
  virgo: 6,
  libra: 1,
  scorpio: 7,
  sagittarius: 4,
  capricorn: 9,
  aquarius: 11,
  pisces: 12,
};

export const MOCK_BROADCAST_DATE = '2026년 4월 30일 (목) 방송분';

export const MOCK_HOROSCOPES: Record<ZodiacSign, MockHoroscope> = Object.fromEntries(
  Object.keys(ADVICE_BY_SIGN).map((sign, index) => {
    const zodiacSign = sign as ZodiacSign;
    const seed = index + 1;

    return [
      zodiacSign,
      {
        zodiacSign,
        rank: RANKS[zodiacSign],
        advice: ADVICE_BY_SIGN[zodiacSign],
        luckyColor: LUCKY_COLORS[zodiacSign],
        luckyItem: LUCKY_ITEMS[zodiacSign],
        luckyNumber: LUCKY_NUMBERS[zodiacSign],
        mood: ((seed + 2) % 5) + 1,
        love: ((seed + 3) % 5) + 1,
        work: ((seed + 1) % 5) + 1,
        money: ((seed + 4) % 5) + 1,
      },
    ];
  }),
) as Record<ZodiacSign, MockHoroscope>;
