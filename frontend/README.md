# BizCard frontend

Next.js App Router + Tailwind CSS + TypeScript. Imports use the `@/` alias (project root).

```text
app/                         Routes only; no UI lives here
  layout.tsx, globals.css    Root layout, Tailwind theme and global styles
  page.tsx                   Public homepage
  login/, register/          Sign-in and registration pages
  employee/register/         Employee sign-up
  verify/[token]/            Public QR card verification
  (admin)/dashboard/         Signed-in workspace. (admin) is a route group, not part of the URL.
                             layout.tsx mounts DashboardPanel, which loads the user and wraps the
                             page in the admin, company or employee dashboard (shell + shared state).
                             One folder per menu page (employees/, companies/, orders/ ...); each
                             page.tsx renders that page's component. Pages shared by several roles
                             (requests, templates, settings, profile) use RolePage to pick one.
components/
  ui/                        Shared primitives: Button/Input (index.tsx), Icon, Brand,
                             StatusBadge, Toast, ReviewDialog, ProtectedImage, PdfPreview
  layout/                    Page chrome: WorkspaceShell + role shells, NotificationBell,
                             SiteHeader, SiteFooter
  dashboard/                 Shared dashboard blocks: Surface, DataTable, Charts, RowActions
  auth/                      AuthScreen (login and registration forms)
  cards/                     Card preview and design studio components
  home/                      Public homepage sections
  admin/                     Platform admin dashboard + pages/ (one component per menu page)
  company/                   Company admin dashboard + pages/, tabs and dialogs
  employee/                  Employee dashboard + pages/, card ordering
lib/                         api.ts (backend calls), types.ts, validation.ts, csv.ts, site.ts
tests/                       csv.test.ts
```

Where things go: a component used by one role lives in that role's folder; used by
several, in `ui/`, `dashboard/` or `cards/`. Page chrome goes in `layout/`.

Start FastAPI from backend with `uvicorn app.main:app --reload`.
In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000 and use an existing account or your super admin credentials.
No frontend .env is required locally. To change the backend address, copy
.env.example to .env.local, set BACKEND_URL, and restart Next.js.
Next.js forwards /api requests to FastAPI; browser requests stay on the same origin.
Passwords are sent only to the login API. The access token lives in sessionStorage;
logout clears it, and expired tokens redirect to login. Backend RBAC remains authoritative.

Manual checks: incorrect password shows an error; correct login opens your profile;
refresh preserves login; sign out clears login; opening /dashboard without a token
returns to login. Check the login page on both phone and desktop widths.

Production build: `npm run build`, then `npm start`.
Setup references: https://nextjs.org/docs/app/getting-started/installation and
https://tailwindcss.com/docs/installation/framework-guides/nextjs
