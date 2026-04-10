import { useState, useEffect } from 'preact/hooks';
import { useI18n } from '../i18n';
import { getPublicPoll, getSession, saveDraft, submitAnswer } from '../api';
import type { PollQuestion, AnswerMap } from '../../shared/types';
import { hasTextOption } from '../../shared/questionFormat';

interface RespondPollPageProps {
  pollId: string;
}

export function RespondPollPage({ pollId }: RespondPollPageProps) {
  const { t } = useI18n();
  const [poll, setPoll] = useState<{ name: string; details: string; questions: PollQuestion[] } | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadPoll();
  }, [pollId]);

  const loadPoll = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get session
      const session = await getSession();
      setUserId(session.userId);

      // Get poll data
      const pollData = await getPublicPoll(pollId);
      setPoll({
        name: pollData.name,
        details: pollData.details,
        questions: pollData.questions
      });

      // Load draft from localStorage
      const draftKey = `poll-maker-draft:${pollId}:${session.userId}`;
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        const draft = JSON.parse(savedDraft);
        setCurrentIndex(draft.currentIndex || 0);
        setAnswers(draft.answers || {});
      }
    } catch (err) {
      console.error('Error loading poll:', err);
      setError('Failed to load poll');
    } finally {
      setLoading(false);
    }
  };

  const saveDraftToStorage = () => {
    if (!pollId || !userId) return;
    const draftKey = `poll-maker-draft:${pollId}:${userId}`;
    localStorage.setItem(draftKey, JSON.stringify({
      currentIndex,
      answers
    }));
  };

  const saveDraftToServer = async () => {
    if (!pollId) return;
    try {
      await saveDraft(pollId, {
        answers,
        time: new Date().toISOString()
      });
    } catch (err) {
      console.error('Error saving draft:', err);
    }
  };

  const handleAnswerChange = (questionIndex: number, option: string, checked: boolean) => {
    const question = poll?.questions[questionIndex];
    if (!question) return;

    const currentAnswer = answers[String(questionIndex)] || { selectedOptions: [] };
    let selectedOptions = [...(currentAnswer.selectedOptions || [])];

    if (question.multiselect) {
      if (checked) {
        selectedOptions.push(option);
      } else {
        selectedOptions = selectedOptions.filter(o => o !== option);
      }
    } else {
      selectedOptions = checked ? [option] : [];
    }

    const newAnswers = {
      ...answers,
      [String(questionIndex)]: {
        ...currentAnswer,
        selectedOptions
      }
    };

    setAnswers(newAnswers);
    saveDraftToStorage();
  };

  const handleTextChange = (questionIndex: number, text: string) => {
    const currentAnswer = answers[String(questionIndex)] || {};
    const newAnswers = {
      ...answers,
      [String(questionIndex)]: {
        ...currentAnswer,
        text
      }
    };

    setAnswers(newAnswers);
    saveDraftToStorage();
  };

  const handleNext = () => {
    if (currentIndex < (poll?.questions.length || 0) - 1) {
      setCurrentIndex(currentIndex + 1);
      saveDraftToServer();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      saveDraftToServer();
    }
  };

  const handleSubmit = async () => {
    if (!pollId) return;

    setIsSubmitting(true);
    try {
      await submitAnswer(pollId, {
        answers,
        time: new Date().toISOString()
      });
      
      // Clear draft from localStorage
      const draftKey = `poll-maker-draft:${pollId}:${userId}`;
      localStorage.removeItem(draftKey);
      
      setSubmitted(true);
    } catch (err) {
      console.error('Error submitting answer:', err);
      setError('Failed to submit answer');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-moss mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading poll...</p>
        </div>
      </div>
    );
  }

  if (error || !poll) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-8 rounded-lg text-center">
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p>{error || 'Poll not found'}</p>
          <button
            onClick={loadPoll}
            className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (submitted) {
    const answeredCount = Object.values(answers).filter(
      answer => (answer.selectedOptions?.length || 0) > 0 || (answer.text?.trim() || '').length > 0
    ).length;

    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <div className="text-4xl mb-4">🎉</div>
        <h1 className="text-3xl font-bold text-ink mb-4">{t('respond.thanks')}</h1>
        <p className="text-gray-600 mb-8">
          You answered {answeredCount} out of {poll.questions.length} questions in "{poll.name}"
        </p>
        <button
          onClick={() => window.location.href = '/'}
          className="px-6 py-3 bg-moss text-white rounded-lg font-medium hover:bg-moss/90"
        >
          Create Your Own Poll
        </button>
      </div>
    );
  }

  const currentQuestion = poll.questions[currentIndex];
  const currentAnswer = answers[String(currentIndex)] || {};
  const hasText = hasTextOption(currentQuestion);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-ink mb-2">{poll.name}</h1>
        <p className="text-gray-600 whitespace-pre-wrap">{poll.details}</p>
      </div>

      {/* Progress */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            {t('respond.question')} {currentIndex + 1} {t('respond.of')} {poll.questions.length}
          </span>
          <span className="text-sm text-gray-500">
            {Object.values(answers).filter(a => (a.selectedOptions?.length || 0) > 0 || (a.text?.trim() || '').length > 0).length} answered
          </span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-moss transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / poll.questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Current Question */}
      <div className="bg-white rounded-xl border shadow-sm p-6 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-xl font-bold text-ink">{currentQuestion.name}</h2>
          {currentQuestion.optional && (
            <span className="text-sm text-gray-500">{t('respond.optional')}</span>
          )}
        </div>
        
        <p className="text-gray-700 mb-6">{currentQuestion.question}</p>

        {/* Options */}
        <div className="space-y-3">
          {currentQuestion.options.map((option, optionIndex) => {
            const isSelected = currentAnswer.selectedOptions?.includes(option) || false;
            const isTextOption = option === 'text' || option === 'текст';

            return (
              <div key={optionIndex} className="flex items-start gap-3">
                {currentQuestion.multiselect ? (
                  <input
                    type="checkbox"
                    id={`option-${optionIndex}`}
                    checked={isSelected}
                    onChange={(e) => handleAnswerChange(currentIndex, option, (e.target as HTMLInputElement).checked)}
                    className="mt-1 h-5 w-5 rounded border-gray-300 text-moss focus:ring-moss"
                  />
                ) : (
                  <input
                    type="radio"
                    id={`option-${optionIndex}`}
                    name={`question-${currentIndex}`}
                    checked={isSelected}
                    onChange={(e) => handleAnswerChange(currentIndex, option, (e.target as HTMLInputElement).checked)}
                    className="mt-1 h-5 w-5 border-gray-300 text-moss focus:ring-moss"
                  />
                )}
                <label
                  htmlFor={`option-${optionIndex}`}
                  className="flex-1 cursor-pointer"
                >
                  <div className="font-medium">{option}</div>
                  {isTextOption && isSelected && (
                    <div className="mt-2">
                      <textarea
                        value={currentAnswer.text || ''}
                        onChange={(e) => handleTextChange(currentIndex, (e.target as HTMLTextAreaElement).value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-moss focus:border-transparent"
                        placeholder="Enter your answer..."
                        rows={3}
                      />
                    </div>
                  )}
                </label>
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t('respond.prev')}
        </button>

        {currentIndex === poll.questions.length - 1 ? (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-3 bg-moss text-white rounded-lg font-medium hover:bg-moss/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Submitting...' : t('respond.submit')}
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="px-6 py-3 bg-moss text-white rounded-lg font-medium hover:bg-moss/90"
          >
            {t('respond.next')}
          </button>
        )}
      </div>
    </div>
  );
}