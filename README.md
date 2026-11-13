<div align="center">

# BizCard

**Business cards for your whole team: approved, verified and ready to print.**

Companies upload their own card design once. Machine learning reads it, and BizCard prints a matching card for every employee, each with a QR code that proves it is genuine.

![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38BDF8?logo=tailwindcss&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688?logo=fastapi&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![OpenCV](https://img.shields.io/badge/OpenCV-ML-5C3EE8?logo=opencv&logoColor=white)

</div>

---

## Contents

- [What BizCard does](#what-bizcard-does)
- [Features](#features)
- [Card templates from your own design](#card-templates-from-your-own-design)
- [How a card gets made](#how-a-card-gets-made)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Tests](#tests)
- [Project structure](#project-structure)
- [Security](#security)
- [Developer handoff](#developer-handoff)

## What BizCard does

Ordering business cards for a company usually means spreadsheets, emails to a designer, and proofs going back and forth. BizCard puts all of that in one place:

1. A company registers and is approved by the platform.
2. It adds its staff (by hand or from a CSV) and uploads its card design.
3. Cards are requested, approved, and generated as print-ready PDFs (3.5 × 2 in, vector text).
4. Every card carries a QR code. Scanning it opens a public page that confirms the person really works there. When someone leaves, deactivating them makes the QR page show the card is no longer valid.

## Features

### Company admin
- Register a company and track its approval status
- Manage employees: add, edit, photos, search, filter, activate or deactivate, CSV import and export
- **Upload your own card design.** Machine learning finds where every detail goes, and you check it before saving.
- Optional card back: front only, a simple back with your logo and QR code, or an uploaded back design
- Preview any template with a real employee, plus an actual PDF preview
- Request cards for one employee or many at once, then download PDFs or a ZIP
- Approve employees who ask to join the company (memberships)
- Company profile, logo, billing history and settings

### Employee
- Register, then join an approved company with their official email and employee ID
- Create and download their own card using the company's templates
- Personal cards are available even before joining a company
- Mock checkout: pick a quantity, see the total, get an order record

### System admin
- Approve, reject or suspend companies
- Review and approve card requests (each PDF is generated exactly once)
- Overview dashboard with activity chart and status breakdown
- Template, user, payment and audit-log views

## Card templates from your own design

A company admin uploads a finished design from Photoshop, Canva or similar, with sample text still on it. BizCard reads it like this:

| Step | Technology | What it does |
| --- | --- | --- |
| Read the text | **PP-OCR** deep-learning model (RapidOCR + ONNX Runtime) | Finds every line of text and reads it, in any font or colour |
| Understand it | Pattern + layout rules | Labels each line: name, job title, phone, email, website, address, company |
| Copy the style | OpenCV | Measures colour, size, boldness and alignment, so new names look the same |
| Find the photo | Face detection (YuNet, optional) or a photo detector | Marks the frame for each employee's photo |
| Place the QR code | Image analysis | Picks the calmest empty area of the card |
| Clean the card | Inpainting (OpenCV Telea) | Erases the sample text and leaves a blank background |

The admin then checks the result in an editor (drag, resize, relabel, preview with a real employee) and saves it. Everything runs on our own server, and designs are never sent to an outside AI service.

**Back of the card (optional):**
- **Front only:** printed on one side.
- **Simple back:** company logo, name, website and QR code on a colour you choose. Nothing to upload.
- **Upload the back:** read by the same pipeline. On a back, the largest text is treated as the company name.

When a template has a back, its PDF has two pages, ready for double-sided printing.

A plain-language explanation for non-technical readers is in [docs/ml-template-pipeline.md](docs/ml-template-pipeline.md).

## How a card gets made

```mermaid
flowchart LR
    A[Company registers] --> B[System admin approves]
    B --> C[Add employees<br/>manual or CSV]
    B --> D[Upload card design]
    D --> E[ML reads the design]
    E --> F[Admin checks and saves]
    C --> G[Request cards]
    F --> G
    G --> H[System admin approves]
    H --> I[PDF per employee<br/>with QR code]
    I --> J[Download and print]
```

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS 4 |
| Backend | FastAPI, SQLAlchemy 2, Pydantic 2 |
| Database | PostgreSQL, with migrations in Alembic |
| Machine learning | RapidOCR (PP-OCR on ONNX Runtime), OpenCV, NumPy, Pillow |
| PDF | ReportLab (vector text, 3.5 × 2 in), pypdf |
| Auth | JWT, Argon2 password hashing, role-based access |
| Tests | Pytest + FastAPI TestClient |

## Getting started

### Requirements
- Python 3.11 or newer
- Node.js 20 or newer and npm
- PostgreSQL

### 1. Database

```sql
CREATE DATABASE bizcard_db;
```

### 2. Backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
Copy-Item .env.example app/.env
```

Edit `backend/app/.env`:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection, for example `postgresql+psycopg://postgres:password@localhost:5432/bizcard_db` |
| `SECRET_KEY` | Random secret, at least 32 characters |
| `SYSTEM_ADMIN_EMAIL`, `SYSTEM_ADMIN_PASSWORD` | The platform admin account, created on first start |
| `GENERATED_CARD_STORAGE`, `UPLOAD_STORAGE` | Folders for generated PDFs and uploads |
| `PUBLIC_APP_URL` | Website address used in the card QR codes |

Then apply migrations and start the API:

```powershell
.venv\Scripts\python.exe -m alembic upgrade head
.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8001
```

API docs are at http://127.0.0.1:8001/docs. The first design analysis loads the OCR model, so it takes a few extra seconds.

> **Optional:** for better photo detection, place the OpenCV YuNet model at `backend/models/face_detection_yunet.onnx`. Without it, a built-in photo detector is used.

### 3. Frontend

```powershell
cd frontend
npm install
Copy-Item .env.example .env.local
npm run dev -- --port 3001
```

Set `BACKEND_URL=http://127.0.0.1:8001` in `frontend/.env.local`, then open http://localhost:3001.

### Shortcut (Windows)

After the one-time setup above, `run-dev.bat` in the project root starts both servers in separate windows.

## Tests

```powershell
# Backend: API, security, ML templates and workflows
cd backend
.venv\Scripts\python.exe -m pytest -q

# Frontend: type check and production build
cd frontend
npx tsc --noEmit
npm run build
```

The ML tests in `backend/tests/test_image_templates.py` use synthetic card layouts from `backend/tests/card_fixtures.py`, so they need no external files.

## Project structure

```text
BizCardProject/
├── backend/
│   ├── alembic/                  Database migrations
│   ├── app/
│   │   ├── api/routes/           auth, employees, templates, image_templates, employee_portal, ...
│   │   ├── core/                 Settings and security
│   │   ├── models/               SQLAlchemy models
│   │   ├── schemas/              Pydantic schemas (incl. image_template.py)
│   │   ├── services/
│   │   │   ├── template_ml.py            ML analysis of uploaded designs
│   │   │   ├── image_template_render.py  Fills a design and writes the PDF
│   │   │   ├── card_generation.py        PDF generation and QR codes
│   │   │   └── employee_import.py        CSV import
│   │   ├── bootstrap.py          Admin account, retiring old templates
│   │   └── main.py               FastAPI app
│   ├── examples/                 Sample employee CSV
│   └── tests/                    Pytest suite
├── frontend/
│   ├── app/                      Pages: home, login, register, dashboard, verify
│   ├── components/
│   │   ├── company/DesignUploader.tsx   Upload page and field editor
│   │   ├── ImageTemplateCard.tsx        Live card preview (front and back)
│   │   ├── dashboard/                   Shared tables, charts and layout
│   │   └── ...                          Role dashboards and studio
│   └── lib/                      API client and types
└── docs/
    └── ml-template-pipeline.md   How the ML template pipeline works
```

## Security

- Public sign-up can only create company admins and employees. The system admin comes from environment variables.
- Passwords are hashed with Argon2. Repeated failed logins are throttled per IP and email.
- Every company-owned query is scoped to the signed-in user's company or verified membership.
- Uploads are checked for type, file signature, size and pixel count (protects against image bombs).
- Uploaded designs are private to the company. Unsaved uploads are deleted after 24 hours.
- CSV exports escape spreadsheet formulas, and generated file names are sanitised.
- `.env` files, uploads, generated cards and build output are never committed.

## Developer handoff

Read this before changing the project.

### Roles

| Role | Responsibility | How it is created |
| --- | --- | --- |
| `SYSTEM_ADMIN` | Approves companies and card requests | Environment variables only |
| `COMPANY_ADMIN` | Owns one company: staff, designs, requests, memberships | `/register` → Company |
| `EMPLOYEE` | Personal cards; may join an approved company | `/register` → Employee |

### Key rules
- **Templates:** only templates made from an uploaded design (`design.kind == "image"`) are offered. Old demo templates and Gemini-made designs are retired at startup (deactivated, not deleted).
- **ML analysis:** the front analysis is the core feature. The back reuses it with `side=back`. Do not change front behaviour when working on the back.
- **Card generation:** approving a request generates each PDF exactly once. Repeated approval must never create duplicates.
- **Memberships:** `PENDING`, `PRE_APPROVED`, `APPROVED`, `REJECTED` or `REVOKED`. Never allow duplicates. Imported employees are pre-approved and link automatically when the matching user registers.
- **Billing:** checkout is a mock (`quantity × unit price`) and records orders and payments for card generation only. Do not add a real gateway unless asked.

### Workflow for changes
1. Read the models, routes, schemas and migrations before adding a feature, and reuse the existing flow.
2. Use the existing JWT and role dependencies. Never trust a role or company ID from the browser.
3. Scope every tenant-owned query by the authenticated company or a verified membership.
4. Add a new Alembic migration for every database change, and never edit one that has been applied.
5. Keep PDF, CSV and ML logic in `services/`, not in routes.
6. Add tests for auth, isolation, membership state and duplicate prevention.
7. Frontend UI rules are in `frontend/components/dashboard/README.md`: one accent colour, no gradients or emoji, readable text sizes.

### Known business decisions still open
- Company sign-up currently requires a `@gmail.com` address.
- Payments are mocked, and there is no email verification yet.
- Footer contact details, homepage stats and testimonials are placeholders, and the Privacy and Terms pages need real text.
