import type { PollQuestion } from './types';

export function parseQuestionFormat(source: string): PollQuestion[] {
  const questions: PollQuestion[] = [];
  let current: PollQuestion | null = null;

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith('# ') && !line.startsWith('## ')) {
      current = { name: line.slice(2).trim(), question: '', options: [] };
      questions.push(current);
      continue;
    }

    if (!current) {
      throw new Error('QUESTION_NAME_REQUIRED');
    }

    if (line.startsWith('## ')) {
      current.question = line.slice(3).trim();
      continue;
    }

    const optional = line.match(/^\[(x|X)?\]\s+optional$/);
    if (optional) {
      current.optional = optional[1]?.toLowerCase() === 'x';
      continue;
    }

    const multiselect = line.match(/^\[(x|X)?\]\s+multiselect$/);
    if (multiselect) {
      current.multiselect = multiselect[1]?.toLowerCase() === 'x';
      continue;
    }

    if (line.startsWith('- ')) {
      current.options.push(line.slice(2).trim());
      continue;
    }

    throw new Error('QUESTION_FORMAT_INVALID');
  }

  return questions.map((question) => ({
    ...question,
    optional: question.optional ?? false,
    multiselect: question.multiselect ?? false
  }));
}

export function serializeQuestionFormat(questions: PollQuestion[]): string {
  return questions
    .map((question) => {
      const lines = [
        `# ${question.name}`,
        `## ${question.question}`,
        question.optional ? '[x] optional' : '[] optional',
        question.multiselect ? '[x] multiselect' : '[] multiselect',
        ...question.options.map((option) => `- ${option}`)
      ];
      return lines.join('\n');
    })
    .join('\n\n');
}

export function hasTextOption(question: PollQuestion): boolean {
  return question.options.some((option) => option === 'text' || option === 'текст');
}
