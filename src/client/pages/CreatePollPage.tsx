import { useState } from 'preact/hooks';
import { useI18n } from '../i18n';
import { createPoll } from '../api';
import { parseQuestionFormat, serializeQuestionFormat } from '../../shared/questionFormat';
import { validatePollInput } from '../../shared/validation';
import { MarkdownEditor } from '../components/MarkdownEditor';

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

export function CreatePollPage() {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [details, setDetails] = useState('');
  const [questionText, setQuestionText] = useState(DEFAULT_QUESTION_TEXT);
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      const result = await createPoll({ name, details, questions: questionText });
      
      // Navigate to admin page
      window.location.href = result.adminUrl;
    } catch (error) {
      console.error('Error creating poll:', error);
      try {
        const errorData = JSON.parse(error.message);
        setErrors(errorData.errors || ['INTERNAL_SERVER_ERROR']);
      } catch {
        setErrors(['INTERNAL_SERVER_ERROR']);
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

  const parsedQuestions = (() => {
    try {
      return parseQuestionFormat(questionText);
    } catch {
      return [];
    }
  })();

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-ink">{t('create.title')}</h1>
      
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Poll Name */}
        <div>
          <label className="block text-sm font-medium mb-2 text-ink">
            {t('create.name')}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName((e.target as HTMLInputElement).value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-moss focus:border-transparent"
            placeholder={t('create.name')}
          />
        </div>

        {/* Poll Details */}
        <div>
          <label className="block text-sm font-medium mb-2 text-ink">
            {t('create.details')}
          </label>
          <MarkdownEditor
            label={t('create.details')}
            value={details}
            onChange={setDetails}
          />
        </div>

        {/* Questions Editor */}
        <div>
          <label className="block text-sm font-medium mb-2 text-ink">
            {t('create.questions')}
          </label>
          <MarkdownEditor
            label={t('create.questions')}
            value={questionText}
            onChange={setQuestionText}
          />
          <div className="mt-2 text-sm text-gray-600">
            Format: # Question Name ## Question Text [] optional [x] multiselect - Option 1 - Option 2
          </div>
        </div>

        {/* Parsed Preview */}
        {parsedQuestions.length > 0 && (
          <div className="bg-white/50 p-4 rounded-lg border">
            <h3 className="font-medium mb-2">Preview ({parsedQuestions.length} questions)</h3>
            <div className="space-y-3">
              {parsedQuestions.map((question, index) => (
                <div key={index} className="p-3 bg-white rounded border">
                  <div className="font-medium">{question.name}</div>
                  <div className="text-sm text-gray-600">{question.question}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {question.optional && 'Optional • '}
                    {question.multiselect ? 'Multi-select' : 'Single-select'} • 
                    {question.options.length} options
                    {question.options.includes('text') || question.options.includes('текст') ? ' • Free text allowed' : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error Messages */}
        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <ul className="list-disc list-inside space-y-1">
              {errors.map((error, index) => (
                <li key={index}>{t(`error.${error}` as any) || error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-3 bg-moss text-white rounded-lg font-medium hover:bg-moss/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Creating...' : t('create.submit')}
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300"
          >
            {t('create.clear')}
          </button>
        </div>
      </form>
    </div>
  );
}