import { useEffect, useRef } from 'preact/hooks';
import QRCode from 'qrcode';

const CARD_SHADOW = '0 10px 30px rgba(26,16,51,0.06)';

interface QRCodeCanvasProps {
  url: string;
}

export function QRCodeCanvas({ url }: QRCodeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, { width: 128, margin: 1, color: { dark: '#1A1033', light: '#ffffff' } });
    }
  }, [url]);
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement('a');
    a.download = 'poll-qr.png';
    a.href = canvas.toDataURL('image/png');
    a.click();
  };
  return (
    <div className="flex flex-col items-center gap-1">
      <canvas ref={canvasRef} className="rounded-xl" />
      <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#4E4669', fontFamily: "'JetBrains Mono', monospace" }}>Scan to open</span>
      <button onClick={handleDownload}
              className="px-3 py-1 rounded-full bg-white text-[10px] font-semibold hover:bg-slate-50 transition"
              style={{ boxShadow: CARD_SHADOW, color: '#1A1033' }}>
        ⇩ Save QR
      </button>
    </div>
  );
}
