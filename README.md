# BizCard

BizCard is a full-stack company visiting-card management system. Companies register for an account, import or manually manage employees, select a predefined design, request cards, and download generated PDFs after System Admin approval.

## Features

### Company Admin

- Register a company using a valid `@gmail.com` address
- Track company approval status
- Import employees from CSV with all-or-nothing validation
- Add and edit employees manually
- Search, filter, activate/deactivate, add photos, and export employees
- Maintain company profile details and upload a company logo
- Select Classic, Modern, or Minimal card templates
- Submit single or bulk card requests
- Track request status and rejection reasons
- Download completed employee cards as PDF files
- Download a full request as a ZIP and verify cards through public QR pages
- Receive in-app workflow notifications

### System Admin

- Secure account bootstrap from environment variables
- Review company details and approve, reject, or suspend companies
- Review the requester, selected template, and employee details before approving cards
- Approve or reject card requests
- Activate or deactivate predefined templates
- Generate one PDF per employee without duplicate generation
- Review platform statistics and a traceable administrative audit log

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js, React, Tailwind CSS, JavaScript |
| Backend | FastAPI, SQLAlchemy, Pydantic |
| Database | PostgreSQL |
| Authentication | JWT, Argon2 password hashing, role-based access control |
| Migrations | Alembic |
| PDF generation | ReportLab |
| Tests | Pytest, FastAPI TestClient |

## Project structure

```text
BizCardProject/
├── backend/
│   ├── alembic/              Database migrations
│   ├── app/
│   │   ├── api/              Dependencies and API routes
│   │   ├── core/             Configuration and security
│   │   ├── db/               Database base and session
│   │   ├── models/           SQLAlchemy models
│   │   ├── schemas/          Pydantic request/response schemas
│   │   ├── services/         CSV import and PDF generation
│   │   ├── bootstrap.py      System Admin and template bootstrap
│   │   └── main.py           FastAPI application
│   ├── examples/             Sample employee CSV
│   └── tests/                API, migration, security, and workflow tests
└── frontend/
    ├── app/                   Next.js pages and global styles
    ├── components/            Authentication and dashboard components
    └── lib/                   API client and form validation
```

## Requirements

- Python 3.11 or newer
- PostgreSQL
- Node.js 20 or newer
- npm

## Backend setup

Create the PostgreSQL database:

```sql
CREATE DATABASE bizcard_db;
```

From the project root:

```powershell
cd backend
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
Copy-Item .env.example app/.env
```

Configure `backend/app/.env`:

```env
DATABASE_URL=postgresql+psycopg://postgres:password@localhost:5432/bizcard_db
SECRET_KEY=replace-with-a-random-secret-at-least-32-characters
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
SYSTEM_ADMIN_USERNAME=Rubel
SYSTEM_ADMIN_EMAIL=rubel@gmail.com
SYSTEM_ADMIN_PASSWORD=replace-with-a-secure-password
GENERATED_CARD_STORAGE=generated_cards
UPLOAD_STORAGE=uploads
PUBLIC_APP_URL=http://localhost:3000
```

Apply migrations and start FastAPI:

```powershell
.venv\Scripts\python.exe -m alembic upgrade head
.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

API documentation is available at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

On startup, the backend creates the System Admin only when one does not already exist. It also ensures the three predefined templates exist. Plaintext passwords are never logged or stored.

## Frontend setup

Open a second terminal from the project root:

```powershell
cd frontend
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

`frontend/.env.local` controls the backend address:

```env
BACKEND_URL=http://127.0.0.1:8000
```

If port `3000` is already in use:

```powershell
npm run dev -- --port 3001
```

## Main workflow

1. A Company Admin registers with a Gmail address and a strong password.
2. The new company receives `PENDING` status.
3. The System Admin reviews and approves the company.
4. The Company Admin imports a CSV or manually adds employees.
5. The company selects an active card template.
6. The Company Admin creates a single or bulk card request.
7. The System Admin reviews the requester and employee details.
8. Approval generates one PDF for each employee.
9. Each card receives a unique public-safe QR verification URL.
10. The Company Admin downloads individual PDFs or a request ZIP.

## Validation rules

Company registration requires an exact `@gmail.com` email address. New passwords must contain at least eight characters, including:

- One uppercase letter
- One lowercase letter
- One number
- One special character

Example: `BizCard@123`

## Employee CSV

The required columns are:

