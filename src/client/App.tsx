import { useState } from 'preact/hooks';
import { I18nProvider, useI18n, Language } from './i18n';
import { CreatePollPage } from './pages/CreatePollPage';
import { AdminPollPage } from './pages/AdminPollPage';
import { RespondPollPage } from './pages/RespondPollPage';

function LanguageToggle() {
  const { language, setLanguage, t } = useI18n();
  
  return (
    <div className="fixed top-4 right-4 z-10">
      <button
        onClick={() => setLanguage(language === 'en' ? 'ru' : 'en')}
        className="px-3 py-1 bg-white/80 backdrop-blur-sm rounded-full border border-gray-300 text-sm font-medium hover:bg-white transition-colors"
      >
        {language === 'en' ? t('language.ru') : t('language.en')}
      </button>
    </div>
  );
}

function AppContent() {
  const { t } = useI18n();
  const [path] = useState(() => window.location.pathname);
  const [search] = useState(() => window.location.search);

  // Check for edit mode in query params
  const urlParams = new URLSearchParams(search);
  const editPollHash = urlParams.get('edit');

  // Simple routing based on path
  if (path.startsWith('/admin/')) {
    const pollHash = path.split('/admin/')[1];
    return (
      <>
        <LanguageToggle />
        <AdminPollPage pollHash={pollHash} />
      </>
    );
  }

  if (path.startsWith('/poll/')) {
    const pollId = path.split('/poll/')[1];
    return (
      <>
        <LanguageToggle />
        <RespondPollPage pollId={pollId} />
      </>
    );
  }

  // Default to create page (with optional edit mode)
  return (
    <>
      <LanguageToggle />
      <CreatePollPage editPollHash={editPollHash || undefined} />
    </>
  );
}

export function App() {
  return (
    <I18nProvider>
      <div className="min-h-screen p-4 md:p-8">
        <AppContent />
      </div>
    </I18nProvider>
  );
}