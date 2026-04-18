import { useI18n } from '../i18n';
import type { UserPollItem } from '../api';

interface SidebarProps {
  polls: UserPollItem[];
  currentPath: string;
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ polls, currentPath, isOpen, onClose }: SidebarProps) {
  const { t } = useI18n();
  const isNewPoll = currentPath === '/new';
  const editingHash = currentPath.startsWith('/edit/') ? currentPath.split('/edit/')[1] : null;

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={[
          'fixed inset-y-0 left-0 z-50 w-[320px] flex flex-col',
          'md:relative md:inset-auto md:z-auto md:translate-x-0 md:flex-shrink-0',
          'transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
        style={{ background: 'white', boxShadow: '2px 0 20px rgba(26,16,51,0.06)' }}
      >
        {/* Mobile header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b md:hidden"
             style={{ borderColor: '#EDE6FF' }}>
          <span className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: '#9E92C8', fontFamily: "'JetBrains Mono', monospace" }}>
            {t('sidebar.navigation')}
          </span>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-base hover:bg-slate-100 transition"
            style={{ color: '#1A1033' }}
          >
            ✕
          </button>
        </div>

        <div className="hidden md:block h-4" />

        {/* New Poll button */}
        <div className="px-3 pb-3">
          <a
            href="/new"
            className="flex items-center justify-center gap-1.5 w-full px-3 py-2.5 rounded-xl text-sm font-bold transition no-underline"
            style={{
              background: isNewPoll ? '#5B3DF5' : '#EDE6FF',
              color: isNewPoll ? 'white' : '#5B3DF5',
            }}
          >
            <span className="text-base leading-none">+</span> {t('sidebar.newPoll')}
          </a>
        </div>

        {/* My Polls section */}
        <div className="px-4 pb-2">
          <div className="border-t mb-3" style={{ borderColor: '#EDE6FF' }} />
          <span className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: '#9E92C8', fontFamily: "'JetBrains Mono', monospace" }}>
            {t('sidebar.myPolls')}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-3">
          {polls.length === 0 ? (
            <div className="px-2 py-3 text-xs leading-relaxed" style={{ color: '#B8AEDD' }}>
              {t('sidebar.noPollsLine1')}<br />{t('sidebar.noPollsLine2')}
            </div>
          ) : (
            polls.map(poll => {
              const isActive = currentPath === `/admin/${poll.adminHash}` || editingHash === poll.adminHash;
              return (
                <a
                  key={poll.adminHash}
                  href={`/admin/${poll.adminHash}`}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl mb-0.5 text-sm transition no-underline group"
                  style={{
                    background: isActive ? '#EDE6FF' : 'transparent',
                    color: isActive ? '#5B3DF5' : '#1A1033',
                    fontWeight: isActive ? 600 : 400,
                  }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = '#F5F0FF'; }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: poll.active ? '#C6F24B' : '#D1D5DB' }}
                  />
                  <span className="truncate">{poll.name}</span>
                </a>
              );
            })
          )}
        </div>

        {/* GitHub link */}
        <div className="px-4 py-3 border-t" style={{ borderColor: '#EDE6FF' }}>
          <a
            href="https://github.com/mikhail-angelov/poll-maker"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs no-underline transition hover:opacity-70"
            style={{ color: '#9E92C8', fontFamily: "'JetBrains Mono', monospace" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12" />
            </svg>
            GitHub
            <span className="ml-auto" style={{ color: '#C8C0E0' }}>© Ѣ 2026</span>
          </a>
        </div>
      </aside>
    </>
  );
}
