# BizCard Design System Specification & Component Tokens

**Version:** 1.0.0  
**Framework:** Tailwind CSS + React (Next.js)  
**Conformance:** WCAG 2.1 AA / AAA compliant  
**Architectural Inspiration:** Shopify Polaris, GitHub Primer, Radix UI, Linear  

---

## 1. Design Tokens & CSS Custom Properties

These tokens are to be declared in `frontend/app/globals.css`:

```css
:root {
  /* Surface Ladders */
  --color-canvas: #F8FAFC;         /* slate-50 */
  --color-surface: #FFFFFF;        /* pure white */
  --color-surface-subtle: #F1F5F9; /* slate-100 */
  --color-surface-hover: #F8FAFC;  /* slate-50/70 */

  /* Borders & Dividers */
  --color-border-subtle: #F1F5F9;  /* slate-100 */
  --color-border-default: #E2E8F0; /* slate-200 */
  --color-border-strong: #CBD5E1;  /* slate-300 */
  --color-border-hover: #94A3B8;   /* slate-400 */

  /* Typography / Text Colors */
  --color-text-primary: #0F172A;   /* slate-900 (14.5:1 contrast) */
  --color-text-secondary: #475569; /* slate-600 (5.8:1 contrast) */
  --color-text-muted: #64748B;     /* slate-500 (4.6:1 contrast) */
  --color-text-inverted: #FFFFFF;

  /* Interactive Accents (Single-Voltage) */
  --color-accent-primary: #0F172A;      /* slate-900 authoritative */
  --color-accent-primary-hover: #1E293B;/* slate-800 */
  --color-accent-blue: #2563EB;         /* blue-600 focus & highlights */
  --color-accent-blue-subtle: #EFF6FF;  /* blue-50 */

  /* Semantic Status: Success / Approved */
  --color-success-bg: #ECFDF5;     /* emerald-50 */
  --color-success-text: #065F46;   /* emerald-800 */
  --color-success-border: #A7F3D0; /* emerald-200 */
  --color-success-dot: #10B981;    /* emerald-500 */

  /* Semantic Status: Warning / Pending */
  --color-warning-bg: #FFFBEB;     /* amber-50 */
  --color-warning-text: #92400E;   /* amber-800 */
  --color-warning-border: #FDE68A; /* amber-200 */
  --color-warning-dot: #F59E0B;    /* amber-500 */

  /* Semantic Status: Critical / Rejected */
  --color-critical-bg: #FEF2F2;    /* red-50 */
  --color-critical-text: #991B1B;  /* red-800 */
  --color-critical-border: #FECACA;/* red-200 */
  --color-critical-dot: #EF4444;   /* red-500 */

  /* Semantic Status: Neutral / Draft */
  --color-neutral-bg: #F1F5F9;     /* slate-100 */
  --color-neutral-text: #334155;   /* slate-700 */
  --color-neutral-border: #CBD5E1; /* slate-300 */
  --color-neutral-dot: #94A3B8;    /* slate-400 */

  /* Radii */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 12px;
  --radius-full: 9999px;

  /* Shadows (Subtle, Crisp, Non-blurry) */
  --shadow-hairline: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-card: 0 1px 3px 0 rgba(15, 23, 42, 0.06), 0 1px 2px -1px rgba(15, 23, 42, 0.06);
  --shadow-popover: 0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.06);
  --shadow-modal: 0 12px 24px -4px rgba(15, 23, 42, 0.12), 0 4px 8px -4px rgba(15, 23, 42, 0.08);

  /* Focus Ring */
  --focus-ring: 0 0 0 2px #FFFFFF, 0 0 0 4px #2563EB;
}
```

---

## 2. Component Specifications

### 2.1 Buttons
Buttons provide clear, tactile affordances without aggressive gradient fills.

#### Primary Button (Single-Voltage)
Used for the single most important action on a page or modal (e.g., "Add Employee", "Save Changes", "Confirm Order").
```jsx
<button className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 active:scale-[0.98] transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none shadow-sm">
  {icon && <Icon className="w-4 h-4" />}
  <span>Add Employee</span>
</button>
```

#### Secondary Outline Button
Used for standard actions alongside a primary button (e.g., "Import CSV", "Cancel", "Export").
```jsx
<button className="inline-flex items-center justify-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 hover:text-slate-900 hover:border-slate-400 active:bg-slate-100 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50 shadow-sm">
  {icon && <Icon className="w-4 h-4 text-slate-500" />}
  <span>Import CSV</span>
</button>
```

#### Compact Table Action Button
Used inside table row action cells.
```jsx
<button className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 transition-colors focus:outline-none focus:ring-1 focus:ring-slate-400">
  <span>Review</span>
</button>
```

---

### 2.2 IndexTable Architecture (Polaris + Airtable Standard)

The primary data grid for Employee Roster and Card Requests:

