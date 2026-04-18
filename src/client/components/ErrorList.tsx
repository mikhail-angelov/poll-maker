import { useI18n } from '../i18n';

interface ErrorListProps {
  errors: string[];
}

export function ErrorList({ errors }: ErrorListProps) {
  const { t } = useI18n();
  if (errors.length === 0) return null;
  return (
    <div className="p-5 rounded-[20px] border-2" style={{ background: '#FFF0F3', borderColor: '#FF7AB6' }}>
      <ul className="list-disc list-inside space-y-1 text-sm" style={{ color: '#1A1033' }}>
        {errors.map((error, index) => (
          <li key={index}>{(t as any)(`error.${error}`) || error}</li>
        ))}
      </ul>
    </div>
  );
}
