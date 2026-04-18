import { useState, useEffect } from 'preact/hooks';
import { useI18n } from '../i18n';
import { getAdminPoll, csvUrl } from '../api';
import type { AdminPollResponse } from '../api';
import { CopyRow } from '../components/CopyRow';
import { QRCodeCanvas } from '../components/QRCodeCanvas';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { CARD_SHADOW } from '../styles';

interface AdminPollPageProps {
  pollHash: string;
}

export function AdminPollPage({ pollHash }: AdminPollPageProps) {
  const { t } = useI18n();
  const [data, setData] = useState<AdminPollResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadPoll(); }, [pollHash]);

  const loadPoll = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getAdminPoll(pollHash);
      setData(result);
    } catch (err) {
      console.error('Error loading poll:', err);
      setError('Failed to load poll data');
    } finally {
      setLoading(false);
    }
  };

  const handleEditPoll = () => { window.location.href = `/edit/${pollHash}`; };

  if (loading) {
    return <LoadingSpinner label="Loading poll data…" className="max-w-5xl mx-auto pt-12 text-center" />;
  }

  if (error || !data) {
    return (
      <div className="max-w-5xl mx-auto pt-8">
        <div className="p-8 rounded-[28px] bg-white text-center" style={{ boxShadow: CARD_SHADOW }}>
          <h2 className="text-xl font-bold mb-2" style={{ color: '#1A1033' }}>Error</h2>
          <p style={{ color: '#4E4669' }}>{error || 'Poll not found or access denied'}</p>
          <button onClick={loadPoll}
                  className="mt-4 px-5 py-2.5 rounded-full text-white text-sm font-bold transition hover:brightness-110"
                  style={{ background: '#5B3DF5' }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { poll, summary, results } = data;
  const baseUrl = window.location.origin;
  const publicUrl = `${baseUrl}/poll/${poll.pollId}`;
  const adminUrl = `${baseUrl}/admin/${pollHash}`;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Title row */}
      <div className="pt-6 pb-5 flex items-start justify-between gap-6 flex-wrap">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold tracking-wider mb-2"
               style={{ background: '#C6F24B', color: '#1A1033' }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#1A1033' }} />
            LIVE
          </div>
          <h1 className="m-0 text-[40px] leading-none font-normal tracking-tight"
              style={{ fontFamily: "'Fraunces', Georgia, serif", color: '#1A1033' }}>
            {poll.name}<span style={{ color: '#5B3DF5' }}>.</span>
          </h1>
          <p className="mt-2" style={{ color: '#4E4669' }}>{poll.details}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={handleEditPoll}
                  className="h-11 px-4 rounded-full bg-white text-sm font-semibold hover:bg-slate-50 transition"
                  style={{ boxShadow: CARD_SHADOW, color: '#1A1033' }}>
            ✎ {t('admin.editPoll')}
          </button>
          <a href={csvUrl(pollHash)} download
             className="h-11 px-4 rounded-full text-white text-sm font-bold flex items-center transition hover:brightness-110 no-underline"
             style={{ background: '#1A1033' }}>
            ⇩ {t('admin.downloadCsv')}
          </a>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {[
          { label: t('admin.questions'), value: summary.questionCount, bg: '#5B3DF5', color: '#fff' },
          { label: t('admin.submitted'), value: summary.submittedCount, bg: '#fff', color: '#1A1033' },
        ].map((m, i) => (
          <div key={i} className="p-5 rounded-3xl" style={{ background: m.bg, color: m.color, boxShadow: CARD_SHADOW }}>
            <div className="text-[11px] font-bold uppercase tracking-wider opacity-70"
                 style={{ fontFamily: "'JetBrains Mono', monospace" }}>{m.label}</div>
            <div className="mt-1 text-4xl font-normal tracking-tight"
                 style={{ fontFamily: "'Fraunces', Georgia, serif" }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Share links */}
      <div className="bg-white rounded-3xl p-5 mb-6" style={{ boxShadow: CARD_SHADOW }}>
        <div className="text-[11px] font-bold uppercase tracking-wider mb-3"
             style={{ color: '#5B3DF5', fontFamily: "'JetBrains Mono', monospace" }}>
          {t('admin.publishUrl')} / {t('admin.adminUrl')}
        </div>
        <div className="flex gap-4 items-start">
          <div className="flex-1 min-w-0">
            <CopyRow label="Public" url={publicUrl} accent="#5B3DF5" />
            <CopyRow label="Admin" url={adminUrl} accent="#FF7AB6" />
          </div>
          <div className="shrink-0">
            <QRCodeCanvas url={publicUrl} />
          </div>
        </div>
      </div>

      {/* Results table */}
      <div className="bg-white rounded-3xl overflow-hidden" style={{ boxShadow: CARD_SHADOW }}>
        <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100">
          <div className="text-sm font-bold" style={{ color: '#1A1033' }}>{t('admin.results')}</div>
        </div>

        {results.length === 0 ? (
          <div className="px-6 py-12 text-center" style={{ color: '#4E4669' }}>
            No submissions yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ textAlign: 'left' }}>
                  {[t('admin.time'), t('admin.user'), t('admin.answered'), t('admin.answers')].map(h => (
                    <th key={h} className="px-5 py-3 font-bold text-[10px] uppercase tracking-widest"
                        style={{ color: '#4E4669', fontFamily: "'JetBrains Mono', monospace" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map((row, index) => {
                  const answered = row.answered_questions;
                  const total = summary.questionCount;
                  const pct = answered / total;
                  return (
                    <tr key={index} className="border-t border-slate-100 hover:bg-indigo-50/30">
                      <td className="px-5 py-3 font-mono text-xs" style={{ color: '#1A1033' }}>
                        {new Date(row.time).toLocaleString()}
                      </td>
                      <td className="px-5 py-3" style={{ color: '#1A1033' }}>
                        <div className="max-w-xs truncate" title={row.user_info}>{row.user_info}</div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(91,61,245,0.12)' }}>
                            <div className="h-full rounded-full"
                                 style={{ width: `${pct * 100}%`, background: pct === 1 ? '#5B3DF5' : '#FFB78A' }} />
                          </div>
                          <span className="text-xs font-mono font-semibold tabular-nums" style={{ color: '#1A1033' }}>
                            {answered} / {total}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="max-w-xs truncate text-xs" style={{ color: '#4E4669' }} title={row.answers}>
                          {row.answers}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
