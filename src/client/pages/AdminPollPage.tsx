import { useState, useEffect } from 'preact/hooks';
import { useI18n } from '../i18n';
import { getAdminPoll, csvUrl } from '../api';
import type { AdminPollResponse } from '../api';

interface AdminPollPageProps {
  pollHash: string;
}

export function AdminPollPage({ pollHash }: AdminPollPageProps) {
  const { t } = useI18n();
  const [data, setData] = useState<AdminPollResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPoll();
  }, [pollHash]);

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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-moss mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading poll data...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-8 rounded-lg text-center">
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p>{error || 'Poll not found or access denied'}</p>
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

  const { poll, summary, results } = data;
  const baseUrl = window.location.origin;
  const publicUrl = `${baseUrl}/poll/${poll.pollId}`;
  const adminUrl = `${baseUrl}/admin/${pollHash}`;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-ink mb-2">{poll.name}</h1>
        <p className="text-gray-600 whitespace-pre-wrap">{poll.details}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <div className="text-2xl font-bold text-moss">{summary.questionCount}</div>
          <div className="text-gray-600">{t('admin.questions')}</div>
        </div>
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <div className="text-2xl font-bold text-moss">{summary.submittedCount}</div>
          <div className="text-gray-600">{t('admin.submitted')}</div>
        </div>
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <a
            href={csvUrl(pollHash)}
            download
            className="block text-center px-4 py-3 bg-moss text-white rounded-lg font-medium hover:bg-moss/90"
          >
            {t('admin.downloadCsv')}
          </a>
        </div>
      </div>

      {/* URLs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h3 className="font-medium mb-2">{t('admin.publishUrl')}</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={publicUrl}
              readOnly
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
            />
            <button
              onClick={() => copyToClipboard(publicUrl)}
              className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200"
            >
              Copy
            </button>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h3 className="font-medium mb-2">{t('admin.adminUrl')}</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={adminUrl}
              readOnly
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
            />
            <button
              onClick={() => copyToClipboard(adminUrl)}
              className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200"
            >
              Copy
            </button>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-bold text-ink">{t('admin.results')}</h2>
        </div>
        
        {results.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            No submissions yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('admin.time')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('admin.user')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('admin.answered')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('admin.answers')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {results.map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(row.time).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="max-w-xs truncate" title={row.user_info}>
                        {row.user_info}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {row.answered_questions} / {summary.questionCount}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="max-w-xs truncate" title={row.answers}>
                        {row.answers}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}