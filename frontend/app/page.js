import Link from 'next/link';
import Brand from '../components/Brand';
import CardPreview from '../components/CardPreview';

const steps = [
  ['01', 'Company Provisioning', 'Register your organization workspace and establish verified corporate ownership.'],
  ['02', 'Employee Roster Sync', 'Import 10 to 10,000+ employees via validated CSV or invite individual team members.'],
  ['03', 'Brand Standard Lock', 'Select or configure a company-approved card template to guarantee absolute brand consistency.'],
  ['04', 'Batch Issuance & QR', 'Administrators approve card requests in one click. Instant 300 DPI vector PDFs with QR verification.'],
];

const features = [
  ['01', 'Centralized Directory Sync', 'Search, filter, update, and manage thousands of employees across multi-location departments.'],
  ['02', 'Locked Brand Kit Standards', 'Enforce corporate typography, dimensions, and official logos. Zero off-brand or rogue printed cards.'],
  ['03', 'Traceable Approval Workflow', 'Complete transparency: see requester, employee list, and revision history before approving card batches.'],
  ['04', 'Tamper-Proof Verification', 'Every generated card includes a unique QR code leading to a verified digital credential page.'],
];

export default function HomePage() {
  return (
    <main className="marketing-page">
      {/* NAVIGATION */}
      <nav className="marketing-nav">
        <Link href="/" aria-label="BizCard home">
          <Brand />
        </Link>
        <div className="marketing-links">
          <a href="#workflow">How it Works</a>
          <a href="#features">Platform Features</a>
          <a href="#templates">Card Styles</a>
          <a href="#security">Enterprise Security</a>
        </div>
        <div className="nav-actions">
          <Link className="nav-signin" href="/login">
            Sign In
          </Link>
          <Link className="btn-secondary !text-xs !py-1.5 !px-3" href="/employee/register">
            Employee Portal
          </Link>
          <Link className="btn-primary !text-xs !py-1.5 !px-3.5" href="/register">
            Create Workspace →
          </Link>
        </div>
      </nav>

      {/* HERO SECTION */}
      <div className="hero-shell">
        <section className="hero-section">
          <div className="hero-copy">
            <span className="hero-kicker">
              <i /> Enterprise Visiting Card Infrastructure
            </span>
            <h1>
              Professional Visiting Cards.<br />
              <span>Managed with precision.</span>
            </h1>
            <p>
              Eliminate rogue printing, outdated titles, and scattered design files. Issue brand-locked, verified visiting cards across 10 to 10,000+ employees with built-in approvals, CSV roster sync, and QR verification.
            </p>
            <div className="hero-actions">
              <Link className="btn-primary !py-2.5 !px-5 !text-sm" href="/register">
                Create Company Workspace →
              </Link>
              <Link className="btn-secondary !py-2.5 !px-5 !text-sm" href="/employee/register">
                Employee Access Portal
              </Link>
            </div>
            <div className="hero-proof">
              <span>
                <strong>10,000+</strong> roster scale
              </span>
              <span>
                <strong>100%</strong> tenant isolation
              </span>
              <span>
                <strong>300 DPI</strong> print-ready
              </span>
              <span>
                <strong>QR</strong> verified PDFs
              </span>
            </div>
          </div>

          {/* APPLICATION WORKSPACE MOCKUP PREVIEW */}
          <div className="hero-visual">
            <div className="border border-slate-200/90 rounded-xl bg-white shadow-xl overflow-hidden">
              {/* Window Header */}
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                  </div>
                  <span className="font-medium text-slate-700 ml-2">BizCard Enterprise • Directory & Card Studio</span>
                </div>
                <span className="font-mono text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">
                  ● PRODUCTION READY
                </span>
              </div>

              {/* Window Body Split */}
              <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 items-center bg-slate-50/40">
                {/* Left: Mini Live Roster */}
                <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-2.5 shadow-sm">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs font-semibold text-slate-700">
                    <span>Verified Roster</span>
                    <span className="text-[10px] text-slate-400 font-mono">3 / 1,420 Active</span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between p-1.5 rounded bg-slate-50 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px]">AR</span>
                        <div>
                          <p className="font-semibold text-slate-900 leading-tight">Ayesha Rahman</p>
                          <p className="text-[10px] text-slate-500">Software Engineer</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">READY</span>
                    </div>
                    <div className="flex items-center justify-between p-1.5 rounded bg-slate-50 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px]">TH</span>
                        <div>
                          <p className="font-semibold text-slate-900 leading-tight">Tanvir Hasan</p>
                          <p className="text-[10px] text-slate-500">Sales Director</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">READY</span>
                    </div>
                    <div className="flex items-center justify-between p-1.5 rounded bg-slate-50 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px]">NA</span>
                        <div>
                          <p className="font-semibold text-slate-900 leading-tight">Nabila Ahmed</p>
                          <p className="text-[10px] text-slate-500">Product Lead</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">READY</span>
                    </div>
                  </div>
                </div>

                {/* Right: Visiting Card Mockup */}
                <div className="space-y-2">
                  <div className="relative rounded-lg overflow-hidden border border-slate-300 shadow-md">
                    <CardPreview
                      style="modern"
                      name="Ayesha Rahman"
                      designation="Software Engineer"
                      company="NORTHSTAR LABS"
                      email="ayesha@northstar.com"
                      phone="+880 1711 000000"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                    <span>Standard 3.5" × 2.0" (300 DPI)</span>
                    <span className="text-emerald-700 font-medium">✓ Safe-Zone Bleed Validated</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sub-note */}
            <div className="floating-note">
              <b>✓</b>
              <div>
                <span className="font-semibold text-xs">SOC2 & Enterprise Multi-Tenant Scoped</span>
                <small className="block">All company rosters isolated by cryptographic tenant IDs.</small>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* CORPORATE TRUST BAR */}
      <section className="signal-strip">
        <div>
          <span>ENTERPRISE ROSTER SYNC</span>
          <i>•</i>
          <span>ROLE-BASED APPROVAL GATES</span>
          <i>•</i>
          <span>PRINT-READY 300 DPI VECTORS</span>
          <i>•</i>
          <span>PUBLIC-SAFE QR VERIFICATION</span>
          <i>•</i>
          <span>100% TENANT ISOLATION</span>
        </div>
      </section>

      {/* 4-STEP WORKFLOW */}
      <section id="workflow" className="marketing-section">
        <div className="section-heading centered">
          <span className="section-chip">OPERATIONAL WORKFLOW</span>
          <h2>
            From company onboarding to<br />
            <em>print-ready cards in minutes.</em>
          </h2>
          <p>A single, traceable four-step pipeline engineered for scale and speed.</p>
        </div>
        <div className="step-grid">
          {steps.map(([number, title, copy]) => (
            <article key={number}>
              <span className="step-number">{number}</span>
              <div className="step-icon">
                {number === '01' ? '🏢' : number === '02' ? '👥' : number === '03' ? '🎨' : '✓'}
              </div>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      {/* PLATFORM FEATURES */}
      <section id="features" className="feature-stage">
        <div className="feature-stage-inner">
          <div className="feature-intro">
            <span className="section-chip dark">ENTERPRISE PLATFORM</span>
            <h2>
              Eliminate card chaos.<br />
              <em>Empower your team.</em>
            </h2>
            <p>
              BizCard transforms a fragmented manual printing process into an automated, brand-safe corporate operating system.
            </p>
            <div className="mt-6">
              <Link className="btn-primary bg-white !text-slate-900 border-white hover:!bg-slate-100" href="/register">
                Provision Workspace →
              </Link>
            </div>
          </div>
          <div className="feature-grid">
            {features.map(([n, title, copy]) => (
              <article key={n}>
                <span>{n}</span>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* TEMPLATE SHOWCASE */}
      <section id="templates" className="marketing-section">
        <div className="section-heading">
          <span className="section-chip">CURATED BRAND SYSTEM</span>
          <h2>
            Curated corporate styles.<br />
            <em>One unified identity.</em>
          </h2>
          <p>Select from established corporate aesthetics or configure custom brand rules for your enterprise.</p>
        </div>
        <div className="showcase-grid">
          {[
            ['classic', 'Classic Corporate', 'Timeless typography and formal structured layout for finance, legal, and institutions.', '01'],
            ['modern', 'Modern Tech', 'High-contrast contemporary styling engineered for technology and fast-growing startups.', '02'],
            ['minimal', 'Minimal Executive', 'Subtle, quiet, understated elegance focusing on clean negative space and tactile paper stocks.', '03'],
          ].map(([style, name, copy, n]) => (
            <article key={style}>
              <div className="template-number">{n}</div>
              <CardPreview style={style} name="Ayesha Rahman" designation="Product Designer" company="NORTHSTAR" />
              <div>
                <h3>{name}</h3>
                <p>{copy}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ADMINISTRATIVE APPROVAL DEMO */}
      <section className="marketing-section review-section">
        <div className="review-copy">
          <span className="section-chip">APPROVAL GOVERNANCE</span>
          <h2>
            Administrative oversight<br />
            <em>with zero bottlenecks.</em>
          </h2>
          <p>
            Company administrators maintain complete control over card budgets and branding without needing to manually design each employee card.
          </p>
          <ul className="feature-list">
            <li>Single and bulk card requests</li>
            <li>Decision notes & audit logging</li>
            <li>Automated duplicate protection</li>
            <li>Instant PDF vector bundle download</li>
          </ul>
        </div>
        <div className="approval-mock">
          <div className="mock-top">
            <span>Card Request Batch <b>#1042</b></span>
            <em>Pending Admin Decision</em>
          </div>
          <div className="mock-company">
            <span className="w-8 h-8 rounded-md bg-slate-900 text-white font-bold flex items-center justify-center text-xs">
              N
            </span>
            <div>
              <strong className="text-sm font-semibold text-slate-900">Northstar Labs Inc.</strong>
              <small className="block text-[11px] text-slate-500">Submitted by Ayesha Rahman</small>
            </div>
            <span className="mock-template">Style: Modern Tech</span>
          </div>
          {['Tanvir Hasan · Sales Director', 'Nabila Ahmed · Product Lead', 'Farhan Kabir · Principal Engineer'].map((name, i) => (
            <div className="mock-row" key={name}>
              <span>
                <b>{String(i + 1).padStart(2, '0')}</b>
                {name}
              </span>
              <i>Verified</i>
            </div>
          ))}
          <button type="button">Approve & Generate 3 Cards</button>
        </div>
      </section>

      {/* ENTERPRISE SECURITY */}
      <section id="security" className="security-section">
        <div>
          <span className="section-chip dark">SECURITY & COMPLIANCE</span>
          <h2>
            Architected for enterprise security<br />
            <em>and complete tenant privacy.</em>
          </h2>
        </div>
        <div className="security-grid">
          <article>
            <span>01</span>
            <strong>Multi-Tenant Data Isolation</strong>
            <p>Every database query is strictly scoped by company ID, guaranteeing strict separation between corporate tenants.</p>
          </article>
          <article>
            <span>02</span>
            <strong>Role-Based Access (RBAC)</strong>
            <p>Strict separation between System Admins, Company Admins, and Employees powered by Argon2 and cryptographically signed JWTs.</p>
          </article>
          <article>
            <span>03</span>
            <strong>Cryptographic Verification</strong>
            <p>Every generated visiting card carries a tamper-proof QR token allowing instant public validation without exposing internal data.</p>
          </article>
        </div>
      </section>

      {/* FINAL CALL TO ACTION */}
      <section className="final-cta">
        <span className="section-chip">GET STARTED TODAY</span>
        <h2>
          Modernize visiting cards across<br />
          <em>your entire company workspace.</em>
        </h2>
        <p>
          Join hundreds of companies provisioning verified, brand-locked visiting cards with zero administrative friction.
        </p>
        <div className="flex justify-center gap-3">
          <Link className="btn-primary !py-2.5 !px-6 !text-sm" href="/register">
            Create Company Workspace →
          </Link>
          <Link className="btn-secondary !py-2.5 !px-6 !text-sm" href="/login">
            Sign In to Existing Account
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="marketing-footer">
        <div className="max-w-[1240px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="footer-brand">
            <Brand light />
            <p className="mt-2 text-xs text-slate-400">
              The high-precision visiting card SaaS for modern enterprises and scaling teams.
            </p>
          </div>
          <div className="footer-links flex flex-wrap gap-12 md:justify-end">
            <div>
              <b>Platform</b>
              <a href="#workflow">How it Works</a>
              <a href="#features">Features</a>
              <a href="#templates">Card Styles</a>
              <a href="#security">Security</a>
            </div>
            <div>
              <b>Workspace</b>
              <Link href="/login">Sign In</Link>
              <Link href="/register">Register Company</Link>
              <Link href="/employee/register">Employee Portal</Link>
            </div>
          </div>
          <div className="footer-bottom col-span-full flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 pt-4 border-t border-slate-800">
            <span>© {new Date().getFullYear()} BizCard Inc. All rights reserved.</span>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>All Systems Operational</span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
