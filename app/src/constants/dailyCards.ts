export type DailyCard = {
  rank: number;
  name: string;
  spell: string;
  interpretation: string;
};

export const DAILY_CARDS: Record<number, DailyCard[]> = {
  1: [
    {
      rank: 1,
      name: '태양',
      spell: '오늘의 빛은 나를 향해 있어요',
      interpretation:
        '좋은 흐름이 자연스럽게 따라오는 날이에요. 무엇이든 조금 더 자신 있게 움직여 보세요.',
    },
    {
      rank: 1,
      name: '왕관',
      spell: '가장 빛나는 순간이 시작됐어요',
      interpretation:
        '주목받는 자리에서 당신의 매력이 잘 드러나는 날이에요. 망설이기보다 드러내 보세요.',
    },
    {
      rank: 1,
      name: '불꽃',
      spell: '망설임보다 확신이 더 잘 어울려요',
      interpretation:
        '추진력이 살아나는 날이에요. 마음이 가는 방향으로 힘 있게 나아가면 좋은 결과가 따라와요.',
    },
  ],

  2: [
    {
      rank: 2,
      name: '달',
      spell: '고요한 마음이 길을 알려줘요',
      interpretation:
        '직감이 유난히 잘 맞는 날이에요. 마음이 끌리는 선택을 믿어봐도 좋아요.',
    },
    {
      rank: 2,
      name: '별',
      spell: '기대하는 마음이 행운을 불러와요',
      interpretation:
        '좋은 예감이 스며드는 날이에요. 소소한 기대 하나가 하루를 환하게 밝혀줄 수 있어요.',
    },
    {
      rank: 2,
      name: '이슬',
      spell: '맑은 기운이 하루를 부드럽게 적셔요',
      interpretation:
        '복잡했던 생각이 정리되며 마음이 한결 가벼워지는 날이에요. 차분하게 시작해 보세요.',
    },
  ],

  3: [
    {
      rank: 3,
      name: '바람',
      spell: '가볍게 움직이면 좋은 일이 따라와요',
      interpretation:
        '작은 변화가 의외의 기쁨으로 이어질 수 있어요. 오늘은 조금 유연하게 움직여 보세요.',
    },
    {
      rank: 3,
      name: '꽃',
      spell: '웃음이 피어나는 쪽으로 마음을 열어요',
      interpretation:
        '따뜻한 분위기가 주변에 퍼지는 날이에요. 사람들과의 대화에서 기분 좋은 흐름이 생겨요.',
    },
    {
      rank: 3,
      name: '무지개',
      spell: '기분 좋은 기대가 하늘에 걸려 있어요',
      interpretation:
        '조금은 설레는 일이 찾아올 수 있어요. 즐거운 상상을 가볍게 현실로 이어가 보세요.',
    },
  ],

  4: [
    {
      rank: 4,
      name: '새싹',
      spell: '작은 시작도 충분히 아름다워요',
      interpretation:
        '대단한 한 걸음이 아니어도 괜찮아요. 오늘의 작은 시작이 멀리 이어질 수 있어요.',
    },
    {
      rank: 4,
      name: '햇살',
      spell: '따뜻한 기운이 천천히 스며들어요',
      interpretation:
        '무리하지 않아도 좋은 흐름이 만들어지는 날이에요. 편안한 리듬을 유지해 보세요.',
    },
    {
      rank: 4,
      name: '나비',
      spell: '가볍게 방향을 바꾸면 새로운 길이 보여요',
      interpretation:
        '고정된 방식보다 유연한 태도가 더 잘 맞는 날이에요. 생각보다 쉬운 답이 가까이에 있어요.',
    },
  ],

  5: [
    {
      rank: 5,
      name: '파도',
      spell: '흐름을 타면 멀리 갈 수 있어요',
      interpretation:
        '억지로 밀어붙이기보다 자연스러운 흐름을 따를 때 더 편안한 하루가 될 거예요.',
    },
    {
      rank: 5,
      name: '산책',
      spell: '조금 느려도 기분 좋은 리듬이면 충분해요',
      interpretation:
        '오늘은 속도보다 기분이 더 중요해요. 여유를 가지면 놓쳤던 즐거움이 보여요.',
    },
    {
      rank: 5,
      name: '꽃잎',
      spell: '부드러운 감정이 하루를 채워줘요',
      interpretation:
        '작은 친절이나 다정한 말 한마디가 마음에 오래 남는 날이에요. 따뜻함을 나눠보세요.',
    },
  ],

  6: [
    {
      rank: 6,
      name: '구름',
      spell: '지나가는 마음은 가볍게 보내요',
      interpretation:
        '생각이 많아질 수 있지만 오래 붙잡지 않는 게 좋아요. 흘려보내면 마음이 편안해져요.',
    },
    {
      rank: 6,
      name: '찻잔',
      spell: '천천히 식지 않는 온기가 필요해요',
      interpretation:
        '분주함 속에서도 잠깐 숨을 고르면 하루가 훨씬 부드러워져요. 나를 돌보는 시간을 챙겨보세요.',
    },
    {
      rank: 6,
      name: '나무',
      spell: '조용한 단단함이 오늘의 힘이 돼요',
      interpretation:
        '크게 흔들리지 않고 중심을 지키는 태도가 도움이 되는 날이에요. 차분함이 무기가 돼요.',
    },
  ],

  7: [
    {
      rank: 7,
      name: '씨앗',
      spell: '작은 시작이 조용히 자라고 있어요',
      interpretation:
        '아직 눈에 띄지 않아도 괜찮아요. 오늘의 노력은 분명히 다음을 위한 힘이 돼요.',
    },
    {
      rank: 7,
      name: '고요',
      spell: '조금 멈추는 시간도 의미가 있어요',
      interpretation:
        '무조건 앞으로만 나아가려 하지 않아도 괜찮아요. 잠시 멈춤이 오히려 방향을 분명하게 해줘요.',
    },
    {
      rank: 7,
      name: '물결',
      spell: '흔들려도 다시 제자리로 돌아올 수 있어요',
      interpretation:
        '감정의 기복이 있더라도 너무 걱정하지 마세요. 오늘은 균형을 되찾는 데 의미가 있어요.',
    },
  ],

  8: [
    {
      rank: 8,
      name: '안개',
      spell: '천천히 걸어도 길은 이어져요',
      interpretation:
        '모든 것이 선명하지 않아도 괜찮아요. 서두르지 않고 하나씩 확인해 가면 충분해요.',
    },
    {
      rank: 8,
      name: '노을',
      spell: '마무리를 예쁘게 하면 하루가 부드러워져요',
      interpretation:
        '새로운 시작보다 정리에 더 어울리는 날이에요. 끝맺음을 잘하면 마음도 가벼워져요.',
    },
    {
      rank: 8,
      name: '책갈피',
      spell: '오늘의 한 장면을 조용히 간직해 보세요',
      interpretation:
        '큰 사건은 없더라도 오래 남을 작은 순간이 생길 수 있어요. 사소한 감정을 소중히 여겨보세요.',
    },
  ],

  9: [
    {
      rank: 9,
      name: '돌',
      spell: '흔들려도 내 중심은 단단해요',
      interpretation:
        '오늘은 속도를 내기보다 중심을 지키는 것이 더 중요해요. 묵묵함이 오히려 힘이 돼요.',
    },
    {
      rank: 9,
      name: '쉼표',
      spell: '잠시 숨을 고르는 것도 필요한 흐름이에요',
      interpretation:
        '무리해서 이어가려 하면 오히려 지칠 수 있어요. 잠깐 쉬어가는 선택도 충분히 괜찮아요.',
    },
    {
      rank: 9,
      name: '우산',
      spell: '조금 피하고 쉬어가도 괜찮아요',
      interpretation:
        '굳이 모든 상황을 정면으로 맞설 필요는 없어요. 오늘은 나를 보호하는 태도가 더 중요해요.',
    },
  ],

  10: [
    {
      rank: 10,
      name: '겨울',
      spell: '쉬어가는 시간도 나를 지켜줘요',
      interpretation:
        '에너지가 조금 낮게 느껴질 수 있어요. 오늘은 속도를 줄이고 스스로에게 여유를 주세요.',
    },
    {
      rank: 10,
      name: '등불',
      spell: '작은 빛 하나면 충분한 밤도 있어요',
      interpretation:
        '크게 잘하려 하기보다 작은 희망 하나를 붙잡는 게 도움이 되는 날이에요. 천천히 가도 괜찮아요.',
    },
    {
      rank: 10,
      name: '숨',
      spell: '깊게 들이쉬고 천천히 내쉬어 보세요',
      interpretation:
        '마음이 조급해질수록 호흡을 가다듬는 것이 중요해요. 오늘은 나를 안정시키는 데 집중해 보세요.',
    },
  ],

  11: [
    {
      rank: 11,
      name: '새벽',
      spell: '어둠 끝에는 늘 빛이 와요',
      interpretation:
        '조금 무겁게 느껴지는 하루라도 괜찮아요. 지금의 시간이 지나면 새로운 흐름이 찾아올 거예요.',
    },
    {
      rank: 11,
      name: '조약돌',
      spell: '천천히 버티는 힘도 소중해요',
      interpretation:
        '오늘은 크게 나아가는 것보다 무너지지 않는 것이 더 중요해요. 충분히 잘 버티고 있어요.',
    },
    {
      rank: 11,
      name: '이정표',
      spell: '아직 멀어 보여도 방향은 잃지 않았어요',
      interpretation:
        '결과가 바로 보이지 않아 답답할 수 있어요. 그래도 지금의 걸음은 분명히 의미 있는 과정이에요.',
    },
  ],

  12: [
    {
      rank: 12,
      name: '촛불',
      spell: '작은 온기가 오늘을 지켜줄 거예요',
      interpretation:
        '마음이 쉽게 지칠 수 있는 날이에요. 거창한 위로보다 익숙한 따뜻함이 큰 힘이 되어줄 거예요.',
    },
    {
      rank: 12,
      name: '비',
      spell: '잠시 젖는 하루도 결국 지나가요',
      interpretation:
        '오늘은 조금 축 처질 수 있어요. 억지로 밝아지려 하기보다 차분히 지나가게 두는 것도 좋아요.',
    },
    {
      rank: 12,
      name: '여명',
      spell: '다시 밝아질 준비는 이미 시작됐어요',
      interpretation:
        '지금은 흐릿해 보여도 괜찮아요. 오늘의 끝에서부터 새로운 기운이 천천히 들어올 거예요.',
    },
  ],
};

export function getCardByRank(rank: number, date: string): DailyCard {
  const variants = DAILY_CARDS[rank] ?? DAILY_CARDS[12];
  const day = parseInt(date.slice(8, 10), 10);
  return variants[(day - 1) % variants.length];
}
