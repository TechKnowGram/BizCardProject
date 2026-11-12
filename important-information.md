# BizCard — Implementation Handoff for Antigravity

## Read this first

BizCard is a multi-tenant Visiting Card SaaS. It has a FastAPI/PostgreSQL backend and a Next.js frontend. Do not rewrite the current authentication, PDF generation, approval workflow, or tenant checks. Inspect existing models, routes, schemas, migrations, and tests before changing anything.

The product currently supports three roles:

| Role | Responsibility |
| --- | --- |
| `SYSTEM_ADMIN` | Platform control: approves companies and card requests; manages shared templates |
| `COMPANY_ADMIN` | Owns one company workspace: profile, branding, employees, memberships, templates, company cards |
| `EMPLOYEE` | Independent personal account: personal cards and optional membership in a company |

`SYSTEM_ADMIN` must never be publicly selectable. It is bootstrapped from environment variables.

---

## What is already implemented

### Authentication and roles

- JWT login and role-based backend authorization.
- Password hashing via Argon2.
- Public company registration creates a `COMPANY_ADMIN` and a Company with `PENDING` status.
- Employee registration creates an independent `EMPLOYEE` account.
- System Admin is created only from `.env` values if it does not already exist.
- Company registration uses Gmail validation and strong-password validation in the UI/backend flow.

### Registration experience

There is a professional account choice screen:

```text
/register
  ├─ Company → /register/company
  └─ Employee → /employee/register
```

Keep this flow. Any generic “Register” CTA should normally link to `/register`, not directly to a role-specific form.

### Company workspace

Company Admin can:

- Manage company profile, uploaded logo, and branding.
- Add employees manually.
- Edit and manage employees.
- Optionally import employees by CSV.
- Use/select card templates.
- Submit single or bulk card requests for employees.
- Review employee membership requests.
- Approve, reject, or revoke memberships.
- View company card requests and generated cards.
- View mock card orders/payment records.

CSV import remains optional. The platform must not require a company to upload CSV before an employee can use personal cards.

### Employee workspace

Employee can:

- Register and log in without any company.
- Create personal visiting cards.
- View/download personal cards and their history.
- Browse registered companies.
- Submit a request to join a company.
- After Company Admin approval, use company branding and active company templates.
- Select card quantity and see a calculated mock total before checkout.

### Membership data model

The system keeps these entities separate:

- `User`: authentication identity and role.
- `Company`: tenant and branding owner.
- `Employee`: company-owned directory record; not necessarily a login account.
- `Membership`: relationship between a `User` and a `Company`.
- `CardRequest` / `CardRequestItem`: company approval workflow.
- `GeneratedCard` / `PersonalCard`: generated-card metadata and PDF path.
- `CardOrder` / `PaymentRecord`: mock billing audit data.

Membership states:

```text
PENDING       Employee requested access; Company Admin must decide.
PRE_APPROVED  Company imported employee without a matching user account yet.
APPROVED      Active company membership.
REJECTED      Company declined request.
REVOKED       Company removed a previous membership.
```

### Existing automated membership flows

1. **Employee account exists first, employee directory record exists**
   - Employee selects a company and submits official email + employee ID.
   - Backend checks the company employee record.
   - If values match, a pending request goes to Company Admin.
   - Company Admin approves once; membership stays active until revoked.

2. **Company imports unregistered employee**
   - Import creates `Employee` plus `PRE_APPROVED` membership, without creating a user.
   - If the person later creates an account using the same official email, the account links to this membership and activates it.

3. **Company imports an already registered employee**
   - Matching official email and employee ID link the existing user and membership.

Duplicate memberships and cross-company access must always be prevented.

### Cards and mock checkout

- Company card requests use a selected template and one or many employee IDs.
- System Admin approves/rejects company card requests.
- Approval generates one PDF per employee through services, not route handlers.
- Repeated approval must not generate duplicate PDF records/files.
- PDFs are stored in local storage; database stores metadata/path only.
- Employees can create personal cards independently.
- Quantity has no fixed limit.
- Total is calculated as `quantity × unit price`.
- Payer can be `INDIVIDUAL` or `COMPANY`.
- Current payment is mock-only: `CardOrder` and `PaymentRecord` are created, but no payment gateway is connected.
- Registration and CSV import never create charges.

### Isolation/security rules

