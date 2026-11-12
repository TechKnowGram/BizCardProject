with open("frontend/app/globals.css", "r", encoding="utf-8") as f:
    css = f.read()

# Replace the marketing styles with clean enterprise B2B styling
old_hero_marker = ".marketing-page { background:var(--cream); color:var(--ink); }"
if old_hero_marker in css:
    print("Found old marketing styles in globals.css")

# Let's write the comprehensive modern marketing stylesheet
marketing_css = """
/* ==========================================================================
   BIZCARD ENTERPRISE MARKETING STYLES (STRIPE / LINEAR / RAMP BENCHMARK)
   ========================================================================== */

.marketing-page {
  background: #f8fafc !important;
  color: #0f172a !important;
  min-height: 100vh !important;
  overflow-x: hidden !important;
  font-family: var(--font-ui) !important;
}

/* Navigation */
.marketing-nav {
  position: sticky !important;
  top: 0 !important;
  z-index: 50 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  width: 100% !important;
  max-width: 1240px !important;
  margin: 0 auto !important;
  padding: 16px 24px !important;
  border-bottom: 1px solid #e2e8f0 !important;
  background: rgba(255, 255, 255, 0.95) !important;
  backdrop-filter: blur(8px) !important;
}
.marketing-links {
  display: flex !important;
  align-items: center !important;
  gap: 28px !important;
  font-size: 13px !important;
  font-weight: 500 !important;
  color: #475569 !important;
}
.marketing-links a:hover {
  color: #0f172a !important;
}
.nav-actions {
  display: flex !important;
  align-items: center !important;
  gap: 16px !important;
}
.nav-signin {
  font-size: 13px !important;
  font-weight: 500 !important;
  color: #475569 !important;
  padding: 6px 10px !important;
  border-radius: 6px !important;
  transition: all 0.15s !important;
}
.nav-signin:hover {
  color: #0f172a !important;
  background: #f1f5f9 !important;
}
.btn-sun {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 8px !important;
  min-height: 38px !important;
  padding: 0 16px !important;
  background: #0f172a !important;
  color: #ffffff !important;
  border: 1px solid #0f172a !important;
  border-radius: 6px !important;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05) !important;
  font-size: 13px !important;
  font-weight: 500 !important;
  transition: all 0.15s !important;
}
.btn-sun span {
  display: inline !important;
  background: transparent !important;
  color: #94a3b8 !important;
  width: auto !important;
  height: auto !important;
}
.btn-sun:hover {
  background: #1e293b !important;
  border-color: #1e293b !important;
  transform: none !important;
  color: #ffffff !important;
}

/* Hero Shell */
.hero-shell {
  background: #ffffff !important;
  border-bottom: 1px solid #e2e8f0 !important;
  position: relative !important;
  overflow: hidden !important;
}
.hero-shell::before,
.hero-shell::after {
  display: none !important;
}

.hero-section {
  display: grid !important;
  grid-template-columns: 1fr 1fr !important;
  align-items: center !important;
  gap: 48px !important;
  max-width: 1240px !important;
  min-height: auto !important;
  margin: 0 auto !important;
  padding: 64px 24px 80px !important;
}
.hero-doodle {
  display: none !important;
}
.hero-wave {
  display: none !important;
}

.hero-kicker {
  display: inline-flex !important;
  align-items: center !important;
  gap: 8px !important;
  padding: 6px 12px !important;
  border: 1px solid #e2e8f0 !important;
  border-radius: 9999px !important;
  background: #f8fafc !important;
  color: #475569 !important;
  font-size: 11px !important;
  font-weight: 600 !important;
  letter-spacing: 0.04em !important;
  text-transform: uppercase !important;
  backdrop-filter: none !important;
}
.hero-kicker i {
  width: 6px !important;
  height: 6px !important;
  border-radius: 50% !important;
  background: #10b981 !important;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2) !important;
}

.hero-copy h1 {
  max-width: 600px !important;
  margin-top: 20px !important;
  font-size: clamp(38px, 4.2vw, 54px) !important;
  line-height: 1.1 !important;
  letter-spacing: -0.03em !important;
  font-weight: 800 !important;
  color: #0f172a !important;
  font-family: var(--font-ui) !important;
}
.hero-copy h1 span {
  color: #2563eb !important;
  font-family: inherit !important;
  font-style: normal !important;
  font-weight: 800 !important;
  letter-spacing: -0.03em !important;
}
.hero-copy > p {
  max-width: 520px !important;
  margin-top: 18px !important;
  color: #475569 !important;
  font-size: 15px !important;
  line-height: 1.65 !important;
}

.hero-actions {
  display: flex !important;
  align-items: center !important;
  gap: 14px !important;
  margin-top: 30px !important;
}
.hero-text-link {
  display: inline-flex !important;
  align-items: center !important;
  gap: 6px !important;
  color: #475569 !important;
  font-size: 13px !important;
  font-weight: 500 !important;
  padding: 8px 12px !important;
}
.hero-text-link b {
  display: none !important;
}
.hero-text-link:hover {
  color: #0f172a !important;
}

.hero-proof {
  display: flex !important;
  align-items: center !important;
  gap: 24px !important;
  margin-top: 40px !important;
  padding-top: 24px !important;
  border-top: 1px solid #e2e8f0 !important;
  color: #64748b !important;
  font-size: 12px !important;
}
.hero-proof span {
  display: flex !important;
  align-items: baseline !important;
  gap: 6px !important;
  min-width: 0 !important;
  padding-right: 0 !important;
  margin-right: 0 !important;
  border-right: none !important;
}
.hero-proof strong {
  color: #0f172a !important;
  font-size: 16px !important;
  font-weight: 700 !important;
  font-variant-numeric: tabular-nums !important;
}

/* Hero Visual / Mockup Frame */
.hero-visual {
  position: relative !important;
  min-height: auto !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 16px !important;
}
.hero-visual::before {
  display: none !important;
}
.orbit {
  display: none !important;
}

.hero-card {
  width: 100% !important;
  position: relative !important;
  top: auto !important;
  right: auto !important;
  bottom: auto !important;
  left: auto !important;
  transform: none !important;
  box-shadow: none !important;
}
.hero-card .card-preview {
  min-height: auto !important;
  padding: 24px !important;
  border-radius: 8px !important;
  border: 1px solid #e2e8f0 !important;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.06) !important;
}
.hero-card-back {
  display: none !important;
}
.hero-card-front {
  position: relative !important;
  transform: none !important;
}

.floating-note {
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
  position: relative !important;
  right: auto !important;
  bottom: auto !important;
  padding: 10px 14px !important;
  border: 1px solid #e2e8f0 !important;
  border-radius: 8px !important;
  background: #ffffff !important;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04) !important;
  color: #0f172a !important;
  font-size: 12px !important;
}
.floating-note b {
  display: grid !important;
  width: 20px !important;
  height: 20px !important;
  place-items: center !important;
  border-radius: 50% !important;
  background: #ecfdf5 !important;
  color: #065f46 !important;
  font-size: 11px !important;
}
.floating-note small {
  display: block !important;
  color: #64748b !important;
  font-size: 11px !important;
}

.floating-qr {
  display: none !important;
}

/* Trust / Signal Strip */
.signal-strip {
  background: #ffffff !important;
  border-bottom: 1px solid #e2e8f0 !important;
  padding: 20px 0 !important;
  transform: none !important;
  color: #475569 !important;
}
.signal-strip p {
  display: none !important;
}
.signal-strip div {
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
  flex-wrap: wrap !important;
  gap: 32px !important;
  font-size: 11px !important;
  font-weight: 600 !important;
  letter-spacing: 0.08em !important;
  color: #64748b !important;
}
.signal-strip i {
  color: #cbd5e1 !important;
  font-size: 12px !important;
}

/* Sections */
.marketing-section {
  width: 100% !important;
  max-width: 1240px !important;
  margin: 0 auto !important;
  padding: 80px 24px !important;
}

.section-heading {
  max-width: 720px !important;
  margin-bottom: 48px !important;
}
.section-heading.centered {
  margin-inline: auto !important;
  text-align: center !important;
}
.section-chip {
  display: inline-flex !important;
  border: 1px solid #e2e8f0 !important;
  border-radius: 9999px !important;
  background: #ffffff !important;
  padding: 4px 10px !important;
  color: #2563eb !important;
  font-size: 10px !important;
  font-weight: 700 !important;
  letter-spacing: 0.08em !important;
  text-transform: uppercase !important;
  box-shadow: none !important;
}
.section-chip.dark {
  border-color: #334155 !important;
  background: #1e293b !important;
  color: #60a5fa !important;
}

.section-heading h2,
.feature-intro h2,
.review-copy h2,
.security-section h2,
.final-cta h2 {
  margin-top: 14px !important;
  font-size: clamp(28px, 3.2vw, 40px) !important;
  line-height: 1.15 !important;
  letter-spacing: -0.03em !important;
  font-weight: 800 !important;
  color: #0f172a !important;
  font-family: var(--font-ui) !important;
}
.section-heading h2 em,
.review-copy h2 em,
.final-cta h2 em,
.feature-intro h2 em,
.security-section h2 em {
  color: #2563eb !important;
  font-family: inherit !important;
  font-style: normal !important;
}
.section-heading > p:last-child {
  margin-top: 12px !important;
  color: #475569 !important;
  font-size: 14px !important;
  line-height: 1.6 !important;
}

/* Steps Grid */
.step-grid {
  display: grid !important;
  grid-template-columns: repeat(4, 1fr) !important;
  gap: 16px !important;
  border: 0 !important;
}
.step-grid article {
  min-height: auto !important;
  border: 1px solid #e2e8f0 !important;
  border-radius: 8px !important;
  background: #ffffff !important;
  padding: 24px !important;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04) !important;
  transition: all 0.15s ease !important;
}
.step-grid article:hover {
  transform: none !important;
  border-color: #cbd5e1 !important;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05) !important;
}
.step-number {
  color: #2563eb !important;
  font-size: 12px !important;
  font-weight: 700 !important;
  font-family: var(--font-mono) !important;
}
.step-icon {
  display: flex !important;
  width: 36px !important;
  height: 36px !important;
  place-items: center !important;
  justify-content: center !important;
  margin: 16px 0 12px !important;
  border-radius: 6px !important;
  background: #f1f5f9 !important;
  color: #0f172a !important;
  font-size: 16px !important;
  transform: none !important;
}
.spark-coral .step-icon,
.spark-cyan .step-icon,
.spark-yellow .step-icon,
.spark-violet .step-icon {
  background: #f1f5f9 !important;
  color: #0f172a !important;
}
.step-grid h3 {
  font-size: 15px !important;
  font-weight: 600 !important;
  color: #0f172a !important;
  text-align: left !important;
}
.step-grid p {
  margin-top: 6px !important;
  font-size: 12px !important;
  color: #64748b !important;
  line-height: 1.6 !important;
  text-align: left !important;
}

/* Feature Stage */
.feature-stage {
  background: #0f172a !important;
  color: #ffffff !important;
  padding: 80px 24px !important;
}
.feature-stage::before {
  display: none !important;
}
.feature-stage-inner {
  display: grid !important;
  grid-template-columns: 1fr 1.2fr !important;
  gap: 64px !important;
  max-width: 1240px !important;
  margin: 0 auto !important;
  padding: 0 !important;
}
.feature-intro h2 {
  color: #ffffff !important;
}
.feature-intro > p {
  color: #94a3b8 !important;
}
.feature-grid {
  display: grid !important;
  grid-template-columns: 1fr 1fr !important;
  gap: 16px !important;
}
.feature-grid article {
  min-height: auto !important;
  border: 1px solid #1e293b !important;
  border-radius: 8px !important;
  background: #1e293b/60 !important;
  padding: 24px !important;
  box-shadow: none !important;
  transition: all 0.15s !important;
}
.feature-grid article:hover {
  background: #1e293b !important;
  transform: none !important;
}
.feature-grid article > span {
  color: #38bdf8 !important;
  font-family: var(--font-mono) !important;
  font-size: 12px !important;
}
.feature-grid h3 {
  margin-top: 12px !important;
  font-size: 16px !important;
  font-weight: 600 !important;
  color: #ffffff !important;
}
.feature-grid p {
  margin-top: 6px !important;
  color: #94a3b8 !important;
  font-size: 12px !important;
  line-height: 1.6 !important;
}

/* Template Showcase */
.template-showcase {
  max-width: 1240px !important;
  margin: 0 auto !important;
}
.showcase-grid {
  display: grid !important;
  grid-template-columns: repeat(3, 1fr) !important;
  gap: 20px !important;
}
.showcase-grid article {
  border: 1px solid #e2e8f0 !important;
  border-radius: 8px !important;
  background: #ffffff !important;
  padding: 20px !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04) !important;
  transform: none !important;
  transition: all 0.15s !important;
}
.showcase-grid article:nth-child(2),
.showcase-grid article:hover,
.showcase-grid article:nth-child(2):hover {
  transform: none !important;
  border-color: #cbd5e1 !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06) !important;
}
.template-number {
  position: absolute !important;
  top: 16px !important;
  right: 16px !important;
  width: 24px !important;
  height: 24px !important;
  border-radius: 4px !important;
  background: #f1f5f9 !important;
  color: #475569 !important;
  font-family: var(--font-mono) !important;
  font-size: 10px !important;
  font-weight: 600 !important;
  box-shadow: none !important;
}
.showcase-grid h3 {
  font-size: 16px !important;
  font-weight: 600 !important;
  margin-top: 16px !important;
  color: #0f172a !important;
}
.showcase-grid p {
  color: #64748b !important;
  font-size: 12px !important;
  margin-top: 4px !important;
}

/* Review Section */
.review-section {
  display: grid !important;
  grid-template-columns: 1fr 1fr !important;
  gap: 64px !important;
  align-items: center !important;
}
.feature-list {
  display: grid !important;
  grid-template-columns: 1fr 1fr !important;
  gap: 12px !important;
  margin-top: 24px !important;
  list-style: none !important;
  padding: 0 !important;
  font-size: 13px !important;
  color: #334155 !important;
}
.feature-list li {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
}
.feature-list li::before {
  content: "✓" !important;
  display: inline-flex !important;
  width: 18px !important;
  height: 18px !important;
  align-items: center !important;
  justify-content: center !important;
  border-radius: 50% !important;
  background: #ecfdf5 !important;
  color: #065f46 !important;
  font-size: 11px !important;
  font-weight: 700 !important;
}

.approval-mock {
  border: 1px solid #e2e8f0 !important;
  border-radius: 8px !important;
  padding: 24px !important;
  background: #ffffff !important;
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.08) !important;
  transform: none !important;
}
.approval-mock::before {
  display: none !important;
}
.mock-top {
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  padding-bottom: 14px !important;
  border-bottom: 1px solid #e2e8f0 !important;
  font-size: 12px !important;
  color: #64748b !important;
}
.mock-top em {
  background: #fffbeb !important;
  color: #92400e !important;
  border: 1px solid #fde68a !important;
  border-radius: 9999px !important;
  padding: 2px 8px !important;
  font-size: 10px !important;
  font-weight: 600 !important;
  font-style: normal !important;
}
.mock-company {
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
  margin: 16px 0 !important;
}
.mock-template {
  margin-left: auto !important;
  background: #f1f5f9 !important;
  color: #334155 !important;
  border: 1px solid #e2e8f0 !important;
  border-radius: 4px !important;
  padding: 2px 8px !important;
  font-size: 11px !important;
  font-weight: 500 !important;
}
.mock-row {
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  padding: 8px 12px !important;
  border-radius: 4px !important;
  background: #f8fafc !important;
  margin-top: 6px !important;
  font-size: 12px !important;
  color: #334155 !important;
}
.mock-row span b {
  color: #94a3b8 !important;
  font-family: var(--font-mono) !important;
  margin-right: 8px !important;
}
.mock-row i {
  color: #065f46 !important;
  font-style: normal !important;
  font-size: 11px !important;
  font-weight: 600 !important;
}
.approval-mock button {
  width: 100% !important;
  margin-top: 18px !important;
  background: #0f172a !important;
  color: #ffffff !important;
  padding: 10px !important;
  border-radius: 6px !important;
  font-size: 12px !important;
  font-weight: 600 !important;
  border: none !important;
  cursor: pointer !important;
  transition: background 0.15s !important;
}
.approval-mock button:hover {
  background: #1e293b !important;
}

/* Security Section */
.security-section {
  max-width: 1240px !important;
  margin: 0 auto !important;
  border-radius: 8px !important;
  background: #0f172a !important;
  border: 1px solid #1e293b !important;
  color: #ffffff !important;
  padding: 56px 48px !important;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08) !important;
  position: relative !important;
  overflow: hidden !important;
}
.security-section h2 {
  color: #ffffff !important;
}
.security-section h2 em {
  color: #38bdf8 !important;
}
.security-orb {
  display: none !important;
}
.security-grid {
  display: grid !important;
  grid-template-columns: repeat(3, 1fr) !important;
  gap: 24px !important;
  margin-top: 40px !important;
}
.security-grid article {
  border: 1px solid #1e293b !important;
  border-radius: 6px !important;
  padding: 20px !important;
  background: #1e293b/40 !important;
}
.security-grid article > span {
  display: block !important;
  margin-bottom: 12px !important;
  color: #38bdf8 !important;
  font-family: var(--font-mono) !important;
  font-size: 12px !important;
  font-weight: 600 !important;
}
.security-grid strong {
  font-size: 15px !important;
  font-weight: 600 !important;
  color: #ffffff !important;
  display: block !important;
}
.security-grid p {
  color: #94a3b8 !important;
  font-size: 12px !important;
  margin-top: 6px !important;
  line-height: 1.6 !important;
}

/* Final CTA */
.final-cta {
  max-width: 1240px !important;
  margin: 60px auto 80px !important;
  border: 1px solid #e2e8f0 !important;
  border-radius: 8px !important;
  background: #ffffff !important;
  padding: 64px 32px !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04) !important;
  text-align: center !important;
  position: relative !important;
}
.cta-scribble {
  display: none !important;
}
.final-cta h2 {
  max-width: 600px !important;
  margin: 12px auto 0 !important;
}
.final-cta p {
  max-width: 480px !important;
  margin: 12px auto 24px !important;
  color: #475569 !important;
  font-size: 14px !important;
}

/* Marketing Footer */
.marketing-footer {
  background: #0f172a !important;
  border-top: 1px solid #1e293b !important;
  padding: 48px 24px 24px !important;
  color: #94a3b8 !important;
}
.footer-brand p {
  margin-top: 12px !important;
  font-size: 12px !important;
  color: #64748b !important;
}
.footer-links b {
  color: #ffffff !important;
  font-size: 12px !important;
}
.footer-links a {
  color: #94a3b8 !important;
}
.footer-links a:hover {
  color: #ffffff !important;
}
.footer-bottom {
  border-top: 1px solid #1e293b !important;
  margin-top: 36px !important;
  padding-top: 20px !important;
  color: #64748b !important;
}

@media (max-width: 900px) {
  .hero-section {
    grid-template-columns: 1fr !important;
    padding: 40px 20px 50px !important;
  }
  .step-grid {
    grid-template-columns: repeat(2, 1fr) !important;
  }
  .showcase-grid {
    grid-template-columns: 1fr !important;
  }
  .feature-stage-inner {
    grid-template-columns: 1fr !important;
    gap: 36px !important;
  }
  .feature-grid {
    grid-template-columns: 1fr !important;
  }
  .review-section {
    grid-template-columns: 1fr !important;
    gap: 36px !important;
  }
  .security-grid {
    grid-template-columns: 1fr !important;
  }
  .marketing-links {
    display: none !important;
  }
}
"""

css += "\n" + marketing_css

with open("frontend/app/globals.css", "w", encoding="utf-8") as f:
    f.write(css)

print("Marketing styles appended successfully to globals.css!")
