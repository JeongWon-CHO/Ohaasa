
import {
  EMOTION_QUESTIONS,
  FUTURE_QUESTIONS,
  IMAGINATION_QUESTIONS,
  LIGHT_QUESTIONS,
  RELATIONSHIP_QUESTIONS,
  REVIEW_QUESTIONS,
  SELF_QUESTIONS,
} from './daily-questions';

export {
  EMOTION_QUESTIONS,
  FUTURE_QUESTIONS,
  IMAGINATION_QUESTIONS,
  LIGHT_QUESTIONS,
  RELATIONSHIP_QUESTIONS,
  REVIEW_QUESTIONS,
  SELF_QUESTIONS,
} from './daily-questions';

const QUESTION_CATEGORIES: readonly string[][] = [
  LIGHT_QUESTIONS,
  EMOTION_QUESTIONS,
  RELATIONSHIP_QUESTIONS,
  SELF_QUESTIONS,
  FUTURE_QUESTIONS,
  IMAGINATION_QUESTIONS,
  REVIEW_QUESTIONS,
];

const MILLISECONDS_PER_DAY = 86_400_000;
const QUESTION_ROTATION_START = Date.UTC(2026, 0, 1);

function rotationDayIndex(date: string): number {
  const [year, month, day] = date.split('-').map(Number);
  const current = Date.UTC(year, month - 1, day);
  return Math.floor((current - QUESTION_ROTATION_START) / MILLISECONDS_PER_DAY);
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

export function getQuestionByDate(date: string): string {
  const dayIndex = rotationDayIndex(date);
  const categoryIndex = positiveModulo(dayIndex, QUESTION_CATEGORIES.length);
  const questionIndex = Math.floor(dayIndex / QUESTION_CATEGORIES.length);
  const category = QUESTION_CATEGORIES[categoryIndex];

  return category[positiveModulo(questionIndex, category.length)];
}
