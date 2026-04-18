import { useState, useEffect } from "preact/hooks";
import type { VNode } from "preact";
import { I18nProvider } from "./i18n";
import { CreatePollPage } from "./pages/CreatePollPage";
import { AdminPollPage } from "./pages/AdminPollPage";
import { RespondPollPage } from "./pages/RespondPollPage";
import { LandingPage } from "./pages/LandingPage";
import { Sidebar } from "./components/Sidebar";
import { NeonHeader } from "./components/NeonHeader";
import { getUserPolls, type UserPollItem } from "./api";

function AppContent() {
  const [path] = useState(() => window.location.pathname);
  const [userPolls, setUserPolls] = useState<UserPollItem[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    getUserPolls()
      .then((r) => setUserPolls(r.polls))
      .catch(() => {});
  }, []);

  // Respondent view — no sidebar
  if (path.startsWith("/poll/")) {
    const pollId = path.split("/poll/")[1];
    return (
      <div
        className="min-h-screen relative overflow-hidden"
        style={{ background: "#F3EEFF" }}
      >
        <div className="neon-blob-tr" />
        <div className="neon-blob-bl" />
        <NeonHeader />
        <main className="relative z-10 px-5 pb-10">
          <RespondPollPage pollId={pollId} />
        </main>
      </div>
    );
  }

  const isFullHeight = path === '/new' || path.startsWith('/edit/');

  // Determine page content for sidebar layout
  let pageContent: VNode;
  if (path.startsWith("/admin/")) {
    const pollHash = path.split("/admin/")[1];
    pageContent = <AdminPollPage pollHash={pollHash} />;
  } else if (path.startsWith("/edit/")) {
    const editHash = path.split("/edit/")[1];
    pageContent = <CreatePollPage editPollHash={editHash} />;
  } else if (path === "/new") {
    pageContent = <CreatePollPage />;
  } else {
    pageContent = <LandingPage />;
  }

  return (
    <div
      className="h-screen flex flex-col relative overflow-hidden"
      style={{ background: "#F3EEFF" }}
    >
      <div className="neon-blob-tr" />
      <div className="neon-blob-bl" />
      <NeonHeader onMenuToggle={() => setSidebarOpen((o) => !o)} />
      <div className="flex flex-1 overflow-hidden relative z-10">
        <Sidebar
          polls={userPolls}
          currentPath={path}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main className={`flex-1 px-5 ${isFullHeight ? 'overflow-hidden' : 'overflow-y-auto pb-10'}`}>
          {pageContent}
        </main>
      </div>
    </div>
  );
}

export function App() {
  return (
    <I18nProvider>
      <AppContent />
    </I18nProvider>
  );
}
