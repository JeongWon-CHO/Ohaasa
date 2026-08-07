import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { TodayHoroscopeWidget, type WidgetSize } from '@/src/components/widget/TodayHoroscopeWidget';
import { ZODIAC_MAP } from '@/src/constants/zodiac';
import { fetchTodayHoroscopeForSign, formatShortDate } from '@/src/lib/horoscope';
import { getZodiacSign } from '@/src/lib/storage';

const WIDGET_SIZE_BY_NAME: Record<string, WidgetSize> = {
  TodayHoroscopeSmall: 'small',
  TodayHoroscope: 'medium',
  TodayHoroscopeLarge: 'large',
};

// Android 홈 화면 위젯 headless task. 앱 JS 런타임 밖(headless)에서 실행되므로
// 어떤 예외도 밖으로 던지지 않는다 — storage.ts/notifications.ts와 동일한 원칙.
export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  if (props.widgetAction === 'WIDGET_DELETED') return;

  const size = WIDGET_SIZE_BY_NAME[props.widgetInfo.widgetName] ?? 'medium';

  try {
    const zodiacSign = await getZodiacSign();

    if (!zodiacSign) {
      props.renderWidget(<TodayHoroscopeWidget size={size} status="no-zodiac" />);
      return;
    }

    const horoscope = await fetchTodayHoroscopeForSign(zodiacSign);

    if (!horoscope) {
      props.renderWidget(<TodayHoroscopeWidget size={size} status="error" />);
      return;
    }

    const zodiac = ZODIAC_MAP[zodiacSign];

    props.renderWidget(
      <TodayHoroscopeWidget
        size={size}
        status="ok"
        sign={zodiacSign}
        zodiacName={zodiac.ko}
        zodiacEn={zodiac.en}
        zodiacDateRange={zodiac.dateRange}
        rank={horoscope.rank}
        advice={horoscope.advice_ko ?? horoscope.advice}
        dateText={formatShortDate(horoscope.date)}
        luckyColor={horoscope.lucky_color_ko ?? horoscope.lucky_color}
      />,
    );
  } catch {
    props.renderWidget(<TodayHoroscopeWidget size={size} status="error" />);
  }
}
