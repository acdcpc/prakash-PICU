import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, Droplets, Pill, FlaskConical,
  StickyNote, Image, Calculator, BookOpen, Download, Settings, LogOut, Stethoscope, CreditCard, Baby, Newspaper, Siren
} from 'lucide-react';

const NAV_ITEMS = [
  { group: 'Main', items: [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { id: 'patients', label: 'Patients', icon: Users, path: '/patients' },
  ]},
  { group: 'Clinical', items: [
    { id: 'calculators', label: 'Calculators', icon: Calculator, path: '/calculators' },
    { id: 'clinical-tools', label: 'Clinical Tools', icon: Stethoscope, path: '/clinical-tools' },
    { id: 'subscription', label: 'Subscription & Payment', icon: CreditCard, path: '/subscription' },
    { id: 'child-health', label: 'Child Health', icon: Baby, path: '/child-health' },
    { id: 'pediatric-updates', label: "What’s New", icon: Newspaper, path: '/pediatric-updates' },
    { id: 'emergency', label: 'Emergency Mode', icon: Siren, path: '/emergency' },
    { id: 'education', label: 'Education Hub', icon: BookOpen, path: '/education-hub' },
    { id: 'export', label: 'Export Centre', icon: Download, path: '/export' },
  ]},
  { group: 'Settings', items: [
    { id: 'admin', label: 'Admin Panel', icon: Settings, path: '/admin', admin: true },
  ]},
];

const TITLE_MAP = {
  dashboard: 'Dashboard', patients: 'Patients', calculators: 'Calculators', 'clinical-tools': 'Clinical Tools', subscription: 'Subscription & Payment', 'child-health': 'Child Health', 'pediatric-updates': "What’s New", emergency: 'Emergency Mode',
  education: 'Education Hub', export: 'Export Centre', admin: 'Admin Panel',
  fluidBalance: 'Fluid Balance', drugs: 'Drug Library', investigations: 'Investigations',
  notes: 'Clinical Notes', images: 'Patient Images',
};

export default function Sidebar({ open, onClose, onTitleChange }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, signOut, isAdmin } = useAuth();

  const currentSection = location.pathname.split('/')[1] || 'dashboard';
  const name = profile?.full_name || user?.email?.split('@')[0] || 'Doctor';

  const handleNav = (item) => {
    if (item.admin && !isAdmin) {
      alert('Admin access required.');
      return;
    }
    onTitleChange(TITLE_MAP[item.id] || item.label);
    navigate(item.path);
    onClose();
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="sidebar-brand">
        <div className="avatar">{(name[0] || 'D').toUpperCase()}</div>
        <div>
          <h3>{name}</h3>
          <p>{profile?.designation || profile?.hospital || 'PICU'}</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map(group => (
          <div key={group.group} className="nav-group">
            <div className="nav-group-label">{group.group}</div>
            {group.items.filter(i => !i.admin || isAdmin).map(item => {
              const Icon = item.icon;
              const active = currentSection === item.id || 
                (item.id === 'patients' && ['patients', 'fluidBalance', 'drugs', 'investigations', 'notes', 'images'].includes(currentSection));
              return (
                <button
                  key={item.id}
                  className={`nav-item ${active ? 'active' : ''}`}
                  onClick={() => handleNav(item)}
                >
                  <Icon size={18} />
                  {item.label}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </aside>
  );
}
