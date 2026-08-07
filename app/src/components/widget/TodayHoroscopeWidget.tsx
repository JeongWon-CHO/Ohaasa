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

const LUCKY_COLOR_HEX: Record<string, string> = {
  빨간색: '#E05555',
  주황색: '#E8935B',
  노란색: '#E8C85A',
  초록색: '#5AAA6B',
  파란색: '#5588CC',
  남색: '#3B4D8B',
  보라색: '#8B5BAA',
  분홍색: '#E87FAA',
  흰색: '#E8E0D4',
  회색: '#8B8B8B',
  검은색: '#3B3330',
  갈색: '#8B6347',
  황금색: '#D4AA45',
  은색: '#A8A8A8',
};

const CARD_RADIUS = { small: 18, medium: 20, large: 22 } as const;
const CARD_GRADIENT = { from: colors.cream, to: colors.cream3, orientation: 'TL_BR' } as const;
const RANK_GRADIENT = { from: colors.yellow, to: colors.apricot, orientation: 'LEFT_RIGHT' } as const;
const DASH_RING_COLOR = 'rgba(217, 138, 104, 0.16)' as const;
const GLOW_COLOR = 'rgba(240, 184, 154, 0.4)' as const;
const ADVICE_BG = 'rgba(255, 253, 249, 0.75)' as const;
const ADVICE_BORDER = 'rgba(237, 227, 214, 0.7)' as const;
const TEAL_BLOB = 'rgba(161, 210, 196, 0.4)' as const;
const SPARKLE_COLOR = 'rgba(200, 168, 98, 0.45)' as const;
const MOON_COLOR = 'rgba(163, 175, 200, 0.5)' as const;

function EmptyStateWidget({
  size,
  status,
}: {
  size: WidgetSize;
  status: 'no-zodiac' | 'error';
}) {
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

function SmallWidget({
  sign,
  zodiacName,
  zodiacEn,
  zodiacDateRange,
  rank,
  advice,
  luckyColor,
}: {
  sign: ZodiacSign;
  zodiacName: string;
  zodiacEn: string;
  zodiacDateRange: string;
  rank: number;
  advice: string;
  luckyColor: string | null;
}) {
  const badgeSize = 64;
  const dotColor = luckyColor ? (LUCKY_COLOR_HEX[luckyColor] as `#${string}` | undefined) : undefined;

  return (
    <OverlapWidget
      clickAction="OPEN_APP"
      style={{ height: 'match_parent', width: 'match_parent' }}
    >
      {/* 배경 그라디언트 — OverlapWidget에 backgroundGradient를 직접 쓰면 투명하게 렌더링되는 버그 있음 */}
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundGradient: CARD_GRADIENT,
          borderRadius: CARD_RADIUS.small,
        }}
      />

      {/* 하단 좌: 민트 원 데코 */}
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          justifyContent: 'flex-end',
          alignItems: 'flex-start',
        }}
      >
        <FlexWidget
          style={{
            width: 56,
            height: 56,
            borderRadius: 999,
            backgroundColor: TEAL_BLOB,
            marginLeft: -16,
            marginBottom: -16,
          }}
        />
      </FlexWidget>

      {/* 우측 중앙: 달 데코 */}
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          justifyContent: 'center',
          alignItems: 'flex-end',
          paddingRight: 14,
        }}
      >
        <TextWidget text="☽" style={{ fontSize: 20, color: MOON_COLOR }} />
      </FlexWidget>

      {/* 우측 상단: 스파클 데코 */}
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          alignItems: 'flex-end',
          paddingTop: 26,
          paddingRight: 16,
        }}
      >
        <TextWidget text="✦" style={{ fontSize: 7, color: SPARKLE_COLOR }} />
      </FlexWidget>

      {/* 메인 콘텐츠 */}
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          flexDirection: 'column',
          paddingHorizontal: 14,
          paddingTop: 10,
          paddingBottom: 10,
        }}
      >
        {/* ohaasa | N위 */}
        <FlexWidget
          style={{ flexDirection: 'row', justifyContent: 'space-between', width: 'match_parent' }}
        >
          <TextWidget
            text="ohaasa"
            style={{ fontSize: 13, color: colors.textSoft, letterSpacing: 1 }}
          />
          <FlexWidget
            style={{
              backgroundGradient: RANK_GRADIENT,
              borderRadius: 999,
              paddingHorizontal: 14,
              paddingVertical: 5,
            }}
          >
            <TextWidget
              text={`${rank}위`}
              style={{ fontSize: 15, fontWeight: 'bold', color: colors.cardSolid }}
            />
          </FlexWidget>
        </FlexWidget>

        {/* 별자리 배지 | 텍스트 컬럼 */}
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
          <ConstellationBadgeWidget sign={sign} size={badgeSize} />

          <FlexWidget style={{ flexDirection: 'column', marginLeft: 14 }}>
            <TextWidget
              text={zodiacName}
              style={{ fontSize: 20, fontWeight: 'bold', color: colors.text }}
            />
            <TextWidget
              text={`${zodiacEn} · ${zodiacDateRange}`}
              style={{ fontSize: 11, color: colors.textSoft, marginTop: 2 }}
            />
            <TextWidget
              text={`✦ ${advice}`}
              maxLines={1}
              truncate="END"
              style={{ fontSize: 12, color: colors.textMid, marginTop: 6 }}
            />
            {luckyColor && (
              <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                <TextWidget text="✦ 행운 컬러" style={{ fontSize: 10, color: colors.textSoft }} />
                <TextWidget text="  |  " style={{ fontSize: 10, color: colors.cream3 }} />
                <TextWidget
                  text={luckyColor}
                  style={{ fontSize: 10, fontWeight: 'bold', color: colors.textMid }}
                />
                {dotColor && (
                  <FlexWidget
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 999,
                      backgroundColor: dotColor,
                      marginLeft: 4,
                    }}
                  />
                )}
              </FlexWidget>
            )}
          </FlexWidget>
        </FlexWidget>
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

