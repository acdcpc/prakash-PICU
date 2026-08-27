import { Link } from 'react-router-dom';
import { ArrowRight, Baby, BookOpenCheck, HeartPulse, ShieldCheck, Sparkles, Stethoscope } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const FEATURES = [
  { icon: BookOpenCheck, title: 'Fast clinical references', text: 'Weight-based tools, scores, emergency references, and reviewed Teddy Bear monographs in one calm workspace.', tone: 'teal' },
  { icon: Baby, title: 'Growth with context', text: 'WHO growth visualization with AD and Bikram Sambat date entry for the children you follow.', tone: 'violet' },
  { icon: ShieldCheck, title: 'Private by design', text: 'Authenticated records, owner-scoped access, signed images, and clinical audit boundaries built into the workflow.', tone: 'blue' },
];

export default function Home() {
  const { user } = useAuth();
  return (
    <div className="public-home">
      <section className="public-hero-v2">
        <div className="public-hero-copy"><span className="eyebrow"><Sparkles size={14} /> A calmer way to care for children</span><h1>Clinical clarity for<br /><em>every pediatric day.</em></h1><p>Prakash Pediatrics brings the references, calculations, and child-growth context you need closer to the next decision.</p><div className="public-hero-actions"><Link to={user ? '/dashboard' : '/login'} className="btn btn-primary btn-lg">{user ? 'Open workspace' : 'Start your workspace'} <ArrowRight size={17} /></Link><Link to="/about" className="btn btn-ghost btn-lg">See how it works</Link></div><div className="public-trust-row"><span><ShieldCheck size={15} /> Private clinician workspace</span><span><Stethoscope size={15} /> Built with Nepal in mind</span></div></div>
        <div className="public-hero-art" aria-hidden="true"><div className="hero-art-glow" /><div className="hero-art-ring ring-a" /><div className="hero-art-ring ring-b" /><div className="hero-art-card card-a"><span className="mini-icon teal"><Baby size={16} /></span><div><strong>Child growth</strong><small>Track the whole story</small></div><span className="mini-dot" /></div><div className="hero-art-card card-b"><span className="mini-icon coral"><HeartPulse size={16} /></span><div><strong>Next decision</strong><small>Ready when you are</small></div><span className="mini-arrow"><ArrowRight size={14} /></span></div><div className="hero-art-heart"><HeartShape /></div><div className="hero-art-spark spark-one" /><div className="hero-art-spark spark-two" /></div>
      </section>
      <section className="public-feature-section"><div className="public-section-heading"><span className="eyebrow">One thoughtful home base</span><h2>Made for the pace of pediatric care.</h2><p>Less time hunting through pages. More time listening, checking, and caring.</p></div><div className="public-feature-grid">{FEATURES.map((feature) => { const Icon = feature.icon; return <article className="public-feature-card" key={feature.title}><span className={`public-feature-icon ${feature.tone}`}><Icon size={21} /></span><h3>{feature.title}</h3><p>{feature.text}</p><Link to={user ? '/dashboard' : '/login'}>Explore workspace <ArrowRight size={14} /></Link></article>; })}</div></section>
      <footer className="public-footer"><span>© {new Date().getFullYear()} Prakash Pediatrics</span><span>Clinical tools for professionals looking after children</span></footer>
    </div>
  );
}

function HeartShape() {
  return <svg viewBox="0 0 100 100" width="100" height="100" fill="none"><path d="M50 83S18 64 18 39c0-11 8-19 19-19 7 0 12 4 16 10 4-6 9-10 16-10 11 0 19 8 19 19 0 25-32 44-32 44Z" fill="currentColor" /><path d="M29 39c0-8 5-14 13-14" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity=".8" /></svg>;
}
