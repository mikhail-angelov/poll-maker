import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../i18n';
import { RespondPollPage } from './RespondPollPage';
import { getPublicPoll, getSession, saveDraft, submitAnswer } from '../api';

vi.mock('../api', () => ({
  getPublicPoll: vi.fn(),
  getSession: vi.fn(),
  saveDraft: vi.fn(),
  submitAnswer: vi.fn()
}));

const mockedGetSession = vi.mocked(getSession);
const mockedGetPublicPoll = vi.mocked(getPublicPoll);
const mockedSaveDraft = vi.mocked(saveDraft);
const mockedSubmitAnswer = vi.mocked(submitAnswer);

function renderPage() {
  return render(
    <I18nProvider>
      <RespondPollPage pollId="poll-1" />
    </I18nProvider>
  );
}

describe('RespondPollPage free-text options', () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: vi.fn((key: string) => storage.get(key) ?? null),
        setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
        removeItem: vi.fn((key: string) => storage.delete(key)),
        clear: vi.fn(() => storage.clear())
      }
    });
    mockedGetSession.mockResolvedValue({ userId: 'user-123456789012345' });
    mockedSaveDraft.mockResolvedValue({ success: true });
    mockedSubmitAnswer.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders a text-only question as a single input without a choice control', async () => {
    mockedGetPublicPoll.mockResolvedValue({
      id: 'poll-db-id',
      pollId: 'poll-1',
      name: 'Test poll',
      details: 'Poll details',
      active: true,
      questions: [
        {
          name: 'Q1',
          question: 'What should we know?',
          optional: false,
          multiselect: false,
          options: ['text']
        }
      ]
    });

    renderPage();

    await screen.findByText('What should we know?');

    expect(screen.getByPlaceholderText('Enter your answer...')).not.toBeNull();
    expect(screen.queryByRole('radio')).toBeNull();
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('selects the free-text radio option when typing into mixed options', async () => {
    mockedGetPublicPoll.mockResolvedValue({
      id: 'poll-db-id',
      pollId: 'poll-1',
      name: 'Test poll',
      details: 'Poll details',
      active: true,
      questions: [
        {
          name: 'Q1',
          question: 'Pick one',
          optional: false,
          multiselect: false,
          options: ['A', 'text']
        }
      ]
    });

    renderPage();

    await screen.findByText('Pick one');

    const textRadio = screen.getAllByRole('radio')[1] as HTMLInputElement;
    expect(textRadio.checked).toBe(false);

    fireEvent.input(screen.getByPlaceholderText('Enter your answer...'), {
      target: { value: 'Custom answer' }
    });

    await waitFor(() => expect(textRadio.checked).toBe(true));
  });
});
