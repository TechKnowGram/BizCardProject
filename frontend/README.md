# BizCard frontend

Next.js App Router + Tailwind CSS, using plain JavaScript.

```text
app/
  layout.js          Shared page layout
  globals.css        Tailwind and global styles
  page.js            Public marketing homepage
  login/page.js      Login form
  dashboard/page.js  Role-aware company/admin workspace
  verify/[token]/     Public QR card verification
components/
  Brand.js           Shared logo and visual identity
lib/
  api.js             Backend requests and token helpers
```

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
