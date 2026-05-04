import { createClient } from '@supabase/supabase-js';

import type { ZodiacSign } from '@/src/constants/zodiac';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface UpsertDeviceParams {
  deviceId: string;
  zodiacSign: ZodiacSign;
  pushToken: string | null;
  platform: 'ios' | 'android' | null;
  notificationsEnabled: boolean;
}

export async function upsertDevice(params: UpsertDeviceParams): Promise<void> {
  const { error } = await supabase.from('user_devices').upsert(
    {
      device_id: params.deviceId,
      zodiac_sign: params.zodiacSign,
      push_token: params.pushToken,
      platform: params.platform,
      notifications_enabled: params.notificationsEnabled,
    },
    { onConflict: 'device_id' },
  );

  if (error) {
    console.warn('[supabase] upsertDevice failed:', error.message);
  }
}
