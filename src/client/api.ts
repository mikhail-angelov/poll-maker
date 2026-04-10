import type { PollQuestion, AnswerMap, PollRecord } from '../shared/types';

export interface SessionResponse {
  userId: string;
}

export interface CreatePollRequest {
  name: string;
  details: string;
  questions: string;
}

export interface CreatePollResponse {
  pollId: string;
  adminHash: string;
  publicUrl: string;
  adminUrl: string;
}

export interface PublicPollResponse {
  id: string;
  pollId: string;
  name: string;
  details: string;
  questions: PollQuestion[];
  active: boolean;
}

export interface AdminPollResponse {
  poll: PublicPollResponse;
  summary: {
    questionCount: number;
    submittedCount: number;
  };
  results: Array<{
    time: string;
    user_info: string;
    answered_questions: number;
    answers: string;
  }>;
}

export interface UpdatePollRequest {
  name?: string;
  details?: string;
  questions?: string;
  active?: boolean;
}

export interface AnswerRequest {
  answers: AnswerMap;
  time: string;
}

export interface ErrorResponse {
  errors: string[];
}

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ errors: ['Unknown error'] }));
    throw new Error(JSON.stringify(errorData));
  }

  return response.json();
}

async function adminApiRequest<T>(endpoint: string, adminHash: string, options: RequestInit = {}): Promise<T> {
  return apiRequest<T>(endpoint, {
    ...options,
    headers: {
      'X-Poll-Admin-Hash': adminHash,
      ...options.headers,
    },
  });
}

export async function getSession(): Promise<SessionResponse> {
  return apiRequest<SessionResponse>('/session');
}

export async function createPoll(data: CreatePollRequest): Promise<CreatePollResponse> {
  return apiRequest<CreatePollResponse>('/polls', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getPublicPoll(pollId: string): Promise<PublicPollResponse> {
  return apiRequest<PublicPollResponse>(`/polls/${pollId}`);
}

export async function getAdminPoll(adminHash: string): Promise<AdminPollResponse> {
  return adminApiRequest<AdminPollResponse>('/admin/poll', adminHash);
}

export async function updateAdminPoll(adminHash: string, data: UpdatePollRequest): Promise<{ success: boolean }> {
  return adminApiRequest<{ success: boolean }>('/admin/poll', adminHash, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function saveDraft(pollId: string, data: AnswerRequest): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/polls/${pollId}/answers/draft`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function submitAnswer(pollId: string, data: AnswerRequest): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/polls/${pollId}/answers/submit`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function csvUrl(adminHash: string): string {
  return `/api/admin/poll/results.csv`;
}