function MediumWidget({
  sign,
  zodiacName,
  zodiacEn,
  zodiacDateRange,
  rank,
  advice,
}: {
  sign: ZodiacSign;
  zodiacName: string;
  zodiacEn: string;
  zodiacDateRange: string;
  rank: number;
  advice: string;
}) {
  const badgeSize = 44;

  return (
    <OverlapWidget
      clickAction="OPEN_APP"
      style={{ height: 'match_parent', width: 'match_parent' }}
    >
      {/* 배경 그라디언트 — OverlapWidget에 backgroundGradient를 직접 쓰면 투명하게 렌더링되는 버그 있음 */}
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundGradient: CARD_GRADIENT,
          borderRadius: CARD_RADIUS.medium,
        }}
      />

      {/* 하단 좌: 민트 원 데코 */}
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          justifyContent: 'flex-end',
          alignItems: 'flex-start',
        }}
      >
        <FlexWidget
          style={{
            width: 44,
            height: 44,
            borderRadius: 999,
            backgroundColor: TEAL_BLOB,
            marginLeft: -12,
            marginBottom: -12,
          }}
        />
      </FlexWidget>

      {/* 하단 우: 달 데코 */}
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          justifyContent: 'flex-end',
          alignItems: 'flex-end',
          paddingBottom: 10,
          paddingRight: 8,
        }}
      >
        <TextWidget text="☽" style={{ fontSize: 15, color: MOON_COLOR }} />
      </FlexWidget>

      {/* 우측 중단: 스파클 데코 */}
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          alignItems: 'flex-end',
          paddingTop: 28,
          paddingRight: 9,
        }}
      >
        <TextWidget text="✦" style={{ fontSize: 6, color: SPARKLE_COLOR }} />
      </FlexWidget>

      {/* 메인 콘텐츠 */}
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          flexDirection: 'column',
          alignItems: 'center',
          paddingHorizontal: 10,
          paddingVertical: 9,
        }}
      >
        {/* ohaasa | N위 */}
        <FlexWidget
          style={{ flexDirection: 'row', justifyContent: 'space-between', width: 'match_parent' }}
        >
          <TextWidget
            text="ohaasa"
            style={{ fontSize: 10, color: colors.textSoft, letterSpacing: 1 }}
          />
          <FlexWidget
            style={{
              backgroundGradient: RANK_GRADIENT,
              borderRadius: 999,
              paddingHorizontal: 8,
              paddingVertical: 3,
            }}
          >
            <TextWidget
              text={`${rank}위`}
              style={{ fontSize: 11, fontWeight: 'bold', color: colors.cardSolid }}
            />
          </FlexWidget>
        </FlexWidget>

        {/* 별자리 배지 */}
        <FlexWidget style={{ marginTop: 4 }}>
          <ConstellationBadgeWidget sign={sign} size={badgeSize} />
        </FlexWidget>

        {/* 별자리명 */}
        <TextWidget
          text={zodiacName}
          style={{ fontSize: 13, fontWeight: 'bold', color: colors.text, marginTop: 4 }}
        />

        {/* 영문 · 날짜 */}
        <TextWidget
          text={`${zodiacEn} · ${zodiacDateRange}`}
          style={{ fontSize: 9, color: colors.textSoft, marginTop: 1 }}
        />

        {/* 조언 */}
        <TextWidget
          text={`✦ ${advice}`}
          maxLines={1}
          truncate="END"
          style={{ fontSize: 10, color: colors.textMid, marginTop: 5 }}
        />
      </FlexWidget>
    </OverlapWidget>
  );
}

