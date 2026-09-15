import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Activity, Baby, BookOpen, Calculator, ClipboardCheck, CreditCard, Download,
  LayoutDashboard, LogOut, Newspaper, Settings, Siren, SlidersHorizontal, Syringe, Users,
} from 'lucide-react';

const NAV_ITEMS = [
  { group: 'Workspace', items: [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { id: 'patients', label: 'My Patients', icon: Users, path: '/patients' },
    { id: 'calculators', label: 'Drugs & Scores', icon: Calculator, path: '/calculators' },
    { id: 'child-growth', label: 'Child Growth', icon: Baby, path: '/child-growth' },
    { id: 'pediatric-updates', label: "What's New in Pediatrics", icon: Newspaper, path: '/pediatric-updates' },
  ]},
  { group: 'Clinical reference', items: [
    { id: 'emergency', label: 'Emergency Reference', icon: Siren, path: '/emergency' },
    { id: 'high-risk-infusions', label: 'High-Risk Infusions', icon: Syringe, path: '/high-risk-infusions' },
    { id: 'teddy-bear-review', label: 'Teddy Bear Review', icon: ClipboardCheck, path: '/teddy-bear-review' },
    { id: 'neonate-review', label: 'Neonate Formulary', icon: Baby, path: '/neonate-review' },
    { id: 'education', label: 'Education Hub', icon: BookOpen, path: '/education-hub' },
  ]},
  { group: 'Account', items: [
    { id: 'preferences', label: 'Preferences', icon: SlidersHorizontal, path: '/preferences' },
    { id: 'subscription', label: 'Subscription & Payment', icon: CreditCard, path: '/subscription' },
    { id: 'export', label: 'Export Centre', icon: Download, path: '/export' },
    { id: 'admin', label: 'Admin Panel', icon: Settings, path: '/admin', admin: true },
  ]},
];

const TITLE_MAP = {
  dashboard: 'Dashboard', patients: 'My Patients', calculators: 'Drugs & Scores',
  'child-growth': 'Child Growth', 'child-health': 'Child Growth',
  'pediatric-updates': "What's New in Pediatrics", subscription: 'Subscription & Payment',
  emergency: 'Emergency Reference', 'high-risk-infusions': 'High-Risk Infusions',
  preferences: 'Preferences',
  'teddy-bear-review': 'Teddy Bear Review',
  'neonate-review': 'Neonate Formulary', education: 'Education Hub', export: 'Export Centre',
  admin: 'Admin Panel', fluidBalance: 'Fluid Balance', drugs: 'Patient Drugs',
  investigations: 'Investigations', notes: 'Clinical Notes', images: 'Patient Images',
};

export default function Sidebar({ open, onClose, onTitleChange }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, signOut, isAdmin } = useAuth();
  const currentSection = location.pathname.split('/')[1] || 'dashboard';
  const name = profile?.full_name || user?.email?.split('@')[0] || 'Clinician';

  const handleNav = (item) => {
    if (item.admin && !isAdmin) return;
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
        <div className="brand-mark"><Activity size={20} /></div>
        <div>
          <h3>Prakash Pediatrics</h3>
          <p>Clinical companion</p>
        </div>
      </div>
      <div className="sidebar-user">
        <div className="avatar">{(name[0] || 'C').toUpperCase()}</div>
        <div><strong>{name}</strong><span>{profile?.designation || 'Pediatric clinician'}</span></div>
      </div>
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((group) => (
          <div key={group.group} className="nav-group">
            <div className="nav-group-label">{group.group}</div>
            {group.items.filter((item) => !item.admin || isAdmin).map((item) => {
              const Icon = item.icon;
              const active = currentSection === item.id || (item.id === 'patients' && ['patients', 'fluidBalance', 'drugs', 'investigations', 'notes', 'images'].includes(currentSection));
              return <button key={item.id} className={`nav-item ${active ? 'active' : ''}`} onClick={() => handleNav(item)}><Icon size={18} />{item.label}</button>;
            })}
          </div>
        ))}
      </nav>
      <div className="sidebar-footer"><button className="logout-btn" onClick={handleLogout}><LogOut size={16} /> Sign out</button></div>
    </aside>
  );
}
