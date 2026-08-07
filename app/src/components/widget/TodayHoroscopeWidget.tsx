import { FlexWidget, ImageWidget, OverlapWidget, TextWidget } from 'react-native-android-widget';

import { colors } from '@/src/constants/design';
import type { ZodiacSign } from '@/src/constants/zodiac';

export type WidgetSize = 'small' | 'medium' | 'large';

export type TodayHoroscopeWidgetProps =
  | { size: WidgetSize; status: 'no-zodiac' }
  | { size: WidgetSize; status: 'error' }
  | {
      size: WidgetSize;
      status: 'ok';
      sign: ZodiacSign;
      zodiacName: string;
      zodiacEn: string;
      zodiacDateRange: string;
      rank: number;
      advice: string;
      dateText: string;
      luckyColor: string | null;
    };

const MESSAGES = {
  'no-zodiac': '별자리를\n선택해주세요',
  error: '정보를 불러올 수\n없어요',
} as const;

// 배지(원) 안에 들어가는 별자리 그래픽 — ConstellationBadge와 동일한 원본 에셋(진하게 보임).
const ZODIAC_IMAGE: Record<ZodiacSign, number> = {
  aries: require('@/assets/images/zodiac/aries.png'),
  taurus: require('@/assets/images/zodiac/taurus.png'),
  gemini: require('@/assets/images/zodiac/gemini.png'),
  cancer: require('@/assets/images/zodiac/cancer.png'),
  leo: require('@/assets/images/zodiac/leo.png'),
  virgo: require('@/assets/images/zodiac/virgo.png'),
  libra: require('@/assets/images/zodiac/libra.png'),
  scorpio: require('@/assets/images/zodiac/scorpio.png'),
  sagittarius: require('@/assets/images/zodiac/sagittarius.png'),
  capricorn: require('@/assets/images/zodiac/capricorn.png'),
  aquarius: require('@/assets/images/zodiac/aquarius.png'),
  pisces: require('@/assets/images/zodiac/pisces.png'),
};

// 1x1 아이콘 위젯 전용 — 배경 전체에 은은하게 깔리는, 미리 알파를 낮춰둔 버전.
const FADED_ZODIAC_IMAGE: Record<ZodiacSign, number> = {
  aries: require('@/assets/images/zodiac-widget/aries.png'),
  taurus: require('@/assets/images/zodiac-widget/taurus.png'),
  gemini: require('@/assets/images/zodiac-widget/gemini.png'),
  cancer: require('@/assets/images/zodiac-widget/cancer.png'),
  leo: require('@/assets/images/zodiac-widget/leo.png'),
  virgo: require('@/assets/images/zodiac-widget/virgo.png'),
  libra: require('@/assets/images/zodiac-widget/libra.png'),
  scorpio: require('@/assets/images/zodiac-widget/scorpio.png'),
  sagittarius: require('@/assets/images/zodiac-widget/sagittarius.png'),
  capricorn: require('@/assets/images/zodiac-widget/capricorn.png'),
  aquarius: require('@/assets/images/zodiac-widget/aquarius.png'),
  pisces: require('@/assets/images/zodiac-widget/pisces.png'),
};

const CARD_RADIUS = { small: 18, medium: 20, large: 22 } as const;
const CARD_GRADIENT = { from: colors.cream, to: colors.cream3, orientation: 'TL_BR' } as const;
const RANK_GRADIENT = { from: colors.yellow, to: colors.apricot, orientation: 'LEFT_RIGHT' } as const;
const DASH_RING_COLOR = 'rgba(217, 138, 104, 0.16)' as const;
const GLOW_COLOR = 'rgba(240, 184, 154, 0.4)' as const;
const ADVICE_BG = 'rgba(255, 253, 249, 0.75)' as const;
const ADVICE_BORDER = 'rgba(237, 227, 214, 0.7)' as const;

