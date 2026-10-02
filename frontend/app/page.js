import Link from 'next/link';
import Brand from '../components/Brand';
import CardPreview from '../components/CardPreview';

const steps = [
  ['01', 'Create your workspace', 'Register your company and submit it for a quick administrator review.'],
  ['02', 'Bring your people', 'Add employees one by one or import a validated CSV for the whole team.'],
  ['03', 'Choose your signature', 'Preview a curated card style and make it the company standard.'],
  ['04', 'Approve and share', 'Approved requests become verified, downloadable employee PDF cards.'],
];

export default function HomePage() {
  return <main className="marketing-page">
    <nav className="marketing-nav"><Link href="/"><Brand /></Link><div className="hidden items-center gap-8 text-sm text-slate-600 md:flex"><a href="#product">Product</a><a href="#templates">Templates</a><a href="#security">Security</a></div><div className="flex items-center gap-2"><Link className="btn-quiet" href="/login">Sign in</Link><Link className="btn-primary" href="/register">Start your workspace</Link></div></nav>

    <section className="hero-section"><div className="hero-copy"><span className="hero-kicker">VISITING CARDS, BEAUTIFULLY MANAGED</span><h1>Your team deserves a better first impression.</h1><p>Manage every employee, keep every card on brand, and turn approved requests into verified PDF visiting cards from one calm workspace.</p><div className="mt-8 flex flex-wrap gap-3"><Link className="btn-primary hero-cta" href="/register">Create your company workspace →</Link><a className="btn-secondary hero-cta" href="#product">See how it works</a></div><div className="hero-proof"><span><strong>3</strong> curated templates</span><span><strong>100%</strong> company isolated</span><span><strong>QR</strong> verified cards</span></div></div><div className="hero-visual"><div className="hero-card hero-card-back"><CardPreview style="minimal" name="Tanvir Hasan" designation="Sales Manager" company="NORTHSTAR" /></div><div className="hero-card hero-card-front"><CardPreview style="modern" name="Ayesha Rahman" designation="Software Engineer" company="NORTHSTAR" /></div><span className="floating-note">✓ Approved & ready</span></div></section>

    <section className="trust-strip"><span>Built for modern teams</span><b>Company approval</b><b>Employee management</b><b>Brand consistency</b><b>Verified PDFs</b></section>

    <section id="product" className="marketing-section"><div className="section-heading"><p className="eyebrow">ONE CONNECTED WORKFLOW</p><h2>From company registration to a card worth sharing.</h2><p>No scattered spreadsheets, design handoffs, or uncertain approval status. Every step lives in one traceable flow.</p></div><div className="step-grid">{steps.map(([number, title, copy]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{copy}</p></article>)}</div></section>

    <section id="templates" className="marketing-section template-showcase"><div className="section-heading"><p className="eyebrow">CURATED DESIGN SYSTEM</p><h2>Three styles. One unmistakable identity.</h2><p>Choose the character that fits your company. Every employee stays consistent without needing a designer.</p></div><div className="showcase-grid">{[['classic','Classic','Confident and traditional.'],['modern','Modern','Bold, sharp, and contemporary.'],['minimal','Minimal','Quiet, refined, and clear.']].map(([style,name,copy]) => <article key={style}><CardPreview style={style} name="Ayesha Rahman" designation="Product Designer" company="NORTHSTAR" /><h3>{name}</h3><p>{copy}</p></article>)}</div></section>

    <section className="marketing-section feature-split"><div><p className="eyebrow">DESIGNED FOR REAL OPERATIONS</p><h2>Give every decision the context it needs.</h2><p>Administrators see who submitted a company or card request, which employees are included, the selected design, and any previous decision reason before they approve.</p><ul className="feature-list"><li>Single and bulk card requests</li><li>Manual employee editing and CSV import</li><li>Company logo and employee photo support</li><li>Bulk ZIP and employee CSV export</li></ul></div><div className="approval-mock"><div className="mock-top"><span>Card request #1042</span><b>Pending review</b></div><div className="mock-company"><span className="company-mark">N</span><div><strong>Northstar Labs</strong><small>Requested by Ayesha Rahman</small></div></div>{['Tanvir Hasan · Sales Manager','Nabila Ahmed · Product Designer','Farhan Kabir · Engineer'].map(name => <div className="mock-row" key={name}><span>{name}</span><i>Ready</i></div>)}<button>Approve & generate 3 cards</button></div></section>

    <section id="security" className="security-section"><div><p className="eyebrow">SECURITY BY DESIGN</p><h2>Your company data stays your company data.</h2></div><div className="security-grid"><article><strong>Tenant isolation</strong><p>Every company-owned query is scoped by company ID at the API layer.</p></article><article><strong>Role-based access</strong><p>JWT authentication and backend RBAC protect every operational action.</p></article><article><strong>Public-safe verification</strong><p>QR pages confirm a card without exposing private contact information.</p></article></div></section>

    <section className="final-cta"><p className="eyebrow">A BETTER FIRST IMPRESSION STARTS HERE</p><h2>Bring your team and your brand together.</h2><p>Set up your company workspace, choose a signature design, and create verified cards your people are proud to share.</p><Link className="btn-primary hero-cta mt-7" href="/register">Get started with BizCard →</Link></section>

    <footer className="marketing-footer"><Brand light /><p>Professional cards. Controlled workflow. Confident teams.</p><div><Link href="/login">Sign in</Link><Link href="/register">Register</Link></div></footer>
  </main>;
}
