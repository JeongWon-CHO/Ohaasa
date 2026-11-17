import { COMMUNITY_EXAMPLE_PROMPT } from '../../backend/scripts/community-prompt.mjs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { database, required } from './community-api.mjs';
import dailyQuestions from '../../packages/shared/src/constants/dailyQuestions.ts';
const { getQuestionByDate } = dailyQuestions;
import contentFilter from '../../packages/shared/src/lib/contentFilter.ts';
const { containsObjectionableContent } = contentFilter;

// Dedicated synthetic authors; never use a real user's device ID.
const DEFAULT_AUTHORS = {
  REVIEW_ANSWER_DEVICE_ID: '17418a2f-4190-4543-8446-822c6a6f796e',
  REVIEW_REPLY_DEVICE_ID: '1aed86bc-646e-4c40-a145-c4dbdbe5e11a',
};

function validateText(value, limit) {
  if (typeof value !== 'string' || !value.trim()) throw new Error('AI returned empty content');
  const body = value.trim();
  if (Array.from(body).length > limit || containsObjectionableContent(body)) throw new Error('AI content failed length or safety validation');
  return body;
}

export { COMMUNITY_EXAMPLE_PROMPT };

export async function generateExample(question, existingAnswer, env = required, request = fetch, context) {
  let lastError;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await request('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env('OPENAI_API_KEY')}`, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(45_000),
        body: JSON.stringify({
          model: 'gpt-5.4-mini',
          response_format: { type: 'json_object' },
          max_completion_tokens: 400,
          messages: [
            { role: 'system', content: COMMUNITY_EXAMPLE_PROMPT },
            { role: 'user', content: JSON.stringify({ question, ...(existingAnswer ? { existingAnswer } : {}), ...(context ? { variation: context } : {}) }) },
          ],
        }),
      });
      if (!response.ok) throw new Error(`AI request failed (${response.status})`);
      const data = await response.json();
      const choice = data.choices?.[0];
      if (choice?.finish_reason !== 'stop' || choice.message?.refusal) throw new Error('AI did not return a complete example');
      const generated = JSON.parse(choice.message.content);
      return {
        answer: validateText(generated.answer, 120),
        reply: validateText(generated.reply, 100),
      };
    } catch (error) {
      // Never log model responses, headers or arbitrary API error bodies.
      lastError = error;
      if (attempt === 0) continue;
    }
  }
  throw new Error(lastError?.message?.startsWith('AI request failed (') ? lastError.message : 'AI generation or validation failed after two attempts');
}

