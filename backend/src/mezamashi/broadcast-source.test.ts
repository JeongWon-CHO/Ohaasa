import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { describe, expect, it, vi } from 'vitest';

// 앱의 조회 코드를 실행하되 Supabase는 대체한다. 운영 DB/기기에는 접근하지 않는다.
function moduleAt(file: string, dependencies: Record<string, unknown> = {}) {
  const exports: Record<string, any> = {};
  const code = ts.transpileModule(readFileSync(resolve(__dirname, '../../../packages/shared/src', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  runInNewContext(code, { exports, Date, require: (name: string) => {
    if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
    return dependencies[name];
  } });
  return exports;
}
const zodiac = moduleAt('constants/zodiac.ts');
const service = moduleAt('lib/broadcastHoroscopes.ts', {
  '../constants/zodiac': zodiac,
  './mezamashi': moduleAt('lib/mezamashi.ts'),
});
const signs = Object.keys(zodiac.ZODIAC_MAP);
function rows(date = '2026-10-24', source = 'gogo') {
  return signs.map((sign, index) => ({ date, source, zodiac_sign: sign, rank: index + 1, advice: '원문', advice_ko: '번역' }));
}

describe('방송별 읽기 전용 운세 선택', () => {
  it('다른 방송 데이터와 섞지 않고 최신의 완전한 날짜를 고른다', () => {
    const result = service.latestCompleteBroadcast([...rows('2026-10-25', 'ohaasa'), ...rows(), ...rows('2026-10-23')], 'gogo');
    expect(result).toHaveLength(12);
    expect(result.every((row: any) => row.date === '2026-10-24' && row.source === 'gogo')).toBe(true);
  });
  it.each(['missing', 'duplicate-sign', 'duplicate-rank', 'blank', 'invalid-sign', 'invalid-rank'])(
    '불완전한 최신 데이터(%s)는 이전의 완전한 운세로 대체한다', reason => {
      const latest = rows('2026-10-25');
      if (reason === 'missing') latest.pop();
      if (reason === 'duplicate-sign') latest[1].zodiac_sign = latest[0].zodiac_sign;
      if (reason === 'duplicate-rank') latest[1].rank = latest[0].rank;
      if (reason === 'blank') latest[0].advice = '  ';
      if (reason === 'invalid-sign') latest[0].zodiac_sign = 'unknown';
      if (reason === 'invalid-rank') latest[0].rank = 1.5;
      expect(service.latestCompleteBroadcast([...latest, ...rows()], 'gogo').map((row: any) => row.date)).toEqual(Array(12).fill('2026-10-24'));
    },
  );
  it('자료가 없는 방송은 빈 목록으로 반환한다', () => {
    expect(service.latestCompleteBroadcast(rows(), 'mezamashi')).toEqual([]);
    expect(service.isBroadcastSource('unknown')).toBe(false);
    expect(service.isBroadcastSource(['gogo'])).toBe(false);
  });
  it('메자마시 필수 행운 항목이 비어 있으면 완전한 운세로 취급하지 않는다', () => {
    const incomplete = rows('2026-10-24', 'mezamashi').map(row => ({
      ...row, mezamashi: { lucky_point: '  ', lucky_color: '파란색' },
    }));
    expect(service.latestCompleteBroadcast(incomplete, 'mezamashi')).toEqual([]);
  });
  it.each(['gogo', 'ohaasa', 'mezamashi'])('%s는 자기 원본 테이블만 읽고 미래 날짜를 제외한다', async source => {
    const data = rows('2026-10-24', source).map(row => ({ ...row, lucky_point: '행운 포인트', lucky_color: '파란색' }));
    const query: Record<string, any> = {};
    for (const name of ['select', 'lte', 'eq', 'order', 'limit']) query[name] = vi.fn(() => query);
    query.abortSignal = vi.fn(async () => ({ data, error: null }));
    const from = vi.fn(() => query);
    const signal = new AbortController().signal;
    const result = await service.fetchBroadcastHoroscopes({ from }, source, signal);
    expect(from).toHaveBeenCalledWith(source === 'mezamashi' ? 'mezamashi_horoscopes' : 'horoscopes');
    expect(query.lte).toHaveBeenCalledWith('date', new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10));
    if (source === 'mezamashi') {
      expect(query.eq).not.toHaveBeenCalled();
      expect(result[0].mezamashi.zodiac_sign).toBe(signs[0]);
      expect(result[0].love_score).toBeNull();
    } else expect(query.eq).toHaveBeenCalledWith('source', source);
    expect(query.abortSignal).toHaveBeenCalledWith(signal);
    expect(result).toHaveLength(12);
  });
  it('조회 실패를 데이터 없음으로 숨기지 않는다', async () => {
    const failure = new Error('offline');
    const query: Record<string, any> = {};
    for (const name of ['select', 'lte', 'eq', 'order', 'limit']) query[name] = () => query;
    query.abortSignal = async () => ({ data: null, error: failure });
    await expect(service.fetchBroadcastHoroscopes({ from: () => query }, 'gogo', new AbortController().signal)).rejects.toBe(failure);
  });
});