function CardWidget({
  sign,
  zodiacName,
  zodiacEn,
  zodiacDateRange,
  rank,
  advice,
  dateText,
  luckyColor,
}: {
  sign: ZodiacSign;
  zodiacName: string;
  zodiacEn: string;
  zodiacDateRange: string;
  rank: number;
  advice: string;
  dateText: string;
  luckyColor: string | null;
}) {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundGradient: CARD_GRADIENT,
        borderRadius: CARD_RADIUS.large,
        flexDirection: 'column',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
      }}
    >
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

      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
        <ConstellationBadgeWidget sign={sign} size={84} />

        <FlexWidget style={{ flexDirection: 'column', marginLeft: 10 }}>
          <TextWidget text={zodiacName} style={{ fontSize: 18, fontWeight: 'bold', color: colors.text }} />
          <TextWidget
            text={`${zodiacEn} · ${zodiacDateRange}`}
            style={{ fontSize: 11, color: colors.textSoft, marginTop: 2 }}
          />
        </FlexWidget>
      </FlexWidget>

      <FlexWidget
        style={{
          backgroundColor: ADVICE_BG,
          borderWidth: 1,
          borderColor: ADVICE_BORDER,
          borderRadius: 14,
          paddingHorizontal: 14,
          paddingVertical: 10,
          width: 'match_parent',
        }}
      >
        <TextWidget
          text={advice}
          maxLines={3}
          truncate="END"
          style={{ fontSize: 13, color: colors.text, lineHeight: 19 }}
        />
      </FlexWidget>

      {luckyColor && (
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
    return (
      <SmallWidget
        sign={props.sign}
        zodiacName={props.zodiacName}
        zodiacEn={props.zodiacEn}
        zodiacDateRange={props.zodiacDateRange}
        rank={props.rank}
        advice={props.advice}
        luckyColor={props.luckyColor}
      />
    );
  }

  if (props.size === 'medium') {
    return (
      <MediumWidget
        sign={props.sign}
        zodiacName={props.zodiacName}
        zodiacEn={props.zodiacEn}
        zodiacDateRange={props.zodiacDateRange}
        rank={props.rank}
        advice={props.advice}
      />
    );
  }

  return (
    <CardWidget
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
