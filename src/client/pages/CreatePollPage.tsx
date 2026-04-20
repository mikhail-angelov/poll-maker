import { useState, useEffect } from 'preact/hooks';
import { useI18n } from '../i18n';
import { createPoll, getAdminPoll, updateAdminPoll } from '../api';
import { parseQuestionFormat, serializeQuestionFormat } from '../../shared/questionFormat';
import { validatePollInput } from '../../shared/validation';
import { MicroMDEditor } from 'micro-md-editor/preact';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorList } from '../components/ErrorList';
import { CARD_SHADOW } from '../styles';

const DEFAULT_QUESTION_TEXT = `# Id
## Type your email
- text

# Subjects
## What subjects do you have
[] optional
[x] multiselect
- Math
- Literature
- text`;

interface CreatePollPageProps {
  editPollHash?: string;
}

export function CreatePollPage({ editPollHash }: CreatePollPageProps) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [details, setDetails] = useState('');
  const [questionText, setQuestionText] = useState(DEFAULT_QUESTION_TEXT);
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editorKey, setEditorKey] = useState(0);

  useEffect(() => {
    if (editPollHash) loadPollForEdit();
  }, [editPollHash]);

  const loadPollForEdit = async () => {
    try {
      setIsLoading(true);
      const result = await getAdminPoll(editPollHash!);
      setName(result.poll.name);
      setDetails(result.poll.details);
      setQuestionText(serializeQuestionFormat(result.poll.questions));
      // Increment editorKey to force MicroMDEditor to re-mount with new initialMarkdown
      setEditorKey(prev => prev + 1);
    } catch (err) {
      console.error('Error loading poll for edit:', err);
      setErrors(['Failed to load poll data']);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setErrors([]);
    try {
      const questions = parseQuestionFormat(questionText);
      const validation = validatePollInput({ name, details, questions });
      if (!validation.ok) {
        setErrors(validation.errors);
        return;
      }
      setIsSubmitting(true);
      if (editPollHash) {
        await updateAdminPoll(editPollHash, { name, details, questions: questionText, active: true });
        window.location.href = `/admin/${editPollHash}`;
      } else {
        const result = await createPoll({ name, details, questions: questionText });
        window.location.href = result.adminUrl;
      }
    } catch (error: any) {
      console.error('Error saving poll:', error);
      // Handle both JSON errors (from server) and string errors (from parseQuestionFormat)
      try {
        const errorData = JSON.parse(error.message);
        setErrors(errorData.errors || ['INTERNAL_SERVER_ERROR']);
      } catch {
        // If it's not JSON, check if it's a known error message from parseQuestionFormat
        const message = error.message || 'INTERNAL_SERVER_ERROR';
        if (message === 'QUESTION_NAME_REQUIRED' || message === 'QUESTION_FORMAT_INVALID') {
          setErrors([message]);
        } else {
          setErrors(['INTERNAL_SERVER_ERROR']);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClear = () => {
    setName('');
    setDetails('');
    setQuestionText(DEFAULT_QUESTION_TEXT);
    setErrors([]);
  };

  if (isLoading) {
    return <LoadingSpinner label="Loading poll data…" />;
  }

  return (
    <form onSubmit={handleSubmit} className="h-full flex flex-col lg:flex-row gap-5 py-5">
      {/* On desktop it should be 2 columns, on mobile one */}
      
      <div className="flex-1 flex flex-col lg:flex-row gap-5 min-h-0">
        {/* Left column: meta + actions - full width on mobile, fixed width on desktop */}
        <div className="w-full lg:w-[320px] flex-shrink-0 flex-col gap-4 overflow-y-auto flex">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold tracking-wider self-start"
               style={{ background: '#C6F24B', color: '#1A1033' }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#1A1033' }} />
            {editPollHash ? t('create.editTitle') : t('create.title')}
          </div>

          {/* Poll name */}
          <div className="p-6 bg-white rounded-[28px]" style={{ boxShadow: CARD_SHADOW }}>
            <label className="block text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: '#5B3DF5' }}>
              {t('create.name')}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName((e.target as HTMLInputElement).value)}
              className="w-full bg-transparent border-0 border-b-2 outline-none py-1.5 text-xl font-bold transition"
              style={{ borderColor: '#C6B8F5', color: '#1A1033' }}
              placeholder="My awesome poll"
              onFocus={e => (e.target as HTMLElement).style.borderColor = '#5B3DF5'}
              onBlur={e => (e.target as HTMLElement).style.borderColor = '#C6B8F5'}
            />
          </div>

          {/* Poll details */}
          <div className="p-6 bg-white rounded-[28px]" style={{ boxShadow: CARD_SHADOW }}>
            <label className="block text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: '#5B3DF5' }}>
              {t('create.details')}
            </label>
            <textarea
              value={details}
              onChange={(e: any) => setDetails(e.target.value)}
              rows={4}
              className="w-full rounded-xl p-3 outline-none text-sm resize-none transition"
              style={{ background: '#EDE6FF', border: 'none', color: '#1A1033' }}
              placeholder="A short description of this poll…"
            />
          </div>

          <ErrorList errors={errors} />

          {/* Actions - visible on both mobile and desktop */}
          <div className="flex flex-col gap-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full px-6 py-3.5 rounded-full text-white text-sm font-bold transition hover:brightness-110 disabled:opacity-50"
              style={{ background: '#5B3DF5' }}
            >
              {isSubmitting
                ? (editPollHash ? 'Updating…' : 'Creating…')
                : (editPollHash ? t('create.update') : t('create.submit'))} →
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="w-full px-6 py-3.5 rounded-full text-sm font-semibold transition hover:bg-slate-100"
              style={{ background: '#EDE6FF', color: '#1A1033' }}
            >
              {t('create.clear')}
            </button>
            {editPollHash && (
              <button
                type="button"
                onClick={() => (window.location.href = `/admin/${editPollHash}`)}
                className="w-full px-6 py-3.5 rounded-full text-sm font-semibold transition hover:bg-slate-100"
                style={{ background: '#EDE6FF', color: '#1A1033' }}
              >
                {t('create.cancel')}
              </button>
            )}
          </div>
        </div>

        {/* Right column: questions editor - full width on mobile, flex-1 on desktop */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="bg-white rounded-[28px] flex flex-col flex-1 min-h-0 p-4 lg:p-6" style={{ boxShadow: CARD_SHADOW }}>
            <label className="block text-[11px] font-bold uppercase tracking-wider mb-2 shrink-0" style={{ color: '#5B3DF5' }}>
              {t('create.questions')}
            </label>
            <div className="editor-fullheight flex-1 min-h-0 rounded-xl border-2" style={{ borderColor: '#EDE6FF' }}>
              <MicroMDEditor
                key={`${editPollHash || 'create'}-${editorKey}`} // Force re-render when editing different poll or after loading
                initialMarkdown={questionText}
                onChange={setQuestionText}
              />
            </div>
            <p className="mt-3 text-xs leading-relaxed shrink-0" style={{ color: '#4E4669', fontFamily: "'JetBrains Mono', monospace" }}>
              Format: # Name → ## Question → [] optional / [x] multiselect → - Option 1 - Option 2
            </p>
          </div>
        </div>
      </div>

      
    </form>
  );
}
