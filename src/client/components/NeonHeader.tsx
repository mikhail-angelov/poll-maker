import { useI18n } from "../i18n";

function HamburgerIcon() {
  return (
    <svg width="18" height="14" viewBox="0 0 18 14" fill="none" aria-hidden="true">
      <rect width="18" height="2" rx="1" fill="currentColor" />
      <rect y="6" width="18" height="2" rx="1" fill="currentColor" />
      <rect y="12" width="18" height="2" rx="1" fill="currentColor" />
    </svg>
  );
}

interface NeonHeaderProps {
  onMenuToggle?: () => void;
}

export function NeonHeader({ onMenuToggle }: NeonHeaderProps) {
  const { t, language, setLanguage } = useI18n();

  return (
    <header className="relative z-10 px-5 pt-5 pb-4 flex items-center gap-3">
      {onMenuToggle && (
        <button
          onClick={onMenuToggle}
          className="md:hidden w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/60 transition -ml-1 shrink-0"
          style={{ color: "#1A1033" }}
          aria-label="Toggle navigation"
        >
          <HamburgerIcon />
        </button>
      )}
      <a
        href="/"
        className="flex items-center gap-2.5 pl-2 pr-3.5 py-1.5 rounded-full text-[13px] font-semibold text-white no-underline"
        style={{ background: "#1A1033" }}
      >
        <span
          className="w-6 h-6 rounded-full grid place-items-center text-[13px] font-extrabold"
          style={{ background: "#C6F24B", color: "#1A1033" }}
        >
          ◆
        </span>
        {t("app.title")}
      </a>
      <button
        onClick={() => setLanguage(language === "en" ? "ru" : "en")}
        className="ml-auto h-10 px-3.5 rounded-full bg-white font-mono text-xs font-semibold shadow-sm hover:-translate-y-0.5 transition"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {language === "en" ? "EN" : "РУ"}
      </button>
    </header>
  );
}
