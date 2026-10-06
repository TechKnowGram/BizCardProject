import Link from 'next/link';
import Brand from '../components/Brand';
import CardPreview from '../components/CardPreview';

const steps = [
  ['01', 'Create your workspace', 'Register your company and send the profile for a quick administrator review.', 'spark-coral'],
  ['02', 'Bring your people', 'Add employees manually or import a validated CSV when the whole team is ready.', 'spark-cyan'],
  ['03', 'Pick your signature', 'Choose a curated card style and keep every employee perfectly on brand.', 'spark-yellow'],
  ['04', 'Approve. Generate. Share.', 'Approved requests become verified PDF cards, ready to download or share.', 'spark-violet'],
];

const features = [
  ['01', 'People, organized', 'Search, edit, import and manage every employee from one focused workspace.'],
  ['02', 'Brand, protected', 'A single approved template keeps every card consistent across the company.'],
  ['03', 'Requests, visible', 'See the requester, employees, template and decision history before approval.'],
  ['04', 'Cards, verified', 'Every generated PDF includes a public-safe QR verification experience.'],
];

export default function HomePage() {
  return <main className="marketing-page">
    <div className="hero-shell">
      <nav className="marketing-nav">
        <Link href="/" aria-label="BizCard home"><Brand light /></Link>
        <div className="marketing-links"><a href="#workflow">How it works</a><a href="#templates">Templates</a><a href="#security">Security</a></div>
        <div className="nav-actions"><Link className="nav-signin" href="/login">Sign in</Link><Link className="btn-sun" href="/register">Start free <span>↗</span></Link></div>
      </nav>

      <section className="hero-section">
        <div className="hero-doodle hero-doodle-one">✦</div><div className="hero-doodle hero-doodle-two">⌁</div>
        <div className="hero-copy">
          <span className="hero-kicker"><i /> THE SMARTER COMPANY CARD WORKSPACE</span>
          <h1>Small card.<br /><span>Big impression.</span></h1>
          <p>Bring your people, brand and approval flow together. Create polished, verified visiting cards without the design chaos.</p>
          <div className="hero-actions"><Link className="btn-sun hero-cta" href="/register">Build your company workspace <span>↗</span></Link><a className="hero-text-link" href="#workflow">See the workflow <b>↓</b></a></div>
          <div className="hero-proof"><span><strong>3</strong> curated styles</span><span><strong>100%</strong> company isolated</span><span><strong>QR</strong> verified PDFs</span></div>
        </div>
        <div className="hero-visual">
          <span className="orbit orbit-one" /><span className="orbit orbit-two" /><span className="orbit orbit-three" />
          <div className="hero-card hero-card-back"><CardPreview style="minimal" name="Tanvir Hasan" designation="Sales Manager" company="NORTHSTAR" /></div>
          <div className="hero-card hero-card-front"><CardPreview style="modern" name="Ayesha Rahman" designation="Software Engineer" company="NORTHSTAR" /></div>
          <div className="floating-note"><b>✓</b><span>Approved & ready<small>3 cards generated</small></span></div>
          <div className="floating-qr"><span>▦</span><small>Verified</small></div>
        </div>
      </section>
      <div className="hero-wave" />
    </div>

    <section className="signal-strip"><p>Everything your card workflow needs</p><div><span>COMPANY APPROVAL</span><i>✦</i><span>EMPLOYEE MANAGEMENT</span><i>✦</i><span>BRAND CONSISTENCY</span><i>✦</i><span>VERIFIED PDF CARDS</span></div></section>

    <section id="workflow" className="marketing-section workflow-section">
      <div className="section-heading centered"><span className="section-chip">THE WHOLE JOURNEY</span><h2>From company signup to<br /><em>a card worth sharing.</em></h2><p>One clear, traceable workflow. Every person knows what happens next.</p></div>
      <div className="step-grid">{steps.map(([number, title, copy, color]) => <article key={number} className={color}><span className="step-number">{number}</span><div className="step-icon">{number === '01' ? '⌂' : number === '02' ? '♙' : number === '03' ? '✦' : '✓'}</div><h3>{title}</h3><p>{copy}</p></article>)}</div>
    </section>

    <section className="feature-stage">
      <div className="feature-stage-inner"><div className="feature-intro"><span className="section-chip dark">BUILT FOR REAL TEAMS</span><h2>Less chasing.<br /><em>More creating.</em></h2><p>BizCard turns a scattered operational task into a simple, confident system.</p><Link className="btn-sun" href="/register">Start your workspace <span>↗</span></Link></div><div className="feature-grid">{features.map(([n, title, copy]) => <article key={n}><span>{n}</span><h3>{title}</h3><p>{copy}</p></article>)}</div></div>
    </section>

    <section id="templates" className="marketing-section template-showcase">
      <div className="section-heading"><span className="section-chip">CURATED DESIGN SYSTEM</span><h2>Three moods.<br /><em>One unmistakable team.</em></h2><p>Choose the character that fits your company. No designer or custom setup required.</p></div>
      <div className="showcase-grid">{[['classic','Classic','Confident and timeless.','01'],['modern','Modern','Bold and energetic.','02'],['minimal','Minimal','Quiet and refined.','03']].map(([style,name,copy,n]) => <article key={style}><div className="template-number">{n}</div><CardPreview style={style} name="Ayesha Rahman" designation="Product Designer" company="NORTHSTAR" /><div><h3>{name}</h3><p>{copy}</p></div></article>)}</div>
    </section>

    <section className="marketing-section review-section"><div className="review-copy"><span className="section-chip">DECIDE WITH CONTEXT</span><h2>A clear review.<br /><em>A confident yes.</em></h2><p>Administrators see the company, requester, employees and selected template before making a decision.</p><ul className="feature-list"><li>Single and bulk card requests</li><li>Company and request decision notes</li><li>Complete audit trail</li><li>Duplicate-safe PDF generation</li></ul></div><div className="approval-mock"><div className="mock-top"><span>Card request <b>#1042</b></span><em>Pending review</em></div><div className="mock-company"><span className="company-mark">N</span><div><strong>Northstar Labs</strong><small>Requested by Ayesha Rahman</small></div><span className="mock-template">Modern</span></div>{['Tanvir Hasan · Sales Manager','Nabila Ahmed · Product Designer','Farhan Kabir · Engineer'].map((name, i) => <div className="mock-row" key={name}><span><b>{String(i + 1).padStart(2, '0')}</b>{name}</span><i>Ready</i></div>)}<button>Approve & generate 3 cards <span>↗</span></button></div></section>

    <section id="security" className="security-section"><div className="security-orb">✦</div><div><span className="section-chip dark">SECURITY BY DESIGN</span><h2>Your company data stays<br /><em>your company data.</em></h2></div><div className="security-grid"><article><span>01</span><strong>Tenant isolation</strong><p>Every company-owned query is scoped by company ID.</p></article><article><span>02</span><strong>Role-based access</strong><p>JWT authentication and backend RBAC protect each action.</p></article><article><span>03</span><strong>Public-safe verification</strong><p>QR pages confirm validity without exposing private details.</p></article></div></section>

    <section className="final-cta"><div className="cta-scribble">⌁</div><span className="section-chip">READY WHEN YOU ARE</span><h2>Make the next introduction<br /><em>impossible to forget.</em></h2><p>Create your company workspace and turn your team into one confident brand.</p><Link className="btn-sun hero-cta" href="/register">Get started with BizCard <span>↗</span></Link></section>

    <footer className="marketing-footer"><div className="footer-brand"><Brand light /><p>Professional cards.<br />Beautifully managed.</p></div><div className="footer-links"><div><b>Product</b><a href="#workflow">How it works</a><a href="#templates">Templates</a><a href="#security">Security</a></div><div><b>Workspace</b><Link href="/login">Sign in</Link><Link href="/register">Register company</Link></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} BizCard</span><span>Built for memorable first impressions.</span></div></footer>
  </main>;
}
