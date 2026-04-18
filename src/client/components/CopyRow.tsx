import { useState } from 'preact/hooks';

interface CopyRowProps {
  label: string;
  url: string;
  accent: string;
}

export function CopyRow({ label, url, accent }: CopyRowProps) {
  const [copied, setCopied] = useState(false);
  const doCopy = async () => {
    try { await navigator.clipboard.writeText(url); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };
  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl mb-2" style={{ background: '#EDE6FF50' }}>
      <span className="w-2 h-10 rounded-full shrink-0" style={{ background: accent }} />
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: '#4E4669', fontFamily: "'JetBrains Mono', monospace" }}>{label}</div>
        <div className="text-sm font-mono truncate" style={{ color: '#1A1033' }}>{url}</div>
      </div>
      <button onClick={doCopy}
              className="px-3 py-1.5 rounded-full bg-white text-xs font-semibold hover:bg-slate-50 shrink-0 transition"
              style={{ color: copied ? '#16a34a' : '#1A1033' }}>
        {copied ? '✓' : 'Copy'}
      </button>
    </div>
  );
}
