# Dashboard UI rules

BizCard is a business-card generator. A **company** registers, keeps its staff list,
picks a card design and orders cards. **Employees** join their company (or order
personal cards). The **platform admin** approves companies and card requests.
Every screen should make that flow obvious and nothing else.

These rules exist so all three workspaces (platform admin, company admin, employee)
look like one product made by one careful designer.

## Layout

- The shell (`components/layout/WorkspaceShell.tsx`) is shared. Sidebar: navigation on top,
  an **Account** group at the bottom (profile, billing, settings, help), then the
  signed-in user and **Sign out**. Top bar: breadcrumbs + notifications only.
- Page background is `slate-100`. Every page starts with `PageHeader`.
- Content is built from white cards: `rounded-2xl border border-slate-200 bg-white shadow-xs`.
  Use `SectionCard`, `StatTile`, `DataTable` from this folder instead of hand-made boxes.
- Vertical rhythm between blocks: `space-y-6` (or `gap-6` in grids).

## Building blocks (`components/dashboard/`)

| Component | Use for |
|---|---|
| `PageHeader` (`Surface.tsx`) | Page title, one-line description, actions/filters on the right |
| `SectionCard` | Any titled card. Optional `info` tooltip and `action` (use `CardLink`) |
| `StatTile` | A single number with a label. 3–4 in a row, never coloured |
| `ToolbarSelect` | Small select for filters and periods |
| `DataTable` (`DataTable.tsx`) | **Every table.** Dark header, numbered rows, search + toolbar, pagination |
| `NameCell`, `Avatar` | First column of people/company rows |
| `AreaChart`, `bucketByDate`, `rangeOptions` (`Charts.tsx`) | Counts over time (one series) |
| `StatusBreakdown`, `statusColor` | "How many in each status" with a segmented bar and list |
| `StatusBadge` (`components/ui/StatusBadge.tsx`) | Status pills in tables |
| `Button`, `buttonClass` (`components/ui/index.tsx`) | All buttons |

## Colour

- Navy `#080D26` (`navy-950`) for the sidebar and table headers. Headings `text-navy-900`.
- One accent: brand blue (`brand-600`, hover `brand-700`, tint `brand-50`). Primary buttons, links, active nav, chart line.
- Text: `slate-700` body, `slate-500` secondary. Borders `slate-200`, dividers `slate-100`.
- Green/amber/red **only** for status, always with a text label (use `StatusBadge` / `statusColor`).
- Not allowed: purple/violet/indigo/pink/teal, gradients on cards, coloured top strips on cards,
  glows, dark "hero" banners inside a page, different colour per stat card.

## Type

- Body `text-sm`. Smallest text `text-xs` (12px). Never `text-3xs`/`text-2xs` for content you need to read.
- Weights: `font-medium`, `font-semibold`, `font-bold` (page titles only). No `font-black`/`extrabold`.
- Uppercase only in table headers. No `tracking-widest` micro-labels sprinkled around.
- No monospace except IDs/codes if really needed.

## Copy

- Short, plain sentences a busy office manager would write. Sentence case for titles.
- No jargon or hype: "console", "command center", "SLA", "prepress engine", "enterprise-grade",
  "seamless", "elevate", "immutable", "next great first impression", "in focus".
- No invented facts or numbers. Only show what the data says.
- No emoji, no decorative symbols (✦ ⚡ 🚀). Use `components/ui/Icon.tsx` or `@iconify/react` (`lucide:*`) icons, sparingly.

## Behaviour

- Never change API calls, request bodies, permissions or state logic. This is a visual layer.
- Keep every existing action reachable (approve, reject, export, import, download…).
- Empty states: one sentence saying what will appear and, if useful, one button to start.
- Must pass `npx tsc --noEmit` and `npm run build`.
