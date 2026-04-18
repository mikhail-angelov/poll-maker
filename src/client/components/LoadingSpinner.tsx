interface LoadingSpinnerProps {
  label?: string;
  className?: string;
}

export function LoadingSpinner({ label, className = 'h-full flex items-center justify-center' }: LoadingSpinnerProps) {
  return (
    <div className={`${className} text-center`}>
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{ borderColor: '#5B3DF5' }} />
      {label && <p className="mt-4" style={{ color: '#4E4669' }}>{label}</p>}
    </div>
  );
}
