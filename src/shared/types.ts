export type PollQuestion = {
  name: string;
  question: string;
  optional?: boolean;
  multiselect?: boolean;
  options: string[];
};

export type AnswerValue = {
  selectedOptions?: string[];
  text?: string;
};

export type AnswerMap = Record<string, AnswerValue>;

export type PollRecord = {
  id: string;
  userId: string;
  pollId: string;
  adminHash: string;
  name: string;
  details: string;
  questions: PollQuestion[];
  active: boolean;
};

export type AnswerStatus = 'draft' | 'submitted';