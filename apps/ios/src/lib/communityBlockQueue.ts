import AsyncStorage from '@react-native-async-storage/async-storage';
import { getOrCreateDeviceId } from '@ohaasa/shared/lib/storage';
import { supabase } from '@ohaasa/shared/lib/supabase';

export type BlockTarget = { kind: 'answer' | 'reply'; id: string };
const KEY = 'ohaasa:pending_community_blocks:v1';
let tail: Promise<unknown> = Promise.resolve();

function serialized<T>(run: () => Promise<T>): Promise<T> {
  const next = tail.then(run);
  tail = next.catch(() => {});
  return next;
}
async function load(): Promise<BlockTarget[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  const values: unknown = JSON.parse(raw);
  if (!Array.isArray(values)) throw new Error('Invalid block queue');
  return values.filter((item): item is BlockTarget =>
    item && (item.kind === 'answer' || item.kind === 'reply') && typeof item.id === 'string');
}

/** Persist before attempting delivery; an offline block must still hide content immediately. */
export function queueCommunityBlock(target: BlockTarget): Promise<void> {
  return serialized(async () => {
    const pending = await load();
    if (!pending.some((item) => item.kind === target.kind && item.id === target.id)) {
      await AsyncStorage.setItem(KEY, JSON.stringify([...pending, target]));
    }
  });
}

export function flushCommunityBlocks(): Promise<void> {
  return serialized(async () => {
    const pending = await load();
    if (!pending.length) return;
    const deviceId = await getOrCreateDeviceId();
    await flushRemaining(pending, deviceId);
  });
}
async function flushRemaining(pending: BlockTarget[], deviceId: string) {
  while (pending.length) {
    const target = pending[0];
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const { error } = await supabase.rpc('submit_community_block', {
        p_target_kind: target.kind, p_target_id: target.id, p_reporter_device_id: deviceId,
      }).abortSignal(controller.signal);
      if (error) return;
    } finally {
      clearTimeout(timeout);
    }

    pending.shift();
    await AsyncStorage.setItem(KEY, JSON.stringify(pending));
  }
}
