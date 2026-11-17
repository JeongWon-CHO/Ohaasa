import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { generateExample } from '../../.github/scripts/seed-community-review.mjs';
import { required } from '../../.github/scripts/community-api.mjs';

export const PREVIEW_USAGE = 'npm run community:preview -- "질문" [--count 3] [--answer "기존 답변"]\n생성 API만 호출하며 DB에는 접근하지 않습니다. OPENAI_API_KEY 또는 backend/.env가 필요합니다.';

export async function runPreview(args, { generate = generateExample, env = required, write = console.log } = {}) {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: { count: { type: 'string', default: '3' }, answer: { type: 'string' }, help: { type: 'boolean' } },
  });
  if (values.help) { write(PREVIEW_USAGE); return []; }
  const count = Number(values.count);
  if (positionals.length !== 1 || !positionals[0].trim() || !Number.isInteger(count) || count < 1 || count > 10 || (values.answer !== undefined && !values.answer.trim())) {
    throw new Error('Invalid preview arguments');
  }
  const question = positionals[0].trim();
  const existingAnswer = values.answer?.trim();
  const samples = [];
  for (let index = 0; index < count; index++) {
    const sample = await generate(question, existingAnswer, env, undefined, {
      avoidRepeating: samples.map(item => item.answer),
      avoidRepeatingReplies: samples.map(item => item.reply),
    });
    samples.push(sample);
    // Local opt-in preview only; never print configuration, headers or API errors.
    write(JSON.stringify({ question, ...(existingAnswer ? { existingAnswer } : {}), ...sample }, null, 2));
  }
  return samples;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const { config } = await import('dotenv');
    config({ path: new URL('../.env', import.meta.url), quiet: true });
    await runPreview(process.argv.slice(2));
  } catch {
    console.error('Community preview failed. Check arguments (--help), OPENAI_API_KEY and network access.');
    process.exitCode = 1;
  }
}
