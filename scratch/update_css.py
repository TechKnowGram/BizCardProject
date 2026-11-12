import re

with open("frontend/app/globals.css", "r", encoding="utf-8") as f:
    css = f.read()

# Let's replace the AI-prototype classes:
# 1. button colors
css = css.replace("background: #6151be;", "background: #0f172a;")
css = css.replace("background: #5142aa;", "background: #1e293b;")
css = css.replace("border: 1px solid #6151be;", "border: 1px solid #0f172a;")
css = css.replace("background: #635bce;", "background: #0f172a;")
css = css.replace("outline: 2px solid #635bce;", "outline: 2px solid #2563eb;")

# 2. workspace rail & purple gradients
css = css.replace(
    "background: linear-gradient(180deg,#211748,#2c1859 70%,#4a218b);",
    "background: #0f172a; border-right: 1px solid #1e293b;"
)
css = css.replace(
    "background:linear-gradient(180deg,#211748,#2c1859 70%,#4a218b);",
    "background:#0f172a; border-right: 1px solid #1e293b;"
)
css = css.replace(
    "background: linear-gradient(120deg,#312e81,#4f46e5 64%,#7c3aed);",
    "background: #0f172a; border: 1px solid #1e293b;"
)
css = css.replace(
    "background:linear-gradient(120deg,#312e81,#4f46e5 64%,#7c3aed);",
    "background:#0f172a; border: 1px solid #1e293b;"
)
css = css.replace(
    "background:linear-gradient(120deg,#4f24b8,#6f36df 58%,#ed6280);",
    "background:#0f172a; border: 1px solid #1e293b;"
)
css = css.replace(
    "background: linear-gradient(135deg,var(--violet),var(--violet-deep));",
    "background: #0f172a;"
)
css = css.replace(
    "background:linear-gradient(135deg,var(--violet),var(--violet-deep));",
    "background:#0f172a;"
)
css = css.replace(
    "background:linear-gradient(110deg,#5142aa,#6f59d2);",
    "background:#0f172a;"
)

# 3. Rotations & Tilts
css = css.replace("transform:rotate(-4deg);", "transform:none;")
css = css.replace("transform:rotate(-3deg);", "transform:none;")
css = css.replace("transform:rotate(-7deg);", "transform:none;")
css = css.replace("transform:rotate(-5deg);", "transform:none;")

# 4. Hide circular pseudo-elements on rail
css = css.replace(
    '.workspace-rail::after { content:""; position:absolute; right:-65px; bottom:-55px; width:180px; height:180px; border:28px solid #ffffff0b; border-radius:50%; }',
    '.workspace-rail::after { display: none; }'
)

# 5. Hide old rail-art slogan box
css = css.replace('.rail-art {', '.rail-art { display: none; ')

