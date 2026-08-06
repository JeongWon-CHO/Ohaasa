import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { TodayHoroscopeWidget } from '@/src/components/widget/TodayHoroscopeWidget';
import { ZODIAC_MAP } from '@/src/constants/zodiac';
import { fetchTodayHoroscopeForSign, formatShortDate } from '@/src/lib/horoscope';
import { getZodiacSign } from '@/src/lib/storage';

// Android 홈 화면 위젯 headless task. 앱 JS 런타임 밖(headless)에서 실행되므로
// 어떤 예외도 밖으로 던지지 않는다 — storage.ts/notifications.ts와 동일한 원칙.
export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  if (props.widgetAction === 'WIDGET_DELETED') return;

  try {
    const zodiacSign = await getZodiacSign();

    if (!zodiacSign) {
      props.renderWidget(<TodayHoroscopeWidget status="no-zodiac" />);
      return;
    }

    const horoscope = await fetchTodayHoroscopeForSign(zodiacSign);

    if (!horoscope) {
      props.renderWidget(<TodayHoroscopeWidget status="error" />);
      return;
    }

    const zodiac = ZODIAC_MAP[zodiacSign];

    props.renderWidget(
      <TodayHoroscopeWidget
        status="ok"
        zodiacEmoji={zodiac.emoji}
        zodiacName={zodiac.ko}
        rank={horoscope.rank}
        advice={horoscope.advice_ko ?? horoscope.advice}
        dateText={formatShortDate(horoscope.date)}
      />,
    );
  } catch {
    props.renderWidget(<TodayHoroscopeWidget status="error" />);
  }
}