```csv
employee_id,name,designation,department,email,phone
EMP-001,Ayesha Rahman,Software Engineer,Engineering,ayesha@example.com,+8801700000001
EMP-002,Tanvir Hasan,Sales Manager,Sales,tanvir@example.com,+8801700000002
```

Employee IDs must be unique inside each company. A row error or duplicate causes the whole import to roll back.

## Card request example

Use the database employee IDs returned by `GET /employees`:

```json
{
  "employee_ids": [1, 2, 3],
  "template_id": 2
}
```

One employee ID creates a single request; multiple IDs create a bulk request using the same API structure.

## Tests

Run the backend test suite:

```powershell
cd backend
.venv\Scripts\python.exe -m pytest -q -p no:cacheprovider
```

Verify the frontend production build:

```powershell
cd frontend
npm run build
```

## Security and data isolation

- Public registration can only create `COMPANY_ADMIN` users.
- `SYSTEM_ADMIN` is created from environment variables.
- Passwords are hashed with Argon2.
- Protected endpoints require JWT bearer authentication.
- Company-owned employee, request, and card queries are scoped by `company_id`.
- Generated PDFs are stored on disk; PostgreSQL stores their metadata and file paths.
- Logos and employee photos use local upload storage and are never stored as database bytes.
- Deactivating an employee also deactivates their existing public card verification.
- Real `.env` files, local databases, generated cards, virtual environments, and frontend build files are excluded from Git.

## AI Card Designer

Set `GEMINI_API_KEY` and optionally `GEMINI_MODEL=gemini-3.5-flash-lite` in `backend/app/.env`, then run `alembic upgrade head` and restart the backend. The key stays on the backend. The integration uses Gemini's OpenAI-compatible chat completions endpoint; no OpenAI key is needed.

Approved companies can open **Card Studio ? AI Designer**, describe a style, preview it, refine it, then save it as a private company template. Select the saved template and submit the normal card request for admin approval and PDF generation. Draft generation does not save or select a template automatically.

Supported designs use validated colors, three print fonts, left/center layouts and four decorations. AI does not generate executable HTML, arbitrary artwork or brand logos. This keeps saved previews and printable PDFs predictable. Employee data is not sent to Gemini; only the design prompt and optional previous draft are sent. Avoid putting confidential information in prompts. Provider quota and costs depend on your Gemini account.

Company AI designs remain private and are listed separately from the shared admin template collection. System Admin can use **Company designs ? Save to shared collection** to publish a copy. Card approval does not publish a template, and repeated library saves reuse the same shared copy.


### Premium Card Studio

- The interface uses locally hosted Manrope, with its OFL license included in `frontend/app/fonts`.
- **Explore 3 styles** creates three AI alternatives in one provider request. Pick a design, then adjust palette, alignment, decoration and print font without another AI call.
- **Your Brand Kit** saves company-specific color and font preferences. Existing uploaded logos are applied locally; employee data and images are not sent to Gemini.
- **Actual PDF preview** renders an unsaved draft or selected template with the same service used after approval. Previews do not issue cards or create database records; preview QR codes do not verify.
- Enable **Include branded back** to create a two-page PDF per employee, with each side sized 3.5 ? 2 inches. Existing single-sided templates stay single-sided.
- Apply the brand-kit migration with `cd backend` then `alembic upgrade head` before restarting the backend.

### Employee Portal

Employees register at `/employee/register`, then sign in and select an approved company from their dashboard. A company administrator approves the membership once from **Memberships**. Approved employees can create and download their own visiting cards using active company templates. Their membership remains active until the company administrator revokes it.

Run the latest migration before using this feature:

```powershell
cd backend
.venv/Scripts/python.exe -m alembic upgrade head
```

### Verified Membership and Mock Checkout

## Current Project Handoff

This section is the source of truth for the next developer or AI model. Read it before changing the project.

### Roles and registration

| Role | Responsibility | Registration |
| --- | --- | --- |
| `SYSTEM_ADMIN` | Approves companies and requests; manages shared templates | Bootstrap only from environment variables |
| `COMPANY_ADMIN` | Owns one company and manages its people, brand, requests and memberships | `/register` → Company → `/register/company` |
| `EMPLOYEE` | Has a personal account/cards and may join an approved company | `/register` → Employee → `/employee/register` |

Never expose System Admin in public registration. Public company registration must create `COMPANY_ADMIN`, and employee registration must create `EMPLOYEE`.

`/register` is intentionally an account-type selection page. Keep links labelled “Register” pointing there so a visitor consciously chooses their Company or Employee workspace.

### Domain model and ownership

