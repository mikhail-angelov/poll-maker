import { useI18n } from '../i18n';

const CARD_SHADOW = '0 10px 30px rgba(26,16,51,0.06)';

const FEATURE_ICONS = ['◆', '⇩', '◎', '✎', '⬡', '⟳'] as const;

type FeatureKey =
  | 'landing.feature.questionTypes'
  | 'landing.feature.csvExport'
  | 'landing.feature.realtimeResults'
  | 'landing.feature.editable'
  | 'landing.feature.noSignup'
  | 'landing.feature.draftSave';

const FEATURE_KEYS: FeatureKey[] = [
  'landing.feature.questionTypes',
  'landing.feature.csvExport',
  'landing.feature.realtimeResults',
  'landing.feature.editable',
  'landing.feature.noSignup',
  'landing.feature.draftSave',
];

export function LandingPage() {
  const { t } = useI18n();

  const steps = [
    { step: '01', titleKey: 'landing.step01Title', descKey: 'landing.step01Desc' },
    { step: '02', titleKey: 'landing.step02Title', descKey: 'landing.step02Desc' },
    { step: '03', titleKey: 'landing.step03Title', descKey: 'landing.step03Desc' },
  ] as const;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Hero */}
      <div className="pt-10 pb-8">
        <div
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold tracking-wider mb-5"
          style={{ background: '#C6F24B', color: '#1A1033' }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#1A1033' }} />
          {t('landing.badge')}
        </div>
        <h1
          className="text-[48px] md:text-[58px] leading-[1.05] font-normal tracking-tight mb-4"
          style={{ fontFamily: "'Fraunces', Georgia, serif", color: '#1A1033' }}
        >
          {t('landing.heroTitle')}<br />
          <span style={{ color: '#5B3DF5' }}>{t('landing.heroAccent')}</span>
        </h1>
        <p className="text-lg mb-8 max-w-xl leading-relaxed" style={{ color: '#4E4669' }}>
          {t('landing.heroSubtitle')}
        </p>
        <a
          href="/new"
          className="inline-flex items-center gap-2 px-7 py-4 rounded-full text-white text-sm font-bold transition hover:brightness-110 no-underline"
          style={{ background: '#5B3DF5' }}
        >
          {t('landing.cta')}
        </a>
      </div>

      {/* How it works */}
      <div className="mb-6">
        <div
          className="text-[11px] font-bold uppercase tracking-widest mb-4"
          style={{ color: '#5B3DF5', fontFamily: "'JetBrains Mono', monospace" }}
        >
          {t('landing.howItWorks')}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {steps.map(({ step, titleKey, descKey }) => (
            <div key={step} className="p-5 bg-white rounded-3xl" style={{ boxShadow: CARD_SHADOW }}>
              <div
                className="text-[10px] font-bold mb-2 tracking-widest"
                style={{ color: '#B8AEDD', fontFamily: "'JetBrains Mono', monospace" }}
              >
                STEP {step}
              </div>
              <div
                className="text-xl font-normal mb-2"
                style={{ fontFamily: "'Fraunces', Georgia, serif", color: '#1A1033' }}
              >
                {t(titleKey)}<span style={{ color: '#5B3DF5' }}>.</span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: '#4E4669' }}>{t(descKey)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="bg-white rounded-3xl p-6 mb-10" style={{ boxShadow: CARD_SHADOW }}>
        <div
          className="text-[11px] font-bold uppercase tracking-widest mb-4"
          style={{ color: '#5B3DF5', fontFamily: "'JetBrains Mono', monospace" }}
        >
          {t('landing.features')}
        </div>
        <div className="grid grid-cols-2 gap-y-1">
          {FEATURE_KEYS.map((key, i) => (
            <div key={key} className="flex items-center gap-2.5 py-2">
              <span
                className="w-7 h-7 rounded-full grid place-items-center text-xs font-bold shrink-0"
                style={{ background: '#EDE6FF', color: '#5B3DF5' }}
              >
                {FEATURE_ICONS[i]}
              </span>
              <span className="text-sm font-medium" style={{ color: '#1A1033' }}>{t(key)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
