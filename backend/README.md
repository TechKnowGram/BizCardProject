# BizCard backend MVP

FastAPI, SQLAlchemy, PostgreSQL, Alembic, JWT RBAC, CSV employee import and
ReportLab PDF card generation.

## Setup and run

From `backend`:

```powershell
.venv/Scripts/python.exe -m pip install -r requirements-dev.txt
Copy-Item .env.example app/.env
.venv/Scripts/python.exe -m alembic upgrade head
.venv/Scripts/python.exe -m uvicorn app.main:app --reload
```

Open `http://127.0.0.1:8000/docs`. Startup creates the system admin from the
environment if none exists and makes sure Classic, Modern and Minimal templates
exist. It never changes an existing system admin password.

Required settings:

```env
DATABASE_URL=postgresql+psycopg://postgres:password@localhost:5432/bizcard_db
SECRET_KEY=replace-with-a-random-secret-at-least-32-characters
ACCESS_TOKEN_EXPIRE_MINUTES=30
SYSTEM_ADMIN_USERNAME=Rubel
SYSTEM_ADMIN_EMAIL=rubel@gmail.com
SYSTEM_ADMIN_PASSWORD=choose-at-least-8-characters
GENERATED_CARD_STORAGE=generated_cards
```

`GENERATED_CARD_STORAGE` may be absolute. A relative path is resolved under
`backend`. Generated PDF bytes stay on disk; PostgreSQL stores path, filename,
size and ownership metadata.

## Main workflow

1. `POST /auth/register` creates a `COMPANY_ADMIN` and `PENDING` company.
2. System admin uses `PATCH /admin/companies/{id}/status` with `APPROVED`.
3. Company admin uploads CSV at `POST /employees/import`.
4. Company admin lists `GET /templates`, then selects one with
   `POST /templates/{id}/select`.
5. Company admin creates a single or bulk `POST /card-requests`.
6. System admin approves or rejects at
   `PATCH /admin/card-requests/{id}/decision`.
7. Company admin lists `GET /card-requests/{id}/cards` and downloads from
   `GET /cards/{id}/download`.

Registration example:

```json
{
  "username": "Rubel",
  "company_name": "BizCard Ltd",
  "email": "owner@gmail.com",
  "password": "Strong@123"
}
```

CSV columns (a ready sample is in `examples/employees.csv`):

```csv
employee_id,name,designation,department,email,phone
EMP-001,Ayesha Rahman,Software Engineer,Engineering,ayesha@example.com,+8801700000001
```

Card request example (one ID is single; several IDs are bulk):

```json
{
  "employee_ids": [1, 2, 3],
  "template_id": 2
}
```

Run tests:

```powershell
.venv/Scripts/python.exe -m pytest -q -p no:cacheprovider
```