- All company-owned backend queries must be scoped by `company_id` from the authenticated user or validated membership.
- A Company Admin cannot see another company's employees, memberships, card requests, cards, logo files, templates, or orders.
- An Employee can only access own personal cards and cards provided through own approved membership.
- Never trust `company_id`, `role`, or payer values from browser input without server-side authorization checks.

---

## Current decision: demo-friendly manual membership verification

The product owner does **not** want automatic employment verification for demos right now.

### Desired behavior going forward

Employee join form should still display and collect:

```text
Company
Official company email
Employee ID / registration number
```

But when there is no company employee record to validate, the employee should still be able to submit a `PENDING` membership request. Company Admin manually reviews the submitted details and chooses Approve or Reject.

This enables the key demo scenario:

```text
Employee registers first
→ company has not imported/added the employee
→ employee selects company and enters claimed official email + employee ID
→ request reaches Company Admin as PENDING
→ Company Admin manually approves or rejects
→ approved employee uses company branding/templates
```

### Important implementation constraint

Do not describe this as verified employment. It is **manual verification** for MVP.

Use clear UI language such as:

> “Your details will be reviewed by this company administrator.”

Later phase options (not needed now): company email OTP, HR API, SSO, or an external employee registry.

The existing strict company-record matching may remain as an optional fast-path. It must not block manual review in demo mode.

---

## Important code locations

| Area | Location |
| --- | --- |
| FastAPI application/router registration | `backend/app/main.py` |
| Security/config/JWT | `backend/app/core/` |
| Authentication endpoints | `backend/app/api/routes/auth.py` |
| Membership endpoints | `backend/app/api/routes/memberships.py` |
| Employee portal, personal cards, checkout | `backend/app/api/routes/employee_portal.py` |
| Company/employees/templates/cards routes | `backend/app/api/routes/` |
| SQLAlchemy business models | `backend/app/models/domain.py` |
| Role/status constants | `backend/app/models/constants.py` |
| Pydantic schemas | `backend/app/schemas/domain.py`, `backend/app/schemas/auth.py` |
| CSV import service | `backend/app/services/employee_import.py` |
| PDF generation service | `backend/app/services/card_generation.py` |
| Latest database migrations | `backend/alembic/versions/20261111_05_employee_memberships.py`, `backend/alembic/versions/20261112_06_flexible_membership_checkout.py` |
| Register choice page | `frontend/app/register/page.js` |
| Company registration form | `frontend/app/register/company/page.js`, `frontend/components/AuthScreen.js` |
| Employee registration page | `frontend/app/employee/register/page.js` |
| Role dashboard router | `frontend/app/dashboard/page.js` |
| Company dashboard | `frontend/components/CompanyDashboard.js` |
| Employee dashboard | `frontend/components/EmployeeDashboard.js` |
| Membership management UI | `frontend/components/CompanyMemberships.js` |
| Shared API helper | `frontend/lib/api.js` |
| Shared styles | `frontend/app/globals.css` |

---

## Database and application setup

Required backend environment variables in `backend/app/.env`:

```env
DATABASE_URL=postgresql+psycopg://USER:PASSWORD@localhost:5432/bizcard_db
SECRET_KEY=replace-with-a-long-random-secret
ACCESS_TOKEN_EXPIRE_MINUTES=30
SYSTEM_ADMIN_USERNAME=admin
SYSTEM_ADMIN_EMAIL=admin@gmail.com
SYSTEM_ADMIN_PASSWORD=replace-with-strong-password
GENERATED_CARD_STORAGE=generated_cards
```

Run locally:

```powershell
# terminal 1
cd backend
.venv\Scripts\python.exe -m alembic upgrade head
.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8001

# terminal 2
cd frontend
npm run dev -- --port 3001
```

URLs:

```text
Frontend: http://localhost:3001
API docs: http://localhost:8001/docs
Register choice: http://localhost:3001/register
```

---

## Required development discipline

1. Reuse current conventions and avoid rewrites of working features.
2. Add a new Alembic migration for database model changes; never modify a migration already applied in a database.
3. Keep generation/import logic in services, not API routes.
4. Add tests for new authentication, membership, data-isolation, and duplicate-prevention behavior.
5. Run migrations and backend tests after changes:

```powershell
cd backend
.venv\Scripts\python.exe -m alembic upgrade head
.venv\Scripts\python.exe -m pytest -q -p no:cacheprovider
```

6. Do not add Redis, Celery, Kafka, microservices, real billing, or third-party verification unless explicitly requested.