# 6. Append comprehensive Design System styles
design_tokens = """
/* ==========================================================================
   BIZCARD DESIGN SYSTEM - MODERN B2B ENTERPRISE SPECIFICATION (POLARIS/PRIMER)
   ========================================================================== */

/* Design Tokens */
:root {
  --font-ui: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

/* Typography & Focus Utilities */
.tabular-nums, table, .stat-card strong, .metric-val {
  font-variant-numeric: tabular-nums;
}

/* Authoritative Button System */
.btn-primary {
  background: #0f172a !important;
  color: #ffffff !important;
  border: 1px solid #0f172a !important;
  border-radius: 6px !important;
  font-weight: 500 !important;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05) !important;
  transition: all 0.15s ease !important;
}
.btn-primary:hover:not(:disabled) {
  background: #1e293b !important;
  border-color: #1e293b !important;
  transform: none !important;
}
.btn-primary:active:not(:disabled) {
  transform: scale(0.98) !important;
}
.btn-primary:focus-visible {
  outline: 2px solid #2563eb !important;
  outline-offset: 2px !important;
}

.btn-secondary {
  background: #ffffff !important;
  color: #334155 !important;
  border: 1px solid #cbd5e1 !important;
  border-radius: 6px !important;
  font-weight: 500 !important;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05) !important;
  transition: all 0.15s ease !important;
}
.btn-secondary:hover:not(:disabled) {
  background: #f8fafc !important;
  color: #0f172a !important;
  border-color: #94a3b8 !important;
  transform: none !important;
}
.btn-secondary:active:not(:disabled) {
  transform: scale(0.98) !important;
}

.btn-quiet {
  background: transparent !important;
  color: #64748b !important;
  border: 1px solid transparent !important;
  border-radius: 6px !important;
  font-weight: 500 !important;
  transition: all 0.15s ease !important;
}
.btn-quiet:hover:not(:disabled) {
  background: #f1f5f9 !important;
  color: #0f172a !important;
  transform: none !important;
}

/* Sidebar & Navigation Shell */
.workspace {
  grid-template-columns: 240px minmax(0, 1fr) !important;
  background: #f8fafc !important;
}
.workspace-rail {
  background: #0f172a !important;
  border-right: 1px solid #1e293b !important;
  padding: 24px 16px !important;
}
.brand-lockup {
  gap: 10px !important;
}
.brand-mark {
  width: 34px !important;
  height: 34px !important;
  border-radius: 6px !important;
  background: #1e293b !important;
  border: 1px solid #334155 !important;
  box-shadow: 0 1px 2px rgba(0,0,0,0.2) !important;
  color: #ffffff !important;
  transform: none !important;
}
.brand-mark::after {
  display: none !important;
}
.brand-mark i {
  font-size: 16px !important;
  font-weight: 800 !important;
}
.brand-mark b {
  display: none !important;
}
.brand-name {
  font-size: 18px !important;
  font-weight: 700 !important;
  letter-spacing: -0.02em !important;
  color: #ffffff !important;
}
.brand-name small {
  font-size: 9px !important;
  font-weight: 600 !important;
  letter-spacing: 0.1em !important;
  color: #94a3b8 !important;
}

.rail-status {
  margin-top: 24px !important;
  background: #1e293b !important;
  border: 1px solid #334155 !important;
  border-radius: 6px !important;
  padding: 8px 12px !important;
  font-size: 11px !important;
  font-weight: 500 !important;
  color: #e2e8f0 !important;
}
.rail-status i {
  background: #10b981 !important;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2) !important;
}

.rail-navigation {
  margin-top: 20px !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 4px !important;
}
.rail-navigation button {
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
  padding: 8px 12px !important;
  border-radius: 6px !important;
  color: #94a3b8 !important;
  font-size: 13px !important;
  font-weight: 500 !important;
  transition: all 0.15s ease !important;
  border: 1px solid transparent !important;
}
.rail-navigation button:hover {
  background: #1e293b !important;
  color: #ffffff !important;
}
.rail-navigation button.active {
  background: #1e293b !important;
  color: #ffffff !important;
  font-weight: 600 !important;
  border-left: 3px solid #2563eb !important;
}

.rail-footer {
  margin-top: auto !important;
  padding-top: 16px !important;
  border-top: 1px solid #1e293b !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 8px !important;
}
.rail-meta {
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  font-size: 11px !important;
}
.rail-meta-label {
  color: #64748b !important;
}
.rail-meta-val {
  color: #cbd5e1 !important;
  font-weight: 500 !important;
  display: flex !important;
  align-items: center !important;
  gap: 5px !important;
}
.rail-status-dot {
  width: 6px !important;
  height: 6px !important;
  border-radius: 50% !important;
  background: #10b981 !important;
}

/* Workspace Top Bar */
.workspace-header {
  background: rgba(255, 255, 255, 0.95) !important;
  border-bottom: 1px solid #e2e8f0 !important;
  padding: 12px 32px !important;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.03) !important;
}
.workspace-crumb {
  font-size: 12px !important;
  color: #64748b !important;
}
.workspace-crumb b {
  color: #0f172a !important;
  font-weight: 600 !important;
}
.user-avatar {
  background: #0f172a !important;
  color: #ffffff !important;
  border-radius: 50% !important;
  width: 28px !important;
  height: 28px !important;
  font-size: 11px !important;
  font-weight: 600 !important;
  transform: none !important;
}

/* Metric / Health Strip */
.stats-grid {
  gap: 12px !important;
}
.stat-card {
  padding: 16px 18px !important;
  border: 1px solid #e2e8f0 !important;
  border-radius: 8px !important;
  background: #ffffff !important;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03) !important;
}
.stat-card:hover {
  transform: none !important;
  border-color: #cbd5e1 !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05) !important;
}
.stat-card p {
  font-size: 12px !important;
  font-weight: 500 !important;
  color: #64748b !important;
}
.stat-card strong {
  font-size: 24px !important;
  font-weight: 700 !important;
  color: #0f172a !important;
  font-variant-numeric: tabular-nums !important;
  display: block !important;
  margin-top: 4px !important;
}
.stat-card small {
  font-size: 11px !important;
  color: #94a3b8 !important;
  margin-top: 2px !important;
  display: block !important;
}

/* Polaris IndexTable Architecture */
.panel {
  border: 1px solid #e2e8f0 !important;
  border-radius: 8px !important;
  background: #ffffff !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04) !important;
}
.panel-header {
  padding: 16px 20px !important;
  border-bottom: 1px solid #e2e8f0 !important;
}
.panel-kicker {
  font-size: 10px !important;
  font-weight: 700 !important;
  letter-spacing: 0.08em !important;
  text-transform: uppercase !important;
  color: #64748b !important;
}
.panel-header h2 {
  font-size: 18px !important;
  font-weight: 700 !important;
  letter-spacing: -0.02em !important;
  color: #0f172a !important;
  margin-top: 2px !important;
}
.panel-header p {
  font-size: 12px !important;
  color: #64748b !important;
}

.data-table {
  width: 100% !important;
  border-collapse: collapse !important;
}
.data-table th {
  background: #f8fafc !important;
  color: #64748b !important;
  font-size: 11px !important;
  font-weight: 600 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.05em !important;
  padding: 10px 16px !important;
  border-bottom: 1px solid #e2e8f0 !important;
}
.data-table td {
  padding: 12px 16px !important;
  border-bottom: 1px solid #f1f5f9 !important;
  color: #0f172a !important;
  font-size: 13px !important;
}
.data-table tbody tr:hover {
  background: #f8fafc !important;
}
.selected-row {
  background: #eff6ff !important;
}

/* Batch Action Toolbar */
.selection-bar {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  padding: 12px 20px !important;
  background: #eff6ff !important;
  border-top: 1px solid #bfdbfe !important;
  color: #1e3a8a !important;
  font-size: 13px !important;
  font-weight: 500 !important;
}

/* Table Footer */
.table-footer {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  padding: 12px 20px !important;
  border-top: 1px solid #e2e8f0 !important;
  background: #f8fafc !important;
  font-size: 12px !important;
  color: #64748b !important;
}
.table-footer button {
  padding: 4px 10px !important;
  background: #ffffff !important;
  border: 1px solid #cbd5e1 !important;
  border-radius: 4px !important;
  color: #334155 !important;
  font-weight: 500 !important;
  font-size: 11px !important;
}
.table-footer button:hover:not(:disabled) {
  background: #f1f5f9 !important;
  border-color: #94a3b8 !important;
}
.table-footer button:disabled {
  opacity: 0.4 !important;
  cursor: not-allowed !important;
}

/* Company Banner Clean Slate */
.company-banner {
  background: #0f172a !important;
  border: 1px solid #1e293b !important;
  border-radius: 8px !important;
  padding: 22px 26px !important;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06) !important;
}
.company-mark {
  width: 40px !important;
  height: 40px !important;
  border-radius: 6px !important;
  background: #1e293b !important;
  border: 1px solid #334155 !important;
  font-size: 16px !important;
  font-weight: 700 !important;
  color: #ffffff !important;
}
.workflow span {
  border-radius: 6px !important;
  border-color: #334155 !important;
  color: #94a3b8 !important;
}
.workflow span.current {
  background: #2563eb !important;
  border-color: #2563eb !important;
  color: #ffffff !important;
  box-shadow: none !important;
}
.workflow span.done {
  background: #10b981 !important;
  border-color: #10b981 !important;
  color: #ffffff !important;
}
"""

css += design_tokens

with open("frontend/app/globals.css", "w", encoding="utf-8") as f:
    f.write(css)

print("CSS updated successfully!")
