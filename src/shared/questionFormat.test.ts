import { describe, it, expect } from 'vitest';
import { parseQuestionFormat, serializeQuestionFormat, hasTextOption } from './questionFormat';
import type { PollQuestion } from './types';

describe('parseQuestionFormat', () => {
  it('parses a simple question', () => {
    const source = `# Id
## Type your email
- text`;

    const result = parseQuestionFormat(source);
    expect(result).toEqual([
      {
        name: 'Id',
        question: 'Type your email',
        optional: false,
        multiselect: false,
        options: ['text']
      }
    ]);
  });

  it('parses multiple questions', () => {
    const source = `# Question 1
## What is your name?
- text

# Question 2  
## Choose options
[] optional
[x] multiselect
- Option A
- Option B
- text`;

    const result = parseQuestionFormat(source);
    expect(result).toEqual([
      {
        name: 'Question 1',
        question: 'What is your name?',
        optional: false,
        multiselect: false,
        options: ['text']
      },
      {
        name: 'Question 2',
        question: 'Choose options',
        optional: false,
        multiselect: true,
        options: ['Option A', 'Option B', 'text']
      }
    ]);
  });

  it('handles optional flag', () => {
    const source = `# Test
## Question
[x] optional
- A`;

    const result = parseQuestionFormat(source);
    expect(result[0].optional).toBe(true);
  });

  it('handles multiselect flag', () => {
    const source = `# Test
## Question
[x] multiselect
- A`;

    const result = parseQuestionFormat(source);
    expect(result[0].multiselect).toBe(true);
  });

  it('defaults optional and multiselect to false when not specified', () => {
    const source = `# Test
## Question
- A`;

    const result = parseQuestionFormat(source);
    expect(result[0].optional).toBe(false);
    expect(result[0].multiselect).toBe(false);
  });

  it('throws error for invalid format', () => {
    const source = `Invalid line`;
    expect(() => parseQuestionFormat(source)).toThrow('QUESTION_NAME_REQUIRED');
  });

  it('handles русский текст options', () => {
    const source = `# Имя
## Введите ваше имя
- текст`;

    const result = parseQuestionFormat(source);
    expect(result[0].options).toEqual(['текст']);
  });
});

describe('serializeQuestionFormat', () => {
  it('serializes a simple question', () => {
    const question: PollQuestion = {
      name: 'Id',
      question: 'Type your email',
      optional: false,
      multiselect: false,
      options: ['text']
    };

    const result = serializeQuestionFormat([question]);
    expect(result).toBe(`# Id
## Type your email
[] optional
[] multiselect
- text`);
  });

  it('serializes with optional and multiselect flags', () => {
    const question: PollQuestion = {
      name: 'Test',
      question: 'Question',
      optional: true,
      multiselect: true,
      options: ['A', 'B']
    };

    const result = serializeQuestionFormat([question]);
    expect(result).toBe(`# Test
## Question
[x] optional
[x] multiselect
- A
- B`);
  });

  it('serializes multiple questions', () => {
    const questions: PollQuestion[] = [
      {
        name: 'Q1',
        question: 'Question 1',
        optional: false,
        multiselect: false,
        options: ['text']
      },
      {
        name: 'Q2',
        question: 'Question 2',
        optional: true,
        multiselect: false,
        options: ['A', 'B']
      }
    ];

    const result = serializeQuestionFormat(questions);
    expect(result).toBe(`# Q1
## Question 1
[] optional
[] multiselect
- text

# Q2
## Question 2
[x] optional
[] multiselect
- A
- B`);
  });
});

describe('hasTextOption', () => {
  it('returns true for text option', () => {
    const question: PollQuestion = {
      name: 'Test',
      question: 'Question',
      optional: false,
      multiselect: false,
      options: ['A', 'text', 'B']
    };
    expect(hasTextOption(question)).toBe(true);
  });

  it('returns true for текст option', () => {
    const question: PollQuestion = {
      name: 'Test',
      question: 'Question',
      optional: false,
      multiselect: false,
      options: ['A', 'текст']
    };
    expect(hasTextOption(question)).toBe(true);
  });

  it('returns false when no text option', () => {
    const question: PollQuestion = {
      name: 'Test',
      question: 'Question',
      optional: false,
      multiselect: false,
      options: ['A', 'B']
    };
    expect(hasTextOption(question)).toBe(false);
  });
});

describe('round trip', () => {
  it('parses and serializes back to same format', () => {
    const source = `# Question 1
## What is your name?
[x] optional
[] multiselect
- text

# Question 2
## Choose options
[] optional
[x] multiselect
- Option A
- Option B
- текст`;

    const parsed = parseQuestionFormat(source);
    const serialized = serializeQuestionFormat(parsed);
    expect(serialized).toBe(source);
  });
});
