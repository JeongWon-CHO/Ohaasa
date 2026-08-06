import { FlexWidget, TextWidget } from 'react-native-android-widget';

import { colors } from '@/src/constants/design';

export type TodayHoroscopeWidgetProps =
  | { status: 'no-zodiac' }
  | { status: 'error' }
  | {
      status: 'ok';
      zodiacEmoji: string;
      zodiacName: string;
      rank: number;
      advice: string;
      dateText: string;
    };

const MESSAGES = {
  'no-zodiac': '앱에서 별자리를 선택해주세요',
  error: '정보를 불러올 수 없어요\n탭해서 앱을 열어주세요',
} as const;

export function TodayHoroscopeWidget(props: TodayHoroscopeWidgetProps) {
  if (props.status !== 'ok') {
    return (
      <FlexWidget
        clickAction="OPEN_APP"
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundColor: colors.cream,
          borderRadius: 20,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
        }}
      >
        <TextWidget
          text={MESSAGES[props.status]}
          style={{ fontSize: 13, color: colors.textMid, textAlign: 'center' }}
        />
      </FlexWidget>
    );
  }

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: colors.cream,
        borderRadius: 20,
        flexDirection: 'column',
        paddingHorizontal: 16,
        paddingVertical: 12,
      }}
    >
      <FlexWidget
        style={{ flexDirection: 'row', justifyContent: 'space-between', width: 'match_parent' }}
      >
        <TextWidget text="오늘의 운세" style={{ fontSize: 11, color: colors.textSoft }} />
        <TextWidget text={props.dateText} style={{ fontSize: 11, color: colors.skyDark }} />
      </FlexWidget>

      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
        <TextWidget
          text={`${props.zodiacEmoji} ${props.zodiacName}`}
          style={{ fontSize: 15, fontWeight: 'bold', color: colors.text }}
        />
        <TextWidget
          text={`${props.rank}위`}
          style={{ fontSize: 15, fontWeight: 'bold', color: colors.apricotDark, marginLeft: 8 }}
        />
      </FlexWidget>

      <TextWidget
        text={props.advice}
        maxLines={2}
        truncate="END"
        style={{ fontSize: 12, color: colors.textMid, marginTop: 6, lineHeight: 17 }}
      />
    </FlexWidget>
  );
}
