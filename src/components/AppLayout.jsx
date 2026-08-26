import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useState, useCallback } from 'react';
import { Menu } from 'lucide-react';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [title, setTitle] = useState('Dashboard');

  const updateTitle = useCallback((t) => setTitle(t), []);

  return (
    <div className="app-layout">
      <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} onTitleChange={updateTitle} />
      <div className="main-content">
        <div className="topbar">
          <button className="hamburger" onClick={() => setSidebarOpen(true)}>
            <Menu size={24} />
          </button>
          <h2>{title}</h2>
        </div>
        <div className="content-area">
          <Outlet context={{ setTitle: updateTitle }} />
        </div>
      </div>
    </div>
  );
}