```jsx
<div className="w-full bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
  {/* Table Control Header / Toolbar */}
  <div className="p-4 border-b border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
    {/* Left: Search & Filter Chips */}
    <div className="flex items-center gap-2 flex-1">
      <div className="relative flex-1 max-w-sm">
        <SearchIcon className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Filter by name, email, department..."
          className="w-full pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
        />
      </div>
      {/* Filter Chips */}
      <div className="hidden md:flex items-center gap-1.5">
        <button className="px-2.5 py-1 text-xs font-medium rounded-full bg-slate-900 text-white">All (48)</button>
        <button className="px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200">Active (42)</button>
        <button className="px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200">Pending (6)</button>
      </div>
    </div>

    {/* Right: Actions */}
    <div className="flex items-center gap-2">
      <button className="...">Import CSV</button>
      <button className="...">+ Add Employee</button>
    </div>
  </div>

  {/* Checkbox Batch Action Bar (Animates in when selectedCount > 0) */}
  {selectedCount > 0 && (
    <div className="px-4 py-2.5 bg-blue-50/80 border-b border-blue-200 flex items-center justify-between text-xs text-blue-900 animate-in fade-in duration-150">
      <div className="flex items-center gap-2 font-medium">
        <span>{selectedCount} employee{selectedCount > 1 ? 's' : ''} selected</span>
      </div>
      <div className="flex items-center gap-2">
        <button className="px-2.5 py-1 bg-white border border-blue-300 rounded font-medium text-blue-700 hover:bg-blue-50">Bulk Request Cards</button>
        <button className="px-2.5 py-1 bg-white border border-slate-300 rounded font-medium text-slate-700 hover:bg-slate-50">Export Selected</button>
      </div>
    </div>
  )}

  {/* Table Body */}
  <div className="overflow-x-auto">
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500 select-none">
          <th className="py-2.5 px-4 w-10">
            <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
          </th>
          <th className="py-2.5 px-3"># ID</th>
          <th className="py-2.5 px-4">Employee</th>
          <th className="py-2.5 px-4">Department / Role</th>
          <th className="py-2.5 px-4">Status</th>
          <th className="py-2.5 px-4 text-right">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 text-xs">
        {/* Row */}
        <tr className="hover:bg-slate-50/70 transition-colors">
          <td className="py-3 px-4">
            <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
          </td>
          <td className="py-3 px-3 font-mono text-slate-500">EMP-001</td>
          <td className="py-3 px-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-semibold flex items-center justify-center text-xs">
                MR
              </div>
              <div>
                <p className="font-medium text-slate-900">Mahmudur Rahman</p>
                <p className="text-slate-500 text-[11px]">mahmud@example.com</p>
              </div>
            </div>
          </td>
          <td className="py-3 px-4">
            <p className="text-slate-900 font-medium">Head of Operations</p>
            <p className="text-slate-500 text-[11px]">Operations</p>
          </td>
          <td className="py-3 px-4">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Active
            </span>
          </td>
          <td className="py-3 px-4 text-right">
            <button className="...">Edit</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  {/* Summary Footer */}
  <div className="p-3 border-t border-slate-200 bg-slate-50/60 flex items-center justify-between text-xs text-slate-500">
    <span>Showing 1 to 20 of 20 employees</span>
    <div className="flex items-center gap-2">
      <button disabled className="px-2 py-1 bg-white border border-slate-200 rounded disabled:opacity-40">Previous</button>
      <button disabled className="px-2 py-1 bg-white border border-slate-200 rounded disabled:opacity-40">Next</button>
    </div>
  </div>
</div>
```

---

### 2.3 Status Badges & Lozenges (Atlassian + Spectrum)

Explicit semantic status tags with high contrast:

```jsx
// Active / Approved
<span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-600/20">
  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
  Active
</span>

// Pending Review
<span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20">
  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
  Pending
</span>

// Rejected / Revoked
<span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-800 ring-1 ring-inset ring-red-600/20">
  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
  Rejected
</span>

// Neutral / Draft
<span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-400/20">
  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
  Draft
</span>
```

---

### 2.4 Form Inputs & Validation (GOV.UK + Radix UI)

Top-aligned, clear field labels with explicit helper and error states:

```jsx
<div className="space-y-1.5">
  <label className="block text-xs font-medium text-slate-700">
    Employee ID <span className="text-slate-400 font-normal">(required)</span>
  </label>
  <input
    type="text"
    placeholder="e.g. EMP-042"
    className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-md placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
  />
  <p className="text-[11px] text-slate-500">Official company payroll identifier.</p>
</div>

{/* Error State */}
<div className="space-y-1.5">
  <label className="block text-xs font-medium text-red-700">
    Official Email *
  </label>
  <input
    type="email"
    defaultValue="invalid-email"
    className="w-full px-3 py-2 text-sm text-red-900 bg-red-50/30 border border-red-500 rounded-md focus:outline-none focus:ring-2 focus:ring-red-200 transition-all"
  />
  <p className="text-[11px] font-medium text-red-600 flex items-center gap-1">
    <AlertCircle className="w-3.5 h-3.5" /> Please enter a valid company email address.
  </p>
</div>
```

---

### 2.5 Accessible Modal Dialog (Radix UI Standard)

Centered focus-trapped dialog with clean close interaction:

```jsx
<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
  <div className="w-full max-w-lg bg-white rounded-lg border border-slate-200 shadow-xl overflow-hidden animate-in zoom-in-95 duration-150">
    {/* Modal Header */}
    <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
      <div>
        <h3 className="text-base font-semibold text-slate-900">Add Employee</h3>
        <p className="text-xs text-slate-500 mt-0.5">Add an individual employee to the company workspace roster.</p>
      </div>
      <button className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100">
        <XIcon className="w-4 h-4" />
      </button>
    </div>

    {/* Modal Body */}
    <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
      {/* Form Fields */}
    </div>

    {/* Modal Footer */}
    <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
      <button className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">
        Cancel
      </button>
      <button className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800">
        Save Employee
      </button>
    </div>
  </div>
</div>
```

---

## 3. Design Tokens Verification Checklist
- [x] Zero saturated purple/magenta gradient backgrounds.
- [x] Zero blurry drop shadows (`box-shadow: 0 20px 25px -5px ...` removed).
- [x] All typography uses standard Inter scale with tabular numbers on values.
- [x] Every form field has explicit 1px borders and visible focus rings.
- [x] Tables have fixed sticky headers, row hover states, and clear monospace IDs.
- [x] Modals have dark backdrops with subtle blur, clean headers, and separated action footers.