function EmptyStateWidget({
  size,
  status,
}: {
  size: WidgetSize;
  status: 'no-zodiac' | 'error';
}) {
  if (size === 'small') {
    return (
      <FlexWidget
        clickAction="OPEN_APP"
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundColor: colors.cream2,
          borderRadius: CARD_RADIUS.small,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <TextWidget text="!" style={{ fontSize: 20, fontWeight: 'bold', color: colors.textSoft }} />
      </FlexWidget>
    );
  }

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundGradient: CARD_GRADIENT,
        borderRadius: CARD_RADIUS[size],
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <TextWidget
        text={MESSAGES[status]}
        style={{ fontSize: 13, color: colors.textMid, textAlign: 'center', lineHeight: 18 }}
      />
    </FlexWidget>
  );
}

function SmallWidget({ sign, rank }: { sign: ZodiacSign; rank: number }) {
  return (
    <OverlapWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: colors.cream2,
        borderRadius: CARD_RADIUS.small,
      }}
    >
      <FlexWidget
        style={{ height: 'match_parent', width: 'match_parent', alignItems: 'flex-end', justifyContent: 'flex-start' }}
      >
        <ImageWidget
          image={FADED_ZODIAC_IMAGE[sign]}
          imageWidth={44}
          imageHeight={44}
          resizeMode="contain"
          style={{ marginTop: -6, marginRight: -6 }}
        />
      </FlexWidget>
      <FlexWidget
        style={{ height: 'match_parent', width: 'match_parent', alignItems: 'center', justifyContent: 'center' }}
      >
        <TextWidget text={`${rank}위`} style={{ fontSize: 16, fontWeight: 'bold', color: colors.text }} />
      </FlexWidget>
    </OverlapWidget>
  );
}

// 원형 글로우 2겹 + 별자리 그래픽을 겹친 배지. ShareCard의 circleDash/glow 구성을 위젯 프리미티브로 옮긴 것.
// borderStyle:'dashed'는 이 라이브러리에서 검증 안 된 조합이라(테두리 렌더링 실패 시 위젯 전체가 빈 화면이 될 위험) 배경색 두 겹으로 대체.
function ConstellationBadgeWidget({ sign, size }: { sign: ZodiacSign; size: number }) {
  const glowSize = Math.round(size * 0.82);
  const imageSize = Math.round(size * 0.58);

  return (
    <OverlapWidget style={{ width: size, height: size }}>
      <FlexWidget
        style={{
          width: size,
          height: size,
          borderRadius: 999,
          backgroundColor: DASH_RING_COLOR,
        }}
      />
      <FlexWidget
        style={{
          width: glowSize,
          height: glowSize,
          borderRadius: 999,
          backgroundColor: GLOW_COLOR,
          marginTop: (size - glowSize) / 2,
          marginLeft: (size - glowSize) / 2,
        }}
      />
      <ImageWidget
        image={ZODIAC_IMAGE[sign]}
        imageWidth={imageSize}
        imageHeight={imageSize}
        resizeMode="contain"
        style={{ marginTop: (size - imageSize) / 2, marginLeft: (size - imageSize) / 2 }}
      />
    </OverlapWidget>
  );
}

