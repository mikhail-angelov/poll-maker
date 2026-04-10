import { describe, it, expect } from 'vitest';
import { validatePollInput, validateAnswers } from './validation';
import type { PollQuestion, AnswerMap } from './types';

describe('validatePollInput', () => {
  it('validates correct poll input', () => {
    const input = {
      name: 'Test Poll',
      details: 'Test details',
      questions: [
        {
          name: 'Q1',
          question: 'Question 1',
          optional: false,
          multiselect: false,
          options: ['A', 'B']
        }
      ]
    };

    const result = validatePollInput(input);
    expect(result.ok).toBe(true);
  });

  it('rejects empty poll name', () => {
    const input = {
      name: '   ',
      details: 'Test details',
      questions: [
        {
          name: 'Q1',
          question: 'Question 1',
          options: ['A']
        }
      ]
    };

    const result = validatePollInput(input);
    expect(result.ok).toBe(false);
    expect((result as any).errors).toContain('POLL_NAME_REQUIRED');
  });

  it('rejects empty poll details', () => {
    const input = {
      name: 'Test Poll',
      details: '',
      questions: [
        {
          name: 'Q1',
          question: 'Question 1',
          options: ['A']
        }
      ]
    };

    const result = validatePollInput(input);
    expect(result.ok).toBe(false);
    expect((result as any).errors).toContain('POLL_DETAILS_REQUIRED');
  });

  it('rejects empty questions array', () => {
    const input = {
      name: 'Test Poll',
      details: 'Test details',
      questions: []
    };

    const result = validatePollInput(input);
    expect(result.ok).toBe(false);
    expect((result as any).errors).toContain('QUESTIONS_REQUIRED');
  });

  it('rejects question with empty name', () => {
    const input = {
      name: 'Test Poll',
      details: 'Test details',
      questions: [
        {
          name: '',
          question: 'Question 1',
          options: ['A']
        }
      ]
    };

    const result = validatePollInput(input);
    expect(result.ok).toBe(false);
    expect((result as any).errors).toContain('QUESTION_NAME_REQUIRED');
  });

  it('rejects question with empty question text', () => {
    const input = {
      name: 'Test Poll',
      details: 'Test details',
      questions: [
        {
          name: 'Q1',
          question: '   ',
          options: ['A']
        }
      ]
    };

    const result = validatePollInput(input);
    expect(result.ok).toBe(false);
    expect((result as any).errors).toContain('QUESTION_TEXT_REQUIRED');
  });

  it('rejects question with empty options', () => {
    const input = {
      name: 'Test Poll',
      details: 'Test details',
      questions: [
        {
          name: 'Q1',
          question: 'Question 1',
          options: []
        }
      ]
    };

    const result = validatePollInput(input);
    expect(result.ok).toBe(false);
    expect((result as any).errors).toContain('QUESTION_OPTIONS_REQUIRED');
  });

  it('rejects question with empty option strings', () => {
    const input = {
      name: 'Test Poll',
      details: 'Test details',
      questions: [
        {
          name: 'Q1',
          question: 'Question 1',
          options: ['A', '']
        }
      ]
    };

    const result = validatePollInput(input);
    expect(result.ok).toBe(false);
    expect((result as any).errors).toContain('QUESTION_OPTIONS_REQUIRED');
  });
});

describe('validateAnswers', () => {
  const questions: PollQuestion[] = [
    {
      name: 'Required Question',
      question: 'This is required',
      optional: false,
      multiselect: false,
      options: ['A', 'B', 'text']
    },
    {
      name: 'Optional Question',
      question: 'This is optional',
      optional: true,
      multiselect: false,
      options: ['C', 'D']
    },
    {
      name: 'Multi-select Question',
      question: 'Choose multiple',
      optional: false,
      multiselect: true,
      options: ['E', 'F']
    }
  ];

  it('allows incomplete answers for draft', () => {
    const answers: AnswerMap = {
      '0': { selectedOptions: ['A'] },
      '1': {}, // optional question can be empty
      '2': {} // required but draft
    };

    const result = validateAnswers({ questions, answers, final: false });
    expect(result.ok).toBe(true);
  });

  it('requires answers for non-optional questions on final submit', () => {
    const answers: AnswerMap = {
      '0': {}, // required but empty
      '1': {}, // optional is fine
      '2': { selectedOptions: ['E'] }
    };

    const result = validateAnswers({ questions, answers, final: true });
    expect(result.ok).toBe(false);
    expect((result as any).errors).toContain('ANSWER_REQUIRED');
  });

  it('allows text answer for text option', () => {
    const answers: AnswerMap = {
      '0': { text: 'Custom answer' },
      '1': { selectedOptions: ['C'] },
      '2': { selectedOptions: ['E'] }
    };

    const result = validateAnswers({ questions, answers, final: true });
    expect(result.ok).toBe(true);
  });

  it('rejects text answer when no text option', () => {
    const answers: AnswerMap = {
      '0': { selectedOptions: ['A'] },
      '1': { text: 'Invalid text' }, // no text option in question 1
      '2': { selectedOptions: ['E'] }
    };

    const result = validateAnswers({ questions, answers, final: true });
    expect(result.ok).toBe(false);
    expect((result as any).errors).toContain('ANSWER_OPTION_INVALID');
  });

  it('rejects multiple selections for single-select question', () => {
    const answers: AnswerMap = {
      '0': { selectedOptions: ['A', 'B'] }, // multiple for single-select
      '1': { selectedOptions: ['C'] },
      '2': { selectedOptions: ['E'] }
    };

    const result = validateAnswers({ questions, answers, final: true });
    expect(result.ok).toBe(false);
    expect((result as any).errors).toContain('ANSWER_MULTIPLE_NOT_ALLOWED');
  });

  it('allows multiple selections for multi-select question', () => {
    const answers: AnswerMap = {
      '0': { selectedOptions: ['A'] },
      '1': { selectedOptions: ['C'] },
      '2': { selectedOptions: ['E', 'F'] } // multiple allowed
    };

    const result = validateAnswers({ questions, answers, final: true });
    expect(result.ok).toBe(true);
  });

  it('rejects invalid option selection', () => {
    const answers: AnswerMap = {
      '0': { selectedOptions: ['Invalid'] }, // not in options
      '1': { selectedOptions: ['C'] },
      '2': { selectedOptions: ['E'] }
    };

    const result = validateAnswers({ questions, answers, final: true });
    expect(result.ok).toBe(false);
    expect((result as any).errors).toContain('ANSWER_OPTION_INVALID');
  });

  it('considers text as valid answer for required question', () => {
    const answers: AnswerMap = {
      '0': { text: 'Some text' },
      '1': { selectedOptions: ['C'] },
      '2': { selectedOptions: ['E'] }
    };

    const result = validateAnswers({ questions, answers, final: true });
    expect(result.ok).toBe(true);
  });

  it('allows empty optional question on final submit', () => {
    const answers: AnswerMap = {
      '0': { selectedOptions: ['A'] },
      '1': {}, // optional and empty - OK
      '2': { selectedOptions: ['E'] }
    };

    const result = validateAnswers({ questions, answers, final: true });
    expect(result.ok).toBe(true);
  });
});