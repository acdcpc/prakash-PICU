import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { lazy, Suspense, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from './lib/analytics';

import PublicLayout from './components/PublicLayout';
import AppLayout from './components/AppLayout';
import Login from './pages/auth/Login';

const Home = lazy(() => import('./pages/public/Home'));
const Education = lazy(() => import('./pages/public/Education'));
const About = lazy(() => import('./pages/public/About'));

const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'));
const PatientList = lazy(() => import('./pages/patients/PatientList'));
const PatientDetail = lazy(() => import('./pages/patients/PatientDetail'));
const PatientForm = lazy(() => import('./pages/patients/PatientForm'));
const FluidBalance = lazy(() => import('./pages/fluidBalance/FluidBalance'));
const DrugLibrary = lazy(() => import('./pages/drugs/DrugLibrary'));
const Investigations = lazy(() => import('./pages/investigations/Investigations'));
const ClinicalNotes = lazy(() => import('./pages/notes/ClinicalNotes'));
const Images = lazy(() => import('./pages/notes/Images'));
const CalculatorHome = lazy(() => import('./pages/calculators/CalculatorHome'));
const ExportCenter = lazy(() => import('./pages/export/ExportCenter'));
const AdminPanel = lazy(() => import('./pages/admin/AdminPanel'));
const PrivateEducation = lazy(() => import('./pages/education/PrivateEducation'));
const ClinicalTools = lazy(() => import('./pages/clinical/ClinicalTools'));
const Subscription = lazy(() => import('./pages/subscription/Subscription'));
const ChildHealth = lazy(() => import('./pages/childHealth/ChildHealth'));
const PediatricUpdates = lazy(() => import('./pages/updates/PediatricUpdates'));
const EmergencyMode = lazy(() => import('./pages/emergency/EmergencyMode'));

function Loader() {
  return <div className="loader"><div className="spinner"></div> Loading…</div>;
}

function AnalyticsTracker() {
  const location = useLocation();
  useEffect(() => { trackPageView(location.pathname); }, [location.pathname]);
  return null;
}

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;

  return (
    <Suspense fallback={<Loader />}>
      <AnalyticsTracker />
      <Routes>
        {/* Public routes */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/education" element={<Education />} />
          <Route path="/about" element={<About />} />
          <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
          <Route path="/signup" element={<Navigate to="/login" />} />
        </Route>

        {/* Private routes */}
        <Route element={user ? <AppLayout /> : <Navigate to="/login" />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/patients" element={<PatientList />} />
          <Route path="/patients/new" element={<PatientForm />} />
          <Route path="/patients/:id" element={<PatientDetail />} />
          <Route path="/patients/:id/fluid-balance" element={<FluidBalance />} />
          <Route path="/patients/:id/drugs" element={<DrugLibrary />} />
          <Route path="/patients/:id/investigations" element={<Investigations />} />
          <Route path="/patients/:id/notes" element={<ClinicalNotes />} />
          <Route path="/patients/:id/images" element={<Images />} />
          <Route path="/calculators" element={<CalculatorHome />} />
          <Route path="/clinical-tools" element={<ClinicalTools />} />
          <Route path="/subscription" element={<Subscription />} />
          <Route path="/child-health" element={<ChildHealth />} />
          <Route path="/pediatric-updates" element={<PediatricUpdates />} />
          <Route path="/emergency" element={<EmergencyMode />} />
          <Route path="/education-hub" element={<PrivateEducation />} />
          <Route path="/export" element={<ExportCenter />} />
          <Route path="/admin" element={<AdminPanel />} />
        </Route>

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Suspense>
  );
}
