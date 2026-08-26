import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Stethoscope, LogIn } from 'lucide-react';

export default function PublicLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => location.pathname === path ? 'active' : '';

  return (
    <div className="public-layout">
      <header className="pub-header">
        <div className="pub-logo">
          <Stethoscope size={24} />
          <h3>OurPICU</h3>
        </div>
        <nav className="pub-nav">
          <button className={`pub-link ${isActive('/')}`} onClick={() => navigate('/')}>Home</button>
          <button className={`pub-link ${isActive('/education')}`} onClick={() => navigate('/education')}>Education</button>
          <button className={`pub-link ${isActive('/about')}`} onClick={() => navigate('/about')}>About</button>
          {user ? (
            <button className="pub-link login-btn" onClick={() => navigate('/dashboard')}>Dashboard</button>
          ) : (
            <button className="pub-link login-btn" onClick={() => navigate('/login')}>
              <LogIn size={16} /> Sign In
            </button>
          )}
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
