import Link from 'next/link';
import Brand from '../../components/Brand';

const accountTypes = [
  { href: '/register/company', eyebrow: 'FOR COMPANIES', title: 'Bring your team under one brand.', body: 'Create a company workspace to manage people, approve memberships and make branded cards at scale.', action: 'Register a company', icon: '◆', points: ['Company profile & brand kit', 'Employee approvals and teams', 'Shared card templates'], theme: 'company' },
  { href: '/employee/register', eyebrow: 'FOR PROFESSIONALS', title: 'Create cards that move with you.', body: 'Start your own card workspace now. Join a company later when you are ready to use its official brand.', action: 'Create employee account', icon: '✦', points: ['Personal card workspace', 'Join a verified company', 'Your own card history'], theme: 'employee' },
];

export default function RegisterPage() {
  return <main className="register-choice-page">
    <aside className="register-choice-aside">
      <div className="choice-orb choice-orb-one" /><div className="choice-orb choice-orb-two" />
      <Link href="/" aria-label="Back to BizCard home"><Brand light /></Link>
      <div className="choice-aside-copy"><span className="story-label">BIZCARD WORKSPACE</span><h1>A better first<br />impression starts<br /><em>right here.</em></h1><p>Choose the workspace that matches the way you create, share and manage professional cards.</p></div>
      <div className="choice-aside-note"><span>01</span><p><strong>Start simply</strong><small>You can build your profile first and connect your organization when it makes sense.</small></p></div>
    </aside>
    <section className="register-choice-main">
      <header className="choice-topbar"><Link className="choice-mobile-brand" href="/"><Brand /></Link><p>Already have an account? <Link href="/login">Sign in <span>→</span></Link></p></header>
      <div className="choice-content"><span className="section-chip">CHOOSE YOUR WORKSPACE</span><h2>How will you use BizCard?</h2><p className="choice-intro">Both paths are built for polished, share-ready visiting cards. Pick the one that fits today — you can grow from there.</p>
        <div className="register-role-grid">{accountTypes.map((account) => <Link href={account.href} className={`register-role-card ${account.theme}`} key={account.href}>
          <div className="role-card-top"><span className="role-icon" aria-hidden="true">{account.icon}</span><span className="role-eyebrow">{account.eyebrow}</span><span className="role-arrow" aria-hidden="true">↗</span></div>
          <h3>{account.title}</h3><p>{account.body}</p><ul>{account.points.map(point => <li key={point}><span>✓</span>{point}</li>)}</ul><span className="role-action">{account.action} <b>→</b></span>
        </Link>)}</div>
        <p className="choice-reassurance"><span>✓</span> Secure account setup · Your details stay private · No card required</p>
      </div>
    </section>
  </main>;
}
