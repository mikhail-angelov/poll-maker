import { useState, useEffect } from 'preact/hooks';
import { useI18n } from '../i18n';
import { getPublicPoll, getSession, saveDraft, submitAnswer } from '../api';
import type { PollQuestion, AnswerMap } from '../../shared/types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { NeonChip } from '../components/NeonChip';
import { CARD_SHADOW } from '../styles';

interface RespondPollPageProps {
  pollId: string;
}

function isTextOption(option: string) {
  return option === 'text' || option === 'текст';
}

const SINGLE_SELECT_ACCENTS = ['#5B3DF5', '#FFB78A', '#FF7AB6', '#C6F24B'];

export function RespondPollPage({ pollId }: RespondPollPageProps) {
  const { t } = useI18n();
  const [poll, setPoll] = useState<{ name: string; details: string; questions: PollQuestion[] } | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [started, setStarted] = useState(false);
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
      const [session, pollData] = await Promise.all([getSession(), getPublicPoll(pollId)]);
      setUserId(session.userId);
      setPoll({ name: pollData.name, details: pollData.details, questions: pollData.questions });

      const draftKey = `poll-maker-draft:${pollId}:${session.userId}`;
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        const draft = JSON.parse(savedDraft);
        setCurrentIndex(draft.currentIndex || 0);
        setAnswers(draft.answers || {});
        if (draft.currentIndex > 0) setStarted(true);
      }
    } catch (err) {
      console.error('Error loading poll:', err);
      setError('Failed to load poll');
    } finally {
      setLoading(false);
    }
  };

  const saveDraftToStorage = (nextAnswers: AnswerMap, nextIndex: number) => {
    if (!pollId || !userId) return;
    const draftKey = `poll-maker-draft:${pollId}:${userId}`;
    localStorage.setItem(draftKey, JSON.stringify({ currentIndex: nextIndex, answers: nextAnswers }));
  };

  const saveDraftToServer = async () => {
    if (!pollId) return;
    try { await saveDraft(pollId, { answers, time: new Date().toISOString() }); } catch {}
  };

  const handleAnswerChange = (questionIndex: number, option: string, checked: boolean) => {
    const question = poll?.questions[questionIndex];
    if (!question) return;
    const currentAnswer = answers[String(questionIndex)] || { selectedOptions: [] };
    let selectedOptions = [...(currentAnswer.selectedOptions || [])];
    if (question.multiselect) {
      selectedOptions = checked ? [...selectedOptions, option] : selectedOptions.filter(o => o !== option);
    } else {
      selectedOptions = checked ? [option] : [];
    }
    const next = { ...answers, [String(questionIndex)]: { ...currentAnswer, selectedOptions } };
    setAnswers(next);
    saveDraftToStorage(next, currentIndex);
  };

  const handleTextChange = (questionIndex: number, text: string, textOption?: string) => {
    const question = poll?.questions[questionIndex];
    const currentAnswer = answers[String(questionIndex)] || {};
    let selectedOptions = currentAnswer.selectedOptions;
    if (question && textOption) {
      const others = (currentAnswer.selectedOptions || []).filter(o => o !== textOption);
      selectedOptions = text.trim()
        ? (question.multiselect ? [...others, textOption] : [textOption])
        : others;
    }
    const next = { ...answers, [String(questionIndex)]: { ...currentAnswer, selectedOptions, text } };
    setAnswers(next);
    saveDraftToStorage(next, currentIndex);
  };

  const handleNext = () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < (poll?.questions.length || 0)) {
      setCurrentIndex(nextIndex);
      saveDraftToStorage(answers, nextIndex);
      saveDraftToServer();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      const nextIndex = currentIndex - 1;
      setCurrentIndex(nextIndex);
      saveDraftToStorage(answers, nextIndex);
      saveDraftToServer();
    }
  };

  const handleSubmit = async () => {
    if (!pollId) return;
    setIsSubmitting(true);
    try {
      await submitAnswer(pollId, { answers, time: new Date().toISOString() });
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
    return <LoadingSpinner label="Loading…" className="max-w-xl mx-auto pt-12" />;
  }

  if (error || !poll) {
    return (
      <div className="max-w-xl mx-auto pt-8">
        <div className="p-8 rounded-[28px] bg-white text-center" style={{ boxShadow: CARD_SHADOW }}>
          <h2 className="text-xl font-bold mb-2" style={{ color: '#1A1033' }}>Error</h2>
          <p style={{ color: '#4E4669' }}>{error || 'Poll not found'}</p>
          <button onClick={loadPoll}
                  className="mt-4 px-5 py-2.5 rounded-full text-white text-sm font-bold transition hover:brightness-110"
                  style={{ background: '#5B3DF5' }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const answeredCount = Object.values(answers).filter(
    a => (a.selectedOptions?.length || 0) > 0 || (a.text?.trim() || '').length > 0
  ).length;

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto">
        <div className="mt-5 p-8 rounded-[36px] bg-white flex flex-col items-start gap-4" style={{ boxShadow: CARD_SHADOW }}>
          <div className="w-[72px] h-[72px] rounded-full p-1"
               style={{ background: 'conic-gradient(from 0deg, #5B3DF5, #FFB78A, #C6F24B, #FF7AB6, #5B3DF5)', animation: 'neonSpin 6s linear infinite' }}>
            <div className="w-full h-full rounded-full bg-white grid place-items-center text-3xl">✨</div>
          </div>
          <h1 className="m-0 text-[36px] leading-tight font-normal tracking-tight"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
            {t('respond.thanks')}<span style={{ color: '#5B3DF5' }}>.</span>
          </h1>
          <p className="m-0 text-base leading-relaxed" style={{ color: '#4E4669' }}>
            You answered {answeredCount} of {poll.questions.length} questions in "{poll.name}"
          </p>
          <button onClick={() => (window.location.href = '/')}
                  className="mt-2 px-5 py-3.5 rounded-full text-white text-[15px] font-bold transition hover:brightness-110"
                  style={{ background: '#1A1033' }}>
            Create your own poll →
          </button>
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="max-w-xl mx-auto">
        <div className="mt-5 p-7 rounded-[36px] bg-white flex flex-col gap-4" style={{ boxShadow: CARD_SHADOW }}>
          <div className="self-start inline-flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-full text-xs font-bold tracking-wider"
               style={{ background: '#C6F24B', color: '#1A1033' }}>
            <span className="w-2 h-2 rounded-full" style={{ background: '#1A1033' }} />
            YOU ARE INVITED
          </div>
          <h1 className="m-0 text-[42px] leading-none font-normal tracking-tight"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
            {poll.name}<span style={{ color: '#5B3DF5' }}>.</span>
          </h1>
          <p className="m-0 text-[17px] leading-relaxed" style={{ color: '#4E4669' }}>{poll.details}</p>
          <div className="flex gap-2.5 flex-wrap pt-1">
            <NeonChip>{poll.questions.length} question{poll.questions.length !== 1 ? 's' : ''}</NeonChip>
            <NeonChip>About 1 min</NeonChip>
          </div>
          <button onClick={() => setStarted(true)}
                  className="mt-2 px-6 py-4 rounded-full text-white text-[17px] font-bold flex items-center justify-between transition-all hover:brightness-110 active:scale-[0.99]"
                  style={{ background: '#5B3DF5' }}>
            <span>Begin</span>
            <span className="w-8 h-8 rounded-full grid place-items-center font-black text-lg"
                  style={{ background: '#C6F24B', color: '#1A1033' }}>→</span>
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = poll.questions[currentIndex];
  const currentAnswer = answers[String(currentIndex)] || {};
  const onlyTextOption = currentQuestion.options.length === 1 && isTextOption(currentQuestion.options[0]);
  const isLast = currentIndex === poll.questions.length - 1;

  const currentAnswered = onlyTextOption
    ? !!(currentAnswer.text?.trim())
    : (currentAnswer.selectedOptions?.length || 0) > 0;
  const canAdvance = currentQuestion.optional ? true : currentAnswered;

  return (
    <div className="max-w-xl mx-auto">
      <div className="pt-5 flex items-center gap-3">
        <div className="px-3 py-1.5 rounded-full text-white text-xs font-bold" style={{ background: '#1A1033' }}>
          {currentIndex + 1}<span className="opacity-50 mx-1">/</span>{poll.questions.length}
        </div>
        <div className="flex-1 flex gap-1.5 items-center">
          {poll.questions.map((_, i) => (
            <div key={i} className="h-2 rounded-full transition-all"
                 style={{
                   flex: i === currentIndex ? 2 : 1,
                   background: i < currentIndex ? '#3821B0' : i === currentIndex ? '#5B3DF5' : 'rgba(91,61,245,0.16)',
                 }} />
          ))}
        </div>
        <span className="text-xs font-medium" style={{ color: '#4E4669' }}>{answeredCount} answered</span>
      </div>

      <div className="mt-5 p-7 rounded-[36px] bg-white" style={{ boxShadow: CARD_SHADOW }}>
        <div className="flex gap-2 mb-4 flex-wrap">
          <NeonChip bg={currentQuestion.optional ? '#EDE6FF' : '#1A1033'} color={currentQuestion.optional ? '#3821B0' : '#fff'}>
            {currentQuestion.optional ? 'Optional' : 'Required'}
          </NeonChip>
          {currentQuestion.multiselect && <NeonChip bg="#FFB78A" color="#1A1033">Choose one or more</NeonChip>}
          {!currentQuestion.multiselect && !onlyTextOption && <NeonChip bg="#C6F24B" color="#1A1033">Choose one</NeonChip>}
        </div>

        <h2 className="m-0 mb-1 text-[26px] leading-tight font-normal tracking-tight"
            style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
          {currentQuestion.question}
        </h2>
        {currentQuestion.name && (
          <p className="m-0 mb-5 text-[15px] leading-relaxed" style={{ color: '#4E4669' }}>{currentQuestion.name}</p>
        )}

        {onlyTextOption && (
          <input type="text" autoFocus
                 value={currentAnswer.text || ''}
                 onInput={(e) => handleTextChange(currentIndex, (e.target as HTMLInputElement).value)}
                 placeholder="Type your answer…"
                 className="w-full rounded-[20px] px-5 py-4 text-lg outline-none border-2 border-transparent focus:border-moss transition"
                 style={{ background: '#EDE6FF' }} />
        )}

        {!onlyTextOption && currentQuestion.multiselect && (
          <div className="flex flex-col gap-2.5">
            {currentQuestion.options.map((option, i) => {
              const isFreeText = isTextOption(option);
              const selected = currentAnswer.selectedOptions?.includes(option) || false;
              return (
                <div key={i}>
                  <button onClick={() => handleAnswerChange(currentIndex, option, !selected)}
                          className="flex items-center gap-3.5 p-3.5 rounded-[18px] text-left text-base font-medium transition-all w-full"
                          style={{ background: selected ? '#1A1033' : '#EDE6FF', color: selected ? '#fff' : '#1A1033' }}>
                    <span className="w-[26px] h-[26px] rounded-lg shrink-0 grid place-items-center"
                          style={{
                            background: selected ? '#C6F24B' : '#fff',
                            border: selected ? 'none' : '2px solid rgba(91,61,245,0.16)',
                            animation: selected ? 'neonPop .3s ease' : 'none',
                          }}>
                      {selected && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1A1033" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                    </span>
                    <span className="flex-1">{isFreeText ? 'Other' : option}</span>
                    <span className="font-mono text-[11px] opacity-50 tracking-widest">{i + 1}</span>
                  </button>
                  {isFreeText && selected && (
                    <input type="text" autoFocus
                           value={currentAnswer.text || ''}
                           onInput={(e) => handleTextChange(currentIndex, (e.target as HTMLInputElement).value, option)}
                           placeholder="Type your answer…"
                           className="mt-2 w-full rounded-[18px] px-5 py-3 text-base outline-none border-2 border-transparent focus:border-moss transition"
                           style={{ background: '#EDE6FF' }} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!onlyTextOption && !currentQuestion.multiselect && (
          <div className="flex flex-col gap-2.5">
            {currentQuestion.options.map((option, i) => {
              const isFreeText = isTextOption(option);
              const selected = currentAnswer.selectedOptions?.includes(option) || false;
              const accent = SINGLE_SELECT_ACCENTS[i % SINGLE_SELECT_ACCENTS.length];
              return (
                <div key={i}>
                  <button onClick={() => handleAnswerChange(currentIndex, option, !selected)}
                          className="flex items-center gap-3.5 px-4 py-4 rounded-[18px] text-left text-[17px] font-medium transition-all w-full"
                          style={{ background: selected ? '#fff' : '#EDE6FF', border: `2px solid ${selected ? '#1A1033' : 'transparent'}`, color: '#1A1033' }}>
                    <span className="w-7 h-7 rounded-full shrink-0 grid place-items-center font-extrabold text-[13px]"
                          style={{
                            background: selected ? accent : '#fff',
                            border: selected ? 'none' : '2px solid rgba(91,61,245,0.16)',
                            color: '#1A1033',
                            animation: selected ? 'neonPop .3s ease' : 'none',
                          }}>
                      {selected ? '✓' : String.fromCharCode(65 + i)}
                    </span>
                    <span className="flex-1">{isFreeText ? 'Other' : option}</span>
                  </button>
                  {isFreeText && selected && (
                    <input type="text" autoFocus
                           value={currentAnswer.text || ''}
                           onInput={(e) => handleTextChange(currentIndex, (e.target as HTMLInputElement).value, option)}
                           placeholder="Type your answer…"
                           className="mt-2 w-full rounded-[18px] px-5 py-3 text-base outline-none border-2 border-transparent focus:border-moss transition"
                           style={{ background: '#EDE6FF' }} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2.5 mt-5">
        <button onClick={handlePrev} disabled={currentIndex === 0}
                className="w-[52px] h-[52px] rounded-full grid place-items-center text-xl font-bold shrink-0 transition"
                style={{
                  background: currentIndex === 0 ? 'rgba(91,61,245,0.08)' : '#fff',
                  color: currentIndex === 0 ? '#8C84A6' : '#1A1033',
                  boxShadow: currentIndex === 0 ? 'none' : '0 2px 6px rgba(26,16,51,0.08)',
                }}>←</button>
        <button onClick={isLast ? handleSubmit : handleNext}
                disabled={!canAdvance || isSubmitting}
                className="flex-1 h-[52px] rounded-full text-white text-base font-bold flex items-center justify-center gap-2.5 transition hover:brightness-110 active:scale-[0.99] disabled:hover:brightness-100"
                style={{ background: canAdvance ? '#5B3DF5' : 'rgba(91,61,245,0.3)' }}>
          {isSubmitting ? 'Submitting…' : isLast ? t('respond.submit') : t('respond.next')}
          <span className="w-7 h-7 rounded-full grid place-items-center font-black text-[15px]"
                style={{ background: '#C6F24B', color: '#1A1033' }}>→</span>
        </button>
      </div>
    </div>
  );
}
