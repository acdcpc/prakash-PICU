import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useState, useCallback, useEffect } from 'react';
import { Menu } from 'lucide-react';
import Notifications from './Notifications';
import SkipLink from './SkipLink';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [title, setTitle] = useState('Dashboard');

  const updateTitle = useCallback((t) => setTitle(t), []);

  // One unique, meaningful document title per route.
  useEffect(() => { document.title = `${title} · Prakash Pediatrics`; }, [title]);

  return (
    <div className="app-layout">
      <SkipLink />
      <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} onTitleChange={updateTitle} />
      <div className="main-content">
        <header className="topbar">
          <button className="hamburger" aria-label="Open navigation menu" aria-expanded={sidebarOpen} onClick={() => setSidebarOpen(true)}>
            <Menu size={24} />
          </button>
          <h1 className="topbar-title">{title}</h1>
        </header>
        <main id="main-content" tabIndex={-1} className="content-area">
          <Notifications />
          <Outlet context={{ setTitle: updateTitle }} />
        </main>
      </div>
    </div>
  );
}
