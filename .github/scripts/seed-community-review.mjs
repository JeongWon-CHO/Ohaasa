import { database, required } from './community-api.mjs';

export async function seedReviewContent(db = database, env = required) {
  const answerDevice = env('REVIEW_ANSWER_DEVICE_ID');
  const replyDevice = env('REVIEW_REPLY_DEVICE_ID');
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuid.test(answerDevice) || !uuid.test(replyDevice) || answerDevice === replyDevice) throw new Error('Two distinct review device UUIDs are required');
  // Matches the app's HoroscopeDateProvider latest broadcast date, including weekends.
  const dates = await db('horoscopes?select=date&order=date.desc&limit=1');
  if (!dates?.[0]?.date) throw new Error('No broadcast date available; retry after the crawler');
  const date = dates[0].date;
  const bans = await db(`community_bans?select=device_id&device_id=in.(${answerDevice},${replyDevice})`);
  if (bans.length) throw new Error('Review author is banned; moderation must not be overridden');
  const prefer = 'resolution=ignore-duplicates,return=minimal';
  await db('question_answers?on_conflict=question_date,device_id', {
    method: 'POST', prefer,
    body: { question_date: date, device_id: answerDevice, zodiac_sign: 'aries', body: '[사용 예시] 오늘의 질문에는 이렇게 나의 생각을 짧게 남길 수 있어요. 오른쪽 위 더보기에서 신고하거나 작성자를 차단할 수 있어요.' },
  });
  const answers = await db(`question_answers?select=id,hidden_at&question_date=eq.${encodeURIComponent(date)}&device_id=eq.${answerDevice}&limit=1`);
  if (!answers?.[0] || answers[0].hidden_at) throw new Error('Review answer is unavailable or hidden; do not restore automatically');
  await db('question_answer_replies?on_conflict=answer_id,device_id', {
    method: 'POST', prefer,
    body: { answer_id: answers[0].id, device_id: replyDevice, zodiac_sign: 'taurus', body: '[댓글 사용 예시] 다른 사람의 답변에는 이렇게 댓글을 남길 수 있어요. 댓글의 더보기에서도 신고와 작성자 차단이 가능해요.' },
  });
  return date;
}
if (import.meta.url === `file://${process.argv[1]}`) {
  try { console.log(`Review examples prepared for ${await seedReviewContent()}`); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
