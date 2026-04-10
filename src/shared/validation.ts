import { errorCodes } from './errorCodes';
import { hasTextOption } from './questionFormat';
import type { AnswerMap, PollQuestion } from './types';

export type ValidationResult = { ok: true } | { ok: false; errors: string[] };

export function validatePollInput(input: {
  name: string;
  details: string;
  questions: PollQuestion[];
}): ValidationResult {
  const errors: string[] = [];
  if (!input.name.trim()) errors.push(errorCodes.POLL_NAME_REQUIRED);
  if (!input.details.trim()) errors.push(errorCodes.POLL_DETAILS_REQUIRED);
  if (input.questions.length === 0) errors.push(errorCodes.QUESTIONS_REQUIRED);

  input.questions.forEach((question) => {
    if (!question.name.trim()) errors.push(errorCodes.QUESTION_NAME_REQUIRED);
    if (!question.question.trim()) errors.push(errorCodes.QUESTION_TEXT_REQUIRED);
    if (question.options.length === 0 || question.options.some((option) => !option.trim())) {
      errors.push(errorCodes.QUESTION_OPTIONS_REQUIRED);
    }
  });

  return errors.length ? { ok: false, errors } : { ok: true };
}

export function validateAnswers(input: {
  questions: PollQuestion[];
  answers: AnswerMap;
  final: boolean;
}): ValidationResult {
  const errors: string[] = [];
  if (!input.final) return { ok: true };

  input.questions.forEach((question, index) => {
    const answer = input.answers[String(index)];
    const selected = answer?.selectedOptions ?? [];
    const text = answer?.text?.trim() ?? '';
    const hasAnswer = selected.length > 0 || text.length > 0;

    if (!question.optional && !hasAnswer) errors.push(errorCodes.ANSWER_REQUIRED);
    if (!question.multiselect && selected.length > 1) errors.push(errorCodes.ANSWER_MULTIPLE_NOT_ALLOWED);
    if (text && !hasTextOption(question)) errors.push(errorCodes.ANSWER_OPTION_INVALID);

    selected.forEach((option) => {
      if (!question.options.includes(option)) errors.push(errorCodes.ANSWER_OPTION_INVALID);
    });
  });

  return errors.length ? { ok: false, errors } : { ok: true };
}