function CardWidget({
  size,
  sign,
  zodiacName,
  zodiacEn,
  zodiacDateRange,
  rank,
  advice,
  dateText,
  luckyColor,
}: {
  size: 'medium' | 'large';
  sign: ZodiacSign;
  zodiacName: string;
  zodiacEn: string;
  zodiacDateRange: string;
  rank: number;
  advice: string;
  dateText: string;
  luckyColor: string | null;
}) {
  const isLarge = size === 'large';
  const badgeSize = isLarge ? 84 : 46;

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundGradient: CARD_GRADIENT,
        borderRadius: CARD_RADIUS[size],
        flexDirection: 'column',
        justifyContent: 'space-between',
        paddingHorizontal: isLarge ? 20 : 14,
        paddingVertical: isLarge ? 16 : 10,
      }}
    >
      {isLarge ? (
        <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', width: 'match_parent' }}>
          <TextWidget text="ohaasa" style={{ fontSize: 13, color: colors.textSoft, letterSpacing: 1 }} />

          <FlexWidget style={{ flexDirection: 'column', alignItems: 'flex-end' }}>
            <FlexWidget
              style={{ backgroundColor: colors.sky, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}
            >
              <TextWidget text={dateText} style={{ fontSize: 11, fontWeight: 'bold', color: colors.skyDark }} />
            </FlexWidget>
            <FlexWidget
              style={{
                backgroundGradient: RANK_GRADIENT,
                borderRadius: 999,
                paddingHorizontal: 12,
                paddingVertical: 4,
                marginTop: 4,
              }}
            >
              <TextWidget
                text={`오늘의 운세 ${rank}위`}
                style={{ fontSize: 12, fontWeight: 'bold', color: colors.cardSolid }}
              />
            </FlexWidget>
          </FlexWidget>
        </FlexWidget>
      ) : (
        <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', width: 'match_parent' }}>
          <TextWidget text="오늘의 운세" style={{ fontSize: 11, color: colors.textMid }} />
          <FlexWidget
            style={{ backgroundColor: colors.sky, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}
          >
            <TextWidget text={dateText} style={{ fontSize: 10, fontWeight: 'bold', color: colors.skyDark }} />
          </FlexWidget>
        </FlexWidget>
      )}

      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
        <ConstellationBadgeWidget sign={sign} size={badgeSize} />

        <FlexWidget style={{ flexDirection: 'column', marginLeft: 10 }}>
          {isLarge ? (
            <>
              <TextWidget text={zodiacName} style={{ fontSize: 18, fontWeight: 'bold', color: colors.text }} />
              <TextWidget
                text={`${zodiacEn} · ${zodiacDateRange}`}
                style={{ fontSize: 11, color: colors.textSoft, marginTop: 2 }}
              />
            </>
          ) : (
            <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TextWidget text={zodiacName} style={{ fontSize: 15, fontWeight: 'bold', color: colors.text }} />
              <FlexWidget
                style={{
                  backgroundGradient: RANK_GRADIENT,
                  borderRadius: 999,
                  paddingHorizontal: 9,
                  paddingVertical: 2,
                  marginLeft: 8,
                }}
              >
                <TextWidget
                  text={`${rank}위`}
                  style={{ fontSize: 12, fontWeight: 'bold', color: colors.cardSolid }}
                />
              </FlexWidget>
            </FlexWidget>
          )}
        </FlexWidget>
      </FlexWidget>

      <FlexWidget
        style={{
          backgroundColor: ADVICE_BG,
          borderWidth: 1,
          borderColor: ADVICE_BORDER,
          borderRadius: 14,
          paddingHorizontal: isLarge ? 14 : 10,
          paddingVertical: isLarge ? 10 : 8,
          width: 'match_parent',
        }}
      >
        <TextWidget
          text={advice}
          maxLines={isLarge ? 3 : 2}
          truncate="END"
          style={{ fontSize: isLarge ? 13 : 11, color: colors.text, lineHeight: isLarge ? 19 : 16 }}
        />
      </FlexWidget>

      {isLarge && luckyColor && (
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          <TextWidget text="✦ 행운 컬러" style={{ fontSize: 11, color: colors.textSoft }} />
          <FlexWidget
            style={{
              backgroundColor: colors.cream3,
              borderRadius: 999,
              paddingHorizontal: 10,
              paddingVertical: 3,
              marginLeft: 6,
            }}
          >
            <TextWidget text={luckyColor} style={{ fontSize: 11, fontWeight: 'bold', color: colors.textMid }} />
          </FlexWidget>
        </FlexWidget>
      )}
    </FlexWidget>
  );
}

export function TodayHoroscopeWidget(props: TodayHoroscopeWidgetProps) {
  if (props.status !== 'ok') {
    return <EmptyStateWidget size={props.size} status={props.status} />;
  }

  if (props.size === 'small') {
    return <SmallWidget sign={props.sign} rank={props.rank} />;
  }

  return (
    <CardWidget
      size={props.size}
      sign={props.sign}
      zodiacName={props.zodiacName}
      zodiacEn={props.zodiacEn}
      zodiacDateRange={props.zodiacDateRange}
      rank={props.rank}
      advice={props.advice}
      dateText={props.dateText}
      luckyColor={props.luckyColor}
    />
  );
}
