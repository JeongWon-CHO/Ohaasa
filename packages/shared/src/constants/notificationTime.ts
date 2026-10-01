export const NOTIFICATION_TIMES = [
  '06:00', '06:30', '07:00', '07:30', '08:00',
  '08:30', '09:00', '09:30', '10:00',
] as const;

export type NotificationTime = (typeof NOTIFICATION_TIMES)[number];

export const DEFAULT_NOTIFICATION_TIME: NotificationTime = '06:00';

export function isNotificationTime(value: unknown): value is NotificationTime {
  return NOTIFICATION_TIMES.some((time) => time === value);
}

export function formatNotificationTime(time: NotificationTime): string {
  const [hour, minute] = time.split(':');
  return `오전 ${Number(hour)}시${minute === '00' ? '' : ' 30분'}`;
}