- `User`: login identity and role. An employee user is separate from an imported company employee record.
- `Company`: tenant boundary and owner of company branding.
- `Employee`: company-owned directory/contact record with employee ID and official email. CSV import is optional.
- `Membership`: connects a user to a company, with `PENDING`, `PRE_APPROVED`, `APPROVED`, `REJECTED`, or `REVOKED` status.
- `CardRequest` and `CardRequestItem`: normal company card approval workflow.
- `GeneratedCard` / `PersonalCard`: PDF metadata; PDF files stay on local storage, never in PostgreSQL.
- `CardOrder` and `PaymentRecord`: mock checkout audit trail, not a real payment integration.

### Membership workflows that must continue working

1. **Employee first**: employee registers → searches company → submits official email and employee ID → Company Admin approves → active membership.
2. **Imported, not registered**: company imports employee → `PRE_APPROVED` membership has no user → matching user registers → account links and activates membership.
3. **Imported, already registered**: verified official email and employee ID link the existing employee account and activate membership according to the import.

Do not permit duplicate memberships. A user must never retrieve another company's employees, memberships, requests or files.

### Card generation and mock billing

- Employees can create personal cards before joining a company.
- Approved company membership unlocks company templates/branding; normal card creation does not require repeat approval.
- System Admin approving a request generates each PDF exactly once. Repeated approval must not make duplicate cards.
- Checkout accepts any `quantity`; total is `quantity × unit_price`.
- Record mock orders/payments for card generation only, never for registration or CSV import.
- Real billing is intentionally deferred. Do not add a payment gateway unless explicitly requested.

### Important files

| Concern | Location |
| --- | --- |
| FastAPI app and router registration | `backend/app/main.py` |
| Auth | `backend/app/api/routes/auth.py` |
| Membership API | `backend/app/api/routes/memberships.py` |
| Employee portal/personal cards/checkout | `backend/app/api/routes/employee_portal.py` |
| Database models | `backend/app/models/domain.py` |
| Request and response schemas | `backend/app/schemas/domain.py` |
| CSV and PDF services | `backend/app/services/` |
| Latest migrations | `backend/alembic/versions/20261111_05_employee_memberships.py`, `backend/alembic/versions/20261112_06_flexible_membership_checkout.py` |
| Registration choice UI | `frontend/app/register/page.js` |
| Company registration UI | `frontend/app/register/company/page.js`, `frontend/components/AuthScreen.js` |
| Employee registration UI | `frontend/app/employee/register/page.js` |
| Dashboard role router | `frontend/app/dashboard/page.js` |
| Company and employee dashboards | `frontend/components/CompanyDashboard.js`, `frontend/components/EmployeeDashboard.js` |
| Company membership UI | `frontend/components/CompanyMemberships.js` |
| API client and global design | `frontend/lib/api.js`, `frontend/app/globals.css` |

### Rules for future changes

1. Inspect models, routes, schemas and migrations before adding a feature; reuse the current flow.
2. Use existing JWT/RBAC dependencies. Never trust a role or company ID from the browser.
3. Scope all tenant-owned queries by authenticated `company_id` or verified membership.
4. Add a new Alembic migration for database changes; never edit an applied migration.
5. Keep PDF generation and CSV logic in services, not routes.
6. Add/update tests for authentication, isolation, membership state and duplicate prevention.

### Run and verify

```powershell
# Terminal 1
cd backend
.venv\Scripts\python.exe -m alembic upgrade head
.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8001

# Terminal 2
cd frontend
npm run dev -- --port 3001
```

Verify these pages after starting:

- `http://localhost:3001/register` — professional Company/Employee choice
- `http://localhost:3001/register/company` — company registration
- `http://localhost:3001/employee/register` — employee registration
- `http://localhost:8001/docs` — API documentation

Backend check:

```powershell
cd backend
.venv\Scripts\python.exe -m pytest -q -p no:cacheprovider
```

Employees can create personal cards without joining a company. To use company branding, they select a company and submit the official company email plus employee ID recorded by that company. The platform validates both values against the company employee record before sending a request to the Company Admin.

CSV import is optional. Each imported employee creates a `PRE_APPROVED` membership. If that employee already has an account with the same official email, the account is linked and approved immediately. If they register later with the same official email, their pre-approved membership activates automatically.

Employee card checkout is a development mock. The employee selects any quantity, sees `quantity × unit price`, and the system records a paid mock order and payment record with the correct company or individual payer. Default individual unit price is `৳50`; company-sponsored orders are recorded at `৳0`.