export async function seedSingleAuthor(db = database, env = required, generate = generateExample, now = new Date(), dryRun = false, includeReply = true, zodiacSign = 'aries') {
  const author = name => {
    try { return env(name); } catch { return DEFAULT_AUTHORS[name]; }
  };
  const answerDevice = author('REVIEW_ANSWER_DEVICE_ID');
  const replyDevice = author('REVIEW_REPLY_DEVICE_ID');
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuid.test(answerDevice) || !uuid.test(replyDevice) || answerDevice === replyDevice) throw new Error('Two distinct review device UUIDs are required');
  const today = new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const dates = await db('horoscopes?select=date&order=date.desc&limit=1');
  // Prepare today before the crawler; also cover the date currently visible in the app.
  const targets = [...new Set([today, dates?.[0]?.date].filter(Boolean))];
  if (targets.some(date => !/^\d{4}-\d{2}-\d{2}$/.test(date))) throw new Error('Invalid broadcast date');
  const bans = await db(`community_bans?select=device_id&device_id=in.(${answerDevice},${replyDevice})`);
  if (bans.length) throw new Error('Review author is banned; moderation must not be overridden');
  const prefer = 'resolution=ignore-duplicates,return=minimal';
  for (const date of targets) {
    const answerRoute = `question_answers?select=id,body,hidden_at&question_date=eq.${date}&device_id=eq.${answerDevice}&limit=1`;
    let [answer] = await db(answerRoute);
    if (answer?.hidden_at) throw new Error('Review answer is hidden; do not restore automatically');
    if (answer && !includeReply) continue;
    if (answer) {
      const [reply] = await db(`question_answer_replies?select=id,hidden_at&answer_id=eq.${answer.id}&device_id=eq.${replyDevice}&limit=1`);
      if (reply?.hidden_at) throw new Error('Review reply is hidden; do not restore automatically');
      if (reply) continue; // No AI cost and no writes on repeated runs.
    }
    const generated = await generate(getQuestionByDate(date), answer?.body, env);
    // Revalidate injectable/generated text before any write; server filter also applies.
    generated.answer = validateText(generated.answer, 120);
    generated.reply = validateText(generated.reply, 100);
    if (dryRun) continue;
    if (!answer) {
      await db('question_answers?on_conflict=question_date,device_id', {
        method: 'POST', prefer,
        body: { question_date: date, device_id: answerDevice, zodiac_sign: zodiacSign, body: generated.answer },
      });
      [answer] = await db(answerRoute);
      if (!answer || answer.hidden_at) throw new Error('Review answer is unavailable or hidden; do not restore automatically');
      // A concurrent insertion must not receive a reply generated for different text.
      if (answer.body !== generated.answer) throw new Error('Answer changed during insertion; retry to generate a matching reply');
    }
    if (!includeReply) continue;
    await db('question_answer_replies?on_conflict=answer_id,device_id', {
      method: 'POST', prefer,
      body: { answer_id: answer.id, device_id: replyDevice, zodiac_sign: 'taurus', body: generated.reply },
    });
  }
  return targets.join(', ');
}
const STYLES = ['짧고 담백한 해요체', '가벼운 농담이 섞인 반말', '짧은 혼잣말', '행동 하나가 보이는 일상 이야기', '꾸밈없는 솔직한 감상', '편안한 해요체 수다', '이유가 짧게 붙은 취향', '부담 없는 작은 바람', '조금 망설이는 반말', '차분하고 짧은 해요체'];
const SIGNS = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn'];

export async function seedReviewContent(db = database, env = required, generate = generateExample, now = new Date(), dryRun = false) {
  let base;
  try { base = env('REVIEW_ANSWER_DEVICE_ID'); } catch { base = DEFAULT_AUTHORS.REVIEW_ANSWER_DEVICE_ID; }
  const seen = new Map();
  const seenReplies = new Set();
  let dates;
  for (let slot = 0; slot < 10; slot++) {
    // Keep the original author and use stable UUIDs so reruns and blocking remain effective.
    const hash = createHash('sha256').update(`community-answer:${base}:${slot}`).digest('hex');
    const device = slot === 0 ? base : `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
    const slotEnv = name => name === 'REVIEW_ANSWER_DEVICE_ID' ? device : env(name);
    const slotDb = async (route, options) => {
      const result = await db(route, options);
      if (!options && route.startsWith('question_answers?')) {
        const date = route.match(/question_date=eq\.([^&]+)/)?.[1];
        for (const row of result) if (row.body) seen.set(`${date}:${row.body}`, row.body);
      }
      return result;
    };
    const slotGenerate = async (question, existingAnswer, config) => {
      for (let attempt = 0; attempt < 3; attempt++) {
        const value = await generate(question, existingAnswer, config, undefined, { style: STYLES[slot], avoidRepeating: [...seen.values()], avoidRepeatingReplies: [...seenReplies] });
        if (existingAnswer || ![...seen.values()].includes(value.answer)) {
          seen.set(`generated:${slot}:${question}`, value.answer);
          seenReplies.add(value.reply);
          return value;
        }
      }
      throw new Error('AI returned duplicate answers after three attempts');
    };
    dates = await seedSingleAuthor(slotDb, slotEnv, slotGenerate, now, dryRun, slot === 0, SIGNS[slot]);
  }
  return dates;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { console.log(`AI examples prepared for ${await seedReviewContent(database, required, generateExample, new Date(), process.env.DRY_RUN === 'true')}`); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
